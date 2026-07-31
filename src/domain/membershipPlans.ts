import { isPremiumDesignFont } from './designFonts.ts';

export type MembershipPlan = 'basic' | 'standard' | 'premium';
export type MembershipBillingCycle = 'monthly' | 'annual';

export interface MembershipPlanDefinition {
  id: MembershipPlan;
  name: string;
  nameKo: string;
  monthlyPrice: number;
  salesFeePercent: number;
  description: string;
  descriptionKo: string;
  features: string[];
  featuresKo: string[];
  accent: 'slate' | 'violet' | 'amber';
  recommended?: boolean;
}

export type PlanBlockType =
  | 'link'
  | 'image'
  | 'collection'
  | 'donation'
  | 'file'
  | 'sns'
  | 'notice'
  | 'customer_info'
  | 'anonymous_message'
  | 'sales'
  | 'reservation'
  | 'affiliate_product'
  | 'map';

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
  canUseAdvancedDesign: boolean;
  canUseAnimatedStickers: boolean;
  salesFeePercent: number;
}

const MB = 1024 * 1024;

export const BASIC_THEME_IDS = ['minimalist', 'neon-dark', 'soft-gradient', 'air', 'blocks', 'bloom'] as const;

export const isAdvancedTheme = (templateType: unknown, templateValue: unknown) =>
  templateType === 'preset'
  && typeof templateValue === 'string'
  && !BASIC_THEME_IDS.includes(templateValue as (typeof BASIC_THEME_IDS)[number]);

/** Keep the server mirror in functions/src/planEntitlements.ts in sync. */
export const PLAN_ENTITLEMENTS: Record<MembershipPlan, PlanEntitlements> = {
  basic: {
    maxProfiles: 1,
    maxBlocksPerProfile: null,
    maxSharedFileBlocks: 1,
    maxSharedFileBytes: 5 * MB,
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
    canUseAdvancedDesign: false,
    canUseAnimatedStickers: false,
    salesFeePercent: 5,
  },
  standard: {
    maxProfiles: 3,
    maxBlocksPerProfile: null,
    maxSharedFileBlocks: 5,
    maxSharedFileBytes: 20 * MB,
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
    canUseAdvancedDesign: true,
    canUseAnimatedStickers: true,
    salesFeePercent: 2,
  },
  premium: {
    maxProfiles: 5,
    maxBlocksPerProfile: null,
    maxSharedFileBlocks: 20,
    maxSharedFileBytes: 100 * MB,
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
    canUseAdvancedDesign: true,
    canUseAnimatedStickers: true,
    salesFeePercent: 0,
  },
};

export const MEMBERSHIP_PLANS: MembershipPlanDefinition[] = [
  {
    id: 'basic',
    name: 'Basic',
    nameKo: '베이직',
    monthlyPrice: 0,
    salesFeePercent: 5,
    description: 'A simple profile for essential links.',
    descriptionKo: '꼭 필요한 링크를 가볍게 운영하는 플랜',
    features: [
      '1 profile',
      '1 file block · 5 MB per file',
      '20 file downloads per day',
      '5% product sales fee (PG fee separate)',
      '7-day analytics',
      'Basic themes and design',
      'Button design and stickers',
      'Free Instagram DM automation',
    ],
    featuresKo: [
      '프로필 1개',
      '파일 블록 1개 · 파일당 5MB',
      '파일 다운로드 일 20회',
      '상품 판매 수수료 5% · PG 수수료 별도',
      '최근 7일 기본 통계',
      '기본 테마 및 디자인',
      '버튼 디자인 및 스티커',
      '인스타그램 DM 자동화 무료 제공',
    ],
    accent: 'slate',
  },
  {
    id: 'standard',
    name: 'Standard',
    nameKo: '스탠다드',
    monthlyPrice: 3900,
    salesFeePercent: 2,
    description: 'All content blocks and advanced customization.',
    descriptionKo: '콘텐츠와 디자인 기능을 충분히 활용하는 플랜',
    features: [
      'Up to 3 profiles',
      '5 file blocks · 20 MB per file',
      '100 file downloads per day',
      '2% product sales fee (PG fee separate)',
      'Customer forms · up to 1,000 records',
      'Customer data CSV export',
      '90-day detailed analytics',
      'Free Instagram DM automation',
      'Advanced themes and detailed design',
      'Remove LinkZip branding',
    ],
    featuresKo: [
      '프로필 최대 3개',
      '파일 블록 5개 · 파일당 20MB',
      '파일 다운로드 일 100회',
      '상품 판매 수수료 2% · PG 수수료 별도',
      '고객 정보 수집 · 최대 1,000건 보관',
      '고객 데이터 CSV 내보내기',
      '최근 90일 상세 통계',
      '인스타그램 DM 자동화 무료 제공',
      '고급 테마 및 세부 디자인',
      'LinkZip 브랜딩 제거',
    ],
    accent: 'violet',
    recommended: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    nameKo: '프리미엄',
    monthlyPrice: 9900,
    salesFeePercent: 0,
    description: 'Sales, automation, and audience tools for business.',
    descriptionKo: '판매·자동화·고객 관리까지 필요한 비즈니스 플랜',
    features: [
      'Up to 5 profiles',
      '20 file blocks · 100 MB per file',
      '500 file downloads per day',
      '0% product sales fee (PG fee separate)',
      'Customer forms · up to 10,000 records',
      'Customer data CSV export',
      'All-time analytics',
      'Free Instagram DM automation',
      'Advanced themes and detailed design',
      'Remove LinkZip branding',
    ],
    featuresKo: [
      '프로필 최대 5개',
      '파일 블록 20개 · 파일당 100MB',
      '파일 다운로드 일 500회',
      '상품 판매 수수료 0% · PG 수수료 별도',
      '고객 정보 수집 · 최대 10,000건 보관',
      '고객 데이터 CSV 내보내기',
      '전체 기간 상세 통계',
      '인스타그램 DM 자동화 무료 제공',
      '고급 테마 및 세부 디자인',
      'LinkZip 브랜딩 제거',
    ],
    accent: 'amber',
  },
];

