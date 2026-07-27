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

export function verifyMetaSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const providedSignature = signatureHeader.slice("sha256=".length);
  const expectedSignature = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  return safeEqual(providedSignature, expectedSignature);
}

export function webhookEventId(rawBody: Buffer): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
