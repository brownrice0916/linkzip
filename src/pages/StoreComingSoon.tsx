import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';

const StoreComingSoon = () => {
  const location = useLocation();
  const { username } = useParams();
  const isAdmin = location.pathname.startsWith('/admin/');
  const backTo = isAdmin ? '/admin/content' : `/${username || ''}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f4ee] p-5 font-sans text-[#171714]">
      <section className="w-full max-w-lg rounded-[2rem] border-2 border-[#171714] bg-[#fffdfa] p-7 text-center shadow-[8px_8px_0_#171714] sm:p-10">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] border-2 border-[#171714] bg-[#ffd34e] shadow-[4px_4px_0_#ff5f35]">
          <ShoppingBag className="h-9 w-9" />
        </span>
        <span className="mt-7 inline-flex rounded-full bg-[#171714] px-3 py-1 text-[11px] font-black text-white">준비 중</span>
        <h1 className="mt-4 text-3xl font-black tracking-[-0.05em]">스토어를 준비하고 있어요</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-black/55">
          더 안정적인 판매와 구매 경험을 위해 잠시 이용을 막아두었습니다.<br />
          {isAdmin ? '기존 스토어 설정과 상품 데이터는 그대로 보관됩니다.' : '링크집의 다른 콘텐츠는 정상적으로 이용할 수 있어요.'}
        </p>
        <Link to={backTo} className="mt-8 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#171714] px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5">
          <ArrowLeft className="h-4 w-4" /> {isAdmin ? '링크 관리로 돌아가기' : '링크집으로 돌아가기'}
        </Link>
      </section>
    </main>
  );
};

export default StoreComingSoon;
