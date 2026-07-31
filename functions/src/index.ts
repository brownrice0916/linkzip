import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {FieldValue, Timestamp, getFirestore, type DocumentReference} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {logger} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {HttpsError, onCall, onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {onObjectFinalized} from "firebase-functions/v2/storage";
import {createHash, randomBytes, randomInt, randomUUID, timingSafeEqual} from "node:crypto";
import type {Request} from "firebase-functions/v2/https";
import type {Response} from "express";

import {
  buildReplyText,
  decryptSecret,
  deliveryId,
  describeInstagramWebhookPayload,
  encryptSecret,
  extractInstagramInboundEvents,
  hashOAuthState,
  matchingRule,
  normalizeAutomationRules,
  randomOAuthState,
  type EncryptedSecret,
  type InstagramAutomationRule,
  type InstagramInboundEvent,
} from "./instagramAutomation.js";

import {
  parseSignedRequest,
  verifyMetaSignature,
  verifyWebhookChallenge,
  webhookEventId,
} from "./metaWebhook.js";
import {
  INSTAGRAM_PRODUCTION_ORIGIN,
  INSTAGRAM_REDIRECT_URI,
  instagramReturnOrigin,
} from "./instagramRedirect.js";
import {
  generateInviteCode,
  inviteCodeId,
  isSiteAdmin,
  normalizeInviteCode,
} from "./betaAccess.js";
import {
  BETA_LIFETIME_PREMIUM_GRANT,
  BETA_SHARED_FILE_OWNER_DOWNLOADS_PER_DAY,
  BETA_SHARED_FILE_UPLOAD_BYTES_PER_DAY,
  PLAN_ENTITLEMENTS,
  entitlementsForUser,
  isBetaLifetimePremium,
  resolveActiveMembershipPlan,
  sharedFileBytesForUser,
  sharedFileDownloadsPerDayForUser,
  type MembershipPlan,
} from "./planEntitlements.js";

initializeApp();

const db = getFirestore();
const metaWebhookVerifyToken = defineSecret("META_WEBHOOK_VERIFY_TOKEN");
const metaAppSecret = defineSecret("META_APP_SECRET");
const metaInstagramAppId = defineSecret("META_INSTAGRAM_APP_ID");
const metaInstagramAppSecret = defineSecret("META_INSTAGRAM_APP_SECRET");
const metaTokenEncryptionKey = defineSecret("META_TOKEN_ENCRYPTION_KEY");
const tossSecretKey = defineSecret("TOSS_SECRET_KEY");
const kakaoRestApiKey = defineSecret("KAKAO_REST_API_KEY");
const kakaoClientSecret = defineSecret("KAKAO_CLIENT_SECRET");
const naverClientId = defineSecret("NAVER_CLIENT_ID");
const naverClientSecret = defineSecret("NAVER_CLIENT_SECRET");
const resendApiKey = defineSecret("RESEND_API_KEY");

const tossBankCodes: Record<string, string> = {
  "KB국민은행": "06",
  "신한은행": "88",
  "NH농협은행": "11",
  "카카오뱅크": "90",
  "토스뱅크": "92",
  "우리은행": "20",
  "하나은행": "81",
  "IBK기업은행": "03",
  "새마을금고": "45",
  "우체국": "71",
  "SC제일은행": "23",
};

const betaCallableOptions = {
  region: "asia-northeast3" as const,
  memory: "256MiB" as const,
  timeoutSeconds: 30,
};

const betaLifetimePremiumData = () => ({
  membershipPlan: "premium",
  membershipBillingCycle: "lifetime_beta",
  membershipPeriodEndsAt: null,
  membershipPaymentProvider: "beta_invite",
  membershipGrant: BETA_LIFETIME_PREMIUM_GRANT,
  membershipGrantedAt: FieldValue.serverTimestamp(),
  membershipUpdatedAt: FieldValue.serverTimestamp(),
});

const requireSiteAdmin = (request: {auth?: {token: Record<string, unknown>}}) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  if (!isSiteAdmin(request.auth.token)) {
    throw new HttpsError("permission-denied", "사이트 관리자만 사용할 수 있습니다.");
  }
};

const serializeTimestamp = (value: unknown): string | null =>
  value instanceof Timestamp ? value.toDate().toISOString() : null;

const instagramRedirectUri = INSTAGRAM_REDIRECT_URI;
const instagramGraphVersion = "v24.0";
const instagramScopes = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
];

const kakaoRedirectUri = "https://linkzip.kr/auth/kakao/callback";
// Firebase Hosting forwards only the specially named `__session` cookie to
// rewritten Cloud Functions. Provider-specific names are stripped before the
// callback reaches the function, so scope the shared name by provider path.
const oauthStateCookieName = "__session";
const kakaoAllowedReturnOrigins = new Set([
  "https://linkzip.kr",
  "https://www.linkzip.kr",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5274",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5274",
]);

interface KakaoProfileResponse {
  id?: number | string;
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
  kakao_account?: {
    email?: string;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

const naverRedirectUri = "https://linkzip.kr/auth/naver/callback";

interface NaverProfileResponse {
  resultcode?: string;
  message?: string;
  response?: {
    id?: string;
    email?: string;
    nickname?: string;
    name?: string;
    profile_image?: string;
  };
}

interface InstagramConnection {
  uid: string;
  instagramUserId: string;
  instagramWebhookUserId?: string;
  username: string;
  name: string;
  profilePictureUrl: string;
  accessToken: EncryptedSecret;
  tokenExpiresAt: Timestamp | null;
  rules: InstagramAutomationRule[];
  status: "connected" | "disconnected";
}

const orderLookupOrigins = new Set([
  "https://linkzip.kr",
  "https://www.linkzip.kr",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
]);

interface PublicSalesProduct {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  discountPrice?: unknown;
  fileName?: unknown;
  filePath?: unknown;
  stock?: unknown;
  shippingFee?: unknown;
}

interface PublicSalesLink {
  id?: unknown;
  type?: unknown;
  isVisible?: unknown;
  title?: unknown;
  links?: unknown;
  salesConfig?: {
    salesType?: unknown;
    mainText?: unknown;
    products?: unknown;
  };
  donationConfig?: {
    mainText?: unknown;
    minAmount?: unknown;
  };
}

const setPublicPostCors = (request: Request, response: Response) => {
  const origin = request.get("origin") || "";
  if (orderLookupOrigins.has(origin)) response.set("Access-Control-Allow-Origin", origin);
  response.set("Vary", "Origin");
  if (request.method === "OPTIONS") {
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.set("Access-Control-Allow-Methods", "POST");
    response.status(204).send("");
    return false;
  }
  if (request.method !== "POST") {
    response.set("Allow", "POST").status(405).json({message: "Method not allowed"});
    return false;
  }
  if (origin && !orderLookupOrigins.has(origin)) {
    response.status(403).json({message: "허용되지 않은 요청입니다."});
    return false;
  }
  return true;
};

const findPublicLink = (links: unknown, linkId: string): PublicSalesLink | null => {
  if (!Array.isArray(links)) return null;
  for (const candidate of links) {
    if (!candidate || typeof candidate !== "object") continue;
    const link = candidate as PublicSalesLink;
    if (link.id === linkId) return link;
    const nested = findPublicLink(link.links, linkId);
    if (nested) return nested;
  }
  return null;
};

const findPrivateProfileLinks = (
  userData: FirebaseFirestore.DocumentData | undefined,
  username: string,
): unknown => {
  if (!userData) return [];
  const workspaces = Array.isArray(userData.profileWorkspaces) ? userData.profileWorkspaces : [];
  const workspace = workspaces.find((candidate: unknown) => {
    if (!candidate || typeof candidate !== "object") return false;
    const profile = (candidate as {profile?: {username?: unknown}}).profile;
    return typeof profile?.username === "string" && profile.username.trim().toLowerCase() === username;
  }) as {customLinks?: unknown} | undefined;
  return workspace?.customLinks || userData.customLinks || [];
};

const productWithinPlanLimit = (
  links: unknown,
  targetBlockId: string,
  targetProductId: string,
  limit: number | null,
) => {
  if (!Array.isArray(links)) return false;
  let index = 0;
  let allowed = false;
  const visit = (items: unknown[]) => {
    for (const candidate of items) {
      if (!candidate || typeof candidate !== "object") continue;
      const link = candidate as PublicSalesLink;
      if (link.type === "sales" && Array.isArray(link.salesConfig?.products)) {
        for (const product of link.salesConfig.products) {
          if (link.id === targetBlockId && product && typeof product === "object" && (product as {id?: unknown}).id === targetProductId) {
            allowed = limit === null || index < limit;
          }
          index += 1;
        }
      }
      if (Array.isArray(link.links)) visit(link.links);
    }
  };
  visit(links);
  return allowed;
};

const hasCustomerFormBlock = (userData: FirebaseFirestore.DocumentData | undefined, blockId: string) => {
  const workspaces = Array.isArray(userData?.profileWorkspaces) ? userData.profileWorkspaces : [];
  const linkSets = workspaces.length > 0
    ? workspaces.map((workspace: {customLinks?: unknown}) => workspace.customLinks)
    : [userData?.customLinks];
  return linkSets.some((links: unknown) => {
    const block = findPublicLink(links, blockId);
    return block?.type === "customer_info" && block.isVisible !== false;
  });
};

const platformFeeFor = (amount: number, percent: number) =>
  Math.floor(amount * percent / 100);

const writePlatformFeeLedger = (
  transaction: FirebaseFirestore.Transaction,
  orderNumber: string,
  ownerUid: string,
  orderData: FirebaseFirestore.DocumentData | undefined,
  provider: "toss" | "bank_transfer",
) => {
  const feeAmount = Number(orderData?.platformFeeAmount || 0);
  if (feeAmount < 1) return;
  transaction.set(db.collection("platformFeeLedger").doc(orderNumber), {
    orderNumber,
    ownerUid,
    kind: orderData?.kind === "donation" ? "donation" : "sales",
    sellerPlan: orderData?.sellerPlan || "basic",
    grossAmount: Number(orderData?.amount || 0),
    platformFeePercent: Number(orderData?.platformFeePercent || 0),
    platformFeeAmount: feeAmount,
    sellerNetAmount: Number(orderData?.sellerNetAmount || 0),
    paymentProvider: provider,
    collectionStatus: provider === "toss" ? "held_for_settlement" : "receivable",
    createdAt: FieldValue.serverTimestamp(),
  }, {merge: true});
};

const instagramEntitlementsForUid = async (uid: string) => {
  const userSnapshot = await db.collection("users").doc(uid).get();
  return entitlementsForUser(userSnapshot.data());
};

export const submitCustomerData = onCall(
  {region: "asia-northeast3", memory: "256MiB", timeoutSeconds: 20},
  async (request) => {
    const ownerUid = cleanString(request.data?.ownerUid, 128);
    const blockId = cleanString(request.data?.data?.blockId, 128);
    const email = cleanString(request.data?.data?.email, 200);
    const phone = cleanString(request.data?.data?.phone, 50);
    const name = cleanString(request.data?.data?.name, 100);
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(ownerUid) || !blockId || (!email && !phone && !name)) {
      throw new HttpsError("invalid-argument", "제출할 고객 정보를 확인해주세요.");
    }
    const userSnapshot = await db.collection("users").doc(ownerUid).get();
    if (!userSnapshot.exists || !hasCustomerFormBlock(userSnapshot.data(), blockId)) {
      throw new HttpsError("not-found", "고객 정보 수집 양식을 찾을 수 없습니다.");
    }
    const {entitlements} = entitlementsForUser(userSnapshot.data());
    if (!entitlements.canUseCustomerForms) {
      throw new HttpsError("permission-denied", "현재 프로필에서는 고객 정보를 수집할 수 없습니다.");
    }
    const entries = db.collection("users").doc(ownerUid).collection("collected_customer_data");
    const countSnapshot = await entries.count().get();
    const usageRef = db.collection("customerDataUsage").doc(ownerUid);
    const entryRef = entries.doc();
    await db.runTransaction(async (transaction) => {
      const usageSnapshot = await transaction.get(usageRef);
      const count = Math.max(countSnapshot.data().count, Number(usageSnapshot.data()?.count || 0));
      if (count >= entitlements.maxCustomerRecords) {
        throw new HttpsError("resource-exhausted", "이 프로필의 고객 정보 수집 한도에 도달했습니다.");
      }
      transaction.set(usageRef, {
        uid: ownerUid,
        count: count + 1,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});
      transaction.set(entryRef, {
        blockId,
        email,
        phone,
        name,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return {submitted: true};
  },
);

export const deleteMyAccount = onCall(
  {region: "asia-northeast3", memory: "512MiB", timeoutSeconds: 120},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const uid = request.auth.uid;
    const authTime = Number(request.auth.token.auth_time || 0) * 1000;
    if (!authTime || Date.now() - authTime > 10 * 60 * 1000) {
      throw new HttpsError("failed-precondition", "보안을 위해 다시 로그인한 뒤 탈퇴해주세요.");
    }

    const userRef = db.collection("users").doc(uid);
    const [userSnapshot, usernameSnapshot, publicProfileSnapshot, identitySnapshot, bugReportSnapshot] = await Promise.all([
      userRef.get(),
      db.collection("usernames").where("uid", "==", uid).get(),
      db.collection("publicProfiles").where("ownerUid", "==", uid).get(),
      db.collection("oauthIdentities").where("uid", "==", uid).get(),
      db.collection("bugReports").where("uid", "==", uid).get(),
    ]);

    const profileIds = new Set<string>([uid]);
    const profileUsernames = new Set<string>();
    const workspaces = Array.isArray(userSnapshot.data()?.profileWorkspaces)
      ? userSnapshot.data()?.profileWorkspaces as Array<{id?: unknown; profile?: {username?: unknown}}>
      : [];
    for (const workspace of workspaces) {
      if (typeof workspace.id === "string" && workspace.id) profileIds.add(`${uid}_${workspace.id}`);
      if (typeof workspace.profile?.username === "string" && workspace.profile.username) {
        profileUsernames.add(workspace.profile.username.trim().toLowerCase());
      }
    }
    const primaryUsername = userSnapshot.data()?.profile?.username;
    if (typeof primaryUsername === "string" && primaryUsername) profileUsernames.add(primaryUsername.trim().toLowerCase());
    usernameSnapshot.docs.forEach((document) => profileUsernames.add(document.id.trim().toLowerCase()));
    publicProfileSnapshot.docs.forEach((document) => profileIds.add(document.id));

    const batch = db.batch();
    usernameSnapshot.docs.forEach((document) => batch.delete(document.ref));
    publicProfileSnapshot.docs.forEach((document) => batch.delete(document.ref));
    identitySnapshot.docs.forEach((document) => batch.delete(document.ref));
    bugReportSnapshot.docs.forEach((document) => batch.delete(document.ref));
    for (const profileId of profileIds) batch.delete(db.collection("publicProfiles").doc(profileId));
    batch.delete(db.collection("instagramConnections").doc(uid));
    batch.delete(db.collection("customerDataUsage").doc(uid));
    batch.delete(db.collection("betaMembers").doc(uid));
    await batch.commit();

    // Guestbook content lives in top-level collections rather than beneath the
    // user document. Remove content owned by or authored by the departing user,
    // together with password/challenge records that would otherwise be orphaned.
    const guestbookQueries: Array<Promise<FirebaseFirestore.QuerySnapshot>> = [
      db.collection("guestbooks").where("targetOwnerUid", "==", uid).get(),
      db.collection("guestbooks").where("authorUid", "==", uid).get(),
      db.collection("guestbookReplies").where("authorUid", "==", uid).get(),
    ];
    for (const username of profileUsernames) {
      guestbookQueries.push(
        db.collection("guestbooks").where("targetUsername", "==", username).get(),
        db.collection("guestbookReplies").where("targetUsername", "==", username).get(),
        db.collection("guestbookEditChallenges").where("targetUsername", "==", username).get(),
        db.collection("guestbookDeleteChallenges").where("targetUsername", "==", username).get(),
        db.collection("guestbookReplyEditChallenges").where("targetUsername", "==", username).get(),
        db.collection("guestbookReplyDeleteChallenges").where("targetUsername", "==", username).get(),
      );
    }
    const guestbookSnapshots = await Promise.all(guestbookQueries);
    const guestbookDocuments = new Map<string, DocumentReference>();
    for (const snapshot of guestbookSnapshots) {
      snapshot.docs.forEach((document) => guestbookDocuments.set(document.ref.path, document.ref));
    }
    for (const document of guestbookDocuments.values()) {
      if (document.parent.id === "guestbooks") {
        const secretRef = db.collection("guestbookSecrets").doc(document.id);
        guestbookDocuments.set(secretRef.path, secretRef);
      }
      if (document.parent.id === "guestbookReplies") {
        const secretRef = db.collection("guestbookReplySecrets").doc(document.id);
        guestbookDocuments.set(secretRef.path, secretRef);
      }
    }
    const guestbookWriter = db.bulkWriter();
    guestbookDocuments.forEach((document) => guestbookWriter.delete(document));
    await guestbookWriter.close();

    await Promise.all([
      db.recursiveDelete(userRef),
      db.recursiveDelete(db.collection("analytics").doc(uid)),
    ]);

    const bucket = getStorage().bucket();
    const storagePrefixes = [
      `avatars/${uid}/`,
      `profiles/${uid}/`,
      `thumbnails/${uid}/`,
      `affiliate-products/${uid}/`,
      `shared-files/${uid}/`,
      `digital-products/${uid}/`,
    ];
    await Promise.all(storagePrefixes.map(async (prefix) => {
      try {
        await bucket.deleteFiles({prefix, force: true});
      } catch (error) {
        logger.warn("Account storage cleanup failed", {uid, prefix, error});
        throw error;
      }
    }));

    await getAuth().deleteUser(uid);
    logger.info("Account deletion completed", {uid});
    return {deleted: true};
  },
);

export const listCustomerData = onCall(
  {region: "asia-northeast3", memory: "256MiB", timeoutSeconds: 20},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const userSnapshot = await db.collection("users").doc(request.auth.uid).get();
    const {entitlements} = entitlementsForUser(userSnapshot.data());
    const snapshot = await db.collection("users").doc(request.auth.uid)
      .collection("collected_customer_data")
      .limit(entitlements.maxCustomerRecords)
      .get();
    return {
      records: snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          blockId: cleanString(data.blockId, 128),
          email: cleanString(data.email, 200),
          phone: cleanString(data.phone, 50),
          name: cleanString(data.name, 100),
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : cleanString(data.createdAt, 64),
        };
      }),
      limit: entitlements.maxCustomerRecords,
      canExport: entitlements.canExportCustomerData,
    };
  },
);

export const removeCustomerData = onCall(
  {region: "asia-northeast3", memory: "256MiB", timeoutSeconds: 20},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const id = cleanString(request.data?.id, 128);
    if (!/^[A-Za-z0-9]{6,128}$/.test(id)) throw new HttpsError("invalid-argument", "삭제할 고객 정보를 확인해주세요.");
    const entryRef = db.collection("users").doc(request.auth.uid).collection("collected_customer_data").doc(id);
    const usageRef = db.collection("customerDataUsage").doc(request.auth.uid);
    await db.runTransaction(async (transaction) => {
      const [entrySnapshot, usageSnapshot] = await Promise.all([
        transaction.get(entryRef),
        transaction.get(usageRef),
      ]);
      if (!entrySnapshot.exists) return;
      transaction.delete(entryRef);
      transaction.set(usageRef, {
        uid: request.auth?.uid,
        count: Math.max(0, Number(usageSnapshot.data()?.count || 1) - 1),
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});
    });
    return {removed: true};
  },
);

const requireInstagramPlan = async (uid: string) => {
  return instagramEntitlementsForUid(uid);
};

