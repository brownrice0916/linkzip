import {Timestamp} from "firebase-admin/firestore";

export type MembershipPlan = "basic" | "standard" | "premium";

export const BETA_LIFETIME_PREMIUM_GRANT = "beta_lifetime_premium";
export const BETA_SHARED_FILE_UPLOAD_BYTES_PER_DAY = 100 * 1024 * 1024;
export const BETA_SHARED_FILE_DOWNLOADS_PER_DAY = 100;

export interface PlanEntitlements {
  maxProfiles: number;
  maxBlocksPerProfile: number | null;
  maxSharedFileBlocks: number;
  maxSharedFileBytes: number;
  maxSharedFileDownloadsPerDay: number;
  maxProductsPerProfile: number | null;
  maxCustomerRecords: number;
  analyticsDays: number | null;
  maxInstagramRules: number | null;
  maxInstagramDeliveriesPerMonth: number | null;
  maxPageStickers: number;
  maxAnimatedStickers: number;
  canUseCustomerForms: boolean;
  canExportCustomerData: boolean;
  canHideBranding: boolean;
  canUseAnimatedStickers: boolean;
  salesFeePercent: number;
}

export const PLAN_ENTITLEMENTS: Record<MembershipPlan, PlanEntitlements> = {
  basic: {
    maxProfiles: 1,
    maxBlocksPerProfile: null,
    maxSharedFileBlocks: 1,
    maxSharedFileBytes: 5 * 1024 * 1024,
    maxSharedFileDownloadsPerDay: 20,
    maxProductsPerProfile: null,
    maxCustomerRecords: 20,
    analyticsDays: 7,
    maxInstagramRules: null,
    maxInstagramDeliveriesPerMonth: null,
    maxPageStickers: 10,
    maxAnimatedStickers: 0,
    canUseCustomerForms: false,
    canExportCustomerData: false,
    canHideBranding: false,
    canUseAnimatedStickers: false,
    salesFeePercent: 5,
  },
  standard: {
    maxProfiles: 3,
    maxBlocksPerProfile: null,
    maxSharedFileBlocks: 5,
    maxSharedFileBytes: 20 * 1024 * 1024,
    maxSharedFileDownloadsPerDay: 100,
    maxProductsPerProfile: null,
    maxCustomerRecords: 1_000,
    analyticsDays: 90,
    maxInstagramRules: null,
    maxInstagramDeliveriesPerMonth: null,
    maxPageStickers: 10,
    maxAnimatedStickers: 3,
    canUseCustomerForms: true,
    canExportCustomerData: true,
    canHideBranding: true,
    canUseAnimatedStickers: true,
    salesFeePercent: 2,
  },
  premium: {
    maxProfiles: 5,
    maxBlocksPerProfile: null,
    maxSharedFileBlocks: 20,
    maxSharedFileBytes: 100 * 1024 * 1024,
    maxSharedFileDownloadsPerDay: 500,
    maxProductsPerProfile: null,
    maxCustomerRecords: 10_000,
    analyticsDays: null,
    maxInstagramRules: null,
    maxInstagramDeliveriesPerMonth: null,
    maxPageStickers: 15,
    maxAnimatedStickers: 5,
    canUseCustomerForms: true,
    canExportCustomerData: true,
    canHideBranding: true,
    canUseAnimatedStickers: true,
    salesFeePercent: 0,
  },
};

export const normalizeMembershipPlan = (value: unknown): MembershipPlan =>
  value === "standard" || value === "premium" ? value : "basic";

const timestampMillis = (value: unknown): number | null => {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const resolveActiveMembershipPlan = (
  data: FirebaseFirestore.DocumentData | undefined,
  now = Date.now(),
): MembershipPlan => {
  if (data?.membershipGrant === BETA_LIFETIME_PREMIUM_GRANT) return "premium";
  const plan = normalizeMembershipPlan(data?.membershipPlan);
  if (plan === "basic") return "basic";
  const endTime = timestampMillis(data?.membershipPeriodEndsAt);
  return endTime !== null && endTime > now ? plan : "basic";
};

export const entitlementsForUser = (data: FirebaseFirestore.DocumentData | undefined) => {
  const plan = resolveActiveMembershipPlan(data);
  return {plan, entitlements: PLAN_ENTITLEMENTS[plan]};
};

export const isBetaLifetimePremium = (data: FirebaseFirestore.DocumentData | undefined) =>
  data?.membershipGrant === BETA_LIFETIME_PREMIUM_GRANT;

export const sharedFileDownloadsPerDayForUser = (data: FirebaseFirestore.DocumentData | undefined) => {
  if (isBetaLifetimePremium(data)) return BETA_SHARED_FILE_DOWNLOADS_PER_DAY;
  return entitlementsForUser(data).entitlements.maxSharedFileDownloadsPerDay;
};
