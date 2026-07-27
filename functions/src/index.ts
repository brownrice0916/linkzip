import {initializeApp} from "firebase-admin/app";
import {FieldValue, Timestamp, getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {HttpsError, onCall, onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";

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