const reserveInstagramDelivery = async (uid: string, monthlyLimit: number | null) => {
  const month = new Date().toISOString().slice(0, 7);
  const usageRef = db.collection("instagramAutomationUsage").doc(`${uid}_${month}`);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const count = Number(snapshot.data()?.count || 0);
    if (monthlyLimit !== null && count >= monthlyLimit) return false;
    transaction.set(usageRef, {
      uid,
      month,
      count: count + 1,
      ...(monthlyLimit !== null ? {limit: monthlyLimit} : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    return true;
  });
};

const syncProfilePlanVisibility = async (uid: string, plan: MembershipPlan) => {
  const userSnapshot = await db.collection("users").doc(uid).get();
  const workspaces = Array.isArray(userSnapshot.data()?.profileWorkspaces)
    ? userSnapshot.data()?.profileWorkspaces as Array<{id?: unknown}>
    : [];
  if (workspaces.length === 0) return;
  const batch = db.batch();
  const maxProfiles = PLAN_ENTITLEMENTS[plan].maxProfiles;
  workspaces.forEach((workspace, index) => {
    if (typeof workspace.id !== "string") return;
    batch.set(db.collection("publicProfiles").doc(`${uid}_${workspace.id}`), {
      planPaused: index >= maxProfiles,
      forceWatermark: !PLAN_ENTITLEMENTS[plan].canHideBranding,
      planVisibilityUpdatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
  });
  await batch.commit();
};

// Clients cannot write planPaused/forceWatermark — the rules reject them on
// create — so a profile created from the editor starts without any enforcement
// fields. Stamp them here from the owner's current plan.
export const applyPlanVisibilityOnProfileCreate = onDocumentCreated(
  {region: "asia-northeast3", document: "publicProfiles/{profileId}"},
  async (event) => {
    const created = event.data?.data();
    const ownerUid = created?.ownerUid;
    if (typeof ownerUid !== "string" || !ownerUid) return;
    // syncProfilePlanVisibility itself creates any missing profile document,
    // and those already carry both fields. Skipping them stops the recursion.
    if (created?.planPaused !== undefined && created?.forceWatermark !== undefined) return;

    const userSnapshot = await db.collection("users").doc(ownerUid).get();
    if (!userSnapshot.exists) return;
    await syncProfilePlanVisibility(ownerUid, resolveActiveMembershipPlan(userSnapshot.data()));
  },
);

interface BankTransferAccount {
  bankName: string;
  accountNumber: string;
  accountOwnerName: string;
}

const findVerifiedAccount = (
  userData: FirebaseFirestore.DocumentData | undefined,
  username?: string,
): BankTransferAccount | null => {
  if (!userData) return null;
  const workspaces = Array.isArray(userData.profileWorkspaces) ? userData.profileWorkspaces : [];
  const workspace = username ? workspaces.find((candidate: unknown) => {
    if (!candidate || typeof candidate !== "object") return false;
    const profile = (candidate as {profile?: {username?: unknown}}).profile;
    return typeof profile?.username === "string" && profile.username.trim().toLowerCase() === username;
  }) as {profile?: {verifiedAccount?: Record<string, unknown>}} | undefined : undefined;
  const account = workspace?.profile?.verifiedAccount || userData.profile?.verifiedAccount;
  const bankName = cleanString(account?.bankName, 50);
  const accountNumber = cleanString(account?.accountNumber, 40).replace(/[^0-9-]/g, "");
  const accountOwnerName = cleanString(account?.accountOwnerName, 50);
  if (!bankName || !accountNumber || !accountOwnerName || account?.accountConnected !== true) return null;
  return {bankName, accountNumber, accountOwnerName};
};

const getPlatformBankAccount = async (): Promise<BankTransferAccount | null> => {
  const settings = await db.collection("platformSettings").doc("payment").get();
  const configured = settings.data()?.bankTransfer;
  const configuredAccount = findVerifiedAccount({profile: {verifiedAccount: configured}});
  if (configuredAccount) return configuredAccount;
  try {
    const administrator = await getAuth().getUserByEmail("brownrice0916@gmail.com");
    const user = await db.collection("users").doc(administrator.uid).get();
    return findVerifiedAccount(user.data());
  } catch (error) {
    logger.warn("Platform bank account is not configured", {error});
    return null;
  }
};

const bankTransferExpiresAt = () => Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

const bankTransferResponse = (
  account: BankTransferAccount,
  depositorName: string,
  expiresAt: Timestamp,
) => ({
  paymentProvider: "bank_transfer",
  bankTransfer: {
    ...account,
    depositorName,
    expiresAt: expiresAt.toDate().toISOString(),
  },
});

interface TossBankVerificationResponse {
  holderName?: unknown;
  isValid?: unknown;
  code?: unknown;
  message?: unknown;
  entityBody?: {
    holderName?: unknown;
    isValid?: unknown;
  };
  error?: {
    code?: unknown;
    message?: unknown;
  } | null;
}

const requestTossBankVerification = async (
  path: string,
  body: Record<string, string>,
): Promise<TossBankVerificationResponse> => {
  const secretKey = tossSecretKey.value();
  if (!secretKey) throw new HttpsError("failed-precondition", "토스 계좌인증 키가 설정되지 않았습니다.");
  const authorization = Buffer.from(`${secretKey}:`, "utf8").toString("base64");
  const tossResponse = await fetch(`https://api.tosspayments.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await tossResponse.json().catch(() => ({})) as TossBankVerificationResponse;
  if (tossResponse.ok) return payload;

  const errorCode = cleanString(payload.error?.code ?? payload.code, 100);
  logger.warn("Toss bank account verification failed", {
    status: tossResponse.status,
    code: errorCode,
  });
  if (errorCode === "NOT_AVAILABLE_BANK_ACCOUNT_VERIFICATION") {
    throw new HttpsError("unavailable", "은행 점검 시간입니다. 잠시 후 다시 시도해주세요.");
  }
  if (tossResponse.status === 401 || tossResponse.status === 403) {
    throw new HttpsError("failed-precondition", "토스페이먼츠 계좌인증 서비스 계약 또는 API 키를 확인해주세요.");
  }
  throw new HttpsError(
    "failed-precondition",
    cleanString(payload.error?.message ?? payload.message, 200) || "계좌 정보가 일치하지 않습니다.",
  );
};

export const verifyTossBankAccount = onCall(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 20,
    secrets: [tossSecretKey],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const bankName = cleanString(request.data?.bankName, 50);
    const bankCode = tossBankCodes[bankName];
    const accountNumber = cleanString(request.data?.accountNumber, 30).replace(/\D/g, "");
    const holderName = cleanString(request.data?.holderName, 50);
    const identityNumber = cleanString(request.data?.identityNumber, 20).replace(/\D/g, "");
    if (!bankCode || !holderName || accountNumber.length < 8 || accountNumber.length > 14) {
      throw new HttpsError("invalid-argument", "은행, 계좌번호, 예금주명을 확인해주세요.");
    }
    if (identityNumber.length !== 6 && identityNumber.length !== 10) {
      throw new HttpsError("invalid-argument", "생년월일 6자리 또는 사업자등록번호 10자리를 입력해주세요.");
    }

    const verification = await requestTossBankVerification("/v2/bank-accounts/verify-holder-real-name", {
      bankCode,
      accountNumber,
      holderName,
      identityNumber,
    });
    if ((verification.entityBody?.isValid ?? verification.isValid) !== true) {
      throw new HttpsError("failed-precondition", "계좌번호와 소유자 정보가 일치하지 않습니다.");
    }
    const verifiedHolderName = cleanString(
      verification.entityBody?.holderName ?? verification.holderName,
      50,
    );
    const normalizeHolderName = (value: string) => value.replace(/\s+/g, "").toLocaleLowerCase("ko-KR");
    if (!verifiedHolderName || normalizeHolderName(verifiedHolderName) !== normalizeHolderName(holderName)) {
      throw new HttpsError("failed-precondition", "입력한 예금주명과 인증된 예금주명이 일치하지 않습니다.");
    }

    return {holderName: verifiedHolderName};
  },
);

const isValidBusinessRegistrationNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{10}$/.test(digits)) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0)
    + Math.floor((Number(digits[8]) * 5) / 10);
  return (10 - (sum % 10)) % 10 === Number(digits[9]);
};

const sellerVerificationResponse = (data: FirebaseFirestore.DocumentData | undefined) => {
  const verification = data?.sellerVerification || {};
  return {
    status: ["pending", "approved", "rejected"].includes(verification.status)
      ? verification.status
      : "not_submitted",
    sellerType: verification.sellerType === "individual_creator" ? "individual_creator" : "business",
    businessRegistrationNumber: cleanString(verification.businessRegistrationNumber, 10),
    businessName: cleanString(verification.businessName, 100),
    representativeName: cleanString(verification.representativeName, 50),
    businessAddress: cleanString(verification.businessAddress, 300),
    contactPhone: cleanString(verification.contactPhone, 30),
    contactEmail: cleanString(verification.contactEmail, 100),
    mailOrderRegistrationNumber: cleanString(verification.mailOrderRegistrationNumber, 100),
    mailOrderExemptionReason: cleanString(verification.mailOrderExemptionReason, 300),
    bankName: cleanString(verification.bankName, 50),
    accountHolder: cleanString(verification.accountHolder, 50),
    accountNumber: cleanString(verification.accountNumber, 30),
    shippingPolicy: cleanString(verification.shippingPolicy, 1000),
    prohibitedGoodsAgreed: verification.prohibitedGoodsAgreed === true,
    privacyTermsAgreed: verification.privacyTermsAgreed === true,
    sellerTermsAgreed: verification.sellerTermsAgreed === true,
    creatorDigitalOnlyAgreed: verification.creatorDigitalOnlyAgreed === true,
    creatorBusinessTransitionAgreed: verification.creatorBusinessTransitionAgreed === true,
    creatorTaxResponsibilityAgreed: verification.creatorTaxResponsibilityAgreed === true,
    submittedAt: serializeTimestamp(verification.submittedAt),
    reviewedAt: serializeTimestamp(verification.reviewedAt),
    rejectionReason: cleanString(verification.rejectionReason, 300),
  };
};

export const getSellerVerification = onCall(betaCallableOptions, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  const snapshot = await db.collection("users").doc(request.auth.uid).get();
  return sellerVerificationResponse(snapshot.data());
});

export const submitSellerVerification = onCall(betaCallableOptions, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  const sellerType = request.data?.sellerType === "individual_creator" ? "individual_creator" : "business";
  const businessRegistrationNumber = cleanString(request.data?.businessRegistrationNumber, 20).replace(/\D/g, "");
  const application = {
    sellerType,
    businessRegistrationNumber,
    businessName: cleanString(request.data?.businessName, 100),
    representativeName: cleanString(request.data?.representativeName, 50),
    businessAddress: cleanString(request.data?.businessAddress, 300),
    contactPhone: cleanString(request.data?.contactPhone, 30),
    contactEmail: cleanString(request.data?.contactEmail, 100),
    mailOrderRegistrationNumber: cleanString(request.data?.mailOrderRegistrationNumber, 100),
    mailOrderExemptionReason: cleanString(request.data?.mailOrderExemptionReason, 300),
    bankName: cleanString(request.data?.bankName, 50),
    accountHolder: cleanString(request.data?.accountHolder, 50),
    accountNumber: cleanString(request.data?.accountNumber, 30).replace(/\D/g, ""),
    shippingPolicy: cleanString(request.data?.shippingPolicy, 1000),
    prohibitedGoodsAgreed: request.data?.prohibitedGoodsAgreed === true,
    privacyTermsAgreed: request.data?.privacyTermsAgreed === true,
    sellerTermsAgreed: request.data?.sellerTermsAgreed === true,
    creatorDigitalOnlyAgreed: request.data?.creatorDigitalOnlyAgreed === true,
    creatorBusinessTransitionAgreed: request.data?.creatorBusinessTransitionAgreed === true,
    creatorTaxResponsibilityAgreed: request.data?.creatorTaxResponsibilityAgreed === true,
  };
  if (sellerType === "business" && !isValidBusinessRegistrationNumber(businessRegistrationNumber)) {
    throw new HttpsError("invalid-argument", "유효한 사업자등록번호를 입력해주세요.");
  }
  if (!application.representativeName || !/^\S+@\S+\.\S+$/.test(application.contactEmail)
    || !/^\d{9,15}$/.test(application.contactPhone.replace(/\D/g, ""))
    || !application.bankName || !application.accountHolder || application.accountNumber.length < 8
    || !application.shippingPolicy) {
    throw new HttpsError("invalid-argument", "판매자, 연락처, 정산 및 판매 정책 정보를 모두 확인해주세요.");
  }
  if (sellerType === "business" && (!application.businessName || !application.businessAddress
    || (!application.mailOrderRegistrationNumber && !application.mailOrderExemptionReason))) {
    throw new HttpsError("invalid-argument", "사업자와 통신판매업 정보를 모두 확인해주세요.");
  }
  if (sellerType === "individual_creator" && (!application.creatorDigitalOnlyAgreed
    || !application.creatorBusinessTransitionAgreed || !application.creatorTaxResponsibilityAgreed)) {
    throw new HttpsError("failed-precondition", "개인 크리에이터 판매 조건을 모두 확인해주세요.");
  }
  if (!application.prohibitedGoodsAgreed || !application.privacyTermsAgreed || !application.sellerTermsAgreed) {
    throw new HttpsError("failed-precondition", "판매자 필수 동의 항목을 모두 확인해주세요.");
  }
  const ref = db.collection("users").doc(request.auth.uid);
  await ref.set({
    sellerVerification: {
      ...application,
      status: "pending",
      submittedAt: FieldValue.serverTimestamp(),
      reviewedAt: FieldValue.delete(),
      rejectionReason: FieldValue.delete(),
    },
  }, {merge: true});
  const updated = await ref.get();
  return sellerVerificationResponse(updated.data());
});

export const setSellerVerificationStatus = onCall(betaCallableOptions, async (request) => {
  requireSiteAdmin(request);
  const uid = cleanString(request.data?.uid, 128);
  const status = cleanString(request.data?.status, 20);
  const rejectionReason = cleanString(request.data?.rejectionReason, 300);
  if (!uid || !["approved", "rejected"].includes(status) || (status === "rejected" && !rejectionReason)) {
    throw new HttpsError("invalid-argument", "판매자와 심사 상태를 확인해주세요.");
  }
  const ref = db.collection("users").doc(uid);
  const current = await ref.get();
  if (!current.exists || !["pending", "approved", "rejected"].includes(current.data()?.sellerVerification?.status)) {
    throw new HttpsError("failed-precondition", "접수된 판매자 신청을 찾을 수 없습니다.");
  }
  const batch = db.batch();
  batch.update(ref, {
    "sellerVerification.status": status,
    "sellerVerification.reviewedAt": FieldValue.serverTimestamp(),
    "sellerVerification.rejectionReason": status === "rejected" ? rejectionReason : "",
  });
  if (status === "rejected") {
    const userData = current.data() || {};
    const profileWorkspaces = Array.isArray(userData.profileWorkspaces)
      ? userData.profileWorkspaces.map((workspace: FirebaseFirestore.DocumentData) => ({
        ...workspace,
        profile: workspace?.profile?.storefront ? {
          ...workspace.profile,
          storefront: {...workspace.profile.storefront, checkoutAvailability: "external_only"},
        } : workspace?.profile,
      }))
      : [];
    const privateUpdates: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {};
    if (profileWorkspaces.length > 0) privateUpdates.profileWorkspaces = profileWorkspaces;
    if (userData.profile?.storefront) {
      privateUpdates["profile.storefront.checkoutAvailability"] = "external_only";
    }
    if (Object.keys(privateUpdates).length > 0) batch.update(ref, privateUpdates);
    const publicProfiles = await db.collection("publicProfiles").where("ownerUid", "==", uid).get();
    publicProfiles.docs.forEach((profile) => {
      if (profile.data()?.profile?.storefront) {
        batch.update(profile.ref, {"profile.storefront.checkoutAvailability": "external_only"});
      }
    });
  }
  await batch.commit();
  return {ok: true};
});

const createDigitalDownload = async (
  orderData: FirebaseFirestore.DocumentData,
  orderRef: FirebaseFirestore.DocumentReference,
  orderId: string,
) => {
  if (orderData.salesType !== "digital_file") return {};
  const ownerUid = cleanString(orderData.ownerUid, 128);
  const filePath = cleanString(orderData.filePath, 1024);
  if (!ownerUid || !filePath.startsWith(`digital-products/${ownerUid}/`)) {
    logger.error("Digital order is missing a valid private file path", {orderNumber: orderData.orderNumber});
    return {downloadError: "다운로드 파일 정보를 확인하지 못했습니다. 판매자에게 문의해주세요."};
  }
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const token = randomBytes(32).toString("hex");
  await orderRef.update({
    downloadTokenHash: createHash("sha256").update(token).digest("hex"),
    downloadExpiresAt: Timestamp.fromMillis(expiresAt),
  });
  return {
    downloadUrl: `https://asia-northeast3-profilelinks-d81ec.cloudfunctions.net/downloadDigitalOrder?orderId=${encodeURIComponent(orderId)}&token=${token}`,
    downloadFileName: cleanString(orderData.fileName, 255) || "디지털 상품",
    downloadExpiresAt: new Date(expiresAt).toISOString(),
  };
};

const cleanString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const seoulDayKey = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(date);

const safeStorageFileName = (value: unknown) => {
  const cleaned = cleanString(value, 180).replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned || "file";
};

export const reserveSharedFileUpload = onCall(betaCallableOptions, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  const uid = request.auth.uid;
  const size = Number(request.data?.size || 0);
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new HttpsError("invalid-argument", "파일 크기를 확인할 수 없습니다.");
  }

  const userSnapshot = await db.collection("users").doc(uid).get();
  const userData = userSnapshot.data();
  const maxBytes = sharedFileBytesForUser(userData);
  if (size > maxBytes) {
    throw new HttpsError(
      "resource-exhausted",
      `파일당 업로드 용량(${Math.round(maxBytes / 1024 / 1024)}MB)을 초과했습니다.`,
    );
  }

  const fileName = `${Date.now()}_${randomUUID()}_${safeStorageFileName(request.data?.fileName)}`;
  const filePath = `shared-files/${uid}/${fileName}`;
  if (!isBetaLifetimePremium(userData)) {
    return {filePath, reservationId: null, dailyLimitBytes: null};
  }

  const day = seoulDayKey();
  const usageRef = db.collection("sharedFileUploadUsage").doc(`${uid}_${day}`);
  const reservationRef = db.collection("sharedFileUploadReservations").doc();
  await db.runTransaction(async (transaction) => {
    const usageSnapshot = await transaction.get(usageRef);
    const currentBytes = Number(usageSnapshot.data()?.bytes || 0);
    if (currentBytes + size > BETA_SHARED_FILE_UPLOAD_BYTES_PER_DAY) {
      throw new HttpsError(
        "resource-exhausted",
        "베타 계정의 오늘 파일 업로드 용량 100MB를 모두 사용했습니다. 내일 다시 시도해주세요.",
      );
    }
    transaction.set(usageRef, {
      uid,
      day,
      bytes: currentBytes + size,
      count: Number(usageSnapshot.data()?.count || 0) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    transaction.set(reservationRef, {
      uid,
      day,
      fileName,
      filePath,
      size,
      status: "reserved",
      expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    filePath,
    reservationId: reservationRef.id,
    dailyLimitBytes: BETA_SHARED_FILE_UPLOAD_BYTES_PER_DAY,
  };
});

// Storage triggers must sit in the default bucket's region, not the region the
// rest of this codebase uses. Deploying the whole codebase fails otherwise.
export const finalizeSharedFileUpload = onObjectFinalized(
  {region: "us-east1"},
  async (event) => {
    const filePath = event.data.name || "";
    if (!filePath.startsWith("shared-files/")) return;
    const reservationId = cleanString(event.data.metadata?.linkzipUploadReservation, 128);
    if (!reservationId) return;
    const reservationRef = db.collection("sharedFileUploadReservations").doc(reservationId);
    const reservation = await reservationRef.get();
    if (!reservation.exists || reservation.data()?.filePath !== filePath) return;
    await reservationRef.set({
      status: "used",
      usedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
  },
);

const createOrderNumber = () => {
  const now = new Date();
  const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `LZ-${date}-${randomBytes(5).toString("hex").toUpperCase()}`;
};

const createDonationOrderNumber = () => {
  const now = new Date();
  const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `DN-${date}-${randomBytes(5).toString("hex").toUpperCase()}`;
};

type PaidMembershipPlan = "standard" | "premium";
type MembershipBillingCycle = "monthly" | "annual";

const paidMembershipPlans: Record<PaidMembershipPlan, {name: string; monthlyPrice: number}> = {
  standard: {name: "스탠다드", monthlyPrice: 3900},
  premium: {name: "프리미엄", monthlyPrice: 9900},
};

const createMembershipOrderNumber = () => {
  const now = new Date();
  const date = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `MB-${date}-${randomBytes(5).toString("hex").toUpperCase()}`;
};

const requireAuthenticatedUid = async (request: Request) => {
  const authorization = request.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("UNAUTHENTICATED");
  return (await getAuth().verifyIdToken(match[1])).uid;
};

const requireAuthenticatedUser = async (request: Request) => {
  const authorization = request.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("UNAUTHENTICATED");
  return getAuth().verifyIdToken(match[1]);
};

const membershipPeriodEnd = (billingCycle: MembershipBillingCycle) => {
  const end = new Date();
  if (billingCycle === "annual") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
};

export const createTossMembershipOrder = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 20,
    invoker: "public",
  },
  async (request, response) => {
    if (!setPublicPostCors(request, response)) return;

    let uid = "";
    try {
      uid = await requireAuthenticatedUid(request);
    } catch {
      response.status(401).json({message: "로그인 후 플랜을 결제해주세요."});
      return;
    }

    const planId = cleanString(request.body?.planId, 20) as PaidMembershipPlan;
    const billingCycle = cleanString(request.body?.billingCycle, 20) as MembershipBillingCycle;
    const paymentProvider = request.body?.paymentProvider === "bank_transfer" ? "bank_transfer" : "toss";
    const depositorName = cleanString(request.body?.depositorName, 50);
    const buyerContact = cleanString(request.body?.buyerContact, 50);
    const plan = paidMembershipPlans[planId];
    if (!plan || (billingCycle !== "monthly" && billingCycle !== "annual")) {
      response.status(400).json({message: "플랜 또는 결제 기간을 확인해주세요."});
      return;
    }
    if (paymentProvider === "bank_transfer" && (!depositorName || !/^\d{9,15}$/.test(buyerContact.replace(/\D/g, "")))) {
      response.status(400).json({message: "입금자명과 알림을 받을 휴대폰 번호를 확인해주세요."});
      return;
    }

    const bankAccount = paymentProvider === "bank_transfer" ? await getPlatformBankAccount() : null;
    if (paymentProvider === "bank_transfer" && !bankAccount) {
      response.status(503).json({message: "사이트 정산 계좌가 아직 설정되지 않았습니다. 관리자에게 문의해주세요."});
      return;
    }

    const amount = billingCycle === "annual" ? plan.monthlyPrice * 10 : plan.monthlyPrice;
    const orderNumber = createMembershipOrderNumber();
    const orderName = `LinkZip ${plan.name} ${billingCycle === "annual" ? "연간" : "월간"} 이용권`;
    const expiresAt = bankTransferExpiresAt();
    await db.collection("tossPaymentOrders").doc(orderNumber).create({
      kind: "membership",
      ownerUid: uid,
      planId,
      planName: plan.name,
      billingCycle,
      productName: orderName,
      amount,
      paymentProvider,
      depositorName: paymentProvider === "bank_transfer" ? depositorName : "",
      buyerContact: paymentProvider === "bank_transfer" ? buyerContact : "",
      status: paymentProvider === "bank_transfer" ? "WAITING_DEPOSIT" : "READY",
      idempotencyKey: randomUUID(),
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });

    response.status(201).json({
      orderNumber,
      orderName,
      amount,
      ...(paymentProvider === "bank_transfer" && bankAccount
        ? bankTransferResponse(bankAccount, depositorName, expiresAt)
        : {paymentProvider: "toss"}),
    });
  },
);

export const confirmTossMembershipPayment = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    invoker: "public",
    secrets: [tossSecretKey],
  },
  async (request, response) => {
    if (!setPublicPostCors(request, response)) return;

    let uid = "";
    try {
      uid = await requireAuthenticatedUid(request);
    } catch {
      response.status(401).json({message: "로그인 정보가 만료되었습니다. 다시 로그인해주세요."});
      return;
    }

    const paymentKey = cleanString(request.body?.paymentKey, 200);
    const orderId = cleanString(request.body?.orderId, 64).toUpperCase();
    const returnedAmount = request.body?.amount;
    if (!paymentKey || !/^MB-\d{8}-[A-F0-9]{10}$/.test(orderId) || !Number.isSafeInteger(returnedAmount)) {
      response.status(400).json({message: "결제 승인 정보가 올바르지 않습니다."});
      return;
    }

    const orderRef = db.collection("tossPaymentOrders").doc(orderId);
    let orderData: FirebaseFirestore.DocumentData | undefined;
    try {
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        orderData = snapshot.data();
        if (!snapshot.exists || !orderData || orderData.kind !== "membership") throw new Error("ORDER_NOT_FOUND");
        if (orderData.ownerUid !== uid) throw new Error("FORBIDDEN");
        if (orderData.amount !== returnedAmount) throw new Error("AMOUNT_MISMATCH");
        if (orderData.status === "PAID") return;
        if (orderData.status !== "READY" && orderData.status !== "CONFIRMING") throw new Error("ORDER_INVALID_STATUS");
        if (orderData.status === "READY") {
          transaction.update(orderRef, {status: "CONFIRMING", confirmingAt: FieldValue.serverTimestamp()});
        }
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const status = code === "FORBIDDEN" ? 403 : 400;
      const message = code === "AMOUNT_MISMATCH"
        ? "결제 금액이 주문 금액과 일치하지 않습니다."
        : code === "FORBIDDEN" ? "본인의 플랜 주문만 승인할 수 있습니다."
          : code === "ORDER_INVALID_STATUS" ? "결제할 수 없는 주문 상태입니다." : "플랜 주문을 찾을 수 없습니다.";
      response.status(status).json({message});
      return;
    }

    if (!orderData) {
      response.status(404).json({message: "플랜 주문을 찾을 수 없습니다."});
      return;
    }
    const existingEnd = orderData.periodEndsAt instanceof Timestamp ? orderData.periodEndsAt.toDate() : null;
    if (orderData.status === "PAID") {
      response.status(200).json({
        planId: orderData.planId,
        planName: orderData.planName,
        billingCycle: orderData.billingCycle,
        amount: orderData.amount,
        orderNumber: orderId,
        periodEndsAt: existingEnd?.toISOString() || "",
        approvedAt: orderData.approvedAt || null,
      });
      return;
    }

    const authorization = Buffer.from(`${tossSecretKey.value()}:`, "utf8").toString("base64");
    let tossResponse: globalThis.Response;
    try {
      tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/json",
          "Idempotency-Key": String(orderData.idempotencyKey),
        },
        body: JSON.stringify({paymentKey, orderId, amount: orderData.amount}),
      });
    } catch (error) {
      await orderRef.update({status: "READY", lastErrorAt: FieldValue.serverTimestamp()});
      logger.error("Toss membership confirmation network error", {orderId, error});
      response.status(502).json({message: "결제 승인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요."});
      return;
    }

    const tossResult = await tossResponse.json() as Record<string, unknown>;
    if (!tossResponse.ok) {
      await orderRef.update({
        status: "READY",
        lastErrorCode: typeof tossResult.code === "string" ? tossResult.code : "UNKNOWN",
        lastErrorAt: FieldValue.serverTimestamp(),
      });
      response.status(tossResponse.status >= 500 ? 502 : 400).json({
        message: typeof tossResult.message === "string" ? tossResult.message : "결제를 승인하지 못했습니다.",
      });
      return;
    }
    if (tossResult.orderId !== orderId || tossResult.totalAmount !== orderData.amount) {
      logger.error("Toss membership response did not match the order", {orderId});
      response.status(502).json({message: "결제 승인 결과를 확인하지 못했습니다. 고객센터에 문의해주세요."});
      return;
    }

    const periodStartedAt = new Date();
    const periodEndsAt = membershipPeriodEnd(orderData.billingCycle as MembershipBillingCycle);
    const paymentMethod = typeof tossResult.method === "string" ? tossResult.method : "";
    const approvedAt = typeof tossResult.approvedAt === "string" ? tossResult.approvedAt : null;
    await db.runTransaction(async (transaction) => {
      transaction.update(orderRef, {
        status: "PAID",
        paymentKey,
        paymentMethod,
        approvedAt,
        periodStartedAt: Timestamp.fromDate(periodStartedAt),
        periodEndsAt: Timestamp.fromDate(periodEndsAt),
        paidAt: FieldValue.serverTimestamp(),
      });
      transaction.set(db.collection("users").doc(uid), {
        membershipPlan: orderData?.planId,
        membershipBillingCycle: orderData?.billingCycle,
        membershipPeriodStartedAt: Timestamp.fromDate(periodStartedAt),
        membershipPeriodEndsAt: Timestamp.fromDate(periodEndsAt),
        membershipPaymentProvider: "toss",
        membershipUpdatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});
    });
    await syncProfilePlanVisibility(uid, orderData.planId as MembershipPlan);

    response.status(200).json({
      planId: orderData.planId,
      planName: orderData.planName,
      billingCycle: orderData.billingCycle,
      amount: orderData.amount,
      orderNumber: orderId,
      periodEndsAt: periodEndsAt.toISOString(),
      approvedAt,
    });
  },
);

export const createTossSalesOrder = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 20,
    invoker: "public",
  },
  async (request, response) => {
    if (!setPublicPostCors(request, response)) return;

    const ownerUid = cleanString(request.body?.ownerUid, 128);
    const targetUsername = cleanString(request.body?.targetUsername, 30).toLowerCase();
    const blockId = cleanString(request.body?.blockId, 128);
    const productId = cleanString(request.body?.productId, 128);
    const buyerName = cleanString(request.body?.buyerName, 50);
    const buyerContact = cleanString(request.body?.buyerContact, 50);
    const buyerEmail = cleanString(request.body?.buyerEmail, 100);
    const shippingAddress = cleanString(request.body?.shippingAddress, 300);
    const postalCode = cleanString(request.body?.postalCode, 10);
    const orderRequest = cleanString(request.body?.orderRequest, 100);
    const quantity = Number(request.body?.quantity ?? 1);
    const paymentProvider = request.body?.paymentProvider === "bank_transfer" ? "bank_transfer" : "toss";
    const depositorName = cleanString(request.body?.depositorName, 50) || buyerName;
    const normalizedPhone = buyerContact.replace(/\D/g, "");

    if (!/^[A-Za-z0-9_-]{6,128}$/.test(ownerUid) || !/^[\p{L}\p{N}._-]{3,30}$/u.test(targetUsername) || !blockId || !productId) {
      response.status(400).json({message: "상품 정보를 확인해주세요."});
      return;
    }
    if (!buyerName || !/^\d{9,15}$/.test(normalizedPhone)) {
      response.status(400).json({message: "구매자 이름과 휴대폰 번호를 확인해주세요."});
      return;
    }

    const usernameSnapshot = await db.collection("usernames").doc(targetUsername).get();
    const usernameData = usernameSnapshot.data();
    if (!usernameSnapshot.exists || usernameData?.uid !== ownerUid) {
      response.status(404).json({message: "판매자 프로필을 찾을 수 없습니다."});
      return;
    }
    const publicProfileId = typeof usernameData.publicProfileId === "string" ? usernameData.publicProfileId : ownerUid;
    const publicProfileSnapshot = await db.collection("publicProfiles").doc(publicProfileId).get();
    const publicProfile = publicProfileSnapshot.data();
    if (!publicProfileSnapshot.exists || publicProfile?.ownerUid !== ownerUid) {
      response.status(404).json({message: "판매자 프로필을 찾을 수 없습니다."});
      return;
    }

    let block = findPublicLink(publicProfile.customLinks, blockId);
    const publicStorefront = publicProfile.profile?.storefront;
    const storefrontProducts = Array.isArray(publicStorefront?.products)
      ? publicStorefront.products as PublicSalesProduct[]
      : [];
    const storefrontProduct = publicStorefront?.enabled !== false && blockId === `store-${productId}`
      ? storefrontProducts.find((item) => item?.id === productId)
      : undefined;
    const isStorefrontOrder = Boolean(storefrontProduct);
    if (!block && storefrontProduct) {
      block = {
        id: blockId,
        type: "sales",
        isVisible: true,
        salesConfig: {
          salesType: "product",
          products: [storefrontProduct],
        },
      };
    }
    if (!block || block.type !== "sales" || block.isVisible === false) {
      response.status(404).json({message: "판매 중인 상품을 찾을 수 없습니다."});
      return;
    }
    const salesType = block.salesConfig?.salesType === "digital_file" ? "digital_file" : "product";
    if (salesType === "digital_file" && !buyerEmail) {
      response.status(400).json({message: "파일을 받을 이메일을 입력해주세요."});
      return;
    }
    if (salesType === "product" && (!shippingAddress || !postalCode)) {
      response.status(400).json({message: "배송지 주소를 입력해주세요."});
      return;
    }

    const products = Array.isArray(block.salesConfig?.products)
      ? block.salesConfig.products as PublicSalesProduct[]
      : [];
    const product = products.find((item) => item?.id === productId);
    const rawAmount = product?.discountPrice ?? product?.price;
    const unitPrice = typeof rawAmount === "number" ? rawAmount : Number.NaN;
    const shippingFee = salesType === "product" && typeof product?.shippingFee === "number"
      ? Math.max(0, Math.round(product.shippingFee))
      : 0;
    const productAmount = Number.isSafeInteger(unitPrice) && Number.isSafeInteger(quantity)
      ? unitPrice * quantity
      : Number.NaN;
    const amount = Number.isSafeInteger(productAmount) ? productAmount + shippingFee : Number.NaN;
    const productName = cleanString(product?.name, 100);
    const stock = typeof product?.stock === "number" ? Math.max(0, Math.floor(product.stock)) : null;
    if (!product || !productName || !Number.isSafeInteger(unitPrice) || unitPrice < 100 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10 || (stock !== null && quantity > stock) || !Number.isSafeInteger(amount) || amount < 100) {
      response.status(400).json({message: "상품 가격 정보를 확인해주세요."});
      return;
    }

    const previousOrdersSnapshot = await db.collection("users").doc(ownerUid)
      .collection("sales_orders")
      .where("buyerContactNormalized", "==", normalizedPhone)
      .limit(50)
      .get();
    const matchingOrders = previousOrdersSnapshot.docs
      .map((document) => document.data())
      .filter((order) => order.productId === productId && order.targetUsername === targetUsername);
    if (salesType === "digital_file" && matchingOrders.some((order) => order.status === "paid")) {
      response.status(409).json({message: "이미 구매한 상품입니다. 주문조회에서 다운로드 또는 배송 상태를 확인해주세요."});
      return;
    }
    const recentPendingOrder = matchingOrders.some((order) => {
      if (order.status !== "pending") return false;
      const createdAt = order.createdAt;
      return createdAt instanceof Timestamp && createdAt.toMillis() > Date.now() - 30 * 60 * 1000;
    });
    if (recentPendingOrder) {
      response.status(409).json({message: "같은 상품의 결제가 이미 진행 중입니다. 주문조회에서 상태를 확인하거나 30분 후 다시 시도해주세요."});
      return;
    }

    const privateUserSnapshot = await db.collection("users").doc(ownerUid).get();
    if (paymentProvider === "toss") {
      const paymentSettings = await db.collection("platformSettings").doc("payment").get();
      if (paymentSettings.data()?.marketplaceSellerSettlementEnabled !== true) {
        response.status(503).json({message: "판매자별 정산 계약을 준비 중입니다. 현재는 판매자 계좌이체 또는 외부 구매 링크를 이용해주세요."});
        return;
      }
    }
    const {plan: sellerPlan, entitlements: sellerEntitlements} = entitlementsForUser(privateUserSnapshot.data());
    const privateProfileLinks = findPrivateProfileLinks(privateUserSnapshot.data(), targetUsername);
    if (!isStorefrontOrder && !productWithinPlanLimit(privateProfileLinks, blockId, productId, sellerEntitlements.maxProductsPerProfile)) {
      response.status(403).json({message: sellerEntitlements.maxProductsPerProfile === null
        ? "판매 상품 정보를 확인할 수 없습니다."
        : `현재 플랜에서는 프로필당 상품을 최대 ${sellerEntitlements.maxProductsPerProfile}개까지 판매할 수 있습니다.`});
      return;
    }
    const platformFeePercent = sellerEntitlements.salesFeePercent;
    const platformFeeAmount = platformFeeFor(amount, platformFeePercent);
    const sellerNetAmount = amount - platformFeeAmount;
    const bankAccount = paymentProvider === "bank_transfer"
      ? findVerifiedAccount(privateUserSnapshot.data(), targetUsername)
      : null;
    if (paymentProvider === "bank_transfer" && !bankAccount) {
      response.status(503).json({message: "판매자의 입금 계좌가 아직 설정되지 않았습니다."});
      return;
    }

    let filePath = "";
    let fileName = "";
    if (salesType === "digital_file") {
      const privateBlock = findPublicLink(
        findPrivateProfileLinks(privateUserSnapshot.data(), targetUsername),
        blockId,
      );
      const privateProducts = Array.isArray(privateBlock?.salesConfig?.products)
        ? privateBlock.salesConfig.products as PublicSalesProduct[]
        : [];
      const privateProduct = privateProducts.find((item) => item?.id === productId);
      filePath = cleanString(privateProduct?.filePath, 1024);
      fileName = cleanString(privateProduct?.fileName, 255);
      if (!filePath.startsWith(`digital-products/${ownerUid}/`)) {
        response.status(400).json({message: "판매 파일이 등록되지 않았습니다. 파일을 다시 업로드해주세요."});
        return;
      }
    }

    const orderNumber = createOrderNumber();
    const salesOrderRef = db.collection("users").doc(ownerUid).collection("sales_orders").doc();
    const paymentOrderRef = db.collection("tossPaymentOrders").doc(orderNumber);
    const idempotencyKey = randomUUID();
    const orderName = productName.slice(0, 100);
    const expiresAt = bankTransferExpiresAt();
    await db.runTransaction(async (transaction) => {
      transaction.create(salesOrderRef, {
        blockId,
        targetUsername,
        productId,
        productName,
        amount,
        quantity,
        productAmount,
        shippingFee,
        sellerPlan,
        platformFeePercent,
        platformFeeAmount,
        sellerNetAmount,
        salesType,
        buyerName,
        buyerContact,
        buyerEmail,
        shippingAddress: salesType === "product" ? shippingAddress : "",
        postalCode: salesType === "product" ? postalCode : "",
        orderRequest: salesType === "product" ? orderRequest : "",
        orderNumber,
        buyerContactNormalized: normalizedPhone,
        status: "pending",
        fulfillmentStatus: "payment_pending",
        carrier: "",
        trackingNumber: "",
        paymentProvider,
        depositorName: paymentProvider === "bank_transfer" ? depositorName : "",
        ...(salesType === "digital_file" ? {fileName} : {}),
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.create(paymentOrderRef, {
        ownerUid,
        salesOrderId: salesOrderRef.id,
        targetUsername,
        productName,
        amount,
        quantity,
        productAmount,
        shippingFee,
        sellerPlan,
        platformFeePercent,
        platformFeeAmount,
        sellerNetAmount,
        salesType,
        kind: "sales",
        paymentProvider,
        depositorName: paymentProvider === "bank_transfer" ? depositorName : "",
        buyerContact,
        buyerEmail,
        ...(salesType === "digital_file" ? {filePath, fileName} : {}),
        status: paymentProvider === "bank_transfer" ? "WAITING_DEPOSIT" : "READY",
        idempotencyKey,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt,
      });
    });

    response.status(201).json({
      id: salesOrderRef.id,
      orderNumber,
      amount,
      orderName,
      ...(paymentProvider === "bank_transfer" && bankAccount
        ? bankTransferResponse(bankAccount, depositorName, expiresAt)
        : {paymentProvider: "toss"}),
    });
  },
);

export const createTossDonationOrder = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 20,
    invoker: "public",
  },
  async (request, response) => {
    if (!setPublicPostCors(request, response)) return;

    const ownerUid = cleanString(request.body?.ownerUid, 128);
    const targetUsername = cleanString(request.body?.targetUsername, 30).toLowerCase();
    const blockId = cleanString(request.body?.blockId, 128);
    const nickname = cleanString(request.body?.nickname, 50) || "익명 후원자";
    const message = cleanString(request.body?.message, 300);
    const buyerContact = cleanString(request.body?.buyerContact, 50);
    const paymentProvider = request.body?.paymentProvider === "bank_transfer" ? "bank_transfer" : "toss";
    const depositorName = cleanString(request.body?.depositorName, 50) || nickname;
    const requestedAmount = request.body?.amount;

    if (!/^[A-Za-z0-9_-]{6,128}$/.test(ownerUid) || !/^[\p{L}\p{N}._-]{3,30}$/u.test(targetUsername) || !blockId) {
      response.status(400).json({message: "후원받을 프로필 정보를 확인해주세요."});
      return;
    }
    if (!Number.isSafeInteger(requestedAmount) || requestedAmount > 10000000) {
      response.status(400).json({message: "후원 금액을 확인해주세요."});
      return;
    }
    if (paymentProvider === "bank_transfer" && !/^\d{9,15}$/.test(buyerContact.replace(/\D/g, ""))) {
      response.status(400).json({message: "입금 확인 알림을 받을 휴대폰 번호를 입력해주세요."});
      return;
    }

    const usernameSnapshot = await db.collection("usernames").doc(targetUsername).get();
    const usernameData = usernameSnapshot.data();
    if (!usernameSnapshot.exists || usernameData?.uid !== ownerUid) {
      response.status(404).json({message: "후원받을 프로필을 찾을 수 없습니다."});
      return;
    }
    const publicProfileId = typeof usernameData.publicProfileId === "string" ? usernameData.publicProfileId : ownerUid;
    const publicProfileSnapshot = await db.collection("publicProfiles").doc(publicProfileId).get();
    const publicProfile = publicProfileSnapshot.data();
    if (!publicProfileSnapshot.exists || publicProfile?.ownerUid !== ownerUid) {
      response.status(404).json({message: "후원받을 프로필을 찾을 수 없습니다."});
      return;
    }

    const block = findPublicLink(publicProfile.customLinks, blockId);
    if (!block || block.type !== "donation" || block.isVisible === false) {
      response.status(404).json({message: "후원 블록을 찾을 수 없습니다."});
      return;
    }
    const configuredMinimum = block.donationConfig?.minAmount;
    const minAmount = typeof configuredMinimum === "number" && Number.isSafeInteger(configuredMinimum)
      ? Math.max(configuredMinimum, 100)
      : 1000;
    if (requestedAmount < minAmount) {
      response.status(400).json({message: `최소 후원 금액은 ${minAmount.toLocaleString("ko-KR")}원입니다.`});
      return;
    }

    const orderNumber = createDonationOrderNumber();
    const donationRecordRef = db.collection("users").doc(ownerUid).collection("donations").doc();
    const paymentOrderRef = db.collection("tossPaymentOrders").doc(orderNumber);
    const idempotencyKey = randomUUID();
    const configuredName = cleanString(block.donationConfig?.mainText, 100);
    const orderName = configuredName || "도네이션";
    const privateUserSnapshot = await db.collection("users").doc(ownerUid).get();
    const {plan: sellerPlan, entitlements: sellerEntitlements} = entitlementsForUser(privateUserSnapshot.data());
    const platformFeePercent = sellerEntitlements.salesFeePercent;
    const platformFeeAmount = platformFeeFor(requestedAmount, platformFeePercent);
    const sellerNetAmount = requestedAmount - platformFeeAmount;
    const bankAccount = paymentProvider === "bank_transfer"
      ? findVerifiedAccount(privateUserSnapshot.data(), targetUsername)
      : null;
    if (paymentProvider === "bank_transfer" && !bankAccount) {
      response.status(503).json({message: "후원받을 계좌가 아직 설정되지 않았습니다."});
      return;
    }
    const expiresAt = bankTransferExpiresAt();
    await paymentOrderRef.create({
      kind: "donation",
      ownerUid,
      donationRecordId: donationRecordRef.id,
      blockId,
      targetUsername,
      nickname,
      message,
      productName: orderName,
      amount: requestedAmount,
      sellerPlan,
      platformFeePercent,
      platformFeeAmount,
      sellerNetAmount,
      paymentProvider,
      depositorName: paymentProvider === "bank_transfer" ? depositorName : "",
      buyerContact: paymentProvider === "bank_transfer" ? buyerContact : "",
      status: paymentProvider === "bank_transfer" ? "WAITING_DEPOSIT" : "READY",
      idempotencyKey,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });

    response.status(201).json({
      orderNumber,
      amount: requestedAmount,
      orderName,
      ...(paymentProvider === "bank_transfer" && bankAccount
        ? bankTransferResponse(bankAccount, depositorName, expiresAt)
        : {paymentProvider: "toss"}),
    });
  },
);

