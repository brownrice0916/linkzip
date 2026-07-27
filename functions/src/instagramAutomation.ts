import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export interface InstagramAutomationRule {
  id: string;
  keyword: string;
  responseMessage: string;
  targetLinkUrl: string;
  isActive: boolean;
}

export interface InstagramInboundEvent {
  kind: "message" | "comment";
  sourceId: string;
  senderId: string;
  recipientId: string;
  text: string;
  commentId?: string;
}

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  tag: string;
  version: 1;
}

export function normalizeAutomationRules(input: unknown): InstagramAutomationRule[] {
  if (!Array.isArray(input)) throw new Error("Rules must be an array");
  if (input.length > 50) throw new Error("A maximum of 50 rules is allowed");

  const ids = new Set<string>();
  return input.map((value, index) => {
    if (!value || typeof value !== "object") {
      throw new Error(`Rule ${index + 1} is invalid`);
    }

    const candidate = value as Record<string, unknown>;
    const id = requiredText(candidate.id, 100, "Rule ID");
    const keyword = requiredText(candidate.keyword, 100, "Keyword");
    const responseMessage = requiredText(
      candidate.responseMessage,
      900,
      "Response message",
    );
    const targetLinkUrl = optionalUrl(candidate.targetLinkUrl);

    if (ids.has(id)) throw new Error("Rule IDs must be unique");
    ids.add(id);

    return {
      id,
      keyword,
      responseMessage,
      targetLinkUrl,
      isActive: candidate.isActive !== false,
    };
  });
}

export function matchingRule(
  rules: InstagramAutomationRule[],
  text: string,
): InstagramAutomationRule | undefined {
  const normalizedText = text.normalize("NFKC").toLocaleLowerCase("ko-KR");
  return rules.find((rule) => {
    if (!rule.isActive) return false;
    const keyword = rule.keyword.normalize("NFKC").toLocaleLowerCase("ko-KR");
    return keyword === "*" || keyword === "모두" || normalizedText.includes(keyword);
  });
}

export function buildReplyText(rule: InstagramAutomationRule): string {
  if (!rule.targetLinkUrl) return rule.responseMessage;
  return `${rule.responseMessage}\n${rule.targetLinkUrl}`;
}

export function extractInstagramInboundEvents(
  payload: unknown,
): InstagramInboundEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const entries = (payload as {entry?: unknown}).entry;
  if (!Array.isArray(entries)) return [];

  const result: InstagramInboundEvent[] = [];
  for (const rawEntry of entries) {
    if (!rawEntry || typeof rawEntry !== "object") continue;
    const entry = rawEntry as Record<string, unknown>;
    const entryId = stringValue(entry.id);

    const messaging = entry.messaging;
    if (Array.isArray(messaging)) {
      for (const rawMessage of messaging) {
        if (!rawMessage || typeof rawMessage !== "object") continue;
        const event = rawMessage as Record<string, unknown>;
        const message = objectValue(event.message);
        const sender = objectValue(event.sender);
        const recipient = objectValue(event.recipient);
        const text = stringValue(message?.text);
        const sourceId = stringValue(message?.mid);
        const senderId = stringValue(sender?.id);
        const recipientId = stringValue(recipient?.id) || entryId;
        if (message?.is_echo === true || !text || !sourceId || !senderId || !recipientId) {
          continue;
        }
        result.push({kind: "message", sourceId, senderId, recipientId, text});
      }
    }

    const changes = entry.changes;
    if (!Array.isArray(changes)) continue;
    for (const rawChange of changes) {
      if (!rawChange || typeof rawChange !== "object") continue;
      const change = rawChange as Record<string, unknown>;
      if (change.field !== "comments" && change.field !== "live_comments") continue;
      const value = objectValue(change.value);
      const from = objectValue(value?.from);
      const text = stringValue(value?.text);
      const commentId = stringValue(value?.id);
      const senderId = stringValue(from?.id);
      if (!text || !commentId || !senderId || !entryId) continue;
      result.push({
        kind: "comment",
        sourceId: commentId,
        commentId,
        senderId,
        recipientId: entryId,
        text,
      });
    }
  }
  return result;
}

export function encryptSecret(value: string, encodedKey: string): EncryptedSecret {
  const key = encryptionKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    version: 1,
  };
}

export function decryptSecret(value: EncryptedSecret, encodedKey: string): string {
  if (value.version !== 1) throw new Error("Unsupported encrypted secret version");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(encodedKey),
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function randomOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export function deliveryId(
  instagramUserId: string,
  sourceId: string,
  ruleId: string,
): string {
  return createHash("sha256")
    .update(`${instagramUserId}:${sourceId}:${ruleId}`)
    .digest("hex");
}

function requiredText(value: unknown, maxLength: number, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`${label} is invalid`);
  }
  return value.trim();
}

function optionalUrl(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > 500) {
    throw new Error("Target URL is invalid");
  }
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Target URL must use HTTP or HTTPS");
  }
  return url.toString();
}

function encryptionKey(encodedKey: string): Buffer {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error("META_TOKEN_ENCRYPTION_KEY must contain 32 base64-encoded bytes");
  }
  return key;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
