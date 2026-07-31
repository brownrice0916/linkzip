import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled application error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f1e8] px-5 text-[#171714]">
        <section className="w-full max-w-md rounded-[28px] border-2 border-[#171714] bg-[#fffdf8] p-7 text-center shadow-[8px_8px_0_#171714]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#ffcf4a] text-2xl" aria-hidden="true">!</div>
          <h1 className="text-2xl font-black tracking-tight">화면을 불러오지 못했어요</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">잠시 후 다시 시도해 주세요. 작성 중인 내용이 있다면 새로고침 전에 복사해 두는 것이 안전합니다.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => window.location.reload()} className="min-h-12 rounded-full bg-[#171714] px-5 text-sm font-black text-white">다시 불러오기</button>
            <a href="/" className="flex min-h-12 items-center justify-center rounded-full border-2 border-[#171714] px-5 text-sm font-black">홈으로 이동</a>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
