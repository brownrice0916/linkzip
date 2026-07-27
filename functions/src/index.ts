import {initializeApp} from "firebase-admin/app";
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

initializeApp();

const db = getFirestore();
const metaWebhookVerifyToken = defineSecret("META_WEBHOOK_VERIFY_TOKEN");
const metaAppSecret = defineSecret("META_APP_SECRET");
const metaInstagramAppId = defineSecret("META_INSTAGRAM_APP_ID");
const metaTokenEncryptionKey = defineSecret("META_TOKEN_ENCRYPTION_KEY");
const tossSecretKey = defineSecret("TOSS_SECRET_KEY");

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
    response.set("Access-Control-Allow-Headers", "Content-Type");
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

    let filePath = "";
    let fileName = "";
    if (salesType === "digital_file") {
      const privateUserSnapshot = await db.collection("users").doc(ownerUid).get();
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
        paymentProvider: "toss",
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
        ...(salesType === "digital_file" ? {filePath, fileName} : {}),
        status: "READY",
        idempotencyKey,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    response.status(201).json({id: salesOrderRef.id, orderNumber, amount, orderName});
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
    const requestedAmount = request.body?.amount;

    if (!/^[A-Za-z0-9_-]{6,128}$/.test(ownerUid) || !/^[\p{L}\p{N}._-]{3,30}$/u.test(targetUsername) || !blockId) {
      response.status(400).json({message: "후원받을 프로필 정보를 확인해주세요."});
      return;
    }
    if (!Number.isSafeInteger(requestedAmount) || requestedAmount > 10000000) {
      response.status(400).json({message: "후원 금액을 확인해주세요."});
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
      status: "READY",
      idempotencyKey,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
    });

    response.status(201).json({orderNumber, amount: requestedAmount, orderName});
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

    const orders = snapshot.docs.map((document) => {
      const data = document.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null;
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
      };
    });
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