export const confirmTossSalesPayment = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    invoker: "public",
    secrets: [tossSecretKey],
  },
  async (request, response) => {
    if (!setPublicPostCors(request, response)) return;

    const paymentKey = cleanString(request.body?.paymentKey, 200);
    const orderId = cleanString(request.body?.orderId, 64).toUpperCase();
    const returnedAmount = request.body?.amount;
    if (!paymentKey || !/^(?:LZ|DN)-\d{8}-[A-F0-9]{10}$/.test(orderId) || !Number.isSafeInteger(returnedAmount)) {
      response.status(400).json({message: "결제 승인 정보가 올바르지 않습니다."});
      return;
    }

    const orderRef = db.collection("tossPaymentOrders").doc(orderId);
    let orderData: FirebaseFirestore.DocumentData | undefined;
    try {
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(orderRef);
        orderData = snapshot.data();
        if (!snapshot.exists || !orderData) throw new Error("ORDER_NOT_FOUND");
        if (orderData.status === "PAID") return;
        if (orderData.status !== "READY" && orderData.status !== "CONFIRMING") {
          throw new Error("ORDER_INVALID_STATUS");
        }
        if (orderData.amount !== returnedAmount) throw new Error("AMOUNT_MISMATCH");
        if (orderData.status === "READY") {
          transaction.update(orderRef, {status: "CONFIRMING", confirmingAt: FieldValue.serverTimestamp()});
        }
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const message = code === "AMOUNT_MISMATCH"
        ? "결제 금액이 주문 금액과 일치하지 않습니다."
        : code === "ORDER_INVALID_STATUS" ? "결제할 수 없는 주문 상태입니다." : "주문을 찾을 수 없습니다.";
      response.status(400).json({message});
      return;
    }

    if (!orderData) {
      response.status(404).json({message: "주문을 찾을 수 없습니다."});
      return;
    }
    if (orderData.status === "PAID") {
      const digitalDownload = await createDigitalDownload(orderData, orderRef, orderId);
      response.status(200).json({
        kind: orderData.kind || "sales",
        orderNumber: orderId,
        productName: orderData.productName,
        amount: orderData.amount,
        nickname: orderData.nickname || "",
        method: orderData.paymentMethod || "",
        approvedAt: orderData.approvedAt || null,
        targetUsername: orderData.targetUsername,
        ...digitalDownload,
      });
      return;
    }

    const authorization = Buffer.from(`${tossSecretKey.value()}:`, "utf8").toString("base64");
    let tossResponse: globalThis.Response;
    try {
      tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/json",
          "Idempotency-Key": String(orderData.idempotencyKey),
        },
        body: JSON.stringify({paymentKey, orderId, amount: orderData.amount}),
      });
    } catch (error) {
      await orderRef.update({status: "READY", lastErrorAt: FieldValue.serverTimestamp()});
      logger.error("Toss payment confirmation network error", {orderId, error});
      response.status(502).json({message: "결제 승인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요."});
      return;
    }

    const tossResult = await tossResponse.json() as Record<string, unknown>;
    if (!tossResponse.ok) {
      await orderRef.update({
        status: "READY",
        lastErrorCode: typeof tossResult.code === "string" ? tossResult.code : "UNKNOWN",
        lastErrorAt: FieldValue.serverTimestamp(),
      });
      response.status(tossResponse.status >= 500 ? 502 : 400).json({
        message: typeof tossResult.message === "string" ? tossResult.message : "결제를 승인하지 못했습니다.",
      });
      return;
    }

    if (tossResult.orderId !== orderId || tossResult.totalAmount !== orderData.amount) {
      logger.error("Toss payment response did not match the stored order", {orderId});
      response.status(502).json({message: "결제 승인 결과를 확인하지 못했습니다. 고객센터에 문의해주세요."});
      return;
    }

    const ownerUid = String(orderData.ownerUid);
    const paymentMethod = typeof tossResult.method === "string" ? tossResult.method : "";
    const approvedAt = typeof tossResult.approvedAt === "string" ? tossResult.approvedAt : null;
    if (orderData.kind === "donation") {
      const donationRecordId = String(orderData.donationRecordId);
      const donationRef = db.collection("users").doc(ownerUid).collection("donations").doc(donationRecordId);
      const publicDonationRef = db.collection("users").doc(ownerUid).collection("publicDonations").doc(donationRecordId);
      const donationRecord = {
        blockId: orderData.blockId,
        targetUsername: orderData.targetUsername,
        nickname: orderData.nickname,
        message: orderData.message,
        amount: orderData.amount,
        sellerPlan: orderData.sellerPlan,
        platformFeePercent: orderData.platformFeePercent,
        platformFeeAmount: orderData.platformFeeAmount,
        sellerNetAmount: orderData.sellerNetAmount,
        paymentId: orderId,
        paymentProvider: "toss",
        createdAt: FieldValue.serverTimestamp(),
      };
      await db.runTransaction(async (transaction) => {
        transaction.update(orderRef, {
          status: "PAID",
          paymentKey,
          paymentMethod,
          approvedAt,
          paidAt: FieldValue.serverTimestamp(),
        });
        transaction.set(donationRef, donationRecord);
        transaction.set(publicDonationRef, {
          blockId: donationRecord.blockId,
          targetUsername: donationRecord.targetUsername,
          nickname: donationRecord.nickname,
          message: donationRecord.message,
          amount: donationRecord.amount,
          createdAt: FieldValue.serverTimestamp(),
        });
        writePlatformFeeLedger(transaction, orderId, ownerUid, orderData, "toss");
      });
    } else {
      const salesOrderId = String(orderData.salesOrderId);
      const salesOrderRef = db.collection("users").doc(ownerUid).collection("sales_orders").doc(salesOrderId);
      await db.runTransaction(async (transaction) => {
        transaction.update(orderRef, {
          status: "PAID",
          paymentKey,
          paymentMethod,
          approvedAt,
          paidAt: FieldValue.serverTimestamp(),
        });
        transaction.update(salesOrderRef, {
          status: "paid",
          fulfillmentStatus: "preparing",
          paymentProvider: "toss",
          paymentMethod,
          paidAt: approvedAt,
        });
        writePlatformFeeLedger(transaction, orderId, ownerUid, orderData, "toss");
      });
    }

    response.status(200).json({
      kind: orderData.kind || "sales",
      orderNumber: orderId,
      productName: orderData.productName,
      amount: orderData.amount,
      nickname: orderData.nickname || "",
      method: paymentMethod,
      approvedAt,
      targetUsername: orderData.targetUsername,
      ...await createDigitalDownload({...orderData, status: "PAID"}, orderRef, orderId),
    });
  },
);

