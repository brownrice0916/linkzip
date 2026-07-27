import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  confirmTossDonationPayment,
  type TossDonationConfirmation,
} from '../services/commerceService';

export default function DonationPaymentSuccess() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<TossDonationConfirmation | null>(null);
  const [error, setError] = useState('');
  const profile = params.get('profile') || '';

  useEffect(() => {
    const paymentKey = params.get('paymentKey') || '';
    const orderId = params.get('orderId') || '';
    const amount = Number(params.get('amount'));
    if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount <= 0) {
      setError('후원 결제 승인 정보가 올바르지 않습니다.');
      return;
    }
    void confirmTossDonationPayment(paymentKey, orderId, amount)
      .then(setResult)
      .catch((reason) => setError(reason instanceof Error ? reason.message : '후원 결제 승인에 실패했습니다.'));
  }, [params]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl">
        {!result && !error && (
          <>
            <LoaderCircle className="mx-auto h-12 w-12 animate-spin" />
            <h1 className="mt-5 text-xl font-black">후원 결제를 확인하고 있습니다</h1>
            <p className="mt-2 text-sm text-gray-500">창을 닫지 말고 잠시 기다려주세요.</p>
          </>
        )}
        {result && (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            <h1 className="mt-5 text-2xl font-black">후원이 완료되었습니다</h1>
            <p className="mt-2 text-sm text-gray-500">따뜻한 마음이 안전하게 전달되었습니다.</p>
            <div className="mt-5 space-y-2 rounded-2xl bg-gray-50 p-4 text-left text-sm">
              <p><span className="text-gray-500">후원자</span><strong className="float-right">{result.nickname}</strong></p>
              <p><span className="text-gray-500">후원 금액</span><strong className="float-right">{result.amount.toLocaleString()}원</strong></p>
              <p><span className="text-gray-500">결제번호</span><strong className="float-right font-mono text-xs">{result.orderNumber}</strong></p>
            </div>
          </>
        )}
        {error && (
          <>
            <XCircle className="mx-auto h-14 w-14 text-red-500" />
            <h1 className="mt-5 text-2xl font-black">후원을 완료하지 못했습니다</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{error}</p>
          </>
        )}
        {(result || error) && (
          <Link to={profile ? `/${profile}` : '/'} className="mt-6 block rounded-2xl bg-black py-4 text-sm font-black text-white">
            프로필로 돌아가기
          </Link>
        )}
      </section>
    </main>
  );
}
