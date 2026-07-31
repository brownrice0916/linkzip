import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { confirmTossMembershipPayment, type MembershipPaymentConfirmation } from '../services/membershipService';
import { useStore } from '../store/useStore';

export default function PlanPaymentSuccess() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<MembershipPaymentConfirmation | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const paymentKey = params.get('paymentKey') || '';
    const orderId = params.get('orderId') || '';
    const amount = Number(params.get('amount'));
    if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount <= 0) {
      setError('결제 승인 정보가 올바르지 않습니다.');
      return;
    }
    void confirmTossMembershipPayment(paymentKey, orderId, amount)
      .then((confirmation) => {
        useStore.setState({
          membershipPlan: confirmation.planId,
          membershipPeriodEndsAt: confirmation.periodEndsAt,
        });
        setResult(confirmation);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : '플랜 결제 승인에 실패했습니다.'));
  }, [params]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl">
        {!result && !error && <><LoaderCircle className="mx-auto h-12 w-12 animate-spin" /><h1 className="mt-5 text-xl font-black">플랜 결제를 확인하고 있습니다</h1><p className="mt-2 text-sm text-gray-500">창을 닫지 말고 잠시 기다려주세요.</p></>}
        {result && <><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" /><h1 className="mt-5 text-2xl font-black">플랜이 활성화되었습니다</h1><div className="mt-5 space-y-2 rounded-2xl bg-gray-50 p-4 text-left text-sm"><p><span className="text-gray-500">플랜</span><strong className="float-right">{result.planName}</strong></p><p><span className="text-gray-500">이용 기간</span><strong className="float-right">{result.billingCycle === 'annual' ? '연간' : '월간'}</strong></p><p><span className="text-gray-500">결제 금액</span><strong className="float-right">{result.amount.toLocaleString()}원</strong></p><p><span className="text-gray-500">이용 종료일</span><strong className="float-right">{new Date(result.periodEndsAt).toLocaleDateString('ko-KR')}</strong></p></div></>}
        {error && <><XCircle className="mx-auto h-14 w-14 text-red-500" /><h1 className="mt-5 text-2xl font-black">플랜 결제를 완료하지 못했습니다</h1><p className="mt-3 text-sm leading-relaxed text-gray-600">{error}</p></>}
        {(result || error) && <a href="/admin/plan" className="mt-6 block rounded-2xl bg-black py-4 text-sm font-black text-white">플랜 관리로 돌아가기</a>}
      </section>
    </main>
  );
}
