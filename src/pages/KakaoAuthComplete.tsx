import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { finishKakaoLogin } from '../services/kakaoAuthService';
import LinkZipLogo from '../components/brand/LinkZipLogo';
import { authFlowReturnPath } from '../constants/authFlow';

const KakaoAuthComplete = () => {
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const hash = window.location.hash;
    void finishKakaoLogin(hash)
      .then(() => {
        if (active) window.location.replace(authFlowReturnPath());
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : '카카오 로그인에 실패했습니다.');
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f1e8] p-5 text-[#171714]">
      <section className="w-full max-w-sm rounded-[30px] border-2 border-[#171714] bg-[#fffdf8] p-8 text-center shadow-[8px_8px_0_#171714]">
        <LinkZipLogo markClassName="mx-auto h-16 w-16 rotate-[-3deg]" showText={false} />
        {error ? (
          <>
            <h1 className="mt-6 text-xl font-black">로그인을 완료하지 못했어요</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#6d6960]">{error}</p>
            <button type="button" onClick={() => window.location.replace(authFlowReturnPath())} className="mt-6 w-full cursor-pointer rounded-2xl bg-[#171714] py-3.5 text-sm font-black text-white">다시 시도하기</button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mt-6 h-8 w-8 animate-spin" />
            <h1 className="mt-4 text-xl font-black">카카오 로그인 중</h1>
            <p className="mt-2 text-sm font-semibold text-[#6d6960]">안전하게 계정을 연결하고 있어요.</p>
          </>
        )}
      </section>
    </main>
  );
};

export default KakaoAuthComplete;
