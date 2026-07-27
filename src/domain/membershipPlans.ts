export type MembershipPlan = 'basic' | 'standard' | 'premium';

export interface MembershipPlanDefinition {
  id: MembershipPlan;
  name: string;
  nameKo: string;
  monthlyPrice: number;
  description: string;
  descriptionKo: string;
  features: string[];
  featuresKo: string[];
  accent: 'slate' | 'violet' | 'amber';
  recommended?: boolean;
}

export const MEMBERSHIP_PLANS: MembershipPlanDefinition[] = [
  {
    id: 'basic',
    name: 'Basic',
    nameKo: '베이직',
    monthlyPrice: 0,
    description: 'A simple profile for essential links.',
    descriptionKo: '꼭 필요한 링크를 가볍게 운영하는 플랜',
    features: ['1 profile', 'Links and collections', 'Basic design', 'Basic analytics'],
    featuresKo: ['프로필 1개', '링크 및 그룹', '기본 디자인', '기본 통계'],
    accent: 'slate',
  },
  {
    id: 'standard',
    name: 'Standard',
    nameKo: '스탠다드',
    monthlyPrice: 3900,
    description: 'All content blocks and advanced customization.',
    descriptionKo: '콘텐츠와 디자인 기능을 충분히 활용하는 플랜',
    features: ['Up to 5 profiles', 'All content blocks', 'Detailed customization', 'Advanced analytics'],
    featuresKo: ['프로필 최대 5개', '모든 콘텐츠 블록', '세부 디자인 설정', '상세 통계 분석'],
    accent: 'violet',
    recommended: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    nameKo: '프리미엄',
    monthlyPrice: 9900,
    description: 'Sales, automation, and audience tools for business.',
    descriptionKo: '판매·자동화·고객 관리까지 필요한 비즈니스 플랜',
    features: ['Unlimited profiles', 'Sales and donations', 'DM automation', 'Audience management'],
    featuresKo: ['프로필 무제한', '상품 판매 및 후원', 'DM 자동화', '고객 관리 및 내보내기'],
    accent: 'amber',
  },
];

export const normalizeMembershipPlan = (value: unknown): MembershipPlan =>
  value === 'standard' || value === 'premium' ? value : 'basic';
