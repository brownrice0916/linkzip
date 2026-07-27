import { XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export default function PaymentFail() {
  const [params] = useSearchParams();
  const profile = params.get('profile') || '';
  const message = params.get('message') || '결제가 취소되었거나 처리 중 오류가 발생했습니다.';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl">
        <XCircle className="mx-auto h-14 w-14 text-red-500" />
        <h1 className="mt-5 text-2xl font-black">결제가 완료되지 않았습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{message}</p>
        <Link to={profile ? `/${profile}` : '/'} className="mt-6 block rounded-2xl bg-black py-4 text-sm font-black text-white">다시 시도하기</Link>
      </section>
    </main>
  );
}