const enqueueBankTransferNotification = async (
  orderNumber: string,
  orderData: FirebaseFirestore.DocumentData,
) => {
  const phone = cleanString(orderData.buyerContact, 50).replace(/\D/g, "");
  if (!phone) return;
  await db.collection("paymentNotifications").doc(`${orderNumber}-paid`).set({
    event: "bank_transfer_confirmed",
    channel: "alimtalk",
    orderNumber,
    kind: orderData.kind || "sales",
    recipientPhone: phone,
    templateVariables: {
      orderNumber,
      productName: cleanString(orderData.productName, 100),
      amount: Number(orderData.amount) || 0,
    },
    status: "pending_configuration",
    createdAt: FieldValue.serverTimestamp(),
  }, {merge: true});
};

const manageableBankTransferStatuses = new Set(["WAITING_DEPOSIT", "DEPOSIT_REPORTED"]);

export const reportBankTransferDeposit = onRequest(
  {region: "asia-northeast3", memory: "256MiB", timeoutSeconds: 20, invoker: "public"},
  async (request, response) => {
    if (!setPublicPostCors(request, response)) return;
    const orderNumber = cleanString(request.body?.orderNumber, 64).toUpperCase();
    const buyerContact = cleanString(request.body?.buyerContact, 50).replace(/\D/g, "");
    if (!/^(?:LZ|DN|MB)-\d{8}-[A-F0-9]{10}$/.test(orderNumber) || !/^\d{9,15}$/.test(buyerContact)) {
      response.status(400).json({message: "주문번호와 주문 시 입력한 휴대폰 번호를 확인해주세요."});
      return;
    }

    const orderRef = db.collection("tossPaymentOrders").doc(orderNumber);
    const snapshot = await orderRef.get();
    const orderData = snapshot.data();
    const storedContact = cleanString(orderData?.buyerContact, 50).replace(/\D/g, "");
    if (!snapshot.exists || !orderData || orderData.paymentProvider !== "bank_transfer" || storedContact !== buyerContact) {
      response.status(404).json({message: "일치하는 계좌이체 주문을 찾을 수 없습니다."});
      return;
    }
    if (orderData.status === "DEPOSIT_REPORTED") {
      response.status(200).json({orderNumber, status: "DEPOSIT_REPORTED", alreadyReported: true});
      return;
    }
    if (orderData.status !== "WAITING_DEPOSIT") {
      response.status(400).json({message: "입금 확인을 요청할 수 없는 주문 상태입니다."});
      return;
    }
    const expiresAt = orderData.expiresAt instanceof Timestamp ? orderData.expiresAt.toMillis() : 0;
    if (expiresAt > 0 && expiresAt <= Date.now()) {
      await orderRef.update({status: "EXPIRED", expiredAt: FieldValue.serverTimestamp()});
      response.status(400).json({message: "입금 기한이 지난 주문입니다."});
      return;
    }
    await orderRef.update({
      status: "DEPOSIT_REPORTED",
      depositReportedAt: FieldValue.serverTimestamp(),
    });
    response.status(200).json({orderNumber, status: "DEPOSIT_REPORTED"});
  },
);

export const manageBankTransferOrder = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    invoker: "public",
  },
  async (request, response) => {
    if (!setPublicPostCors(request, response)) return;
    let caller: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
    try {
      caller = await requireAuthenticatedUser(request);
    } catch {
      response.status(401).json({message: "로그인이 필요합니다."});
      return;
    }

    const orderNumber = cleanString(request.body?.orderNumber, 64).toUpperCase();
    const requestedAction = request.body?.action;
    const action = requestedAction === "cancel" || requestedAction === "restore" ? requestedAction : "confirm";
    if (!/^(?:LZ|DN|MB)-\d{8}-[A-F0-9]{10}$/.test(orderNumber)) {
      response.status(400).json({message: "주문번호를 확인해주세요."});
      return;
    }
    const orderRef = db.collection("tossPaymentOrders").doc(orderNumber);
    const snapshot = await orderRef.get();
    const orderData = snapshot.data();
    if (!snapshot.exists || !orderData || orderData.paymentProvider !== "bank_transfer") {
      response.status(404).json({message: "계좌이체 주문을 찾을 수 없습니다."});
      return;
    }
    const canManage = orderData.kind === "membership"
      ? isSiteAdmin(caller as unknown as Record<string, unknown>)
      : orderData.ownerUid === caller.uid;
    if (!canManage) {
      response.status(403).json({message: "이 주문을 처리할 권한이 없습니다."});
      return;
    }
    if (action === "restore") {
      if (orderData.status !== "CANCELLED") {
        response.status(400).json({message: "취소된 주문만 입금 대기로 되돌릴 수 있습니다."});
        return;
      }
      const ownerUid = cleanString(orderData.ownerUid, 128);
      const salesOrderRef = orderData.salesOrderId
        ? db.collection("users").doc(ownerUid).collection("sales_orders").doc(String(orderData.salesOrderId))
        : null;
      try {
        await db.runTransaction(async (transaction) => {
          const current = await transaction.get(orderRef);
          if (current.data()?.status !== "CANCELLED") throw new Error("ORDER_ALREADY_PROCESSED");
          transaction.update(orderRef, {
            status: "WAITING_DEPOSIT",
            expiresAt: bankTransferExpiresAt(),
            cancelledAt: FieldValue.delete(),
            depositReportedAt: FieldValue.delete(),
          });
          if (salesOrderRef) transaction.update(salesOrderRef, {status: "pending"});
        });
      } catch (error) {
        if (error instanceof Error && error.message === "ORDER_ALREADY_PROCESSED") {
          response.status(409).json({message: "이미 상태가 변경된 주문입니다."});
          return;
        }
        throw error;
      }
      response.status(200).json({orderNumber, status: "WAITING_DEPOSIT"});
      return;
    }
    if (orderData.status === "PAID" && action === "confirm") {
      response.status(200).json({orderNumber, status: "PAID", alreadyProcessed: true});
      return;
    }
    if (!manageableBankTransferStatuses.has(orderData.status)) {
      response.status(400).json({message: "처리할 수 없는 주문 상태입니다."});
      return;
    }
    const expiresAt = orderData.expiresAt instanceof Timestamp ? orderData.expiresAt.toMillis() : 0;
    if (action === "confirm" && expiresAt > 0 && expiresAt <= Date.now()) {
      await orderRef.update({status: "EXPIRED", expiredAt: FieldValue.serverTimestamp()});
      response.status(400).json({message: "입금 기한이 지난 주문입니다."});
      return;
    }

    const ownerUid = cleanString(orderData.ownerUid, 128);
    const salesOrderRef = orderData.salesOrderId
      ? db.collection("users").doc(ownerUid).collection("sales_orders").doc(String(orderData.salesOrderId))
      : null;
    if (action === "cancel") {
      try {
        await db.runTransaction(async (transaction) => {
          const current = await transaction.get(orderRef);
          if (!manageableBankTransferStatuses.has(current.data()?.status)) throw new Error("ORDER_ALREADY_PROCESSED");
          transaction.update(orderRef, {status: "CANCELLED", cancelledAt: FieldValue.serverTimestamp()});
          if (salesOrderRef) transaction.update(salesOrderRef, {status: "cancelled"});
        });
      } catch (error) {
        if (error instanceof Error && error.message === "ORDER_ALREADY_PROCESSED") {
          response.status(409).json({message: "이미 처리된 주문입니다."});
          return;
        }
        throw error;
      }
      response.status(200).json({orderNumber, status: "CANCELLED"});
      return;
    }

    const paidAt = Timestamp.now();
    try {
      await db.runTransaction(async (transaction) => {
        const current = await transaction.get(orderRef);
        if (!manageableBankTransferStatuses.has(current.data()?.status)) throw new Error("ORDER_ALREADY_PROCESSED");
        transaction.update(orderRef, {
          status: "PAID",
          paymentMethod: "계좌이체",
          approvedAt: paidAt.toDate().toISOString(),
          paidAt,
          confirmedBy: caller.uid,
        });
        if (orderData.kind === "membership") {
          const billingCycle = orderData.billingCycle as MembershipBillingCycle;
          const periodStartedAt = new Date();
          const periodEndsAt = membershipPeriodEnd(billingCycle);
          transaction.update(orderRef, {
            periodStartedAt: Timestamp.fromDate(periodStartedAt),
            periodEndsAt: Timestamp.fromDate(periodEndsAt),
          });
          transaction.set(db.collection("users").doc(ownerUid), {
            membershipPlan: orderData.planId,
            membershipBillingCycle: billingCycle,
            membershipPeriodStartedAt: Timestamp.fromDate(periodStartedAt),
            membershipPeriodEndsAt: Timestamp.fromDate(periodEndsAt),
            membershipPaymentProvider: "bank_transfer",
            membershipUpdatedAt: FieldValue.serverTimestamp(),
          }, {merge: true});
        } else if (orderData.kind === "donation") {
          const donationRef = db.collection("users").doc(ownerUid).collection("donations")
            .doc(String(orderData.donationRecordId));
          const publicDonationRef = db.collection("users").doc(ownerUid).collection("publicDonations")
            .doc(String(orderData.donationRecordId));
          transaction.set(donationRef, {
            blockId: orderData.blockId,
            targetUsername: orderData.targetUsername,
            nickname: orderData.nickname,
            message: orderData.message,
            amount: orderData.amount,
            sellerPlan: orderData.sellerPlan,
            platformFeePercent: orderData.platformFeePercent,
            platformFeeAmount: orderData.platformFeeAmount,
            sellerNetAmount: orderData.sellerNetAmount,
            paymentId: orderNumber,
            paymentProvider: "bank_transfer",
            createdAt: paidAt,
          });
          transaction.set(publicDonationRef, {
            blockId: orderData.blockId,
            targetUsername: orderData.targetUsername,
            nickname: orderData.nickname,
            message: orderData.message,
            amount: orderData.amount,
            createdAt: paidAt,
          });
          writePlatformFeeLedger(transaction, orderNumber, ownerUid, orderData, "bank_transfer");
        } else if (salesOrderRef) {
          transaction.update(salesOrderRef, {
            status: "paid",
            fulfillmentStatus: orderData.salesType === "digital_file" ? "delivered" : "preparing",
            paymentProvider: "bank_transfer",
            paymentMethod: "계좌이체",
            paidAt: paidAt.toDate().toISOString(),
          });
          writePlatformFeeLedger(transaction, orderNumber, ownerUid, orderData, "bank_transfer");
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === "ORDER_ALREADY_PROCESSED") {
        response.status(409).json({message: "이미 처리된 주문입니다."});
        return;
      }
      throw error;
    }
    if (orderData.kind === "membership") {
      await syncProfilePlanVisibility(ownerUid, orderData.planId as MembershipPlan);
    }
    const download = await createDigitalDownload({...orderData, status: "PAID"}, orderRef, orderNumber);
    await enqueueBankTransferNotification(orderNumber, orderData);
    response.status(200).json({orderNumber, status: "PAID", ...download});
  },
);

export const listBankTransferOrders = onRequest(
  {region: "asia-northeast3", memory: "256MiB", timeoutSeconds: 20, invoker: "public"},
  async (request, response) => {
    if (!setPublicPostCors(request, response)) return;
    let caller: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
    try {
      caller = await requireAuthenticatedUser(request);
    } catch {
      response.status(401).json({message: "로그인이 필요합니다."});
      return;
    }
    const includeMemberships = request.body?.includeMemberships === true && isSiteAdmin(caller as unknown as Record<string, unknown>);
    const snapshot = includeMemberships
      ? await db.collection("tossPaymentOrders").where("kind", "==", "membership").limit(300).get()
      : await db.collection("tossPaymentOrders").where("ownerUid", "==", caller.uid).limit(300).get();
    const orders = snapshot.docs
      .map((document): Record<string, unknown> => ({id: document.id, ...document.data()}))
      .filter((order) => order.paymentProvider === "bank_transfer")
      .map((order) => ({
        orderNumber: cleanString(order.id, 128),
        kind: cleanString(order.kind, 30) || "sales",
        productName: cleanString(order.productName, 100),
        amount: Number(order.amount) || 0,
        status: cleanString(order.status, 30),
        depositorName: cleanString(order.depositorName, 50),
        buyerContact: cleanString(order.buyerContact, 50),
        nickname: cleanString(order.nickname, 50),
        message: cleanString(order.message, 300),
        planName: cleanString(order.planName, 50),
        ownerUid: cleanString(order.ownerUid, 128),
        expiresAt: order.expiresAt instanceof Timestamp ? order.expiresAt.toDate().toISOString() : null,
        createdAt: order.createdAt instanceof Timestamp ? order.createdAt.toDate().toISOString() : null,
      }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    response.status(200).json({orders});
  },
);

export const expireBankTransferOrders = onSchedule(
  {region: "asia-northeast3", schedule: "every 60 minutes", timeZone: "Asia/Seoul"},
  async () => {
    const snapshot = await db.collection("tossPaymentOrders")
      .where("status", "in", ["WAITING_DEPOSIT", "DEPOSIT_REPORTED"])
      .limit(500)
      .get();
    const now = Date.now();
    const expired = snapshot.docs.filter((document) => {
      const value = document.data().expiresAt;
      return value instanceof Timestamp && value.toMillis() <= now;
    });
    if (!expired.length) return;
    const batch = db.batch();
    expired.forEach((document) => {
      const data = document.data();
      batch.update(document.ref, {status: "EXPIRED", expiredAt: FieldValue.serverTimestamp()});
      if (data.salesOrderId && data.ownerUid) {
        batch.update(
          db.collection("users").doc(String(data.ownerUid)).collection("sales_orders").doc(String(data.salesOrderId)),
          {status: "cancelled"},
        );
      }
    });
    await batch.commit();
  },
);

export const expireMembershipPlans = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 300,
  },
  async () => {
    const snapshot = await db.collection("users")
      .where("membershipPeriodEndsAt", "<=", Timestamp.now())
      .limit(200)
      .get();
    const expired = snapshot.docs.filter((document) => {
      const data = document.data();
      const plan = data.membershipPlan;
      return data.membershipGrant !== BETA_LIFETIME_PREMIUM_GRANT
        && (plan === "standard" || plan === "premium");
    });
    if (expired.length === 0) return;
    const batch = db.batch();
    expired.forEach((document) => batch.set(document.ref, {
      membershipPreviousPlan: document.data().membershipPlan,
      membershipPlan: "basic",
      membershipExpiredAt: FieldValue.serverTimestamp(),
      membershipUpdatedAt: FieldValue.serverTimestamp(),
    }, {merge: true}));
    await batch.commit();
    await Promise.all(expired.map((document) => syncProfilePlanVisibility(document.id, "basic")));
    logger.info("Expired membership plans downgraded", {count: expired.length});
  },
);

export const downloadDigitalOrder = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 60,
    invoker: "public",
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.set("Allow", "GET").status(405).send("Method not allowed");
      return;
    }
    const orderId = cleanString(request.query.orderId, 64).toUpperCase();
    const token = cleanString(request.query.token, 64);
    if (!/^LZ-\d{8}-[A-F0-9]{10}$/.test(orderId) || !/^[a-f0-9]{64}$/.test(token)) {
      response.status(400).send("다운로드 주소가 올바르지 않습니다.");
      return;
    }

    const orderSnapshot = await db.collection("tossPaymentOrders").doc(orderId).get();
    const orderData = orderSnapshot.data();
    const expectedHash = cleanString(orderData?.downloadTokenHash, 64);
    const actualHash = createHash("sha256").update(token).digest("hex");
    const tokenMatches = expectedHash.length === actualHash.length && timingSafeEqual(
      Buffer.from(expectedHash, "hex"),
      Buffer.from(actualHash, "hex"),
    );
    const expiresAt = orderData?.downloadExpiresAt instanceof Timestamp
      ? orderData.downloadExpiresAt.toMillis()
      : 0;
    if (!orderSnapshot.exists || orderData?.status !== "PAID" || orderData?.salesType !== "digital_file" || !tokenMatches || expiresAt < Date.now()) {
      response.status(403).send("다운로드 링크가 만료되었거나 사용할 수 없습니다.");
      return;
    }

    const ownerUid = cleanString(orderData.ownerUid, 128);
    const filePath = cleanString(orderData.filePath, 1024);
    if (!filePath.startsWith(`digital-products/${ownerUid}/`)) {
      response.status(404).send("다운로드할 파일을 찾을 수 없습니다.");
      return;
    }
    const file = getStorage().bucket().file(filePath);
    const [exists] = await file.exists();
    if (!exists) {
      response.status(404).send("다운로드할 파일을 찾을 수 없습니다.");
      return;
    }
    const fileName = cleanString(orderData.fileName, 255) || "digital-product";
    response.set("Content-Type", "application/octet-stream");
    response.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    response.set("Cache-Control", "private, no-store");
    await new Promise<void>((resolve, reject) => {
      file.createReadStream()
        .on("error", reject)
        .on("end", resolve)
        .pipe(response);
    }).catch((error) => {
      logger.error("Digital product download failed", {orderId, filePath, error});
      if (!response.headersSent) response.status(500).send("파일 다운로드에 실패했습니다.");
    });
  },
);

