import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';

const functions = getFunctions(app, 'asia-northeast3');

export const BETA_INVITE_SESSION_KEY = 'linkzip_beta_invite';
export const BETA_ACCESS_ERROR_EVENT = 'linkzip:beta-access-error';

export interface BetaAccessResult {
  allowed: boolean;
  admin?: boolean;
  legacy?: boolean;
  status?: string;
}

export interface BetaInvite {
  id: string;
  code: string;
  label: string;
  status: 'active' | 'disabled';
  maxUses: number;
  useCount: number;
  expiresAt: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
}

export interface BetaMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  disabled: boolean;
  status: string;
  betaStatus: 'active' | 'disabled' | 'legacy' | 'pending' | string;
  source: string;
  inviteLabel: string;
  joinedAt: string | null;
  lastSignInAt: string | null;
  profileCount: number;
  blockCount: number;
  membershipPlan: 'basic' | 'standard' | 'premium' | string;
  membershipBillingCycle: 'monthly' | 'annual' | '' | string;
  membershipPeriodStartedAt: string | null;
  membershipPeriodEndsAt: string | null;
  membershipPaymentProvider: string;
  membershipPaymentCount: number;
  membershipPaidAmount: number;
  membershipLastPaidAt: string | null;
  username: string;
  updatedAt: string | null;
  emailVerified: boolean;
  providers: string[];
  profiles: Array<{
    id: string;
    username: string;
    name: string;
    blockCount: number;
    visibleBlockCount: number;
    updatedAt: string | null;
  }>;
  salesOrders: number;
  paidSalesOrders: number;
  pendingSalesOrders: number;
  salesRevenue: number;
  donations: number;
  donationRevenue: number;
  guestbookEntries: number;
  anonymousMessages: number;
  unreadAnonymousMessages: number;
  collectedCustomers: number;
  latestActivityAt: string | null;
}

export interface SiteAdminMetrics {
  totalProfiles: number;
  totalBlocks: number;
  salesOrders: number;
  donations: number;
  guestbookEntries: number;
  anonymousMessages: number;
  collectedCustomers: number;
  grossSalesAmount: number;
  grossDonationAmount: number;
  paidMemberships: number;
  membershipRevenue: number;
  planBreakdown: {basic: number; standard: number; premium: number};
}

export const checkBetaAccess = async (): Promise<BetaAccessResult> => {
  const callable = httpsCallable<undefined, BetaAccessResult>(functions, 'checkBetaAccess');
  return (await callable()).data;
};

export const redeemBetaInvite = async (code: string): Promise<BetaAccessResult> => {
  const callable = httpsCallable<{code: string}, BetaAccessResult>(functions, 'redeemBetaInvite');
  return (await callable({ code })).data;
};

export const getSiteAdminDashboard = async () => {
  const callable = httpsCallable<undefined, {members: BetaMember[]; invites: BetaInvite[]; metrics: SiteAdminMetrics}>(functions, 'getSiteAdminDashboard');
  return (await callable()).data;
};

export const createBetaInviteCode = async (input: {label: string; maxUses: number; expiresAt?: string}) => {
  const callable = httpsCallable<typeof input, {id: string; code: string}>(functions, 'createBetaInviteCode');
  return (await callable(input)).data;
};

export const setBetaInviteStatus = async (id: string, status: 'active' | 'disabled') => {
  const callable = httpsCallable<{id: string; status: string}, {updated: boolean}>(functions, 'setBetaInviteStatus');
  return (await callable({ id, status })).data;
};

export const setBetaMemberStatus = async (uid: string, status: 'active' | 'disabled') => {
  const callable = httpsCallable<{uid: string; status: string}, {updated: boolean}>(functions, 'setBetaMemberStatus');
  return (await callable({ uid, status })).data;
};

export const betaErrorMessage = (error: unknown) => {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as {message?: unknown}).message || '')
    : '';
  return message.replace(/^Firebase:\s*/i, '').replace(/\s*\(functions\/[\w-]+\)\.?$/i, '') || '초대코드를 확인하지 못했습니다.';
};
