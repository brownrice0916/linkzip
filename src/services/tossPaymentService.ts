import { ANONYMOUS, loadTossPayments } from '@tosspayments/tosspayments-sdk';

const DEVELOPMENT_TOSS_CLIENT_KEY = 'test_ck_ex6BJGQOVDxl0a9zMvDOVW4w2zNb';

function getTossClientKey(): string {
  const configuredKey = import.meta.env.VITE_TOSS_CLIENT_KEY?.trim();
  if (configuredKey) return configuredKey;

  // 로컬 개발 편의를 위한 테스트 키는 개발 빌드에서만 허용한다.
  // 운영 환경에서 테스트 결제가 조용히 실행되는 것보다 명확히 중단하는 편이 안전하다.
  if (import.meta.env.DEV) return DEVELOPMENT_TOSS_CLIENT_KEY;

  throw new Error('결제 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.');
}

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
  const tossPayments = await loadTossPayments(getTossClientKey());
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
