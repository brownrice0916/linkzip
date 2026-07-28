import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {FieldValue, Timestamp, getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {logger} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {HttpsError, onCall, onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {createHash, randomBytes, randomUUID, timingSafeEqual} from "node:crypto";
import type {Request} from "firebase-functions/v2/https";
import type {Response} from "express";

import {
  buildReplyText,
  decryptSecret,
  deliveryId,
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
  verifyMetaSignature,
  verifyWebhookChallenge,
  webhookEventId,
} from "./metaWebhook.js";
import {
  generateInviteCode,
  inviteCodeId,
  isSiteAdmin,
  normalizeInviteCode,
} from "./betaAccess.js";

initializeApp();

const db = getFirestore();
const metaWebhookVerifyToken = defineSecret("META_WEBHOOK_VERIFY_TOKEN");
const metaAppSecret = defineSecret("META_APP_SECRET");
const metaInstagramAppId = defineSecret("META_INSTAGRAM_APP_ID");
const metaTokenEncryptionKey = defineSecret("META_TOKEN_ENCRYPTION_KEY");
const tossSecretKey = defineSecret("TOSS_SECRET_KEY");

const betaCallableOptions = {
  region: "asia-northeast3" as const,
  memory: "256MiB" as const,
  timeoutSeconds: 30,
};

const requireSiteAdmin = (request: {auth?: {token: Record<string, unknown>}}) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  if (!isSiteAdmin(request.auth.token)) {
    throw new HttpsError("permission-denied", "사이트 관리자만 사용할 수 있습니다.");
  }
};

const serializeTimestamp = (value: unknown): string | null =>
  value instanceof Timestamp ? value.toDate().toISOString() : null;

const instagramRedirectUri = "https://linkzip.kr/auth/instagram/callback";
const instagramGraphVersion = "v24.0";
const instagramScopes = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
];

interface InstagramConnection {
  uid: string;
  instagramUserId: string;
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
  "http://127.0.0.1:5173",
]);

interface PublicSalesProduct {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  discountPrice?: unknown;
  fileName?: unknown;
  filePath?: unknown;
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

    const amount = billingCycle === "annual" ? plan.monthlyPrice * 6 : plan.monthlyPrice;
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

    const block = findPublicLink(publicProfile.customLinks, blockId);
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
    const amount = typeof rawAmount === "number" ? rawAmount : Number.NaN;
    const productName = cleanString(product?.name, 100);
    if (!product || !productName || !Number.isSafeInteger(amount) || amount < 100) {
      response.status(400).json({message: "상품 가격 정보를 확인해주세요."});
      return;
    }

