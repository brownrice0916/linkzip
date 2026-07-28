import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY
  || 'test_ck_ex6BJGQOVDxl0a9zMvDOVW4w2zNb';

export interface TossPaymentRequest {
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerMobilePhone?: string;
  targetUsername?: string;
  paymentKind?: 'sales' | 'donation' | 'membership';
}

export async function requestTossPayment(request: TossPaymentRequest): Promise<void> {
  const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
  const payment = tossPayments.payment({ customerKey: ANONYMOUS });
  const profileQuery = request.targetUsername ? `?profile=${encodeURIComponent(request.targetUsername)}` : '';
  const paymentPath = request.paymentKind === 'donation'
    ? '/payment/donation'
    : request.paymentKind === 'membership' ? '/payment/plan' : '/payment';

  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: request.amount },
    orderId: request.orderId,
    orderName: request.orderName,
    successUrl: `${window.location.origin}${paymentPath}/success${profileQuery}`,
    failUrl: `${window.location.origin}${paymentPath}/fail${profileQuery}`,
    customerName: request.customerName,
    customerEmail: request.customerEmail || undefined,
    customerMobilePhone: request.customerMobilePhone?.replace(/\D/g, '') || undefined,
    card: {
      useEscrow: false,
      flowMode: 'DEFAULT',
      useCardPoint: false,
      useAppCardOnly: false,
    },
  });
}