export const downloadSharedFile = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 60,
    invoker: "public",
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.set("Allow", "GET").status(405).send("Method not allowed");
      return;
    }

    const filePath = cleanString(request.query.path, 1024);
    const downloadToken = cleanString(request.query.token, 128);
    if (!/^shared-files\/[A-Za-z0-9_-]+\/[^/]+$/.test(filePath) || !downloadToken) {
      response.status(400).send("다운로드 주소가 올바르지 않습니다.");
      return;
    }

    const ownerUid = filePath.split("/")[1];
    const ownerSnapshot = await db.collection("users").doc(ownerUid).get();
    const ownerData = ownerSnapshot.data();
    const {entitlements: ownerEntitlements} = entitlementsForUser(ownerData);
    const betaLifetimeOwner = isBetaLifetimePremium(ownerData);
    const file = getStorage().bucket().file(filePath);
    const [exists] = await file.exists();
    if (!exists) {
      response.status(404).send("파일을 찾을 수 없습니다.");
      return;
    }

    const [metadata] = await file.getMetadata();
    const fileSize = Number(metadata.size || 0);
    // Deliberately the plan allowance, not the tighter beta upload cap: this
    // guard runs on every download, so applying the beta cap here would stop
    // serving files that were legitimately uploaded before the cap existed.
    const maxSharedFileBytes = ownerEntitlements.maxSharedFileBytes;
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxSharedFileBytes) {
      response.status(413).send("현재 플랜에서 허용된 파일 크기를 초과했습니다.");
      return;
    }
    const customShareToken = cleanString(metadata.metadata?.linkzipShareToken, 128);
    const validTokens = String(metadata.metadata?.firebaseStorageDownloadTokens || "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
    if (downloadToken !== customShareToken && !validTokens.includes(downloadToken)) {
      response.status(403).send("다운로드 권한을 확인할 수 없습니다.");
      return;
    }

    const dayKey = seoulDayKey();
    const fileKey = createHash("sha256").update(filePath).digest("hex").slice(0, 32);
    const globalUsageRef = db.collection("sharedFileDownloadUsage").doc(`global_${dayKey}`);
    const fileUsageRef = db.collection("sharedFileDownloadUsage").doc(`file_${dayKey}_${fileKey}`);
    const ownerUsageRef = db.collection("sharedFileDownloadUsage").doc(`owner_${dayKey}_${ownerUid}`);
    const maxGlobalDownloadsPerDay = 150;
    const maxGlobalBytesPerDay = 750 * 1024 * 1024;
    const maxFileDownloadsPerDay = sharedFileDownloadsPerDayForUser(ownerData);

    try {
      await db.runTransaction(async (transaction) => {
        const usageSnapshots = await Promise.all([
          transaction.get(globalUsageRef),
          transaction.get(fileUsageRef),
          ...(betaLifetimeOwner ? [transaction.get(ownerUsageRef)] : []),
        ]);
        const [globalUsage, fileUsage, ownerUsage] = usageSnapshots;
        const globalCount = Number(globalUsage.data()?.count || 0);
        const globalBytes = Number(globalUsage.data()?.bytes || 0);
        const fileCount = Number(fileUsage.data()?.count || 0);
        const ownerCount = Number(ownerUsage?.data()?.count || 0);

        if (fileCount >= maxFileDownloadsPerDay) {
          throw new Error("FILE_DAILY_LIMIT");
        }
        if (betaLifetimeOwner && ownerCount >= BETA_SHARED_FILE_OWNER_DOWNLOADS_PER_DAY) {
          throw new Error("BETA_OWNER_DAILY_LIMIT");
        }
        if (globalCount >= maxGlobalDownloadsPerDay || globalBytes + fileSize > maxGlobalBytesPerDay) {
          throw new Error("GLOBAL_DAILY_LIMIT");
        }

        transaction.set(globalUsageRef, {
          count: globalCount + 1,
          bytes: globalBytes + fileSize,
          day: dayKey,
          updatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});
        transaction.set(fileUsageRef, {
          count: fileCount + 1,
          bytes: FieldValue.increment(fileSize),
          day: dayKey,
          filePath,
          updatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});
        if (betaLifetimeOwner) {
          transaction.set(ownerUsageRef, {
            uid: ownerUid,
            count: ownerCount + 1,
            bytes: FieldValue.increment(fileSize),
            day: dayKey,
            updatedAt: FieldValue.serverTimestamp(),
          }, {merge: true});
        }
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      if (reason === "FILE_DAILY_LIMIT") {
        response.status(429).send(`이 파일의 오늘 다운로드 한도(${maxFileDownloadsPerDay}회)를 모두 사용했습니다. 내일 다시 시도해주세요.`);
        return;
      }
      if (reason === "BETA_OWNER_DAILY_LIMIT") {
        response.status(429).send(`베타 계정의 오늘 전체 파일 다운로드 한도(${BETA_SHARED_FILE_OWNER_DOWNLOADS_PER_DAY}회)를 모두 사용했습니다. 내일 다시 시도해주세요.`);
        return;
      }
      if (reason === "GLOBAL_DAILY_LIMIT") {
        response.status(429).send("오늘의 전체 파일 다운로드 한도를 모두 사용했습니다. 내일 다시 시도해주세요.");
        return;
      }
      logger.error("Shared file quota check failed", {filePath, error});
      response.status(503).send("다운로드 한도를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const requestedName = cleanString(request.query.name, 255);
    const storedName = filePath.split("/").pop()?.replace(/^\d+_/, "") || "download";
    const fileName = requestedName || storedName;
    response.set("Content-Type", "application/octet-stream");
    response.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    response.set("Cache-Control", "private, no-store");
    response.set("X-Content-Type-Options", "nosniff");
    response.set("X-LinkZip-File-Daily-Limit", String(maxFileDownloadsPerDay));

    await new Promise<void>((resolve, reject) => {
      file.createReadStream()
        .on("error", reject)
        .on("end", resolve)
        .pipe(response);
    }).catch((error) => {
      logger.error("Shared file download failed", {filePath, error});
      if (!response.headersSent) response.status(500).send("파일 다운로드에 실패했습니다.");
    });
  },
);

export const lookupSalesOrder = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 15,
    invoker: "public",
  },
  async (request, response) => {
    response.set("Cache-Control", "private, no-store");
    const origin = request.get("origin") || "";
    if (orderLookupOrigins.has(origin)) response.set("Access-Control-Allow-Origin", origin);
    response.set("Vary", "Origin");
    if (request.method === "OPTIONS") {
      response.set("Access-Control-Allow-Headers", "Content-Type");
      response.set("Access-Control-Allow-Methods", "POST");
      response.status(204).send("");
      return;
    }
    if (request.method !== "POST") {
      response.set("Allow", "POST").status(405).json({message: "Method not allowed"});
      return;
    }
    if (origin && !orderLookupOrigins.has(origin)) {
      response.status(403).json({message: "허용되지 않은 요청입니다."});
      return;
    }

    const requesterIp = cleanString(request.ip || "unknown", 96);
    const rateLimitRef = db.collection("orderLookupRateLimits").doc(
      createHash("sha256").update(requesterIp).digest("hex"),
    );
    try {
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(rateLimitRef);
        const now = Date.now();
        const previousWindow = snapshot.data()?.windowStartedAt;
        const windowStartedAt = previousWindow instanceof Timestamp ? previousWindow.toMillis() : 0;
        const withinWindow = now - windowStartedAt < 60 * 60 * 1000;
        const count = withinWindow ? Number(snapshot.data()?.count || 0) : 0;
        if (count >= 10) throw new Error("RATE_LIMITED");
        transaction.set(rateLimitRef, {
          count: count + 1,
          windowStartedAt: withinWindow ? previousWindow : Timestamp.fromMillis(now),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMITED") {
        response.set("Retry-After", "3600").status(429).json({message: "조회 요청이 너무 많습니다. 잠시 후 다시 시도해주세요."});
        return;
      }
      logger.error("Order lookup rate limit check failed", {error});
      response.status(503).json({message: "주문 조회를 잠시 이용할 수 없습니다."});
      return;
    }

    const ownerUid = typeof request.body?.ownerUid === "string" ? request.body.ownerUid.trim() : "";
    const orderNumber = cleanString(request.body?.orderNumber, 64).toUpperCase();
    const normalizedPhone = cleanString(request.body?.buyerContact, 50).replace(/\D/g, "");
    const isOrderNumber = /^LZ-\d{8}-(?:[A-Z0-9]{6}|[A-F0-9]{10})$/.test(orderNumber);
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(ownerUid) || !isOrderNumber || normalizedPhone.length < 9) {
      response.status(400).json({message: "주문번호와 휴대폰 번호를 정확히 입력해주세요."});
      return;
    }

    const ordersRef = db.collection("users").doc(ownerUid).collection("sales_orders");
    const snapshot = await ordersRef.where("orderNumber", "==", orderNumber).limit(1).get();
    const matchingDocuments = snapshot.docs.filter((document) =>
      document.data().buyerContactNormalized === normalizedPhone,
    );

    const orders = await Promise.all(matchingDocuments.map(async (document) => {
      const data = document.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null;
      let digitalDownload = {};
      if (data.status === "paid" && data.salesType === "digital_file" && typeof data.orderNumber === "string") {
        const paymentRef = db.collection("tossPaymentOrders").doc(data.orderNumber);
        const payment = await paymentRef.get();
        if (payment.exists && payment.data()?.status === "PAID") {
          digitalDownload = await createDigitalDownload(payment.data() || {}, paymentRef, data.orderNumber);
        }
      }
      return {
        orderNumber: typeof data.orderNumber === "string" ? data.orderNumber : "",
        productName: typeof data.productName === "string" ? data.productName : "상품",
        amount: typeof data.amount === "number" ? data.amount : 0,
        salesType: data.salesType === "digital_file" ? "digital_file" : "product",
        status: ["pending", "paid", "cancelled"].includes(data.status) ? data.status : "pending",
        fulfillmentStatus: ["payment_pending", "preparing", "shipping", "delivered"].includes(data.fulfillmentStatus)
          ? data.fulfillmentStatus : "payment_pending",
        carrier: typeof data.carrier === "string" ? data.carrier : "",
        trackingNumber: typeof data.trackingNumber === "string" ? data.trackingNumber : "",
        createdAt,
        ...digitalDownload,
      };
    }));
    response.status(200).json({orders});
  },
);

export const kakaoOAuthStart = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    invoker: "public",
    secrets: [kakaoRestApiKey],
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.set("Allow", "GET").status(405).send("Method not allowed");
      return;
    }

    const returnTo = normalizeKakaoReturnTo(singleQueryString(request.query.returnTo));
    const state = randomBytes(32).toString("hex");
    await db.collection("kakaoOAuthStates").doc(hashOAuthState(state)).set({
      returnTo,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
      used: false,
    });

    response.setHeader(
      "Set-Cookie",
      `${oauthStateCookieName}=${encodeURIComponent(state)}; Max-Age=600; Path=/auth/kakao; HttpOnly; Secure; SameSite=Lax`,
    );
    // Do not leak a localhost referrer through the redirect chain. Providers
    // can reject an otherwise valid callback when the initiating local origin
    // is not one of the production service URLs registered in their console.
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");

    const authorizationUrl = new URL("https://kauth.kakao.com/oauth/authorize");
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", kakaoRestApiKey.value());
    authorizationUrl.searchParams.set("redirect_uri", kakaoRedirectUri);
    authorizationUrl.searchParams.set("state", state);
    response.redirect(302, authorizationUrl.toString());
  },
);

export const kakaoOAuthCallback = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 60,
    invoker: "public",
    secrets: [kakaoRestApiKey, kakaoClientSecret],
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.set("Allow", "GET").status(405).send("Method not allowed");
      return;
    }

    const state = singleQueryString(request.query.state);
    const code = singleQueryString(request.query.code);
    const providerError = singleQueryString(request.query.error);
    const stateCookie = readCookie(request.get("cookie") || "", oauthStateCookieName);
    const stateRef = state ? db.collection("kakaoOAuthStates").doc(hashOAuthState(state)) : null;
    let returnTo = "https://linkzip.kr/auth/kakao/complete";

    response.setHeader(
      "Set-Cookie",
      `${oauthStateCookieName}=; Max-Age=0; Path=/auth/kakao; HttpOnly; Secure; SameSite=Lax`,
    );

    try {
      if (!state || !stateRef || !stateCookie || !timingSafeStringEqual(state, stateCookie)) {
        throw new Error("Invalid OAuth state cookie");
      }

      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(stateRef);
        const data = snapshot.data();
        const expiresAt = data?.expiresAt as Timestamp | undefined;
        if (!snapshot.exists || !data || data.used === true || !expiresAt || expiresAt.toMillis() < Date.now()) {
          throw new Error("Expired or already used OAuth state");
        }
        returnTo = normalizeKakaoReturnTo(typeof data.returnTo === "string" ? data.returnTo : "");
        transaction.update(stateRef, {used: true, usedAt: FieldValue.serverTimestamp()});
      });

      if (providerError || !code) {
        redirectToKakaoResult(response, returnTo, {error: "authorization_cancelled"});
        return;
      }

      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: kakaoRestApiKey.value(),
        redirect_uri: kakaoRedirectUri,
        code,
        client_secret: kakaoClientSecret.value(),
      });
      const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"},
        body: tokenBody,
      });
      const tokenPayload = await tokenResponse.json() as {access_token?: string; error?: string};
      if (!tokenResponse.ok || !tokenPayload.access_token) {
        logger.warn("Kakao token exchange failed", {status: tokenResponse.status, error: tokenPayload.error});
        throw new Error("Kakao token exchange failed");
      }

      const profileResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });
      const kakaoProfile = await profileResponse.json() as KakaoProfileResponse;
      if (!profileResponse.ok || (typeof kakaoProfile.id !== "number" && typeof kakaoProfile.id !== "string")) {
        logger.warn("Kakao user profile request failed", {status: profileResponse.status});
        throw new Error("Kakao user profile request failed");
      }

      const firebaseUid = await resolveKakaoFirebaseUid(kakaoProfile);
      const customToken = await getAuth().createCustomToken(firebaseUid, {loginProvider: "kakao"});
      redirectToKakaoResult(response, returnTo, {custom_token: customToken});
    } catch (error) {
      logger.error("Kakao OAuth callback failed", error);
      redirectToKakaoResult(response, returnTo, {error: "login_failed"});
    }
  },
);

export const naverOAuthStart = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    invoker: "public",
    secrets: [naverClientId],
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.set("Allow", "GET").status(405).send("Method not allowed");
      return;
    }

    const returnTo = normalizeNaverReturnTo(singleQueryString(request.query.returnTo));
    const state = randomBytes(32).toString("hex");
    await db.collection("naverOAuthStates").doc(hashOAuthState(state)).set({
      returnTo,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
      used: false,
    });

    response.setHeader(
      "Set-Cookie",
      `${oauthStateCookieName}=${encodeURIComponent(state)}; Max-Age=600; Path=/auth/naver; HttpOnly; Secure; SameSite=Lax`,
    );
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");

    const authorizationUrl = new URL("https://nid.naver.com/oauth2.0/authorize");
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", naverClientId.value());
    authorizationUrl.searchParams.set("redirect_uri", naverRedirectUri);
    authorizationUrl.searchParams.set("state", state);
    // NAVER validates the service URL from the browser navigation context.
    // A bare 302 can retain localhost as the referrer across the redirect
    // chain, which NAVER rejects with disp_stat=208. Render one canonical-host
    // document first so the provider navigation starts from linkzip.kr.
    const destination = JSON.stringify(authorizationUrl.toString()).replace(/</g, "\\u003c");
    response
      .status(200)
      .set({
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      })
      .send(`<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>NAVER 로그인</title></head><body><script>window.location.replace(${destination});</script></body></html>`);
  },
);

export const naverOAuthCallback = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 60,
    invoker: "public",
    secrets: [naverClientId, naverClientSecret],
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.set("Allow", "GET").status(405).send("Method not allowed");
      return;
    }

    const state = singleQueryString(request.query.state);
    const code = singleQueryString(request.query.code);
    const providerError = singleQueryString(request.query.error);
    const stateCookie = readCookie(request.get("cookie") || "", oauthStateCookieName);
    const stateRef = state ? db.collection("naverOAuthStates").doc(hashOAuthState(state)) : null;
    let returnTo = "https://linkzip.kr/auth/naver/complete";

    response.setHeader(
      "Set-Cookie",
      `${oauthStateCookieName}=; Max-Age=0; Path=/auth/naver; HttpOnly; Secure; SameSite=Lax`,
    );

    try {
      if (!state || !stateRef || !stateCookie || !timingSafeStringEqual(state, stateCookie)) {
        throw new Error("Invalid OAuth state cookie");
      }

      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(stateRef);
        const data = snapshot.data();
        const expiresAt = data?.expiresAt as Timestamp | undefined;
        if (!snapshot.exists || !data || data.used === true || !expiresAt || expiresAt.toMillis() < Date.now()) {
          throw new Error("Expired or already used OAuth state");
        }
        returnTo = normalizeNaverReturnTo(typeof data.returnTo === "string" ? data.returnTo : "");
        transaction.update(stateRef, {used: true, usedAt: FieldValue.serverTimestamp()});
      });

      if (providerError || !code) {
        redirectToNaverResult(response, returnTo, {error: "authorization_cancelled"});
        return;
      }

      const tokenBody = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: naverClientId.value(),
        client_secret: naverClientSecret.value(),
        code,
        state,
      });
      const tokenResponse = await fetch("https://nid.naver.com/oauth2.0/token", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"},
        body: tokenBody,
      });
      const tokenPayload = await tokenResponse.json() as {access_token?: string; error?: string; error_description?: string};
      if (!tokenResponse.ok || !tokenPayload.access_token) {
        logger.warn("Naver token exchange failed", {status: tokenResponse.status, error: tokenPayload.error});
        throw new Error("Naver token exchange failed");
      }

      const profileResponse = await fetch("https://openapi.naver.com/v1/nid/me", {
        method: "GET",
        headers: {Authorization: `Bearer ${tokenPayload.access_token}`},
      });
      const naverProfile = await profileResponse.json() as NaverProfileResponse;
      if (!profileResponse.ok || naverProfile.resultcode !== "00" || !naverProfile.response?.id) {
        logger.warn("Naver user profile request failed", {
          status: profileResponse.status,
          resultcode: naverProfile.resultcode,
        });
        throw new Error("Naver user profile request failed");
      }

      const firebaseUid = await resolveNaverFirebaseUid(naverProfile);
      const customToken = await getAuth().createCustomToken(firebaseUid, {
        loginProvider: "naver",
        naverDisplayName: getNaverDisplayName(naverProfile),
      });
      redirectToNaverResult(response, returnTo, {custom_token: customToken});
    } catch (error) {
      logger.error("Naver OAuth callback failed", error);
      redirectToNaverResult(response, returnTo, {error: "login_failed"});
    }
  },
);

export const metaInstagramWebhook = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    invoker: "public",
    secrets: [metaWebhookVerifyToken, metaAppSecret, metaInstagramAppSecret],
  },
  async (request, response) => {
    if (request.method === "GET") {
      const result = verifyWebhookChallenge(
        request.query,
        metaWebhookVerifyToken.value(),
      );

      if (!result.ok) {
        logger.warn("Meta webhook verification rejected", {
          status: result.status,
          hasMode: typeof request.query["hub.mode"] === "string",
          hasToken: typeof request.query["hub.verify_token"] === "string",
          hasChallenge: typeof request.query["hub.challenge"] === "string",
        });
        response.status(result.status).send(result.message);
        return;
      }

      response.status(200).send(result.challenge);
      return;
    }

    if (request.method !== "POST") {
      response.set("Allow", "GET, POST").status(405).send("Method not allowed");
      return;
    }

    const signature = request.get("x-hub-signature-256");
    if (!verifyMetaSignature(request.rawBody, signature, [
      metaInstagramAppSecret.value(),
      metaAppSecret.value(),
    ])) {
      logger.warn("Rejected Meta webhook with an invalid signature");
      response.status(401).send("Invalid signature");
      return;
    }

    const eventId = webhookEventId(request.rawBody);
    const eventRef = db.collection("metaInstagramWebhookEvents").doc(eventId);
    let duplicate = false;

    await db.runTransaction(async (transaction) => {
      const existingEvent = await transaction.get(eventRef);
      if (existingEvent.exists) {
        duplicate = true;
        return;
      }

      transaction.create(eventRef, {
        provider: "meta",
        object: typeof request.body?.object === "string" ? request.body.object : null,
        payload: request.body,
        status: "received",
        receivedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    });

    logger.info("Meta Instagram webhook received", {
      eventId,
      duplicate,
      ...describeInstagramWebhookPayload(request.body),
    });
    response.status(200).send("EVENT_RECEIVED");
  },
);

export const startInstagramOAuth = onCall(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    secrets: [metaInstagramAppId],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    await requireInstagramPlan(request.auth.uid);

    const state = randomOAuthState();
    await db.collection("metaInstagramOAuthStates").doc(hashOAuthState(state)).set({
      uid: request.auth.uid,
      returnOrigin: instagramReturnOrigin(request.data?.returnOrigin),
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
      used: false,
    });

    const authorizationUrl = new URL("https://www.instagram.com/oauth/authorize");
    authorizationUrl.searchParams.set("enable_fb_login", "0");
    authorizationUrl.searchParams.set("force_authentication", "1");
    authorizationUrl.searchParams.set("client_id", metaInstagramAppId.value());
    authorizationUrl.searchParams.set("redirect_uri", instagramRedirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", instagramScopes.join(","));
    authorizationUrl.searchParams.set("state", state);

    return {authorizationUrl: authorizationUrl.toString()};
  },
);

export const instagramOAuthCallback = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 60,
    invoker: "public",
    secrets: [metaInstagramAppId, metaInstagramAppSecret, metaTokenEncryptionKey],
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.set("Allow", "GET").status(405).send("Method not allowed");
      return;
    }

    const rawCode = singleQueryString(request.query.code);
    const code = rawCode.trim().replace(/ /g, "+").replace(/#_$/, "");
    const state = singleQueryString(request.query.state);
    const error = singleQueryString(request.query.error);
    // Resolved before the state is consumed so every exit below -- the failures
    // included -- lands back on the origin the flow started from.
    const returnOrigin = await storedInstagramReturnOrigin(state);
    if (error || !code || !state) {
      redirectToInstagramResult(response, "error", "authorization_cancelled", returnOrigin);
      return;
    }

    try {
      logger.info("Instagram OAuth callback received", {
        codeLength: code.length,
        codeWasNormalized: code !== rawCode,
        redirectUri: instagramRedirectUri,
      });
      const stateRef = db.collection("metaInstagramOAuthStates").doc(hashOAuthState(state));
      let uid = "";
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(stateRef);
        const data = snapshot.data();
        if (!snapshot.exists || !data || data.used === true) {
          throw new Error("Invalid or already used OAuth state");
        }
        const expiresAt = data.expiresAt as Timestamp | undefined;
        if (!expiresAt || expiresAt.toMillis() < Date.now() || typeof data.uid !== "string") {
          throw new Error("Expired OAuth state");
        }
        uid = data.uid;
        transaction.update(stateRef, {used: true, usedAt: FieldValue.serverTimestamp()});
      });

      await requireInstagramPlan(uid);

      const shortToken = await exchangeAuthorizationCode(code, instagramRedirectUri);
      logger.info("Instagram OAuth short-lived token exchanged", {
        grantedPermissions: shortToken.permissions,
        deniedPermissions: instagramScopes.filter(
          (scope) => shortToken.permissions.length && !shortToken.permissions.includes(scope),
        ),
      });
      const longToken = await exchangeLongLivedToken(shortToken.accessToken);
      logger.info("Instagram OAuth long-lived token exchanged");
      const profile = await fetchInstagramProfile(shortToken.userId, longToken.accessToken);
      logger.info("Instagram OAuth profile loaded");
      await subscribeInstagramWebhooks(shortToken.userId, longToken.accessToken);
      logger.info("Instagram OAuth webhook subscription completed");

      const connectionRef = db.collection("instagramConnections").doc(uid);
      const existing = await connectionRef.get();
      const existingRules = existing.exists ? normalizeStoredRules(existing.data()?.rules) : [];
      await connectionRef.set({
        uid,
        instagramUserId: shortToken.userId,
        // The id webhook deliveries arrive under. Kept separate from
        // instagramUserId because Graph calls still have to use that one.
        instagramWebhookUserId: profile.webhookUserId,
        username: profile.username,
        name: profile.name,
        profilePictureUrl: profile.profilePictureUrl,
        accessToken: encryptSecret(longToken.accessToken, metaTokenEncryptionKey.value()),
        tokenExpiresAt: longToken.expiresIn
          ? Timestamp.fromMillis(Date.now() + longToken.expiresIn * 1000)
          : null,
        // Fall back to the requested list only when Instagram sends nothing, so
        // an unexpected response shape cannot make every scope look missing.
        scopes: shortToken.permissions.length ? shortToken.permissions : instagramScopes,
        rules: existingRules,
        status: "connected",
        connectedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});

      redirectToInstagramResult(response, "connected", undefined, returnOrigin);
    } catch (callbackError) {
      logger.error("Instagram OAuth callback failed", callbackError);
      redirectToInstagramResult(response, "error", "connection_failed", returnOrigin);
    }
  },
);