    const privateUserSnapshot = await db.collection("users").doc(ownerUid).get();
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
        salesType,
        buyerName,
        buyerContact,
        buyerEmail,
        shippingAddress: salesType === "product" ? shippingAddress : "",
        postalCode: salesType === "product" ? postalCode : "",
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
      const donationRecord = {
        blockId: orderData.blockId,
        targetUsername: orderData.targetUsername,
        nickname: orderData.nickname,
        message: orderData.message,
        amount: orderData.amount,
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
    const action = request.body?.action === "cancel" ? "cancel" : "confirm";
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
          transaction.set(donationRef, {
            blockId: orderData.blockId,
            targetUsername: orderData.targetUsername,
            nickname: orderData.nickname,
            message: orderData.message,
            amount: orderData.amount,
            paymentId: orderNumber,
            paymentProvider: "bank_transfer",
            createdAt: paidAt,
          });
        } else if (salesOrderRef) {
          transaction.update(salesOrderRef, {
            status: "paid",
            fulfillmentStatus: "preparing",
            paymentProvider: "bank_transfer",
            paymentMethod: "계좌이체",
            paidAt: paidAt.toDate().toISOString(),
          });
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === "ORDER_ALREADY_PROCESSED") {
        response.status(409).json({message: "이미 처리된 주문입니다."});
        return;
      }
      throw error;
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

export const lookupSalesOrder = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 15,
    invoker: "public",
  },
  async (request, response) => {
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

    const ownerUid = typeof request.body?.ownerUid === "string" ? request.body.ownerUid.trim() : "";
    const lookupValue = typeof request.body?.lookupValue === "string" ? request.body.lookupValue.trim() : "";
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(ownerUid) || lookupValue.length < 4 || lookupValue.length > 40) {
      response.status(400).json({message: "휴대폰 번호 또는 주문번호를 확인해주세요."});
      return;
    }

    const normalizedPhone = lookupValue.replace(/\D/g, "");
    const isOrderNumber = /^LZ-\d{8}-(?:[A-Z0-9]{6}|[A-F0-9]{10})$/.test(lookupValue.toUpperCase());
    if (!isOrderNumber && normalizedPhone.length < 9) {
      response.status(400).json({message: "휴대폰 번호를 정확히 입력해주세요."});
      return;
    }

    const ordersRef = db.collection("users").doc(ownerUid).collection("sales_orders");
    const snapshot = await (isOrderNumber
      ? ordersRef.where("orderNumber", "==", lookupValue.toUpperCase()).limit(5)
      : ordersRef.where("buyerContactNormalized", "==", normalizedPhone).limit(10)
    ).get();

    const orders = await Promise.all(snapshot.docs.map(async (document) => {
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

export const metaInstagramWebhook = onRequest(
  {
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 30,
    invoker: "public",
    secrets: [metaWebhookVerifyToken, metaAppSecret],
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
    if (!verifyMetaSignature(request.rawBody, signature, metaAppSecret.value())) {
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

    logger.info("Meta Instagram webhook received", {eventId, duplicate});
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

    const state = randomOAuthState();
    await db.collection("metaInstagramOAuthStates").doc(hashOAuthState(state)).set({
      uid: request.auth.uid,
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
    secrets: [metaInstagramAppId, metaAppSecret, metaTokenEncryptionKey],
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.set("Allow", "GET").status(405).send("Method not allowed");
      return;
    }

    const code = singleQueryString(request.query.code);
    const state = singleQueryString(request.query.state);
    const error = singleQueryString(request.query.error);
    if (error || !code || !state) {
      redirectToInstagramResult(response, "error", "authorization_cancelled");
      return;
    }

    try {
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

      const shortToken = await exchangeAuthorizationCode(code);
      const longToken = await exchangeLongLivedToken(shortToken.accessToken);
      const profile = await fetchInstagramProfile(shortToken.userId, longToken.accessToken);
      await subscribeInstagramWebhooks(shortToken.userId, longToken.accessToken);

      const connectionRef = db.collection("instagramConnections").doc(uid);
      const existing = await connectionRef.get();
      const existingRules = existing.exists ? normalizeStoredRules(existing.data()?.rules) : [];
      await connectionRef.set({
        uid,
        instagramUserId: shortToken.userId,
        username: profile.username,
        name: profile.name,
        profilePictureUrl: profile.profilePictureUrl,
        accessToken: encryptSecret(longToken.accessToken, metaTokenEncryptionKey.value()),
        tokenExpiresAt: longToken.expiresIn
          ? Timestamp.fromMillis(Date.now() + longToken.expiresIn * 1000)
          : null,
        scopes: instagramScopes,
        rules: existingRules,
        status: "connected",
        connectedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});

      redirectToInstagramResult(response, "connected");
    } catch (callbackError) {
      logger.error("Instagram OAuth callback failed", callbackError);
      redirectToInstagramResult(response, "error", "connection_failed");
    }
  },
);

export const getInstagramConnectionStatus = onCall(
  {region: "asia-northeast3", memory: "256MiB", timeoutSeconds: 30},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const snapshot = await db.collection("instagramConnections").doc(request.auth.uid).get();
    const data = snapshot.data();
    if (!snapshot.exists || data?.status !== "connected") return {connected: false};
    return {
      connected: true,
      username: typeof data.username === "string" ? data.username : "",
      name: typeof data.name === "string" ? data.name : "",
      profilePictureUrl: typeof data.profilePictureUrl === "string"
        ? data.profilePictureUrl
        : "",
      rules: normalizeStoredRules(data.rules),
      tokenExpiresAt: data.tokenExpiresAt instanceof Timestamp
        ? data.tokenExpiresAt.toDate().toISOString()
        : null,
    };
  },
);

export const saveInstagramAutomationRules = onCall(
  {region: "asia-northeast3", memory: "256MiB", timeoutSeconds: 30},
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    let rules: InstagramAutomationRule[];
    try {
      rules = normalizeAutomationRules(request.data?.rules);
    } catch (error) {
      throw new HttpsError(
        "invalid-argument",
        error instanceof Error ? error.message : "자동 답장 규칙이 올바르지 않습니다.",
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
  const connections = await db.collection("instagramConnections")
    .where("instagramUserId", "==", inboundEvent.recipientId)
    .limit(1)
    .get();
  if (connections.empty) return "skipped";

  const connection = connections.docs[0].data() as InstagramConnection;
  if (connection.status !== "connected") return "skipped";
  if (connection.instagramUserId === inboundEvent.senderId) return "skipped";
  const rule = matchingRule(normalizeStoredRules(connection.rules), inboundEvent.text);
  if (!rule) return "skipped";

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
    if (isAlreadyExistsError(error)) return "skipped";
    throw error;
  }

  try {
    const token = decryptSecret(connection.accessToken, metaTokenEncryptionKey.value());
    const recipient = inboundEvent.kind === "comment"
      ? {comment_id: inboundEvent.commentId}
      : {id: inboundEvent.senderId};
    const result = await metaFetch(
      `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(connection.instagramUserId)}/messages`,
      {
        method: "POST",
        headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
        body: JSON.stringify({recipient, message: {text: buildReplyText(rule)}}),
      },
    );
    await logRef.update({
      status: "sent",
      sentAt: FieldValue.serverTimestamp(),
      metaMessageId: stringField(result, "message_id"),
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
  await db.runTransaction(async (transaction) => {
    const [memberSnapshot, userSnapshot, inviteSnapshot] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(userRef),
      transaction.get(inviteRef),
    ]);
    if (memberSnapshot.exists) {
      if (memberSnapshot.data()?.status === "active") return;
      throw new HttpsError("permission-denied", "이용이 중지된 계정입니다. 관리자에게 문의해주세요.");
    }

    if (userSnapshot.exists || isSiteAdmin(request.auth!.token)) {
      transaction.set(memberRef, {
        uid,
        email: request.auth!.token.email || null,
        displayName: request.auth!.token.name || null,
        photoURL: request.auth!.token.picture || null,
        status: "active",
        source: userSnapshot.exists ? "legacy" : "admin",
        joinedAt: FieldValue.serverTimestamp(),
      }, {merge: true});
      return;
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
    });
  });
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

async function exchangeAuthorizationCode(
  code: string,
): Promise<{accessToken: string; userId: string}> {
  const body = new URLSearchParams({
    client_id: metaInstagramAppId.value(),
    client_secret: metaAppSecret.value(),
    grant_type: "authorization_code",
    redirect_uri: instagramRedirectUri,
    code,
  });
  const result = await metaFetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body,
  });
  const nested = Array.isArray(result.data) && result.data[0] && typeof result.data[0] === "object"
    ? result.data[0] as Record<string, unknown>
    : result;
  const accessToken = stringField(nested, "access_token");
  const userId = String(nested.user_id ?? nested.id ?? "");
  if (!accessToken || !userId) throw new Error("Instagram did not return an access token");
  return {accessToken, userId};
}

async function exchangeLongLivedToken(
  accessToken: string,
): Promise<{accessToken: string; expiresIn: number}> {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", metaAppSecret.value());
  url.searchParams.set("access_token", accessToken);
  const result = await metaFetch(url.toString());
  const longToken = stringField(result, "access_token");
  if (!longToken) throw new Error("Instagram long-lived token exchange failed");
  return {
    accessToken: longToken,
    expiresIn: typeof result.expires_in === "number" ? result.expires_in : 0,
  };
}

async function fetchInstagramProfile(
  userId: string,
  accessToken: string,
): Promise<{username: string; name: string; profilePictureUrl: string}> {
  const url = new URL(
    `https://graph.instagram.com/${instagramGraphVersion}/${encodeURIComponent(userId)}`,
  );
  url.searchParams.set("fields", "user_id,username,name,profile_picture_url");
  const result = await metaFetch(url.toString(), {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  return {
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
  const response = await fetch(url, init);
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

function redirectToInstagramResult(
  response: {redirect: (status: number, url: string) => void},
  status: "connected" | "error",
  reason?: string,
): void {
  const url = new URL("https://linkzip.kr/admin/marketing");
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
