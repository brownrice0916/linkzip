import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle } from "../lib/firebase";
import { useStore } from "../store/useStore";
import { Link2, Sparkles, ArrowRight, LayoutDashboard, KeyRound, Loader2, X } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { getUserByUid } from "../services/userService";
import BusinessFooter from "../components/BusinessFooter";
import PrivateBetaBadge from "../components/PrivateBetaBadge";
import {
  BETA_ACCESS_ERROR_EVENT,
  BETA_INVITE_SESSION_KEY,
  betaErrorMessage,
  redeemBetaInvite,
} from "../services/betaAccessService";

const Landing = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const handleError = (event: Event) => {
      setInviteError((event as CustomEvent<string>).detail || '초대코드를 확인해주세요.');
      setIsInviteOpen(true);
      setIsJoining(false);
    };
    window.addEventListener(BETA_ACCESS_ERROR_EVENT, handleError);
    return () => window.removeEventListener(BETA_ACCESS_ERROR_EVENT, handleError);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      sessionStorage.removeItem(BETA_INVITE_SESSION_KEY);
      const user = await signInWithGoogle();
      if (await getUserByUid(user.uid)) {
        navigate("/admin");
      } else {
        navigate("/onboarding/survey");
      }
    } catch (error: any) {
      // Ignore normal user cancellations (closing popup or double clicking)
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        console.log("Google Sign-In popup was closed or cancelled by user.");
        return;
      }

      console.error("Login failed", error);
      alert(
        `로그인 에러: ${
          error?.message || "알 수 없는 오류가 발생했습니다."
        }\n\n1. Firebase Console에서 Google 로그인이 활성화되어 있는지 확인하세요.\n2. API 키가 정확한지 확인하세요.`
      );
    }
  };

  const handleInviteSignup = async () => {
    const code = inviteCode.trim();
    if (!code) {
      setInviteError('초대코드를 입력해주세요.');
      return;
    }
    setInviteError('');
    setIsJoining(true);
    sessionStorage.setItem(BETA_INVITE_SESSION_KEY, code);
    try {
      const signedInUser = await signInWithGoogle();
      await redeemBetaInvite(code);
      sessionStorage.removeItem(BETA_INVITE_SESSION_KEY);
      setIsInviteOpen(false);
      if (await getUserByUid(signedInUser.uid)) navigate('/admin');
      else navigate('/onboarding/survey');
    } catch (error: any) {
      sessionStorage.removeItem(BETA_INVITE_SESSION_KEY);
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        setIsJoining(false);
        return;
      }
      setInviteError(betaErrorMessage(error));
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30 overflow-hidden relative font-sans">
      {/* Background Mesh Gradient Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-600/20 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => user ? navigate('/admin') : null}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">LinkZip</span>
          <PrivateBetaBadge dark />
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <button
              onClick={() => navigate('/admin')}
              className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-gray-100 font-bold text-sm transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard (관리자)</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleGoogleLogin}
                className="hidden md:block px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                Log in
              </button>
              <button
                onClick={() => { setInviteError(''); setIsInviteOpen(true); }}
                className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-gray-100 font-semibold text-sm transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          <span>link zips</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
          Everything you are. <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400">
            In one, simple link.
          </span>
        </h1>

        <button
          onClick={user ? () => navigate('/admin') : () => { setInviteError(''); setIsInviteOpen(true); }}
          className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold text-lg overflow-hidden transition-transform hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] cursor-pointer"
        >
          {user ? (
            <>
              <LayoutDashboard className="w-5 h-5 text-black" />
              <span>Go to Dashboard (관리자로 이동)</span>
            </>
          ) : (
            <>
              <FaGoogle className="w-5 h-5 text-black" />
              <span>Get started</span>
            </>
          )}
          <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="mt-6 text-sm text-gray-500 font-medium">
          Free forever. No credit card required.
        </p>
      </main>

      <BusinessFooter dark />

      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !isJoining && setIsInviteOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="invite-title" className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#151515] p-7 text-left shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setIsInviteOpen(false)} disabled={isJoining} className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed" aria-label="팝업 닫기"><X className="h-4 w-4" /></button>
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300"><KeyRound className="h-7 w-7" /></span>
            <h2 id="invite-title" className="text-xl font-black text-white">비공개 베타 참여</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-400">초대받은 분만 새 계정을 만들 수 있어요. 전달받은 초대코드를 입력해주세요.</p>
            <label className="mt-6 block text-xs font-bold text-gray-300">초대코드
              <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === 'Enter') void handleInviteSignup(); }} autoComplete="off" placeholder="LZ-XXXXX-XXXXX" className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white outline-none transition focus:border-indigo-400 focus:bg-white/10" />
            </label>
            {inviteError && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold leading-relaxed text-red-300">{inviteError}</p>}
            <button type="button" onClick={handleInviteSignup} disabled={isJoining} className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-black text-black transition hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60">{isJoining ? <><Loader2 className="h-4 w-4 animate-spin" /> 확인 중</> : <><FaGoogle className="h-4 w-4" /> 코드 확인 후 가입</>}</button>
          </section>
        </div>
      )}
    </div>
  );
};

export default Landing;