export const getInstagramConnectionStatus = onCall(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    secrets: [metaTokenEncryptionKey],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const instagramAccess = await instagramEntitlementsForUid(request.auth.uid);
    const usageMonth = new Date().toISOString().slice(0, 7);
    const usageSnapshot = await db.collection("instagramAutomationUsage")
      .doc(`${request.auth.uid}_${usageMonth}`).get();
    const snapshot = await db.collection("instagramConnections").doc(request.auth.uid).get();
    const data = snapshot.data();
    if (!snapshot.exists || data?.status !== "connected") return {
      connected: false,
      planLocked: false,
      plan: instagramAccess.plan,
      monthlyUsage: Number(usageSnapshot.data()?.count || 0),
      monthlyLimit: instagramAccess.entitlements.maxInstagramDeliveriesPerMonth,
    };
    let grantedScopes: string[] = [];
    let subscribedFields: string[] = [];
    let diagnosticError = "";
    // profile_picture_url is a CDN link that stops resolving after a while, so
    // the copy saved at connect time is only a fallback for when Graph is
    // unreachable. The status call already fetches the profile, so ask it for
    // the display fields too and prefer what it returns.
    let liveProfile: {username?: string; name?: string; profilePictureUrl?: string} = {};
    try {
      const token = decryptSecret(
        data.accessToken as EncryptedSecret,
        metaTokenEncryptionKey.value(),
      );
      const instagramUserId = encodeURIComponent(String(data.instagramUserId || ""));
      const profileUrl = new URL(
        `https://graph.instagram.com/${instagramGraphVersion}/${instagramUserId}`,
      );
      profileUrl.searchParams.set("fields", "user_id,username,name,profile_picture_url");
      const subscriptionUrl = new URL(
        `https://graph.instagram.com/${instagramGraphVersion}/${instagramUserId}/subscribed_apps`,
      );
      const [profileResult, subscriptionResult] = await Promise.all([
        metaFetch(profileUrl.toString(), {
          headers: {Authorization: `Bearer ${token}`},
        }),
        metaFetch(subscriptionUrl.toString(), {
          headers: {Authorization: `Bearer ${token}`},
        }),
      ]);
      liveProfile = {
        username: stringField(profileResult, "username") || undefined,
        name: stringField(profileResult, "name") || undefined,
        profilePictureUrl: stringField(profileResult, "profile_picture_url") || undefined,
      };
      // Connections made before the webhook id was stored would otherwise need
      // a reconnect before automation could match their deliveries. The call
      // already has the value in hand, so fill it in once.
      const webhookUserId = stringField(profileResult, "user_id");
      if (webhookUserId && data.instagramWebhookUserId !== webhookUserId) {
        await snapshot.ref.update({instagramWebhookUserId: webhookUserId});
      }
      grantedScopes = Array.isArray(data.scopes)
        ? data.scopes.filter((scope): scope is string => typeof scope === "string")
        : [];
      const subscriptions = Array.isArray(subscriptionResult.data) ? subscriptionResult.data : [];
      subscribedFields = subscriptions.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const fields = (item as Record<string, unknown>).subscribed_fields;
        return Array.isArray(fields)
          ? fields.filter((field): field is string => typeof field === "string")
          : [];
      });
    } catch (diagnosticFailure) {
      diagnosticError = diagnosticFailure instanceof Error
        ? diagnosticFailure.message
        : "인스타그램 권한 상태를 확인하지 못했습니다.";
      logger.warn("Instagram connection diagnostics failed", {
        uid: request.auth.uid,
        error: diagnosticError,
      });
    }
    const missingScopes = diagnosticError
      ? []
      : instagramScopes.filter((scope) => !grantedScopes.includes(scope));
    const missingWebhookFields = diagnosticError
      ? []
      : ["comments", "messages"].filter((field) => !subscribedFields.includes(field));
    // Subscribing succeeds even when Instagram then keeps none of the fields, so
    // the POST returning OK at connect time proves nothing. What the GET reports
    // back is the only account-level answer to "will a comment be delivered".
    logger.info("Instagram connection diagnostics", {
      instagramUserId: String(data.instagramUserId || ""),
      subscribedFields,
      missingWebhookFields,
      missingScopes,
      ruleCount: normalizeStoredRules(data.rules).length,
    });
    return {
      connected: true,
      username: liveProfile.username
        || (typeof data.username === "string" ? data.username : ""),
      name: liveProfile.name || (typeof data.name === "string" ? data.name : ""),
      profilePictureUrl: liveProfile.profilePictureUrl
        || (typeof data.profilePictureUrl === "string" ? data.profilePictureUrl : ""),
      rules: normalizeStoredRules(data.rules),
      tokenExpiresAt: data.tokenExpiresAt instanceof Timestamp
        ? data.tokenExpiresAt.toDate().toISOString()
        : null,
      grantedScopes,
      subscribedFields,
      missingScopes,
      missingWebhookFields,
      diagnosticError,
      planLocked: false,
      plan: instagramAccess.plan,
      monthlyUsage: Number(usageSnapshot.data()?.count || 0),
      monthlyLimit: instagramAccess.entitlements.maxInstagramDeliveriesPerMonth,
    };
  },
);

export const listInstagramMedia = onCall(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    secrets: [metaTokenEncryptionKey],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    await requireInstagramPlan(request.auth.uid);
    const snapshot = await db.collection("instagramConnections").doc(request.auth.uid).get();
    const connection = snapshot.data() as InstagramConnection | undefined;
    if (!snapshot.exists || !connection || connection.status !== "connected") {
      throw new HttpsError("failed-precondition", "인스타그램 계정을 먼저 연결해주세요.");
    }
    const token = decryptSecret(connection.accessToken, metaTokenEncryptionKey.value());
    const url = new URL(
      `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(connection.instagramUserId)}/media`,
    );
    url.searchParams.set(
      "fields",
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count",
    );
    url.searchParams.set("limit", "60");
    const result = await metaFetch(url.toString(), {
      headers: {Authorization: `Bearer ${token}`},
    });
    const data = Array.isArray(result.data) ? result.data : [];
    // A comment that never reaches the webhook has two possible explanations,
    // and they need opposite fixes: the delivery was dropped, or the comment
    // was never on this account's media at all. The comment counts on the most
    // recent posts separate the two.
    logger.info("Instagram media listed", {
      instagramUserId: connection.instagramUserId,
      mediaCount: data.length,
      recent: data.slice(0, 5).map((item) => {
        const media = (item || {}) as Record<string, unknown>;
        return {
          id: stringField(media, "id"),
          timestamp: stringField(media, "timestamp"),
          commentsCount: typeof media.comments_count === "number" ? media.comments_count : null,
        };
      }),
    });
    // Best effort, and deliberately isolated from the response: Meta does not
    // send comment webhooks for comments the media owner leaves on their own
    // post, so who wrote the newest comments decides whether a missing
    // notification is a bug or the documented behaviour. Only the author and
    // time are read -- never the comment text.
    void (async () => {
      for (const item of data.slice(0, 2)) {
        const mediaId = stringField((item || {}) as Record<string, unknown>, "id");
        if (!mediaId) continue;
        try {
          const commentsUrl = new URL(
            `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(mediaId)}/comments`,
          );
          commentsUrl.searchParams.set("fields", "username,timestamp");
          commentsUrl.searchParams.set("limit", "5");
          const comments = await metaFetch(commentsUrl.toString(), {
            headers: {Authorization: `Bearer ${token}`},
          });
          const rows = Array.isArray(comments.data) ? comments.data : [];
          logger.info("Instagram media comments sampled", {
            mediaId,
            // An empty result and a result we failed to parse look identical in
            // the authors list, and only one of them is Meta's doing.
            responseKeys: Object.keys(comments),
            dataIsArray: Array.isArray(comments.data),
            dataLength: rows.length,
            authors: rows.map((row) => {
              const comment = (row || {}) as Record<string, unknown>;
              return `${stringField(comment, "username")}@${stringField(comment, "timestamp")}`;
            }),
          });
        } catch (sampleError) {
          logger.warn("Instagram comment sample failed", {mediaId, error: sampleError});
        }
      }
    })();
    return {
      media: data.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const media = item as Record<string, unknown>;
        const id = stringField(media, "id");
        if (!id) return [];
        return [{
          id,
          caption: stringField(media, "caption"),
          mediaType: stringField(media, "media_type"),
          mediaUrl: stringField(media, "media_url"),
          thumbnailUrl: stringField(media, "thumbnail_url"),
          permalink: stringField(media, "permalink"),
          timestamp: stringField(media, "timestamp"),
        }];
      }),
    };
  },
);

export const saveInstagramAutomationRules = onCall(
  {region: "asia-northeast3", memory: "256MiB", timeoutSeconds: 30},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const {entitlements} = await requireInstagramPlan(request.auth.uid);
    let rules: InstagramAutomationRule[];
    try {
      rules = normalizeAutomationRules(request.data?.rules);
    } catch (error) {
      throw new HttpsError(
        "invalid-argument",
        error instanceof Error ? error.message : "자동 답장 규칙이 올바르지 않습니다.",
      );
    }
    if (entitlements.maxInstagramRules !== null && rules.length > entitlements.maxInstagramRules) {
      throw new HttpsError(
        "resource-exhausted",
        `현재 플랜에서는 DM 자동화 규칙을 최대 ${entitlements.maxInstagramRules}개까지 저장할 수 있습니다.`,
      );
    }
    const connectionRef = db.collection("instagramConnections").doc(request.auth.uid);
    if (!(await connectionRef.get()).exists) {
      throw new HttpsError("failed-precondition", "인스타그램 계정을 먼저 연결해주세요.");
    }
    await connectionRef.update({rules, updatedAt: FieldValue.serverTimestamp()});
    return {saved: true, count: rules.length};
  },
);

export const disconnectInstagram = onCall(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    secrets: [metaTokenEncryptionKey],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const connectionRef = db.collection("instagramConnections").doc(request.auth.uid);
    const snapshot = await connectionRef.get();
    if (!snapshot.exists) return {disconnected: true};

    const connection = snapshot.data() as InstagramConnection;
    try {
      const token = decryptSecret(connection.accessToken, metaTokenEncryptionKey.value());
      await metaFetch(
        `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(connection.instagramUserId)}/subscribed_apps`,
        {method: "DELETE", headers: {Authorization: `Bearer ${token}`}},
      );
    } catch (unsubscribeError) {
      logger.warn("Instagram webhook unsubscribe failed", unsubscribeError);
    }
    await connectionRef.delete();
    return {disconnected: true};
  },
);

// Meta pings this when someone removes the app from their Instagram or
// Facebook settings. The access token is already dead by that point, so the
// unsubscribe is best effort — dropping the stored connection is the part that
// has to happen, otherwise the app keeps a token it is no longer entitled to.
export const metaInstagramDeauthorize = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    invoker: "public",
    secrets: [metaAppSecret, metaInstagramAppSecret, metaTokenEncryptionKey],
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.set("Allow", "POST").status(405).send("Method not allowed");
      return;
    }

    const signedRequest = typeof request.body?.signed_request === "string"
      ? request.body.signed_request
      : undefined;
    const payload = parseSignedRequest(signedRequest, [
      metaAppSecret.value(),
      metaInstagramAppSecret.value(),
    ]);
    if (!payload?.user_id) {
      logger.warn("Instagram deauthorize rejected", {
        hasSignedRequest: Boolean(signedRequest),
      });
      response.status(400).send("Invalid signed_request");
      return;
    }

    const matches = await db.collection("instagramConnections")
      .where("instagramUserId", "==", payload.user_id)
      .get();

    for (const match of matches.docs) {
      const connection = match.data() as InstagramConnection;
      try {
        const token = decryptSecret(connection.accessToken, metaTokenEncryptionKey.value());
        await metaFetch(
          `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(connection.instagramUserId)}/subscribed_apps`,
          {method: "DELETE", headers: {Authorization: `Bearer ${token}`}},
        );
      } catch (unsubscribeError) {
        logger.warn("Instagram unsubscribe failed during deauthorize", unsubscribeError);
      }
      await match.ref.delete();
    }

    logger.info("Instagram deauthorize processed", {removed: matches.size});
    // Meta retries on a non-2xx, and an unknown user_id is not a failure we can
    // recover from by retrying, so acknowledge either way.
    response.status(200).send("OK");
  },
);

export const processMetaInstagramWebhookEvent = onDocumentCreated(
  {
    document: "metaInstagramWebhookEvents/{eventId}",
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [metaTokenEncryptionKey],
    retry: false,
  },
  async (event) => {
    const eventSnapshot = event.data;
    if (!eventSnapshot) return;
    const events = extractInstagramInboundEvents(eventSnapshot.data().payload);
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const inboundEvent of events) {
      try {
        const outcome = await processInboundEvent(inboundEvent);
        if (outcome === "sent") sent += 1;
        else skipped += 1;
      } catch (processingError) {
        failed += 1;
        logger.error("Instagram automation event failed", {
          eventId: event.params.eventId,
          sourceId: inboundEvent.sourceId,
          error: processingError,
        });
      }
    }

    await eventSnapshot.ref.update({
      status: failed > 0 ? "processed_with_errors" : "processed",
      processedAt: FieldValue.serverTimestamp(),
      result: {received: events.length, sent, skipped, failed},
    });
    logger.info("Instagram automation webhook processed", {
      eventId: event.params.eventId,
      received: events.length,
      sent,
      skipped,
      failed,
    });
  },
);

export const refreshInstagramAccessTokens = onSchedule(
  {
    schedule: "every day 03:17",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 300,
    secrets: [metaTokenEncryptionKey],
  },
  async () => {
    const threshold = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiringConnections = await db.collection("instagramConnections")
      .where("tokenExpiresAt", "<=", threshold)
      .limit(100)
      .get();

    for (const snapshot of expiringConnections.docs) {
      const connection = snapshot.data() as InstagramConnection;
      if (connection.status !== "connected") continue;
      try {
        const currentToken = decryptSecret(
          connection.accessToken,
          metaTokenEncryptionKey.value(),
        );
        const url = new URL("https://graph.instagram.com/refresh_access_token");
        url.searchParams.set("grant_type", "ig_refresh_token");
        url.searchParams.set("access_token", currentToken);
        const result = await metaFetch(url.toString());
        const refreshedToken = stringField(result, "access_token");
        const expiresIn = typeof result.expires_in === "number" ? result.expires_in : 0;
        if (!refreshedToken || !expiresIn) throw new Error("Token refresh response was incomplete");
        await snapshot.ref.update({
          accessToken: encryptSecret(refreshedToken, metaTokenEncryptionKey.value()),
          tokenExpiresAt: Timestamp.fromMillis(Date.now() + expiresIn * 1000),
          tokenRefreshedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (error) {
        logger.error("Instagram token refresh failed", {
          uid: connection.uid,
          instagramUserId: connection.instagramUserId,
          error,
        });
      }
    }
  },
);

async function processInboundEvent(
  inboundEvent: InstagramInboundEvent,
): Promise<"sent" | "skipped"> {
  // Deliveries identify the account by its Instagram-scoped id, but connections
  // made before that id was stored only have the app-scoped one. Try the
  // delivery id first and fall back, so old connections keep working without a
  // reconnect and new ones match on the first query.
  let connections = await db.collection("instagramConnections")
    .where("instagramWebhookUserId", "==", inboundEvent.recipientId)
    .limit(1)
    .get();
  if (connections.empty) {
    connections = await db.collection("instagramConnections")
      .where("instagramUserId", "==", inboundEvent.recipientId)
      .limit(1)
      .get();
  }
  if (connections.empty) {
    // The recipient id is the account the automation is meant to run as, so
    // logging it is what distinguishes "Meta sent a sample payload" from "the
    // account we stored is not the one that received the comment".
    logger.info("Instagram automation skipped", {
      reason: "connection_not_found",
      recipientId: inboundEvent.recipientId,
      kind: inboundEvent.kind,
    });
    return "skipped";
  }

  const connectionRef = connections.docs[0].ref;
  let connection = connections.docs[0].data() as InstagramConnection;
  if (connection.status !== "connected") {
    logger.info("Instagram automation skipped", {reason: "connection_inactive"});
    return "skipped";
  }
  // Meta provides self-comment webhooks specifically for previewing and
  // testing automations. Allow those comment events while still ignoring
  // self-authored direct messages to prevent message loops.
  if (inboundEvent.kind === "message" && connection.instagramUserId === inboundEvent.senderId) {
    logger.info("Instagram automation skipped", {reason: "self_message"});
    return "skipped";
  }
  const {plan, entitlements} = await instagramEntitlementsForUid(connection.uid);
  connection = await bindPendingNextPostRules(connectionRef, connection, inboundEvent);
  const storedRules = normalizeStoredRules(connection.rules);
  const rule = matchingRule(
    entitlements.maxInstagramRules === null ? storedRules : storedRules.slice(0, entitlements.maxInstagramRules),
    inboundEvent.text,
    inboundEvent.mediaId,
    inboundEvent.kind,
  );
  if (!rule) {
    logger.info("Instagram automation skipped", {
      reason: "no_matching_rule",
      kind: inboundEvent.kind,
      mediaId: inboundEvent.mediaId || "",
    });
    return "skipped";
  }

  const logRef = db.collection("instagramAutomationDeliveries").doc(
    deliveryId(connection.instagramUserId, inboundEvent.sourceId, rule.id),
  );
  try {
    await logRef.create({
      uid: connection.uid,
      instagramUserId: connection.instagramUserId,
      sourceId: inboundEvent.sourceId,
      sourceKind: inboundEvent.kind,
      ruleId: rule.id,
      status: "sending",
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      logger.info("Instagram automation skipped", {reason: "duplicate_delivery", ruleId: rule.id});
      return "skipped";
    }
    throw error;
  }

  const reserved = await reserveInstagramDelivery(
    connection.uid,
    entitlements.maxInstagramDeliveriesPerMonth,
  );
  if (!reserved) {
    await logRef.update({
      status: "skipped_quota",
      skippedAt: FieldValue.serverTimestamp(),
      monthlyLimit: entitlements.maxInstagramDeliveriesPerMonth,
    });
    logger.info("Instagram automation skipped", {
      reason: "monthly_quota",
      uid: connection.uid,
      plan,
    });
    return "skipped";
  }

  try {
    const token = decryptSecret(connection.accessToken, metaTokenEncryptionKey.value());
    const recipient = inboundEvent.kind === "comment"
      ? {comment_id: inboundEvent.commentId}
      : {id: inboundEvent.senderId};
    const message = rule.buttons?.length ? {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: rule.responseMessage,
            buttons: rule.buttons.map((button) => ({
              type: "web_url",
              url: button.url,
              title: button.label,
            })),
          }],
        },
      },
    } : {text: buildReplyText(rule)};
    const result = await metaFetch(
      `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(connection.instagramUserId)}/messages`,
      {
        method: "POST",
        headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
        body: JSON.stringify({recipient, message}),
      },
    );
    let commentReplySent = false;
    if (inboundEvent.kind === "comment" && inboundEvent.commentId && rule.commentReplies?.length) {
      const replyIndex = Math.abs(
        createHash("sha256").update(inboundEvent.sourceId).digest().readInt32BE(0),
      ) % rule.commentReplies.length;
      try {
        await metaFetch(
          `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(inboundEvent.commentId)}/replies`,
          {
            method: "POST",
            headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
            body: JSON.stringify({message: rule.commentReplies[replyIndex]}),
          },
        );
        commentReplySent = true;
      } catch (replyError) {
        logger.warn("Instagram comment auto-reply failed after DM was sent", {
          commentId: inboundEvent.commentId,
          ruleId: rule.id,
          error: replyError,
        });
      }
    }
    await logRef.update({
      status: "sent",
      sentAt: FieldValue.serverTimestamp(),
      metaMessageId: stringField(result, "message_id"),
      commentReplySent,
    });
    return "sent";
  } catch (error) {
    await logRef.update({
      status: "failed",
      failedAt: FieldValue.serverTimestamp(),
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
    });
    throw error;
  }
}