export const normalizeMembershipPlan = (value: unknown): MembershipPlan =>
  value === 'standard' || value === 'premium' ? value : 'basic';

export const BETA_LIFETIME_PREMIUM_GRANT = 'beta_lifetime_premium';

const membershipEndTime = (value: unknown): number | null => {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  return null;
};

export const resolveActiveMembershipPlan = (
  value: unknown,
  periodEndsAt: unknown,
  now = Date.now(),
  membershipGrant?: unknown,
): MembershipPlan => {
  if (membershipGrant === BETA_LIFETIME_PREMIUM_GRANT) return 'premium';
  const plan = normalizeMembershipPlan(value);
  if (plan === 'basic') return 'basic';
  const endTime = membershipEndTime(periodEndsAt);
  return endTime !== null && endTime > now ? plan : 'basic';
};

export const entitlementsForPlan = (plan: MembershipPlan): PlanEntitlements => PLAN_ENTITLEMENTS[plan];

type EntitlementLink = {
  type?: string;
  links?: EntitlementLink[];
  salesConfig?: { products?: unknown[] };
};

type EntitlementWorkspace = {
  id?: string;
  templateType?: string;
  templateValue?: string;
  profile?: { hideWatermark?: boolean };
  design?: {
    fontFamily?: string;
    titleFontFamily?: string;
    backgroundImageUrl?: string;
    stickers?: Array<{ value?: string; animated?: boolean }>;
  };
  customLinks?: EntitlementLink[];
};

const flattenEntitlementLinks = (links: EntitlementLink[] = []): EntitlementLink[] =>
  links.flatMap((link) => [link, ...flattenEntitlementLinks(link.links || [])]);

export const workspaceUsage = (workspace: EntitlementWorkspace) => {
  const links = flattenEntitlementLinks(workspace.customLinks || []);
  return {
    blocks: links.length,
    sharedFileBlocks: links.filter((link) => link.type === 'file').length,
    customerForms: links.filter((link) => link.type === 'customer_info').length,
    products: links.reduce((sum, link) => sum + (Array.isArray(link.salesConfig?.products) ? link.salesConfig.products.length : 0), 0),
  };
};

