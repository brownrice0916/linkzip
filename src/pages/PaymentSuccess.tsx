import { useEffect, useState } from 'react';
import { CheckCircle2, Download, LoaderCircle, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmTossSalesPayment, type TossPaymentConfirmation } from '../services/commerceService';

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const [result, setResult] = useState<TossPaymentConfirmation | null>(null);
  const [error, setError] = useState('');
  const profile = params.get('profile') || '';

  useEffect(() => {
    const paymentKey = params.get('paymentKey') || '';
    const orderId = params.get('orderId') || '';
    const amount = Number(params.get('amount'));
    if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount <= 0) {
      setError('결제 승인 정보가 올바르지 않습니다.');
      return;
    }
    void confirmTossSalesPayment(paymentKey, orderId, amount)
      .then(setResult)
      .catch((reason) => setError(reason instanceof Error ? reason.message : '결제 승인에 실패했습니다.'));
  }, [params]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl">
        {!result && !error && <><LoaderCircle className="mx-auto h-12 w-12 animate-spin" /><h1 className="mt-5 text-xl font-black">결제를 확인하고 있습니다</h1><p className="mt-2 text-sm text-gray-500">창을 닫지 말고 잠시 기다려주세요.</p></>}
        {result && <><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" /><h1 className="mt-5 text-2xl font-black">결제가 완료되었습니다</h1><div className="mt-5 space-y-2 rounded-2xl bg-gray-50 p-4 text-left text-sm"><p><span className="text-gray-500">상품</span><strong className="float-right">{result.productName}</strong></p><p><span className="text-gray-500">결제 금액</span><strong className="float-right">{result.amount.toLocaleString()}원</strong></p><p><span className="text-gray-500">주문번호</span><strong className="float-right font-mono text-xs">{result.orderNumber}</strong></p></div>{result.downloadUrl && <div className="mt-5"><a href={result.downloadUrl} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white transition hover:bg-emerald-700" download><Download className="h-4 w-4" />{result.downloadFileName || '디지털 파일'} 다운로드</a><p className="mt-2 text-xs text-gray-500">보안을 위해 다운로드 링크는 15분 동안만 유효합니다.</p></div>}{result.downloadError && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">{result.downloadError}</p>}</>}
        {error && <><XCircle className="mx-auto h-14 w-14 text-red-500" /><h1 className="mt-5 text-2xl font-black">결제를 완료하지 못했습니다</h1><p className="mt-3 text-sm leading-relaxed text-gray-600">{error}</p></>}
        {(result || error) && <Link to={profile ? `/${profile}` : '/'} className="mt-6 block rounded-2xl bg-black py-4 text-sm font-black text-white">프로필로 돌아가기</Link>}
      </section>
    </main>
  );
}