async function bindPendingNextPostRules(
  connectionRef: DocumentReference,
  connection: InstagramConnection,
  inboundEvent: InstagramInboundEvent,
): Promise<InstagramConnection> {
  if (inboundEvent.kind !== "comment" || !inboundEvent.mediaId) return connection;
  const storedRules = normalizeStoredRules(connection.rules);
  if (!storedRules.some((rule) => rule.isActive && rule.targetMode === "next")) {
    return connection;
  }

  const token = decryptSecret(connection.accessToken, metaTokenEncryptionKey.value());
  const mediaUrl = new URL(
    `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(connection.instagramUserId)}/media`,
  );
  mediaUrl.searchParams.set("fields", "id,timestamp,caption,media_url,thumbnail_url");
  mediaUrl.searchParams.set("limit", "100");
  const mediaResult = await metaFetch(mediaUrl.toString(), {
    headers: {Authorization: `Bearer ${token}`},
  });
  const media = (Array.isArray(mediaResult.data) ? mediaResult.data : [])
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const value = item as Record<string, unknown>;
      const id = stringField(value, "id");
      if (!id) return [];
      const timestamp = Date.parse(stringField(value, "timestamp"));
      return [{
        id,
        timestamp: Number.isFinite(timestamp) ? timestamp : 0,
        caption: stringField(value, "caption"),
        thumbnailUrl: stringField(value, "thumbnail_url") || stringField(value, "media_url"),
      }];
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  let resolvedRules = storedRules;
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(connectionRef);
    const currentRules = normalizeStoredRules(snapshot.data()?.rules);
    let changed = false;
    resolvedRules = currentRules.map((rule) => {
      if (!rule.isActive || rule.targetMode !== "next") return rule;
      const excluded = new Set(rule.excludedPostIds || []);
      const nextMedia = media.find((item) => !excluded.has(item.id));
      if (!nextMedia || nextMedia.id !== inboundEvent.mediaId) return rule;
      changed = true;
      return {
        ...rule,
        targetMode: "selected" as const,
        postIds: [nextMedia.id],
        excludedPostIds: [],
        postThumbnailUrl: nextMedia.thumbnailUrl,
        postCaption: nextMedia.caption,
      };
    });
    if (changed) {
      transaction.update(connectionRef, {
        rules: resolvedRules,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  return {...connection, rules: resolvedRules};
}

export const checkBetaAccess = onCall(betaCallableOptions, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  const uid = request.auth.uid;
  const [memberSnapshot, userSnapshot] = await Promise.all([
    db.collection("betaMembers").doc(uid).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const member = memberSnapshot.data();
  const admin = isSiteAdmin(request.auth.token);
  const legacy = userSnapshot.exists;
  const allowed = admin || (memberSnapshot.exists ? member?.status === "active" : legacy);

  const shouldBackfillLifetimePremium = memberSnapshot.exists
    && member?.status === "active"
    && member?.source === "invite"
    && (userSnapshot.data()?.membershipGrant !== BETA_LIFETIME_PREMIUM_GRANT
      || userSnapshot.data()?.membershipPlan !== "premium");

  if (shouldBackfillLifetimePremium) {
    await db.collection("users").doc(uid).set(betaLifetimePremiumData(), {merge: true});
    await syncProfilePlanVisibility(uid, "premium");
  }

  if (legacy && !memberSnapshot.exists) {
    await db.collection("betaMembers").doc(uid).set({
      uid,
      email: request.auth.token.email || null,
      displayName: request.auth.token.name || null,
      photoURL: request.auth.token.picture || null,
      status: "active",
      source: "legacy",
      joinedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
  }

  return {allowed, admin, legacy, status: member?.status || (allowed ? "active" : "pending")};
});

const EMAIL_SIGNUP_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_SIGNUP_CODE_COOLDOWN_MS = 60 * 1000;
const EMAIL_SIGNUP_CODE_MAX_ATTEMPTS = 5;

const normalizeSignupEmail = (value: unknown) => String(value || "").trim().toLowerCase();
const signupCodeDocumentId = (email: string) => createHash("sha256").update(email).digest("hex");
const hashSignupCode = (salt: string, code: string) =>
  createHash("sha256").update(`${salt}:${code}`).digest("hex");

const assertSignupEmail = (email: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new HttpsError("invalid-argument", "이메일 주소 형식을 확인해주세요.");
  }
};

const assertInviteAvailable = async (code: string) => {
  if (!code || code.length > 40) {
    throw new HttpsError("invalid-argument", "초대코드를 확인해주세요.");
  }
  const inviteSnapshot = await db.collection("betaInviteCodes").doc(inviteCodeId(code)).get();
  const invite = inviteSnapshot.data();
  if (!inviteSnapshot.exists || invite?.status !== "active") {
    throw new HttpsError("permission-denied", "유효하지 않거나 사용 중지된 초대코드입니다.");
  }
  const expiresAt = invite.expiresAt as Timestamp | null | undefined;
  if (expiresAt && expiresAt.toMillis() <= Date.now()) {
    throw new HttpsError("permission-denied", "만료된 초대코드입니다.");
  }
  const maxUses = typeof invite.maxUses === "number" ? invite.maxUses : 1;
  const useCount = typeof invite.useCount === "number" ? invite.useCount : 0;
  if (useCount >= maxUses) {
    throw new HttpsError("resource-exhausted", "사용 가능한 인원을 모두 채운 초대코드입니다.");
  }
};

const redeemInviteForEmailAccount = async (uid: string, email: string, code: string) => {
  const memberRef = db.collection("betaMembers").doc(uid);
  const userRef = db.collection("users").doc(uid);
  const inviteRef = db.collection("betaInviteCodes").doc(inviteCodeId(code));
  await db.runTransaction(async (transaction) => {
    const inviteSnapshot = await transaction.get(inviteRef);
    const invite = inviteSnapshot.data();
    if (!inviteSnapshot.exists || invite?.status !== "active") {
      throw new HttpsError("permission-denied", "유효하지 않거나 사용 중지된 초대코드입니다.");
    }
    const expiresAt = invite.expiresAt as Timestamp | null | undefined;
    if (expiresAt && expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError("permission-denied", "만료된 초대코드입니다.");
    }
    const maxUses = typeof invite.maxUses === "number" ? invite.maxUses : 1;
    const useCount = typeof invite.useCount === "number" ? invite.useCount : 0;
    if (useCount >= maxUses) {
      throw new HttpsError("resource-exhausted", "사용 가능한 인원을 모두 채운 초대코드입니다.");
    }

    transaction.update(inviteRef, {
      useCount: FieldValue.increment(1),
      lastUsedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(memberRef, {
      uid,
      email,
      displayName: null,
      photoURL: null,
      inviteCodeId: inviteRef.id,
      inviteLabel: typeof invite.label === "string" ? invite.label : "",
      status: "active",
      source: "invite",
      joinedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    transaction.set(userRef, {
      ...betaLifetimePremiumData(),
      membershipPeriodStartedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
  });
  await syncProfilePlanVisibility(uid, "premium").catch((error) => {
    logger.warn("Unable to sync profile plan after email signup", {uid, error});
  });
};

export const requestEmailSignupCode = onCall({
  ...betaCallableOptions,
  secrets: [resendApiKey],
}, async (request) => {
  const email = normalizeSignupEmail(request.data?.email);
  const code = normalizeInviteCode(request.data?.inviteCode);
  assertSignupEmail(email);
  await assertInviteAvailable(code);

  try {
    const existingUser = await getAuth().getUserByEmail(email);
    if (existingUser.emailVerified) {
      throw new HttpsError("already-exists", "이미 가입된 이메일이에요. 로그인해주세요.");
    }
    throw new HttpsError("failed-precondition", "이전에 완료되지 않은 가입 계정이 있어요. 관리자에게 문의해주세요.");
  } catch (error: unknown) {
    const errorCode = typeof error === "object" && error && "code" in error
      ? String((error as {code?: unknown}).code || "")
      : "";
    if (error instanceof HttpsError) throw error;
    if (errorCode !== "auth/user-not-found") throw error;
  }

  const verificationCode = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const salt = randomBytes(16).toString("hex");
  const codeRef = db.collection("emailSignupCodes").doc(signupCodeDocumentId(email));
  const now = Date.now();
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(codeRef);
    const lastSentAt = current.data()?.lastSentAt as Timestamp | undefined;
    if (lastSentAt && now - lastSentAt.toMillis() < EMAIL_SIGNUP_CODE_COOLDOWN_MS) {
      throw new HttpsError("resource-exhausted", "인증코드는 1분 후 다시 요청할 수 있어요.");
    }
    transaction.set(codeRef, {
      email,
      inviteCode: code,
      salt,
      codeHash: hashSignupCode(salt, verificationCode),
      attempts: 0,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      lastSentAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(now + EMAIL_SIGNUP_CODE_TTL_MS),
    });
  });

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey.value()}`,
      "Content-Type": "application/json",
      "User-Agent": "linkzip-firebase-functions/1.0",
    },
    body: JSON.stringify({
      from: "Linkzip <no-reply@linkzip.kr>",
      to: [email],
      subject: "[Linkzip] 이메일 인증코드",
      text: `Linkzip 회원가입 인증코드는 ${verificationCode}입니다. 인증코드는 10분 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시해주세요.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#171714"><h1 style="font-size:24px">Linkzip 이메일 인증</h1><p>회원가입 화면에 아래 인증코드를 입력해주세요.</p><div style="margin:28px 0;padding:22px;border:2px solid #171714;border-radius:16px;background:#f0ffd0;font-size:34px;font-weight:800;letter-spacing:8px;text-align:center">${verificationCode}</div><p style="color:#6b7280;font-size:14px">인증코드는 10분 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시해주세요.</p></div>`,
    }),
  });
  if (!resendResponse.ok) {
    const resendError = await resendResponse.text().catch(() => "");
    logger.error("Resend signup code delivery failed", {status: resendResponse.status, body: resendError});
    await codeRef.delete().catch(() => undefined);
    throw new HttpsError("internal", "인증코드를 보내지 못했어요. 잠시 후 다시 시도해주세요.");
  }

  return {sent: true, expiresInSeconds: EMAIL_SIGNUP_CODE_TTL_MS / 1000};
});

export const completeEmailSignup = onCall(betaCallableOptions, async (request) => {
  const email = normalizeSignupEmail(request.data?.email);
  const password = String(request.data?.password || "");
  const inviteCode = normalizeInviteCode(request.data?.inviteCode);
  const verificationCode = String(request.data?.verificationCode || "").trim();
  assertSignupEmail(email);
  if (password.length < 8 || password.length > 128) {
    throw new HttpsError("invalid-argument", "비밀번호는 8자 이상으로 만들어주세요.");
  }
  if (!/^\d{6}$/.test(verificationCode)) {
    throw new HttpsError("invalid-argument", "6자리 인증코드를 입력해주세요.");
  }

  const codeRef = db.collection("emailSignupCodes").doc(signupCodeDocumentId(email));
  const verificationResult = await db.runTransaction(async (transaction) => {
    const codeSnapshot = await transaction.get(codeRef);
    const pending = codeSnapshot.data();
    if (!codeSnapshot.exists || !pending) return {accepted: false, reason: "missing"};
    if (pending.inviteCode !== inviteCode) return {accepted: false, reason: "invite"};
    const expiresAt = pending.expiresAt as Timestamp | undefined;
    if (!expiresAt || expiresAt.toMillis() <= Date.now()) return {accepted: false, reason: "expired"};
    const attempts = typeof pending.attempts === "number" ? pending.attempts : 0;
    if (attempts >= EMAIL_SIGNUP_CODE_MAX_ATTEMPTS) return {accepted: false, reason: "attempts"};
    if (pending.status !== "pending") return {accepted: false, reason: "busy"};
    const expected = Buffer.from(String(pending.codeHash || ""), "hex");
    const actual = Buffer.from(hashSignupCode(String(pending.salt || ""), verificationCode), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      transaction.update(codeRef, {attempts: FieldValue.increment(1)});
      return {accepted: false, reason: "code"};
    }
    transaction.update(codeRef, {status: "consuming", consumingAt: FieldValue.serverTimestamp()});
    return {accepted: true, reason: "ok"};
  });

  if (!verificationResult.accepted) {
    if (verificationResult.reason === "code") throw new HttpsError("permission-denied", "인증코드가 올바르지 않아요.");
    if (verificationResult.reason === "attempts") throw new HttpsError("resource-exhausted", "인증 시도 횟수를 초과했어요. 코드를 다시 받아주세요.");
    if (verificationResult.reason === "busy") throw new HttpsError("aborted", "가입 처리가 진행 중이에요. 잠시만 기다려주세요.");
    throw new HttpsError("deadline-exceeded", "인증코드가 만료됐어요. 코드를 다시 받아주세요.");
  }

  let createdUid = "";
  let inviteCommitted = false;
  try {
    const userRecord = await getAuth().createUser({email, password, emailVerified: true});
    createdUid = userRecord.uid;
    await redeemInviteForEmailAccount(createdUid, email, inviteCode);
    inviteCommitted = true;
    await codeRef.delete().catch((error) => {
      logger.warn("Unable to delete consumed email signup code", {email, error});
    });
    return {created: true};
  } catch (error: unknown) {
    if (createdUid && !inviteCommitted) await getAuth().deleteUser(createdUid).catch(() => undefined);
    if (!inviteCommitted) await codeRef.set({status: "pending"}, {merge: true}).catch(() => undefined);
    const errorCode = typeof error === "object" && error && "code" in error
      ? String((error as {code?: unknown}).code || "")
      : "";
    if (errorCode === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "이미 가입된 이메일이에요. 로그인해주세요.");
    }
    throw error;
  }
});

export const validateBetaInvite = onCall(betaCallableOptions, async (request) => {
  const code = normalizeInviteCode(request.data?.code);
  if (!code || code.length > 40) {
    throw new HttpsError("invalid-argument", "초대코드를 확인해주세요.");
  }

  const inviteSnapshot = await db.collection("betaInviteCodes").doc(inviteCodeId(code)).get();
  const invite = inviteSnapshot.data();
  if (!inviteSnapshot.exists || invite?.status !== "active") {
    throw new HttpsError("permission-denied", "유효하지 않거나 사용 중지된 초대코드입니다.");
  }
  const expiresAt = invite.expiresAt as Timestamp | null | undefined;
  if (expiresAt && expiresAt.toMillis() <= Date.now()) {
    throw new HttpsError("permission-denied", "만료된 초대코드입니다.");
  }
  const maxUses = typeof invite.maxUses === "number" ? invite.maxUses : 1;
  const useCount = typeof invite.useCount === "number" ? invite.useCount : 0;
  if (useCount >= maxUses) {
    throw new HttpsError("resource-exhausted", "사용 가능한 인원을 모두 채운 초대코드입니다.");
  }

  return {valid: true};
});

export const redeemBetaInvite = onCall(betaCallableOptions, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  const uid = request.auth.uid;
  const code = normalizeInviteCode(request.data?.code);
  if (!code || code.length > 40) {
    throw new HttpsError("invalid-argument", "초대코드를 확인해주세요.");
  }

  const memberRef = db.collection("betaMembers").doc(uid);
  const userRef = db.collection("users").doc(uid);
  const inviteRef = db.collection("betaInviteCodes").doc(inviteCodeId(code));
  const lifetimePremiumGranted = await db.runTransaction(async (transaction) => {
    const [memberSnapshot, inviteSnapshot] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(inviteRef),
    ]);
    if (memberSnapshot.exists && memberSnapshot.data()?.status !== "active") {
      throw new HttpsError("permission-denied", "이용이 중지된 계정입니다. 관리자에게 문의해주세요.");
    }

    if (memberSnapshot.data()?.source === "invite") {
      transaction.set(userRef, betaLifetimePremiumData(), {merge: true});
      return true;
    }

    if (isSiteAdmin(request.auth!.token)) {
      transaction.set(memberRef, {
        uid,
        email: request.auth!.token.email || null,
        displayName: request.auth!.token.name || null,
        photoURL: request.auth!.token.picture || null,
        status: "active",
        source: "admin",
        joinedAt: FieldValue.serverTimestamp(),
      }, {merge: true});
      return false;
    }

    const invite = inviteSnapshot.data();
    if (!inviteSnapshot.exists || invite?.status !== "active") {
      throw new HttpsError("permission-denied", "유효하지 않거나 사용 중지된 초대코드입니다.");
    }
    const expiresAt = invite.expiresAt as Timestamp | null | undefined;
    if (expiresAt && expiresAt.toMillis() <= Date.now()) {
      throw new HttpsError("permission-denied", "만료된 초대코드입니다.");
    }
    const maxUses = typeof invite.maxUses === "number" ? invite.maxUses : 1;
    const useCount = typeof invite.useCount === "number" ? invite.useCount : 0;
    if (useCount >= maxUses) {
      throw new HttpsError("resource-exhausted", "사용 가능한 인원을 모두 채운 초대코드입니다.");
    }

    transaction.update(inviteRef, {
      useCount: FieldValue.increment(1),
      lastUsedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(memberRef, {
      uid,
      email: request.auth!.token.email || null,
      displayName: request.auth!.token.name || null,
      photoURL: request.auth!.token.picture || null,
      inviteCodeId: inviteRef.id,
      inviteLabel: typeof invite.label === "string" ? invite.label : "",
      status: "active",
      source: "invite",
      joinedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    transaction.set(userRef, {
      ...betaLifetimePremiumData(),
      membershipPeriodStartedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    return true;
  });
  if (lifetimePremiumGranted) await syncProfilePlanVisibility(uid, "premium");
  return {allowed: true};
});

export const getSiteAdminDashboard = onCall(betaCallableOptions, async (request) => {
  requireSiteAdmin(request);
  const authAccounts = [];
  let nextPageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(1000, nextPageToken);
    authAccounts.push(...page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  const [inviteSnapshot, memberSnapshot] = await Promise.all([
    db.collection("betaInviteCodes").limit(200).get(),
    db.collection("betaMembers").limit(1000).get(),
  ]);
  const userSnapshots = authAccounts.length
    ? await db.getAll(...authAccounts.map((account) => db.collection("users").doc(account.uid)))
    : [];
  const userByUid = new Map(userSnapshots.filter((item) => item.exists).map((item) => [item.id, item.data() || {}]));
  const memberByUid = new Map(memberSnapshot.docs.map((item) => [item.id, item.data()]));
  const activitySnapshots = await Promise.allSettled([
    db.collection("publicProfiles").get(),
    db.collectionGroup("sales_orders").limit(5000).get(),
    db.collectionGroup("donations").limit(5000).get(),
    db.collection("guestbooks").limit(5000).get(),
    db.collectionGroup("anonymous_messages").limit(5000).get(),
    db.collectionGroup("collected_customer_data").limit(5000).get(),
    db.collection("tossPaymentOrders").where("kind", "==", "membership").limit(5000).get(),
  ]);
  const docsAt = (index: number) => activitySnapshots[index].status === "fulfilled"
    ? activitySnapshots[index].value.docs
    : [];
  const increment = (map: Map<string, number>, key: string | undefined) => {
    if (key) map.set(key, (map.get(key) || 0) + 1);
  };
  const salesByUid = new Map<string, number>();
  const donationsByUid = new Map<string, number>();
  const messagesByUid = new Map<string, number>();
  const guestbooksByUid = new Map<string, number>();
  const customerDataByUid = new Map<string, number>();
  const unreadMessagesByUid = new Map<string, number>();
  const paidSalesByUid = new Map<string, number>();
  const pendingSalesByUid = new Map<string, number>();
  const salesRevenueByUid = new Map<string, number>();
  const donationRevenueByUid = new Map<string, number>();
  const latestActivityByUid = new Map<string, string>();
  const profilesByUid = new Map<string, Array<Record<string, unknown>>>();
  const timestampText = (value: unknown) => value instanceof Timestamp
    ? value.toDate().toISOString()
    : typeof value === "string" ? value : null;
  const recordActivity = (uid: string | undefined, data: FirebaseFirestore.DocumentData) => {
    if (!uid) return;
    const candidate = timestampText(data.paidAt) || timestampText(data.createdAt) || timestampText(data.updatedAt);
    if (candidate && candidate > (latestActivityByUid.get(uid) || "")) latestActivityByUid.set(uid, candidate);
  };
  docsAt(0).forEach((item) => {
    const profile = item.data();
    const uid = typeof profile.ownerUid === "string" ? profile.ownerUid : undefined;
    if (!uid) return;
    const links = Array.isArray(profile.customLinks) ? profile.customLinks : [];
    const details = profilesByUid.get(uid) || [];
    details.push({
      id: item.id,
      username: typeof profile.username === "string" ? profile.username : "",
      name: typeof profile.profile?.name === "string" ? profile.profile.name : "",
      blockCount: links.length,
      visibleBlockCount: links.filter((link: Record<string, unknown>) => link?.isVisible !== false).length,
      updatedAt: timestampText(profile.updatedAt),
    });
    profilesByUid.set(uid, details);
  });
  docsAt(1).forEach((item) => {
    const uid = item.ref.parent.parent?.id;
    const order = item.data();
    increment(salesByUid, uid);
    if (order.status === "paid") {
      increment(paidSalesByUid, uid);
      if (uid) salesRevenueByUid.set(uid, (salesRevenueByUid.get(uid) || 0) + (Number(order.amount) || 0));
    } else if (order.status === "pending") increment(pendingSalesByUid, uid);
    recordActivity(uid, order);
  });
  docsAt(2).forEach((item) => {
    const uid = item.ref.parent.parent?.id;
    const donation = item.data();
    increment(donationsByUid, uid);
    if (uid) donationRevenueByUid.set(uid, (donationRevenueByUid.get(uid) || 0) + (Number(donation.amount) || 0));
    recordActivity(uid, donation);
  });
  docsAt(4).forEach((item) => {
    const uid = item.ref.parent.parent?.id;
    increment(messagesByUid, uid);
    if (item.data().isRead !== true) increment(unreadMessagesByUid, uid);
    recordActivity(uid, item.data());
  });
  docsAt(5).forEach((item) => {
    const uid = item.ref.parent.parent?.id;
    increment(customerDataByUid, uid);
    recordActivity(uid, item.data());
  });
  docsAt(3).forEach((item) => {
    const entry = item.data();
    const ownerUid = typeof entry.targetOwnerUid === "string" ? entry.targetOwnerUid : undefined;
    increment(guestbooksByUid, ownerUid);
    recordActivity(ownerUid, entry);
  });
  const membershipPaymentsByUid = new Map<string, {count: number; amount: number; lastPaidAt: string | null}>();
  docsAt(6).forEach((item) => {
    const payment = item.data();
    if (payment.status !== "PAID" || typeof payment.ownerUid !== "string") return;
    const current = membershipPaymentsByUid.get(payment.ownerUid) || {count: 0, amount: 0, lastPaidAt: null};
    const paidAt = timestampText(payment.paidAt) || timestampText(payment.approvedAt);
    membershipPaymentsByUid.set(payment.ownerUid, {
      count: current.count + 1,
      amount: current.amount + (Number(payment.amount) || 0),
      lastPaidAt: paidAt && paidAt > (current.lastPaidAt || "") ? paidAt : current.lastPaidAt,
    });
  });
  const members = authAccounts.map((account) => {
    const member = memberByUid.get(account.uid);
    const user = userByUid.get(account.uid);
    const workspaces = Array.isArray(user?.profileWorkspaces) ? user.profileWorkspaces : [];
    const profileCount = workspaces.length || (user?.profile || user?.username ? 1 : 0);
    const blockCount = workspaces.length
      ? workspaces.reduce((sum: number, workspace: Record<string, unknown>) => sum + (Array.isArray(workspace.customLinks) ? workspace.customLinks.length : 0), 0)
      : (Array.isArray(user?.customLinks) ? user.customLinks.length : 0);
    const publicProfiles = profilesByUid.get(account.uid) || [];
    const profileDetails = publicProfiles.length ? publicProfiles : workspaces.map((workspace: Record<string, unknown>) => {
      const profile = workspace.profile && typeof workspace.profile === "object" ? workspace.profile as Record<string, unknown> : {};
      const links = Array.isArray(workspace.customLinks) ? workspace.customLinks : [];
      return {
        id: typeof workspace.id === "string" ? workspace.id : "",
        username: typeof profile.username === "string" ? profile.username : "",
        name: typeof profile.name === "string" ? profile.name : "",
        blockCount: links.length,
        visibleBlockCount: links.filter((link: Record<string, unknown>) => link?.isVisible !== false).length,
        updatedAt: typeof workspace.updatedAt === "string" ? workspace.updatedAt : null,
      };
    });
    const membershipPayments = membershipPaymentsByUid.get(account.uid) || {count: 0, amount: 0, lastPaidAt: null};
    const sellerVerification = sellerVerificationResponse(user);
    return {
      uid: account.uid,
      email: account.email || "",
      displayName: account.displayName || "",
      photoURL: account.photoURL || "",
      disabled: account.disabled,
      status: member?.status || (user ? "active" : "pending"),
      betaStatus: member?.status || (user ? "legacy" : "pending"),
      source: member?.source || (user ? "legacy" : "auth"),
      inviteLabel: member?.inviteLabel || "",
      joinedAt: serializeTimestamp(member?.joinedAt) || account.metadata.creationTime || null,
      lastSignInAt: account.metadata.lastSignInTime || null,
      profileCount,
      blockCount,
      membershipPlan: typeof user?.membershipPlan === "string" ? user.membershipPlan : "basic",
      membershipBillingCycle: typeof user?.membershipBillingCycle === "string" ? user.membershipBillingCycle : "",
      membershipPeriodStartedAt: timestampText(user?.membershipPeriodStartedAt),
      membershipPeriodEndsAt: timestampText(user?.membershipPeriodEndsAt),
      membershipGrant: typeof user?.membershipGrant === "string" ? user.membershipGrant : null,
      membershipPaymentProvider: typeof user?.membershipPaymentProvider === "string" ? user.membershipPaymentProvider : "",
      membershipPaymentCount: membershipPayments.count,
      membershipPaidAmount: membershipPayments.amount,
      membershipLastPaidAt: membershipPayments.lastPaidAt,
      username: typeof user?.username === "string" ? user.username : "",
      updatedAt: typeof user?.updatedAt === "string" ? user.updatedAt : null,
      emailVerified: account.emailVerified,
      providers: account.providerData.map((provider) => provider.providerId),
      profiles: profileDetails,
      salesOrders: salesByUid.get(account.uid) || 0,
      paidSalesOrders: paidSalesByUid.get(account.uid) || 0,
      pendingSalesOrders: pendingSalesByUid.get(account.uid) || 0,
      salesRevenue: salesRevenueByUid.get(account.uid) || 0,
      donations: donationsByUid.get(account.uid) || 0,
      donationRevenue: donationRevenueByUid.get(account.uid) || 0,
      guestbookEntries: guestbooksByUid.get(account.uid) || 0,
      anonymousMessages: messagesByUid.get(account.uid) || 0,
      unreadAnonymousMessages: unreadMessagesByUid.get(account.uid) || 0,
      collectedCustomers: customerDataByUid.get(account.uid) || 0,
      latestActivityAt: latestActivityByUid.get(account.uid) || null,
      sellerVerificationStatus: sellerVerification.status,
      sellerType: sellerVerification.sellerType,
      sellerBusinessRegistrationNumber: sellerVerification.businessRegistrationNumber,
      sellerBusinessName: sellerVerification.businessName,
      sellerRepresentativeName: sellerVerification.representativeName,
      sellerBusinessAddress: sellerVerification.businessAddress,
      sellerContactPhone: sellerVerification.contactPhone,
      sellerContactEmail: sellerVerification.contactEmail,
      sellerMailOrderRegistrationNumber: sellerVerification.mailOrderRegistrationNumber,
      sellerMailOrderExemptionReason: sellerVerification.mailOrderExemptionReason,
      sellerBankName: sellerVerification.bankName,
      sellerAccountHolder: sellerVerification.accountHolder,
      sellerAccountNumber: sellerVerification.accountNumber,
      sellerShippingPolicy: sellerVerification.shippingPolicy,
      sellerSubmittedAt: sellerVerification.submittedAt,
      sellerReviewedAt: sellerVerification.reviewedAt,
      sellerRejectionReason: sellerVerification.rejectionReason,
    };
  });
  const invites = inviteSnapshot.docs.map((item) => {
    const invite = item.data();
    return {
      id: item.id,
      code: invite.code || "",
      label: invite.label || "",
      status: invite.status || "disabled",
      maxUses: invite.maxUses || 1,
      useCount: invite.useCount || 0,
      expiresAt: serializeTimestamp(invite.expiresAt),
      createdAt: serializeTimestamp(invite.createdAt),
      lastUsedAt: serializeTimestamp(invite.lastUsedAt),
    };
  }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const countAt = (index: number) => docsAt(index).length;
  const planBreakdown = members.reduce((result, member) => {
    const plan = member.membershipPlan === "premium" || member.membershipPlan === "standard" ? member.membershipPlan : "basic";
    result[plan] += 1;
    return result;
  }, {basic: 0, standard: 0, premium: 0});

  return {
    members,
    invites,
    metrics: {
      totalProfiles: countAt(0),
      totalBlocks: members.reduce((sum, member) => sum + member.blockCount, 0),
      salesOrders: countAt(1),
      donations: countAt(2),
      guestbookEntries: countAt(3),
      anonymousMessages: countAt(4),
      collectedCustomers: countAt(5),
      grossSalesAmount: Array.from(salesRevenueByUid.values()).reduce((sum, amount) => sum + amount, 0),
      grossDonationAmount: Array.from(donationRevenueByUid.values()).reduce((sum, amount) => sum + amount, 0),
      paidMemberships: Array.from(membershipPaymentsByUid.values()).reduce((sum, payment) => sum + payment.count, 0),
      membershipRevenue: Array.from(membershipPaymentsByUid.values()).reduce((sum, payment) => sum + payment.amount, 0),
      planBreakdown,
    },
  };
});

export const createBetaInviteCode = onCall(betaCallableOptions, async (request) => {
  requireSiteAdmin(request);
  const label = cleanString(request.data?.label, 80);
  const maxUses = Math.max(1, Math.min(1000, Math.trunc(Number(request.data?.maxUses) || 1)));
  const expiresAtText = cleanString(request.data?.expiresAt, 64);
  const expiresAtDate = expiresAtText ? new Date(expiresAtText) : null;
  if (expiresAtDate && Number.isNaN(expiresAtDate.getTime())) {
    throw new HttpsError("invalid-argument", "만료일 형식이 올바르지 않습니다.");
  }
  const code = generateInviteCode();
  const ref = db.collection("betaInviteCodes").doc(inviteCodeId(code));
  await ref.set({
    code,
    label: label || "비공개 베타 초대",
    status: "active",
    maxUses,
    useCount: 0,
    expiresAt: expiresAtDate ? Timestamp.fromDate(expiresAtDate) : null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth!.uid,
  });
  return {id: ref.id, code};
});

export const setBetaInviteStatus = onCall(betaCallableOptions, async (request) => {
  requireSiteAdmin(request);
  const id = cleanString(request.data?.id, 128);
  const status = request.data?.status === "active" ? "active" : "disabled";
  if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpsError("invalid-argument", "초대코드 ID가 올바르지 않습니다.");
  await db.collection("betaInviteCodes").doc(id).update({status, updatedAt: FieldValue.serverTimestamp()});
  return {updated: true};
});

export const setBetaMemberStatus = onCall(betaCallableOptions, async (request) => {
  requireSiteAdmin(request);
  const uid = cleanString(request.data?.uid, 128);
  const status = request.data?.status === "active" ? "active" : "disabled";
  if (!uid) throw new HttpsError("invalid-argument", "회원 정보가 올바르지 않습니다.");
  if (uid === request.auth!.uid && status === "disabled") {
    throw new HttpsError("failed-precondition", "현재 관리자 계정은 중지할 수 없습니다.");
  }
  await Promise.all([
    getAuth().updateUser(uid, {disabled: status === "disabled"}),
    db.collection("betaMembers").doc(uid).set({status, updatedAt: FieldValue.serverTimestamp()}, {merge: true}),
  ]);
  return {updated: true};
});

export const setOwnAdminMembershipPlan = onCall(betaCallableOptions, async (request) => {
  requireSiteAdmin(request);
  const requestedPlan = request.data?.planId;
  if (requestedPlan !== "basic" && requestedPlan !== "standard" && requestedPlan !== "premium") {
    throw new HttpsError("invalid-argument", "플랜 정보가 올바르지 않습니다.");
  }
  const uid = request.auth!.uid;
  const now = Timestamp.now();
  const periodEndsAt = requestedPlan === "basic"
    ? null
    : Timestamp.fromDate(new Date("2099-12-31T23:59:59.000Z"));
  await db.collection("users").doc(uid).set({
    membershipPlan: requestedPlan,
    membershipBillingCycle: requestedPlan === "basic" ? null : "admin",
    membershipPeriodStartedAt: requestedPlan === "basic" ? null : now,
    membershipPeriodEndsAt: periodEndsAt,
    membershipPaymentProvider: requestedPlan === "basic" ? null : "admin_override",
    membershipUpdatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
  await syncProfilePlanVisibility(uid, requestedPlan);
  return {
    planId: requestedPlan,
    periodEndsAt: periodEndsAt?.toDate().toISOString() || null,
  };
});

function normalizeKakaoReturnTo(value: string): string {
  const fallback = "https://linkzip.kr/auth/kakao/complete";
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (!kakaoAllowedReturnOrigins.has(url.origin) || url.pathname !== "/auth/kakao/complete") {
      return fallback;
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return fallback;
  }
}

function normalizeNaverReturnTo(value: string): string {
  const fallback = "https://linkzip.kr/auth/naver/complete";
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (!kakaoAllowedReturnOrigins.has(url.origin) || url.pathname !== "/auth/naver/complete") {
      return fallback;
    }
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return fallback;
  }
}

function readCookie(cookieHeader: string, name: string): string {
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== name) continue;
    try {
      return decodeURIComponent(rawValue.join("="));
    } catch {
      return "";
    }
  }
  return "";
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function redirectToKakaoResult(
  response: {redirect: (status: number, url: string) => void},
  returnTo: string,
  payload: Record<string, string>,
): void {
  const url = new URL(normalizeKakaoReturnTo(returnTo));
  url.hash = new URLSearchParams(payload).toString();
  response.redirect(303, url.toString());
}

function redirectToNaverResult(
  response: {redirect: (status: number, url: string) => void},
  returnTo: string,
  payload: Record<string, string>,
): void {
  const url = new URL(normalizeNaverReturnTo(returnTo));
  url.hash = new URLSearchParams(payload).toString();
  response.redirect(303, url.toString());
}

function kakaoPhotoUrl(profile: KakaoProfileResponse): string | undefined {
  const candidate = profile.kakao_account?.profile?.profile_image_url || profile.properties?.profile_image;
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function isAuthError(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === "object" && (error as {code?: unknown}).code === code);
}

async function resolveKakaoFirebaseUid(profile: KakaoProfileResponse): Promise<string> {
  const kakaoId = String(profile.id);
  const account = profile.kakao_account;
  const email = account?.is_email_valid === true && account.is_email_verified === true
    ? account.email?.trim().toLowerCase()
    : undefined;
  const displayName = account?.profile?.nickname?.trim() || profile.properties?.nickname?.trim() || "카카오 사용자";
  const photoURL = kakaoPhotoUrl(profile);
  const identityRef = db.collection("oauthIdentities").doc(`kakao-${kakaoId}`);
  const identity = await identityRef.get();
  const mappedUid = typeof identity.data()?.uid === "string" ? identity.data()!.uid as string : "";

  if (mappedUid) {
    try {
      const existing = await getAuth().getUser(mappedUid);
      const updates: {displayName?: string; photoURL?: string; email?: string} = {};
      if (!existing.displayName && displayName) updates.displayName = displayName;
      if (!existing.photoURL && photoURL) updates.photoURL = photoURL;
      if (!existing.email && email) updates.email = email;
      if (Object.keys(updates).length > 0) await getAuth().updateUser(mappedUid, updates);
      await identityRef.set({lastLoginAt: FieldValue.serverTimestamp()}, {merge: true});
      return mappedUid;
    } catch (error) {
      if (!isAuthError(error, "auth/user-not-found")) throw error;
    }
  }

  let firebaseUser;
  if (email) {
    try {
      firebaseUser = await getAuth().getUserByEmail(email);
    } catch (error) {
      if (!isAuthError(error, "auth/user-not-found")) throw error;
    }
  }

  if (!firebaseUser) {
    const uid = `kakao:${kakaoId}`;
    try {
      firebaseUser = await getAuth().createUser({uid, email, displayName, photoURL});
    } catch (error) {
      if (isAuthError(error, "auth/uid-already-exists")) {
        firebaseUser = await getAuth().getUser(uid);
      } else if (email && isAuthError(error, "auth/email-already-exists")) {
        firebaseUser = await getAuth().getUserByEmail(email);
      } else {
        throw error;
      }
    }
  }

  await identityRef.set({
    provider: "kakao",
    providerUserId: kakaoId,
    uid: firebaseUser.uid,
    email: email || null,
    createdAt: identity.exists ? identity.data()?.createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp(),
  }, {merge: true});
  return firebaseUser.uid;
}

async function resolveNaverFirebaseUid(profile: NaverProfileResponse): Promise<string> {
  const account = profile.response;
  const naverId = account?.id?.trim();
  if (!naverId) throw new Error("Naver profile did not contain an id");

  const displayName = getNaverDisplayName(profile);
  const photoURL = safeHttpUrl(account?.profile_image);
  const email = account?.email?.trim().toLowerCase() || null;
  const uid = `naver:${naverId}`;
  const identityRef = db.collection("oauthIdentities").doc(`naver-${naverId}`);

  let firebaseUser;
  try {
    firebaseUser = await getAuth().getUser(uid);
    const updates: {displayName?: string; photoURL?: string} = {};
    if (displayName && firebaseUser.displayName !== displayName) updates.displayName = displayName;
    if (photoURL && firebaseUser.photoURL !== photoURL) updates.photoURL = photoURL;
    if (Object.keys(updates).length > 0) firebaseUser = await getAuth().updateUser(uid, updates);
  } catch (error) {
    if (!isAuthError(error, "auth/user-not-found")) throw error;
    firebaseUser = await getAuth().createUser({uid, displayName, photoURL});
  }

  const existingIdentity = await identityRef.get();
  await identityRef.set({
    provider: "naver",
    providerUserId: naverId,
    uid: firebaseUser.uid,
    email,
    createdAt: existingIdentity.exists
      ? existingIdentity.data()?.createdAt || FieldValue.serverTimestamp()
      : FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp(),
  }, {merge: true});
  return firebaseUser.uid;
}

function getNaverDisplayName(profile: NaverProfileResponse): string {
  const account = profile.response;
  const emailId = account?.email?.trim().split("@")[0]?.trim();
  return account?.nickname?.trim()
    || account?.name?.trim()
    || emailId
    || "네이버 사용자";
}

function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
): Promise<{accessToken: string; userId: string; permissions: string[]}> {
  const body = new FormData();
  body.set("client_id", metaInstagramAppId.value());
  body.set("client_secret", metaInstagramAppSecret.value());
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", redirectUri);
  body.set("code", code);
  const result = await metaFetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
  });
  const nested = Array.isArray(result.data) && result.data[0] && typeof result.data[0] === "object"
    ? result.data[0] as Record<string, unknown>
    : result;
  const accessToken = stringField(nested, "access_token");
  const userId = String(nested.user_id ?? nested.id ?? "");
  if (!accessToken || !userId) throw new Error("Instagram did not return an access token");
  // The scopes we asked for are not necessarily the ones granted -- the consent
  // screen lets people drop individual permissions and still finish. This list
  // is what Instagram actually approved, and it is the only trustworthy source
  // for that; storing the requested constant instead made the connection status
  // report a clean bill of health it had never checked.
  // Instagram has shipped this field as both a comma-separated string and a
  // list, so accept either rather than silently reading it as empty.
  const rawPermissions = nested.permissions;
  const permissions = (Array.isArray(rawPermissions)
    ? rawPermissions.map((permission) => String(permission))
    : String(rawPermissions ?? "").split(","))
    .map((permission) => permission.trim())
    .filter(Boolean);
  // Only the key names, never the values -- the same object carries the token.
  logger.info("Instagram token exchange fields", {keys: Object.keys(nested)});
  return {accessToken, userId, permissions};
}

async function exchangeLongLivedToken(
  accessToken: string,
): Promise<{accessToken: string; expiresIn: number}> {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", metaInstagramAppSecret.value());
  url.searchParams.set("access_token", accessToken);
  const result = await metaFetch(url.toString());
  const longToken = stringField(result, "access_token");
  if (!longToken) throw new Error("Instagram long-lived token exchange failed");
  return {
    accessToken: longToken,
    expiresIn: typeof result.expires_in === "number" ? result.expires_in : 0,
  };
}

/**
 * Returns `webhookUserId` alongside the display fields because Instagram hands
 * out two different ids for the same account: the app-scoped id the token
 * exchange returns (used for Graph calls) and the Instagram-scoped id that
 * webhook deliveries carry in `entry.id`. Storing only the first meant every
 * real comment and message looked like it belonged to an unknown account.
 */
async function fetchInstagramProfile(
  userId: string,
  accessToken: string,
): Promise<{
  webhookUserId: string;
  username: string;
  name: string;
  profilePictureUrl: string;
}> {
  const url = new URL(
    `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(userId)}`,
  );
  url.searchParams.set("fields", "user_id,username,name,profile_picture_url");
  const result = await metaFetch(url.toString(), {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  return {
    webhookUserId: stringField(result, "user_id"),
    username: stringField(result, "username"),
    name: stringField(result, "name"),
    profilePictureUrl: stringField(result, "profile_picture_url"),
  };
}

async function subscribeInstagramWebhooks(userId: string, accessToken: string): Promise<void> {
  const url = new URL(
    `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(userId)}/subscribed_apps`,
  );
  url.searchParams.set(
    "subscribed_fields",
    "messages,messaging_postbacks,messaging_seen,comments,live_comments",
  );
  await metaFetch(url.toString(), {
    method: "POST",
    headers: {Authorization: `Bearer ${accessToken}`},
  });
}

async function metaFetch(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    data = {raw: text};
  }
  if (!response.ok) {
    const metaError = data.error && typeof data.error === "object"
      ? data.error as Record<string, unknown>
      : undefined;
    const message = typeof metaError?.message === "string"
      ? metaError.message
      : typeof data.error_message === "string"
        ? data.error_message
      : `Meta API request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

function normalizeStoredRules(value: unknown): InstagramAutomationRule[] {
  try {
    return normalizeAutomationRules(value ?? []);
  } catch (error) {
    logger.warn("Ignored invalid stored Instagram automation rules", error);
    return [];
  }
}

function singleQueryString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

async function storedInstagramReturnOrigin(state: string): Promise<string> {
  if (!state) return INSTAGRAM_PRODUCTION_ORIGIN;
  try {
    const snapshot = await db
      .collection("metaInstagramOAuthStates")
      .doc(hashOAuthState(state))
      .get();
    return instagramReturnOrigin(snapshot.data()?.returnOrigin);
  } catch (error) {
    logger.warn("Could not resolve Instagram OAuth return origin", error);
    return INSTAGRAM_PRODUCTION_ORIGIN;
  }
}

function redirectToInstagramResult(
  response: {redirect: (status: number, url: string) => void},
  status: "connected" | "error",
  reason?: string,
  origin: string = INSTAGRAM_PRODUCTION_ORIGIN,
): void {
  const url = new URL(`${origin}/admin/marketing`);
  url.searchParams.set("instagram", status);
  if (reason) url.searchParams.set("reason", reason);
  response.redirect(303, url.toString());
}

function stringField(value: Record<string, unknown>, key: string): string {
  return typeof value[key] === "string" ? value[key] : "";
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as {code?: unknown}).code;
  return code === 6 || code === "already-exists";
}
