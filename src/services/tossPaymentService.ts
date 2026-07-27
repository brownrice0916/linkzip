import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY
  || 'test_ck_ex6BJGQOVDxl0a9zMvDOVW4w2zNb';

export interface TossPaymentRequest {
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerMobilePhone: string;
  targetUsername: string;
}

export async function requestTossPayment(request: TossPaymentRequest): Promise<void> {
  const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
  const payment = tossPayments.payment({ customerKey: ANONYMOUS });
  const profile = encodeURIComponent(request.targetUsername);

  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: request.amount },
    orderId: request.orderId,
    orderName: request.orderName,
    successUrl: `${window.location.origin}/payment/success?profile=${profile}`,
    failUrl: `${window.location.origin}/payment/fail?profile=${profile}`,
    customerName: request.customerName,
    customerEmail: request.customerEmail || undefined,
    customerMobilePhone: request.customerMobilePhone.replace(/\D/g, ''),
    card: {
      useEscrow: false,
      flowMode: 'DEFAULT',
      useCardPoint: false,
      useAppCardOnly: false,
    },
  });
}