export const validateWorkspacesForPlan = (
  workspaces: EntitlementWorkspace[],
  plan: MembershipPlan,
  previousWorkspaces: EntitlementWorkspace[] = [],
): string | null => {
  const limits = PLAN_ENTITLEMENTS[plan];
  if (workspaces.length > limits.maxProfiles && workspaces.length > previousWorkspaces.length) {
    return `${plan === 'basic' ? '베이직' : plan === 'standard' ? '스탠다드' : '프리미엄'} 플랜은 프로필을 최대 ${limits.maxProfiles}개까지 저장할 수 있습니다.`;
  }
  for (let index = 0; index < workspaces.length; index += 1) {
    const workspace = workspaces[index];
    const usage = workspaceUsage(workspace);
    const previousWorkspace = previousWorkspaces.find((candidate) => candidate.id && candidate.id === workspace.id)
      || previousWorkspaces[index]
      || {};
    const previousUsage = workspaceUsage(previousWorkspace);
    const currentStickers = (workspace.design?.stickers || []).filter((item) => item.value);
    const previousStickers = (previousWorkspace.design?.stickers || []).filter((item) => item.value);
    const currentAnimatedStickerCount = currentStickers.filter((item) => item.animated).length;
    const previousAnimatedStickerCount = previousStickers.filter((item) => item.animated).length;
    if (limits.maxBlocksPerProfile !== null && usage.blocks > limits.maxBlocksPerProfile && usage.blocks > previousUsage.blocks) return `프로필당 블록은 최대 ${limits.maxBlocksPerProfile}개까지 저장할 수 있습니다.`;
    if (usage.sharedFileBlocks > limits.maxSharedFileBlocks && usage.sharedFileBlocks > previousUsage.sharedFileBlocks) return `현재 플랜에서는 파일 공유 블록을 프로필당 최대 ${limits.maxSharedFileBlocks}개까지 사용할 수 있습니다.`;
    if (limits.maxProductsPerProfile !== null && usage.products > limits.maxProductsPerProfile && usage.products > previousUsage.products) return `현재 플랜에서는 프로필당 상품을 최대 ${limits.maxProductsPerProfile}개까지 등록할 수 있습니다.`;
    if (!limits.canUseCustomerForms && usage.customerForms > previousUsage.customerForms) return '고객 정보 수집 블록은 스탠다드 플랜부터 사용할 수 있습니다.';
    if (currentStickers.length > limits.maxPageStickers && currentStickers.length > previousStickers.length) {
      return `현재 플랜에서는 프로필당 스티커를 최대 ${limits.maxPageStickers}개까지 저장할 수 있습니다.`;
    }
    if (currentAnimatedStickerCount > limits.maxAnimatedStickers && currentAnimatedStickerCount > previousAnimatedStickerCount) {
      return `현재 플랜에서는 움직이는 스티커를 최대 ${limits.maxAnimatedStickers}개까지 저장할 수 있습니다.`;
    }
    if (!limits.canUseAdvancedDesign
      && isAdvancedTheme(workspace.templateType, workspace.templateValue)
      && (workspace.templateType !== previousWorkspace.templateType || workspace.templateValue !== previousWorkspace.templateValue)) {
      return '고급 테마는 스탠다드 플랜부터 저장할 수 있습니다.';
    }
    if (!limits.canUseAdvancedDesign) {
      if (workspace.design?.backgroundImageUrl
        && workspace.design.backgroundImageUrl !== previousWorkspace.design?.backgroundImageUrl) {
        return '직접 업로드한 배경 이미지는 스탠다드 플랜부터 저장할 수 있습니다.';
      }
      const premiumFontChanged = (
        isPremiumDesignFont(workspace.design?.fontFamily)
        && workspace.design?.fontFamily !== previousWorkspace.design?.fontFamily
      ) || (
        isPremiumDesignFont(workspace.design?.titleFontFamily)
        && workspace.design?.titleFontFamily !== previousWorkspace.design?.titleFontFamily
      );
      if (premiumFontChanged) return '고급 글꼴은 스탠다드 플랜부터 저장할 수 있습니다.';
    }
    if (!limits.canUseAnimatedStickers) {
      const countAnimated = (candidate: EntitlementWorkspace) => (candidate.design?.stickers || [])
        .filter((item) => item.animated && item.value)
        .reduce<Record<string, number>>((counts, item) => ({
          ...counts,
          [item.value!]: (counts[item.value!] || 0) + 1,
        }), {});
      const currentAnimated = countAnimated(workspace);
      const previousAnimated = countAnimated(previousWorkspace);
      if (Object.entries(currentAnimated).some(([value, count]) => count > (previousAnimated[value] || 0))) {
        return '움직이는 스티커는 스탠다드 플랜부터 저장할 수 있습니다.';
      }
    }
  }
  return null;
};

export const membershipCheckoutAmount = (
  plan: Pick<MembershipPlanDefinition, 'monthlyPrice'>,
  billingCycle: MembershipBillingCycle,
) => billingCycle === 'annual' ? plan.monthlyPrice * 10 : plan.monthlyPrice;
