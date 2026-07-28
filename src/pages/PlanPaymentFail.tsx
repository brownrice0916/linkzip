import { XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function PlanPaymentFail() {
  const [params] = useSearchParams();
  const message = params.get('message') || '결제가 취소되었거나 승인되지 않았습니다.';
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl">
        <XCircle className="mx-auto h-14 w-14 text-red-500" />
        <h1 className="mt-5 text-2xl font-black">플랜 결제를 완료하지 못했습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{message}</p>
        <a href="/admin/plan" className="mt-6 block rounded-2xl bg-black py-4 text-sm font-black text-white">플랜 관리로 돌아가기</a>
      </section>
    </main>
  );
}
