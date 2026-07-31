import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export interface InstagramAutomationRule {
  id: string;
  keyword: string;
  keywords?: string[];
  responseMessage: string;
  targetLinkUrl: string;
  postIds?: string[];
  applyToAllPosts?: boolean;
  targetMode?: "selected" | "next";
  excludedPostIds?: string[];
  postThumbnailUrl?: string;
  postCaption?: string;
  buttons?: Array<{label: string; url: string}>;
  commentReplies?: string[];
  isActive: boolean;
}

export interface InstagramInboundEvent {
  kind: "message" | "comment";
  sourceId: string;
  senderId: string;
  recipientId: string;
  text: string;
  commentId?: string;
  mediaId?: string;
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
    const keywords = optionalTextList(candidate.keywords, 20, 100);
    const postIds = optionalTextList(candidate.postIds, 100, 100);
    const excludedPostIds = optionalTextList(candidate.excludedPostIds, 100, 100);
    // Instagram CDN thumbnail URLs contain signed query parameters and can be
    // substantially longer than a normal destination URL.  Treating them with
    // the 500 character destination-link limit caused otherwise valid rules to
    // be rejected when a real post was selected.
    const postThumbnailUrl = optionalUrl(candidate.postThumbnailUrl, 5000);
    const postCaption = optionalText(candidate.postCaption, 300);
    const commentReplies = optionalTextList(candidate.commentReplies, 10, 300);
    const buttons = optionalButtons(candidate.buttons);

    if (ids.has(id)) throw new Error("Rule IDs must be unique");
    ids.add(id);

    return {
      id,
      keyword,
      ...(keywords.length ? {keywords} : {}),
      responseMessage,
      targetLinkUrl,
      ...(postIds.length ? {postIds} : {}),
      applyToAllPosts: candidate.applyToAllPosts === true,
      targetMode: candidate.targetMode === "next" ? "next" : "selected",
      ...(excludedPostIds.length ? {excludedPostIds} : {}),
      ...(postThumbnailUrl ? {postThumbnailUrl} : {}),
      ...(postCaption ? {postCaption} : {}),
      ...(buttons.length ? {buttons} : {}),
      ...(commentReplies.length ? {commentReplies} : {}),
      isActive: candidate.isActive !== false,
    };
  });
}

export function matchingRule(
  rules: InstagramAutomationRule[],
  text: string,
  mediaId?: string,
  sourceKind: InstagramInboundEvent["kind"] = mediaId ? "comment" : "message",
): InstagramAutomationRule | undefined {
  const normalizedText = text.normalize("NFKC").toLocaleLowerCase("ko-KR");
  return rules.find((rule) => {
    if (!rule.isActive) return false;
    if (rule.targetMode === "next") return false;
    if (sourceKind === "comment" && !rule.applyToAllPosts && rule.postIds?.length && (!mediaId || !rule.postIds.includes(mediaId))) {
      return false;
    }
    const candidates = rule.keywords?.length ? rule.keywords : [rule.keyword];
    return candidates.some((value) => {
      const keyword = value.normalize("NFKC").toLocaleLowerCase("ko-KR");
      return keyword === "*" || keyword === "모두" || normalizedText.includes(keyword);
    });
  });
}

export function buildReplyText(rule: InstagramAutomationRule): string {
  const links = rule.buttons?.length
    ? rule.buttons.map((button) => `${button.label}: ${button.url}`)
    : rule.targetLinkUrl ? [rule.targetLinkUrl] : [];
  return [rule.responseMessage, ...links].filter(Boolean).join("\n");
}

/**
 * A one-line summary of what Meta actually delivered, for the receipt log.
 *
 * When an automation does not fire there are two very different causes -- the
 * delivery never arrived, or it arrived carrying something we do not act on --
 * and the raw payload is not in the logs to tell them apart. Recording the
 * object, the entry ids and the change fields makes that visible without
 * logging comment text or any other message content.
 */
export function describeInstagramWebhookPayload(payload: unknown): {
  object: string;
  entryIds: string[];
  fields: string[];
} {
  const summary = {object: "", entryIds: [] as string[], fields: [] as string[]};
  if (!payload || typeof payload !== "object") return summary;
  summary.object = stringValue((payload as {object?: unknown}).object);

  const entries = (payload as {entry?: unknown}).entry;
  if (!Array.isArray(entries)) return summary;
  for (const rawEntry of entries) {
    if (!rawEntry || typeof rawEntry !== "object") continue;
    const entry = rawEntry as Record<string, unknown>;
    const entryId = stringValue(entry.id);
    if (entryId && !summary.entryIds.includes(entryId)) summary.entryIds.push(entryId);
    // A messaging entry can be a message, a read receipt, a reaction or a
    // postback, and only the first is one we act on. Naming the payload key
    // tells a "received: 0" apart from "nothing worth acting on arrived".
    if (Array.isArray(entry.messaging)) {
      for (const rawMessage of entry.messaging) {
        if (!rawMessage || typeof rawMessage !== "object") continue;
        const keys = Object.keys(rawMessage as Record<string, unknown>)
          .filter((key) => !["sender", "recipient", "timestamp"].includes(key));
        for (const key of keys.length ? keys : ["messaging"]) {
          const field = `messaging.${key}`;
          if (!summary.fields.includes(field)) summary.fields.push(field);
        }
      }
    }
    if (!Array.isArray(entry.changes)) continue;
    for (const rawChange of entry.changes) {
      if (!rawChange || typeof rawChange !== "object") continue;
      const field = stringValue((rawChange as Record<string, unknown>).field);
      if (field && !summary.fields.includes(field)) summary.fields.push(field);
    }
  }
  return summary;
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
      const mediaId = stringValue(objectValue(value?.media)?.id);
      if (!text || !commentId || !senderId || !entryId) continue;
      result.push({
        kind: "comment",
        sourceId: commentId,
        commentId,
        senderId,
        recipientId: entryId,
        text,
        ...(mediaId ? {mediaId} : {}),
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

function optionalTextList(
  value: unknown,
  maxItems: number,
  maxLength: number,
): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).flatMap((item) => {
    if (typeof item !== "string") return [];
    const text = item.trim();
    return text && text.length <= maxLength ? [text] : [];
  });
}

function optionalText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function optionalButtons(value: unknown): Array<{label: string; url: string}> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.label !== "string") return [];
    const label = candidate.label.trim().slice(0, 40);
    const url = optionalUrl(candidate.url);
    return label && url ? [{label, url}] : [];
  });
}

function optionalUrl(value: unknown, maxLength = 500): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > maxLength) {
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
