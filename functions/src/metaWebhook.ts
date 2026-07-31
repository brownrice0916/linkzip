import {createHash, createHmac, timingSafeEqual} from "node:crypto";

export type MetaWebhookQuery = Record<string, unknown>;

export type WebhookChallengeResult =
  | {ok: true; challenge: string}
  | {ok: false; status: 400 | 403; message: string};

function singleQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export function verifyWebhookChallenge(
  query: MetaWebhookQuery,
  expectedToken: string,
): WebhookChallengeResult {
  const mode = singleQueryValue(query["hub.mode"]);
  const token = singleQueryValue(query["hub.verify_token"]);
  const challenge = singleQueryValue(query["hub.challenge"]);

  if (mode !== "subscribe" || !token || !challenge) {
    return {ok: false, status: 400, message: "Invalid webhook challenge"};
  }

  if (!safeEqual(token, expectedToken)) {
    return {ok: false, status: 403, message: "Invalid verify token"};
  }

  return {ok: true, challenge};
}

/**
 * Accepts a list of secrets because an Instagram Login app signs its webhook
 * deliveries with the Instagram app secret, not the Facebook one. Checking only
 * the Facebook secret rejected every real comment and message event.
 */
export function verifyMetaSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecrets: string[],
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const providedSignature = signatureHeader.slice("sha256=".length);
  return appSecrets.some((appSecret) => {
    if (!appSecret) return false;
    const expectedSignature = createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");
    return safeEqual(providedSignature, expectedSignature);
  });
}

export function webhookEventId(rawBody: Buffer): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

export type SignedRequestPayload = {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
};

/**
 * Verifies a Meta `signed_request` (the deauthorize and data-deletion pings)
 * and returns its payload, or null if it does not check out.
 *
 * Accepts a list of secrets because the same callback URL can be registered
 * under the Facebook app or the Instagram app, and each signs with its own
 * secret — trying both avoids silently rejecting every ping when the URL was
 * filed under the other product.
 */
export function parseSignedRequest(
  signedRequest: string | undefined,
  appSecrets: string[],
): SignedRequestPayload | null {
  if (!signedRequest) return null;
  const [encodedSignature, encodedPayload] = signedRequest.split(".");
  if (!encodedSignature || !encodedPayload) return null;

  // Meta signs the still-encoded payload string, so verify before decoding.
  const provided = base64UrlDecode(encodedSignature);
  const signed = appSecrets.some((secret) => {
    if (!secret) return false;
    const expected = createHmac("sha256", secret).update(encodedPayload).digest();
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  });
  if (!signed) return null;

  try {
    const payload = JSON.parse(
      base64UrlDecode(encodedPayload).toString("utf8"),
    ) as SignedRequestPayload;
    return payload?.algorithm?.toUpperCase() === "HMAC-SHA256" ? payload : null;
  } catch {
    return null;
  }
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
