import { auth } from '../lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import type { MembershipBillingCycle, MembershipPlan } from '../domain/membershipPlans';
import type { BankTransferInstructions } from './commerceService';

const CREATE_MEMBERSHIP_ORDER_URL = import.meta.env.VITE_TOSS_MEMBERSHIP_CREATE_URL
  || 'https://asia-northeast3-profilelinks-d81ec.cloudfunctions.net/createTossMembershipOrder';
const CONFIRM_MEMBERSHIP_PAYMENT_URL = import.meta.env.VITE_TOSS_MEMBERSHIP_CONFIRM_URL
  || 'https://asia-northeast3-profilelinks-d81ec.cloudfunctions.net/confirmTossMembershipPayment';

export interface MembershipPaymentOrder {
  orderNumber: string;
  orderName: string;
  amount: number;
  paymentProvider: 'toss' | 'bank_transfer';
  bankTransfer?: BankTransferInstructions;
}

export interface MembershipPaymentConfirmation {
  planId: MembershipPlan;
  planName: string;
  billingCycle: MembershipBillingCycle;
  amount: number;
  orderNumber: string;
  periodEndsAt: string;
  approvedAt: string | null;
}

export async function setOwnAdminMembershipPlan(planId: MembershipPlan) {
  const callable = httpsCallable<{planId: MembershipPlan}, {planId: MembershipPlan; periodEndsAt: string | null}>(
    getFunctions(app, 'asia-northeast3'),
    'setOwnAdminMembershipPlan',
  );
  return (await callable({ planId })).data;
}

async function authenticatedHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인 후 플랜을 결제해주세요.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await user.getIdToken()}`,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { message?: string } & T;
  if (!response.ok) throw new Error(body.message || '플랜 결제를 처리하지 못했습니다.');
  return body;
}

export async function createMembershipPaymentOrder(
  planId: Exclude<MembershipPlan, 'basic'>,
  billingCycle: MembershipBillingCycle,
  options: { paymentProvider?: 'toss' | 'bank_transfer'; depositorName?: string; buyerContact?: string } = {},
): Promise<MembershipPaymentOrder> {
  const response = await fetch(CREATE_MEMBERSHIP_ORDER_URL, {
    method: 'POST',
    headers: await authenticatedHeaders(),
    body: JSON.stringify({ planId, billingCycle, ...options }),
  });
  return parseResponse(response);
}

export async function confirmTossMembershipPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<MembershipPaymentConfirmation> {
  const response = await fetch(CONFIRM_MEMBERSHIP_PAYMENT_URL, {
    method: 'POST',
    headers: await authenticatedHeaders(),
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  return parseResponse(response);
}
