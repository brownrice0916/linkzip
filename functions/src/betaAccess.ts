import {createHash, randomBytes} from "node:crypto";

export const SITE_ADMIN_EMAILS = new Set(["brownrice0916@gmail.com"]);

export const normalizeInviteCode = (value: unknown): string =>
  typeof value === "string" ? value.trim().toUpperCase().replace(/\s+/g, "") : "";

export const inviteCodeId = (code: string): string =>
  createHash("sha256").update(normalizeInviteCode(code)).digest("hex");

export const generateInviteCode = (): string => {
  const value = randomBytes(5).toString("hex").toUpperCase();
  return `LZ-${value.slice(0, 5)}-${value.slice(5)}`;
};

export const isSiteAdmin = (token: Record<string, unknown>): boolean =>
  token.siteAdmin === true || (
    token.email_verified === true &&
    typeof token.email === "string" &&
    SITE_ADMIN_EMAILS.has(token.email.toLowerCase())
  );
