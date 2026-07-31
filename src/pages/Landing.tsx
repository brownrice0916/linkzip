import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  auth,
  EMAIL_SIGNUP_PENDING_KEY,
  finishGoogleRedirectLogin,
  GOOGLE_REDIRECT_PENDING_KEY,
  signInWithGoogle,
} from "../lib/firebase";
import { useStore } from "../store/useStore";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  KeyRound,
  Layers3,
  LayoutDashboard,
  Link2,
  Loader2,
  MailCheck,
  MessageCircle,
  MousePointer2,
  Palette,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  X,
} from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { SiKakao, SiNaver } from "react-icons/si";
import { getUserByUid } from "../services/userService";
import BusinessFooter from "../components/BusinessFooter";
import PrivateBetaBadge from "../components/PrivateBetaBadge";
import LinkZipLogo from "../components/brand/LinkZipLogo";
import {
  BETA_ACCESS_ERROR_EVENT,
  BETA_INVITE_SESSION_KEY,
  betaErrorMessage,
  completeEmailSignup,
  redeemBetaInvite,
  requestEmailSignupCode,
  validateBetaInvite,
} from "../services/betaAccessService";
import { isOnboardingComplete } from "../domain/onboardingSurvey";
import { startKakaoLogin } from "../services/kakaoAuthService";
import { startNaverLogin } from "../services/naverAuthService";
import { LOGIN_INTENT_SESSION_KEY } from "../constants/authFlow";

type SignupProvider = 'google' | 'kakao' | 'naver';
type LoginFeedback = { kind: 'account-not-found' | 'error'; title: string; description: string } | null;
type AuthPageMode = 'login' | 'signup';

interface LandingProps {
  authMode?: AuthPageMode;
}

const isMissingAccountError = (error: any) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code.includes('permission-denied') || message.includes('missing or insufficient permissions');
};

const isCredentialError = (error: any) => {
  const code = String(error?.code || '').toLowerCase();
  return ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(code);
};

const emailAuthMessage = (error: any) => {
  switch (error?.code) {
    case 'auth/email-already-in-use': return '이미 가입된 이메일이에요. 로그인해주세요.';
    case 'auth/invalid-email': return '이메일 주소 형식을 확인해주세요.';
    case 'auth/weak-password': return '비밀번호는 8자 이상으로 만들어주세요.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password': return '이메일 또는 비밀번호가 맞지 않아요.';
    case 'auth/too-many-requests': return '시도가 너무 많아요. 잠시 후 다시 시도해주세요.';
    case 'auth/network-request-failed': return '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
    case 'auth/operation-not-allowed': return '이메일 가입이 아직 활성화되지 않았어요. 관리자에게 문의해주세요.';
    case 'auth/unauthorized-continue-uri': return '인증메일의 이동 주소가 Firebase에 허용되지 않았어요. 관리자 설정을 확인해주세요.';
    case 'auth/invalid-continue-uri': return '인증메일의 이동 주소 설정이 올바르지 않아요.';
    default: return error?.message || '이메일 인증 중 문제가 생겼어요. 다시 시도해주세요.';
  }
};

const formatInviteCode = (value: string) => {
  const characters = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (!characters) return '';
  return `${characters.slice(0, 2)}${characters.length > 2 ? `-${characters.slice(2, 7)}` : ''}${characters.length > 7 ? `-${characters.slice(7)}` : ''}`;
};

const Landing = ({ authMode }: LandingProps) => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);
  const [inviteCheckBusy, setInviteCheckBusy] = useState(false);
  const [joiningProvider, setJoiningProvider] = useState<SignupProvider | null>(null);
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupVerificationCode, setSignupVerificationCode] = useState('');
  const [signupConsent, setSignupConsent] = useState(false);
  const [emailAuthBusy, setEmailAuthBusy] = useState(false);
  const [emailSignupMessage, setEmailSignupMessage] = useState('');
  const isJoining = joiningProvider !== null || emailAuthBusy || inviteCheckBusy;
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginProvider, setLoginProvider] = useState<SignupProvider | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [emailLoginMessage, setEmailLoginMessage] = useState('');
  const [loginFeedback, setLoginFeedback] = useState<LoginFeedback>(null);
  const authLaunchRef = useRef(false);
  const [signedInDestination, setSignedInDestination] = useState('/admin');
  const [isGoogleRedirectPending, setIsGoogleRedirectPending] = useState(
    () => sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1',
  );
  const [shouldCompleteGoogleNavigation, setShouldCompleteGoogleNavigation] = useState(false);

  useEffect(() => {
    if (authMode !== 'login') return;
    setLoginEmail('');
    setLoginPassword('');
    setEmailLoginMessage('');
    setLoginFeedback(null);
  }, [authMode]);

  useEffect(() => {
    if (authMode !== 'signup') return;
    setSignupStep(1);
    setInviteError('');
    setEmailSignupMessage('');
    setSignupVerificationCode('');
  }, [authMode]);

  useEffect(() => {
    if (!isGoogleRedirectPending) return;

    let cancelled = false;
    void finishGoogleRedirectLogin()
      .then(() => {
        if (!cancelled) setShouldCompleteGoogleNavigation(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Google redirect login failed', error);
        setInviteError(betaErrorMessage(error));
        if (sessionStorage.getItem(BETA_INVITE_SESSION_KEY)) setIsInviteOpen(true);
      })
      .finally(() => {
        if (!cancelled) setIsGoogleRedirectPending(false);
      });

    return () => { cancelled = true; };
  }, [isGoogleRedirectPending, navigate]);

  useEffect(() => {
    if (isGoogleRedirectPending) return;
    if (!user?.uid) {
      setSignedInDestination('/admin');
      return;
    }
    let cancelled = false;
    void getUserByUid(user.uid).then((resolved) => {
      if (cancelled) return;
      // OAuth 인증만 성공하고 LinkZip 가입 문서가 없는 계정은
      // 온보딩으로 보내지 않고 로그인 화면에서 가입을 안내한다.
      if (!resolved) return;
      const destination = isOnboardingComplete(resolved?.data) ? '/admin' : '/onboarding';
      setSignedInDestination(destination);
      if (authMode || shouldCompleteGoogleNavigation || destination === '/onboarding') {
        setShouldCompleteGoogleNavigation(false);
        navigate(destination, { replace: true });
      }
    }).catch((error) => console.warn('Unable to resolve onboarding state', error));
    return () => { cancelled = true; };
  }, [authMode, isGoogleRedirectPending, navigate, shouldCompleteGoogleNavigation, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    // OAuth callbacks return to the landing page before the destination is
    // resolved. On slower mobile connections an invite error event from the
    // previous auth attempt could otherwise leave the signup modal visible
    // even though Firebase has already restored the signed-in account.
    setIsInviteOpen(false);
    setIsLoginOpen(false);
    setInviteError('');
    setJoiningProvider(null);
    setLoginProvider(null);
    authLaunchRef.current = false;
  }, [user?.uid]);

  useEffect(() => {
    const handleError = (event: Event) => {
      const isLoginAttempt = sessionStorage.getItem(LOGIN_INTENT_SESSION_KEY) === '1';
      sessionStorage.removeItem(LOGIN_INTENT_SESSION_KEY);
      if (isLoginAttempt) {
        void firebaseSignOut(auth).catch(() => undefined);
        setLoginFeedback({
          kind: 'account-not-found',
          title: '가입된 계정이 없어요',
          description: '처음 오셨다면 회원가입을 진행해주세요. 초대코드가 있으면 바로 시작할 수 있어요.',
        });
        setEmailLoginMessage('');
        setIsInviteOpen(false);
        setIsLoginOpen(true);
        setJoiningProvider(null);
        setLoginProvider(null);
        authLaunchRef.current = false;
        return;
      }
      // Ignore a stale beta-access event once authentication has succeeded.
      // A real access denial signs the Firebase user out before dispatching
      // this event, so logged-out/new users still receive the invite prompt.
      if (auth.currentUser?.uid || useStore.getState().user?.uid) return;
      setInviteError((event as CustomEvent<string>).detail || '초대코드를 확인해주세요.');
      setIsInviteOpen(true);
      setIsLoginOpen(false);
      setJoiningProvider(null);
    };
    window.addEventListener(BETA_ACCESS_ERROR_EVENT, handleError);
    return () => window.removeEventListener(BETA_ACCESS_ERROR_EVENT, handleError);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('emailVerified') !== '1') return;
    setIsLoginOpen(true);
    setShowEmailLogin(true);
    setEmailLoginMessage('이메일 인증이 완료됐어요. 비밀번호로 로그인해주세요.');
    params.delete('emailVerified');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }, []);

  const handleGoogleLogin = async () => {
    if (authLaunchRef.current) return;
    authLaunchRef.current = true;
    setLoginProvider('google');
    setLoginFeedback(null);
    sessionStorage.setItem(LOGIN_INTENT_SESSION_KEY, '1');
    try {
      sessionStorage.removeItem(BETA_INVITE_SESSION_KEY);
      const signedInUser = await signInWithGoogle();
      if (!signedInUser) return;
      const resolved = await getUserByUid(signedInUser.uid);
      if (!resolved) throw Object.assign(new Error('Account record not found'), { code: 'account-not-found' });
      sessionStorage.removeItem(LOGIN_INTENT_SESSION_KEY);
      navigate(isOnboardingComplete(resolved?.data) ? "/admin" : "/onboarding");
    } catch (error: any) {
      // Ignore normal user cancellations (closing popup or double clicking)
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        console.log("Google Sign-In popup was closed or cancelled by user.");
        sessionStorage.removeItem(LOGIN_INTENT_SESSION_KEY);
        authLaunchRef.current = false;
        setLoginProvider(null);
        return;
      }

      console.error("Login failed", error);
      sessionStorage.removeItem(LOGIN_INTENT_SESSION_KEY);
      if (isMissingAccountError(error) || error?.code === 'account-not-found') {
        await firebaseSignOut(auth).catch(() => undefined);
        setLoginFeedback({ kind: 'account-not-found', title: '가입된 계정이 없어요', description: '처음 오셨다면 회원가입을 진행해주세요. 초대코드가 있으면 바로 시작할 수 있어요.' });
      } else {
        setLoginFeedback({ kind: 'error', title: '로그인을 완료하지 못했어요', description: '잠시 후 다시 시도하거나 다른 로그인 방법을 이용해주세요.' });
      }
      setIsLoginOpen(true);
      authLaunchRef.current = false;
      setLoginProvider(null);
    }
  };

  const handleKakaoLogin = () => {
    if (authLaunchRef.current) return;
    authLaunchRef.current = true;
    setLoginProvider('kakao');
    setLoginFeedback(null);
    sessionStorage.setItem(LOGIN_INTENT_SESSION_KEY, '1');
    sessionStorage.removeItem(BETA_INVITE_SESSION_KEY);
    startKakaoLogin();
  };

  const handleNaverLogin = () => {
    if (authLaunchRef.current) return;
    authLaunchRef.current = true;
    setLoginProvider('naver');
    setLoginFeedback(null);
    sessionStorage.setItem(LOGIN_INTENT_SESSION_KEY, '1');
    sessionStorage.removeItem(BETA_INVITE_SESSION_KEY);
    startNaverLogin();
  };

  const handleInviteCodeCheck = async () => {
    const code = inviteCode.trim();
    if (!code) {
      setInviteError('초대코드를 입력해주세요.');
      return;
    }
    setInviteError('');
    setInviteCheckBusy(true);
    try {
      await validateBetaInvite(code);
      setInviteCode(code.toUpperCase());
      setSignupStep(2);
    } catch (error) {
      setInviteError(betaErrorMessage(error));
    } finally {
      setInviteCheckBusy(false);
    }
  };

  const handleInviteSignup = async (provider: SignupProvider = 'google') => {
    const code = inviteCode.trim();
    if (!code) {
      setInviteError('초대코드를 입력해주세요.');
      return;
    }
    if (!signupConsent) {
      setInviteError('이용약관과 개인정보처리방침에 동의해주세요.');
      return;
    }
    setInviteError('');
    setJoiningProvider(provider);
    sessionStorage.setItem(BETA_INVITE_SESSION_KEY, code);
    if (provider === 'kakao') {
      startKakaoLogin();
      return;
    }
    if (provider === 'naver') {
      startNaverLogin();
      return;
    }
    try {
      const signedInUser = await signInWithGoogle();
      if (!signedInUser) return;
      await redeemBetaInvite(code);
      sessionStorage.removeItem(BETA_INVITE_SESSION_KEY);
      setIsInviteOpen(false);
      const resolved = await getUserByUid(signedInUser.uid);
      navigate(isOnboardingComplete(resolved?.data) ? '/admin' : '/onboarding');
    } catch (error: any) {
      sessionStorage.removeItem(BETA_INVITE_SESSION_KEY);
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        setJoiningProvider(null);
        return;
      }
      setInviteError(betaErrorMessage(error));
      setJoiningProvider(null);
    }
  };

  const passwordResetSettings = () => ({
    url: 'https://linkzip.kr/login?emailVerified=1',
    handleCodeInApp: false,
    linkDomain: 'linkzip.kr',
  });

  const handleEmailSignup = async () => {
    const code = inviteCode.trim();
    const email = signupEmail.trim();
    if (!code) return setInviteError('초대코드를 입력해주세요.');
    if (!email) return setInviteError('이메일 주소를 입력해주세요.');
    if (signupPassword.length < 8) return setInviteError('비밀번호는 8자 이상으로 만들어주세요.');
    if (!signupConsent) return setInviteError('이용약관과 개인정보처리방침에 동의해주세요.');

    setInviteError('');
    setEmailSignupMessage('');
    setEmailAuthBusy(true);
    try {
      await requestEmailSignupCode({ email, inviteCode: code });
      setSignupVerificationCode('');
      setEmailSignupMessage('6자리 인증코드를 보냈어요. 10분 안에 입력해주세요.');
      setSignupStep(3);
    } catch (error) {
      console.error('Unable to send email signup code', error);
      setInviteError(betaErrorMessage(error));
    } finally {
      setEmailAuthBusy(false);
    }
  };

  const handleCompleteEmailSignup = async () => {
    const email = signupEmail.trim();
    const verificationCode = signupVerificationCode.replace(/\D/g, '');
    if (verificationCode.length !== 6) return setInviteError('6자리 인증코드를 입력해주세요.');
    setInviteError('');
    setEmailSignupMessage('');
    setEmailAuthBusy(true);
    sessionStorage.setItem(EMAIL_SIGNUP_PENDING_KEY, '1');
    try {
      await completeEmailSignup({
        email,
        password: signupPassword,
        inviteCode: inviteCode.trim(),
        verificationCode,
      });
      const credential = await signInWithEmailAndPassword(auth, email, signupPassword);
      sessionStorage.removeItem(EMAIL_SIGNUP_PENDING_KEY);
      const resolved = await getUserByUid(credential.user.uid);
      navigate(isOnboardingComplete(resolved?.data) ? '/admin' : '/onboarding');
    } catch (error) {
      console.error('Email signup verification failed', error);
      setInviteError(betaErrorMessage(error));
    } finally {
      sessionStorage.removeItem(EMAIL_SIGNUP_PENDING_KEY);
      setEmailAuthBusy(false);
    }
  };

  const handleEmailLogin = async () => {
    const email = loginEmail.trim();
    if (!email || !loginPassword) return setEmailLoginMessage('이메일과 비밀번호를 입력해주세요.');
    setEmailLoginMessage('');
    setLoginFeedback(null);
    setEmailAuthBusy(true);
    sessionStorage.setItem(EMAIL_SIGNUP_PENDING_KEY, '1');
    try {
      const credential = await signInWithEmailAndPassword(auth, email, loginPassword);
      if (!credential.user.emailVerified) {
        await firebaseSignOut(auth);
        setEmailLoginMessage('이전에 완료되지 않은 가입 계정이에요. 회원가입에서 다시 진행해주세요.');
        return;
      }
      await firebaseSignOut(auth);
      sessionStorage.removeItem(EMAIL_SIGNUP_PENDING_KEY);
      const verifiedCredential = await signInWithEmailAndPassword(auth, email, loginPassword);
      const resolved = await getUserByUid(verifiedCredential.user.uid);
      if (!resolved) {
        await firebaseSignOut(auth).catch(() => undefined);
        setLoginFeedback({ kind: 'account-not-found', title: '가입된 계정이 없어요', description: '처음 오셨다면 회원가입을 진행해주세요. 초대코드가 있으면 바로 시작할 수 있어요.' });
        return;
      }
      setIsLoginOpen(false);
      navigate(isOnboardingComplete(resolved?.data) ? '/admin' : '/onboarding');
    } catch (error) {
      if (isCredentialError(error)) {
        setEmailLoginMessage('');
        setLoginFeedback({
          kind: 'account-not-found',
          title: '로그인 정보를 확인해주세요',
          description: '이메일 또는 비밀번호가 맞지 않아요. 아직 계정이 없다면 회원가입으로 시작해주세요.',
        });
      } else if (isMissingAccountError(error)) {
        await firebaseSignOut(auth).catch(() => undefined);
        setLoginFeedback({ kind: 'account-not-found', title: '가입된 계정이 없어요', description: '처음 오셨다면 회원가입을 진행해주세요. 초대코드가 있으면 바로 시작할 수 있어요.' });
      } else setEmailLoginMessage(emailAuthMessage(error));
    } finally {
      sessionStorage.removeItem(EMAIL_SIGNUP_PENDING_KEY);
      setEmailAuthBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!loginEmail.trim()) return setEmailLoginMessage('비밀번호를 재설정할 이메일을 입력해주세요.');
    setEmailAuthBusy(true);
    setEmailLoginMessage('');
    try {
      await sendPasswordResetEmail(auth, loginEmail.trim(), passwordResetSettings());
      setEmailLoginMessage('비밀번호 재설정 메일을 보냈어요.');
    } catch (error) {
      setEmailLoginMessage(emailAuthMessage(error));
    } finally {
      setEmailAuthBusy(false);
    }
  };

  const handlePrimaryAction = () => {
    if (user) {
      navigate(signedInDestination);
      return;
    }
    navigate('/signup');
  };

  const closeLogin = () => {
    sessionStorage.removeItem(LOGIN_INTENT_SESSION_KEY);
    setIsLoginOpen(false);
    setLoginFeedback(null);
    setEmailLoginMessage('');
    setLoginProvider(null);
    authLaunchRef.current = false;
  };

  const openSignupFromLogin = () => {
    sessionStorage.removeItem(LOGIN_INTENT_SESSION_KEY);
    navigate('/signup');
  };

  if (authMode) {
    const isLoginPage = authMode === 'login';
    const authBusy = isLoginPage ? loginProvider !== null || emailAuthBusy : isJoining;

    return (
      <div className="min-h-[100svh] bg-[#f4f1e8] font-sans text-[#171714] selection:bg-[#ff6b35]/25">
        <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <button type="button" onClick={() => navigate('/')} className="flex cursor-pointer items-center gap-3 rounded-xl" aria-label="LinkZip 홈으로 이동">
            <LinkZipLogo markClassName="h-11 w-11 rotate-[-3deg]" />
          </button>
          <PrivateBetaBadge compact />
        </header>

        <main className="mx-auto grid w-full max-w-[1180px] items-center gap-10 px-5 pb-12 pt-4 sm:px-8 lg:min-h-[calc(100svh-92px)] lg:grid-cols-[minmax(0,1fr)_460px] lg:px-10 lg:pb-20 lg:pt-0">
          <section className="hidden max-w-xl lg:block">
            <span className="inline-flex rotate-[-1deg] items-center gap-2 rounded-full border-2 border-[#171714] bg-[#d9ff67] px-4 py-2 text-sm font-black">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f35]" />
              LinkZip 계정
            </span>
            <h1 className="mt-7 whitespace-pre-line text-6xl font-black leading-[.95] tracking-[-.065em]">
              {isLoginPage ? '다시 만나서\n반가워요.' : '내 링크집을\n시작해보세요.'}
            </h1>
            <p className="mt-6 max-w-md text-base font-semibold leading-7 text-[#6d6960]">
              {isLoginPage
                ? '이메일 또는 사용하던 SNS 계정으로 로그인하면 내 링크집을 이어서 관리할 수 있어요.'
                : '초대코드를 확인하고 이메일로 계정을 만들면 나만의 링크 페이지를 바로 시작할 수 있어요.'}
            </p>
          </section>

          <section className="w-full rounded-[32px] border-2 border-[#171714] bg-[#fffdf8] p-6 shadow-[8px_8px_0_#171714] sm:p-9">
            <LinkZipLogo markClassName="h-14 w-14 rotate-[-4deg]" showText={false} />
            <h2 className="mt-6 text-3xl font-black tracking-[-.04em]">{isLoginPage ? '로그인' : '회원가입'}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#6d6960]">
              {isLoginPage
                ? '이메일 또는 SNS 계정으로 로그인해주세요.'
                : signupStep === 1
                  ? '먼저 비공개 베타 초대코드를 확인해주세요.'
                  : signupStep === 2
                    ? '이메일과 비밀번호로 계정을 만들어주세요.'
                    : '메일로 받은 6자리 인증코드를 입력해주세요.'}
            </p>

            {!isLoginPage && (
              <div className="mt-5 flex items-center gap-2" aria-label={`회원가입 ${signupStep}단계`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#171714] text-xs font-black ${signupStep >= 1 ? 'bg-[#d9ff67]' : 'bg-white'}`}>1</span>
                <span className="h-0.5 flex-1 bg-[#171714]" />
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#171714] text-xs font-black ${signupStep >= 2 ? 'bg-[#ffb7a2]' : 'bg-white'}`}>2</span>
                <span className="h-0.5 flex-1 bg-[#171714]" />
                <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#171714] text-xs font-black ${signupStep === 3 ? 'bg-[#c9e8ff]' : 'bg-white'}`}>3</span>
              </div>
            )}

            {isLoginPage ? (
              <>
                {loginFeedback && (
                  <div className={`mt-5 rounded-2xl border-2 p-4 ${loginFeedback.kind === 'account-not-found' ? 'border-[#171714] bg-[#fff2c7]' : 'border-[#efb1a2] bg-[#fff0ec]'}`}>
                    <p className="text-sm font-black">{loginFeedback.title}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-gray-600">{loginFeedback.description}</p>
                  </div>
                )}
                {emailLoginMessage && <p className="mt-5 rounded-xl bg-[#eef8e9] px-3 py-2 text-xs font-bold leading-relaxed text-[#315c2c]">{emailLoginMessage}</p>}
                <div className="mt-6 grid gap-3">
                  <input type="email" name="linkzip-login-email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} autoComplete="off" spellCheck={false} placeholder="이메일" className="w-full rounded-2xl border-2 border-[#171714] bg-white px-4 py-3.5 text-base font-bold outline-none transition focus:shadow-[3px_3px_0_#ff5f35]" />
                  <input type="password" name="linkzip-login-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleEmailLogin(); }} autoComplete="new-password" placeholder="비밀번호" className="w-full rounded-2xl border-2 border-[#171714] bg-white px-4 py-3.5 text-base font-bold outline-none transition focus:shadow-[3px_3px_0_#ff5f35]" />
                  <button type="button" onClick={() => void handleEmailLogin()} disabled={emailAuthBusy} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#171714] py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{emailAuthBusy && <Loader2 className="h-4 w-4 animate-spin" />} 이메일로 로그인</button>
                  <div className="flex justify-center text-xs font-black text-gray-500">
                    <button type="button" onClick={() => void handlePasswordReset()} disabled={emailAuthBusy} className="cursor-pointer underline underline-offset-2">비밀번호를 잊으셨나요?</button>
                  </div>
                </div>
              </>
            ) : (
              signupStep === 1 ? (
                <div className="mt-6">
                  <label className="block text-xs font-black text-gray-700">초대코드
                    <span className="mt-2 flex w-full items-center rounded-2xl border-2 border-[#171714] bg-white px-4 transition focus-within:shadow-[3px_3px_0_#ff5f35]">
                      <input value={inviteCode} onChange={(event) => { setInviteCode(formatInviteCode(event.target.value)); setInviteError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') void handleInviteCodeCheck(); }} autoComplete="off" autoFocus maxLength={14} placeholder="XX-XXXXX-XXXXX" aria-label="초대코드" className="min-w-0 flex-1 bg-transparent py-3.5 text-base font-black uppercase tracking-wider outline-none" />
                    </span>
                  </label>
                  {inviteError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-relaxed text-red-600">{inviteError}</p>}
                  <button type="button" onClick={() => void handleInviteCodeCheck()} disabled={inviteCheckBusy} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#171714] py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{inviteCheckBusy && <Loader2 className="h-4 w-4 animate-spin" />} 초대코드 확인</button>
                  <p className="mt-3 text-center text-xs font-semibold leading-5 text-gray-500">코드 확인 후 계정을 만들 수 있어요.</p>
                </div>
              ) : signupStep === 2 ? (
                <>
                  <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border-2 border-[#171714] bg-[#f0ffd0] px-4 py-3">
                    <div><p className="text-[10px] font-black text-gray-500">확인된 초대코드</p><p className="mt-0.5 text-sm font-black tracking-wide">{inviteCode}</p></div>
                    <button type="button" onClick={() => { setSignupStep(1); setInviteError(''); }} disabled={isJoining} className="cursor-pointer text-xs font-black underline underline-offset-2">변경</button>
                  </div>
                  {inviteError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-relaxed text-red-600">{inviteError}</p>}
                  {emailSignupMessage && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold leading-relaxed text-emerald-700">{emailSignupMessage}</p>}
                  <div className="mt-4 grid gap-3">
                    <input type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} autoComplete="email" placeholder="이메일" className="w-full rounded-2xl border-2 border-[#171714] bg-white px-4 py-3.5 text-base font-bold outline-none transition focus:shadow-[3px_3px_0_#ff5f35]" />
                    <input type="password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleEmailSignup(); }} autoComplete="new-password" placeholder="비밀번호 (8자 이상)" className="w-full rounded-2xl border-2 border-[#171714] bg-white px-4 py-3.5 text-base font-bold outline-none transition focus:shadow-[3px_3px_0_#ff5f35]" />
                    <label className="flex cursor-pointer items-start gap-2 text-xs font-bold leading-5 text-gray-600">
                      <input type="checkbox" checked={signupConsent} onChange={(event) => { setSignupConsent(event.target.checked); if (event.target.checked) setInviteError(''); }} className="mt-0.5 h-4 w-4 shrink-0 accent-[#171714]" />
                      <span><a href="/terms" target="_blank" rel="noreferrer" className="font-black underline underline-offset-2">이용약관</a>과 <a href="/privacy" target="_blank" rel="noreferrer" className="font-black underline underline-offset-2">개인정보처리방침</a>에 동의합니다. (필수)</span>
                    </label>
                    <button type="button" onClick={() => void handleEmailSignup()} disabled={isJoining || emailAuthBusy} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#171714] py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{emailAuthBusy && <Loader2 className="h-4 w-4 animate-spin" />} 가입하기</button>
                  </div>
                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs font-black text-gray-500">SNS로 가입</span>
                    <span className="h-px flex-1 bg-gray-200" />
                  </div>
                  <div className="flex justify-center gap-5">
                    <button type="button" onClick={() => void handleInviteSignup('naver')} disabled={isJoining || emailAuthBusy} aria-label="네이버로 가입" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171714] bg-[#03c75a] text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{joiningProvider === 'naver' ? <Loader2 className="h-5 w-5 animate-spin" /> : <SiNaver className="h-5 w-5" />}</button>
                    <button type="button" onClick={() => void handleInviteSignup('kakao')} disabled={isJoining || emailAuthBusy} aria-label="카카오로 가입" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171714] bg-[#fee500] text-[#171714] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{joiningProvider === 'kakao' ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="text-2xl font-black leading-none">K</span>}</button>
                    <button type="button" onClick={() => void handleInviteSignup('google')} disabled={isJoining || emailAuthBusy} aria-label="Google로 가입" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171714] bg-white text-[#171714] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{joiningProvider === 'google' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FaGoogle className="h-5 w-5" />}</button>
                  </div>
                </>
              ) : (
                <div className="mt-7 text-center">
                  <span className="mx-auto flex h-20 w-20 rotate-[-3deg] items-center justify-center rounded-[24px] border-2 border-[#171714] bg-[#c9e8ff] shadow-[4px_4px_0_#171714]"><MailCheck className="h-9 w-9" /></span>
                  <h3 className="mt-7 text-2xl font-black tracking-[-.04em]">인증코드를 입력해주세요</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-gray-600"><strong className="text-[#171714]">{signupEmail}</strong><br />메일로 보낸 6자리 코드는 10분 동안 유효해요.</p>
                  {inviteError && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-relaxed text-red-600">{inviteError}</p>}
                  {emailSignupMessage && <p className="mt-4 rounded-2xl bg-[#eef8e9] px-4 py-3 text-xs font-bold leading-5 text-[#315c2c]">{emailSignupMessage}</p>}
                  <input value={signupVerificationCode} onChange={(event) => { setSignupVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setInviteError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') void handleCompleteEmailSignup(); }} inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} aria-label="이메일 인증코드" placeholder="000000" className="mt-5 w-full rounded-2xl border-2 border-[#171714] bg-white px-4 py-4 text-center text-2xl font-black tracking-[.35em] outline-none transition focus:shadow-[3px_3px_0_#ff5f35]" />
                  <button type="button" onClick={() => void handleCompleteEmailSignup()} disabled={emailAuthBusy || signupVerificationCode.length !== 6} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#171714] py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{emailAuthBusy && <Loader2 className="h-4 w-4 animate-spin" />} 인증하고 가입 완료</button>
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs font-black text-gray-500">
                    <button type="button" onClick={() => void handleEmailSignup()} disabled={emailAuthBusy} className="cursor-pointer underline underline-offset-2">인증코드 다시 받기</button>
                    <button type="button" onClick={() => { setSignupStep(2); setInviteError(''); setEmailSignupMessage(''); }} disabled={emailAuthBusy} className="cursor-pointer underline underline-offset-2">이메일 변경</button>
                  </div>
                  <p className="mt-4 text-xs font-semibold leading-5 text-gray-500">메일이 보이지 않으면 스팸함도 확인해주세요.</p>
                </div>
              )
            )}

            {isLoginPage && <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-black text-gray-500">SNS로 로그인</span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="flex justify-center gap-5">
                <button type="button" onClick={handleNaverLogin} disabled={authBusy} aria-label="네이버로 로그인" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171714] bg-[#03c75a] text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{loginProvider === 'naver' ? <Loader2 className="h-5 w-5 animate-spin" /> : <SiNaver className="h-5 w-5" />}</button>
                <button type="button" onClick={handleKakaoLogin} disabled={authBusy} aria-label="카카오로 로그인" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171714] bg-[#fee500] text-[#171714] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{loginProvider === 'kakao' ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="text-2xl font-black leading-none">K</span>}</button>
                <button type="button" onClick={() => void handleGoogleLogin()} disabled={authBusy} aria-label="Google로 로그인" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171714] bg-white text-[#171714] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{loginProvider === 'google' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FaGoogle className="h-5 w-5" />}</button>
              </div>
            </>}

            {(isLoginPage || signupStep !== 3) && <div className="mt-6 flex items-center justify-center gap-2 border-t border-black/10 pt-5 text-sm">
              <span className="font-semibold text-gray-500">{isLoginPage ? '처음이신가요?' : '이미 계정이 있나요?'}</span>
              <button type="button" onClick={() => navigate(isLoginPage ? '/signup' : '/login')} className="cursor-pointer font-black underline underline-offset-4">{isLoginPage ? '회원가입하기' : '로그인하기'}</button>
            </div>}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f1e8] font-sans text-[#171714] selection:bg-[#ff6b35]/25">
      <nav className="relative z-10 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="cursor-pointer rounded-lg"
            aria-label="LinkZip 홈 상단으로 이동"
          >
            <LinkZipLogo markClassName="h-11 w-11 rotate-[-3deg]" />
          </button>
          <PrivateBetaBadge compact />
        </div>

        <div className="hidden items-center gap-7 text-sm font-black text-[#6d6960] md:flex">
          <a href="#how-it-works" className="cursor-pointer transition hover:text-[#171714]">만드는 방법</a>
          <a href="#features" className="cursor-pointer transition hover:text-[#171714]">기능</a>
          <a href="#use-cases" className="cursor-pointer transition hover:text-[#171714]">활용</a>
          <a href="#faq" className="cursor-pointer transition hover:text-[#171714]">FAQ</a>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {!user && (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="cursor-pointer rounded-full border border-[#171714] bg-[#fffdf8] px-3.5 py-2 text-xs font-black text-[#171714] transition hover:-translate-y-0.5 hover:bg-white sm:px-4 sm:text-sm"
              >
                로그인
              </button>
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="cursor-pointer rounded-full border border-[#171714] bg-[#171714] px-3.5 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-black sm:px-4 sm:text-sm"
              >
                회원가입
              </button>
            </>
          )}
        </div>
      </nav>

      <main className="relative z-[1]">
        <section className="mx-auto grid min-h-[710px] max-w-[1440px] items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(460px,.82fr)] lg:px-12 lg:pb-24 lg:pt-12">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex rotate-[-1deg] items-center gap-2 rounded-full border border-[#171714] bg-[#d9ff67] px-3.5 py-2 text-xs font-black sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-[#ff5f35]" />
              소개부터 판매까지, 링크 하나로
            </div>

            <h1 className="text-[clamp(3.35rem,7.3vw,7.7rem)] font-black leading-[.88] tracking-[-0.075em]">
              내가 하는 모든 일,
              <span className="mt-2 block text-[#ff5f35]">링크 하나에</span>
              <span className="mt-2 block text-[#ff5f35]">모아두세요.</span>
            </h1>

            <p className="mt-8 max-w-xl text-base font-semibold leading-7 text-[#67635b] sm:text-lg sm:leading-8">
              SNS, 포트폴리오, 상품, 문의 링크까지<br className="hidden sm:block" />
              한 페이지에 필요한 만큼 담을 수 있어요.<br className="hidden sm:block" />
              순서를 바꾸고 색만 고르면 바로 완성됩니다.
            </p>

            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                onClick={handlePrimaryAction}
                className="group inline-flex cursor-pointer items-center justify-center gap-3 rounded-full bg-[#171714] px-7 py-4 text-base font-black text-white transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#ff5f35]"
              >
                {user ? <LayoutDashboard className="h-5 w-5" /> : <FaGoogle className="h-5 w-5" />}
                <span>{user ? (signedInDestination === '/onboarding' ? '내 링크집 이어서 만들기' : '내 링크집 관리하기') : '내 링크집 만들기'}</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <p className="mt-7 text-xs font-bold text-[#6d6960] sm:text-sm">카드 등록 없이 무료 · 모바일에서도 편하게</p>
          </div>

          <div className="relative mx-auto w-full max-w-[570px] lg:justify-self-end">
            <div className="absolute -left-5 top-12 z-20 hidden rotate-[-7deg] rounded-2xl border-2 border-[#171714] bg-white px-4 py-3 text-sm font-black shadow-[4px_4px_0_#171714] sm:block">
              끌어서 원하는<br />순서대로
              <MousePointer2 className="absolute -bottom-5 right-2 h-7 w-7 rotate-[-12deg] fill-[#ff5f35] text-[#171714]" />
            </div>
            <div className="absolute -right-3 -top-4 z-20 rotate-[6deg] rounded-full border-2 border-[#171714] bg-[#ffcf4a] px-4 py-2 text-xs font-black sm:right-4">지금 편집 중 ●</div>

            <div className="relative overflow-hidden rounded-[38px] border-2 border-[#171714] bg-[#e9e6de] p-6 shadow-[12px_12px_0_#171714] sm:p-9">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#171714 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <div className="relative mx-auto max-w-[370px] rounded-[36px] border-2 border-[#171714] bg-[#fffdf8] p-5 shadow-[6px_6px_0_rgba(23,23,20,.2)] sm:p-7">
                <div className="flex items-center justify-between border-b border-[#dedbd1] pb-4">
                  <span className="text-xs font-black tracking-[.14em] text-[#8a857b]">MY LINKZIP</span>
                  <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#171714] bg-white" aria-label="미리보기 메뉴"><span className="mb-1 text-lg leading-none">•••</span></button>
                </div>
                <div className="py-7 text-center">
                  <div className="mx-auto flex h-20 w-20 rotate-[-3deg] items-center justify-center rounded-[26px] border-2 border-[#171714] bg-[#ffcf4a] text-2xl font-black">LZ</div>
                  <h2 className="mt-4 text-xl font-black tracking-tight">오늘도 뭔가 만드는 사람</h2>
                  <p className="mt-1 text-xs font-bold text-[#817d74]">좋아하는 것과 요즘 하는 일을 모아뒀어요.</p>
                </div>
                <div className="space-y-2.5">
                  <div className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-[#171714] bg-[#d9ff67] px-3.5 text-sm font-black"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white">↗</span><span className="flex-1">새로 올린 콘텐츠</span><ArrowUpRight className="h-4 w-4" /></div>
                  <div className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-[#171714] bg-white px-3.5 text-sm font-black"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f1eee6]"><ShoppingBag className="h-4 w-4" /></span><span className="flex-1">작은 온라인 숍</span><ArrowUpRight className="h-4 w-4" /></div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border-2 border-[#171714] bg-[#171714] px-3 py-4 text-center text-xs font-black text-white">↗ Instagram</div>
                    <div className="rounded-2xl border-2 border-[#171714] bg-white px-3 py-4 text-center text-xs font-black">↗ YouTube</div>
                  </div>
                </div>
                <p className="mt-6 text-center text-[10px] font-black tracking-[.18em] text-[#aaa59b]">MADE WITH LINKZIP</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y-2 border-[#171714] bg-[#171714] text-white">
          <div className="mx-auto grid max-w-[1440px] divide-y divide-white/20 px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-12">
            <div className="flex items-start gap-4 py-7 md:pr-7"><MousePointer2 className="mt-0.5 h-6 w-6 shrink-0 text-[#d9ff67]" /><div><strong className="block text-base font-black">누구나 쉽게 만들 수 있어요</strong><p className="mt-1 text-sm leading-6 text-white/60">필요한 블록을 넣고 원하는 자리로 옮기면 끝이에요.</p></div></div>
            <div className="flex items-start gap-4 py-7 md:px-7"><Palette className="mt-0.5 h-6 w-6 shrink-0 text-[#d9ff67]" /><div><strong className="block text-base font-black">원하는 모습으로 꾸며요</strong><p className="mt-1 text-sm leading-6 text-white/60">색, 글꼴, 배경, 버튼 모양을 내 취향에 맞게 바꿀 수 있어요.</p></div></div>
            <div className="flex items-start gap-4 py-7 md:pl-7"><BarChart3 className="mt-0.5 h-6 w-6 shrink-0 text-[#d9ff67]" /><div><strong className="block text-base font-black">사람들의 반응도 볼 수 있어요</strong><p className="mt-1 text-sm leading-6 text-white/60">몇 명이 들어왔고 어떤 링크를 눌렀는지 확인할 수 있어요.</p></div></div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-8 px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mx-auto max-w-[1320px]">
            <div className="max-w-3xl">
              <span className="inline-flex rotate-[-1deg] rounded-full border-2 border-[#171714] bg-[#ffcf4a] px-3.5 py-2 text-xs font-black">딱 세 단계면 끝</span>
              <h2 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.055em] sm:text-6xl">어렵게 배울 건 없어요.<br />넣고, 꾸미고, 공유하면 끝.</h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-[#6d6960] sm:text-lg">코딩도 디자인도 필요 없어요. 휴대폰이나 PC에서 바로 만들고 언제든 고칠 수 있어요.</p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                { number: '01', icon: Link2, title: '필요한 것 넣기', description: '링크, SNS, 상품, 일정, 문의 중 필요한 것만 골라 넣어요.' },
                { number: '02', icon: Palette, title: '마음에 들게 꾸미기', description: '색과 글꼴, 배경을 바꾸고 원하는 곳에 스티커도 붙여요.' },
                { number: '03', icon: ArrowUpRight, title: '주소 하나 공유하기', description: '완성된 링크를 SNS 프로필이나 메시지에 올리면 끝이에요.' },
              ].map(({ number, icon: Icon, title, description }) => (
                <article key={number} className="group rounded-[30px] border-2 border-[#171714] bg-[#fffdf8] p-6 transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#171714] sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-[.18em] text-[#8a857b]">STEP {number}</span>
                    <span className="flex h-12 w-12 rotate-[-3deg] items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#d9ff67]"><Icon className="h-6 w-6" /></span>
                  </div>
                  <h3 className="mt-9 text-2xl font-black tracking-[-0.035em]">{title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#6d6960]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-8 border-y-2 border-[#171714] bg-[#fffdf8] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mx-auto max-w-[1320px]">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <span className="text-xs font-black tracking-[.2em] text-[#ff5f35]">링크집 하나면 충분해요</span>
                <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.055em] sm:text-6xl">링크만 모아두기엔<br />아까우니까.</h2>
              </div>
              <p className="max-w-lg text-base font-semibold leading-7 text-[#6d6960]">나를 소개하고, 상품을 팔고, 사람들이 무엇에 관심을 보였는지 확인할 수 있어요. 필요한 기능부터 골라 쓰면 됩니다.</p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Layers3, title: '필요한 블록만 골라서', description: '링크, SNS, 이미지, 일정, 지도, 공지까지 필요한 만큼 넣을 수 있어요.' },
                { icon: Sparkles, title: '내 취향에 맞게', description: '테마, 글꼴, 버튼, 배경을 바꾸고 스티커도 자유롭게 붙일 수 있어요.' },
                { icon: Store, title: '상품 판매와 후원도 바로', description: '따로 쇼핑몰을 만들지 않아도 상품을 팔거나 후원을 받을 수 있어요.' },
                { icon: BarChart3, title: '어떤 링크가 인기 있는지', description: '방문수와 클릭수를 확인하고 사람들이 무엇에 관심 있는지 알아볼 수 있어요.' },
                { icon: Users, title: '여러 개 만들어도 한곳에서', description: '개인용, 브랜드용, 프로젝트용 링크집을 한 계정에서 관리할 수 있어요.' },
                { icon: MessageCircle, title: '찾아온 사람들과 이야기하기', description: '방명록과 메시지, 공지를 이용해 방문자와 소통할 수 있어요.' },
              ].map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-[28px] border-2 border-[#171714] bg-[#f4f1e8] p-6 transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#171714] sm:p-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#d9ff67]"><Icon className="h-6 w-6" /></span>
                  <h3 className="mt-7 text-xl font-black tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#6d6960]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="use-cases" className="scroll-mt-8 px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mx-auto max-w-[1320px]">
            <div className="text-center">
              <span className="inline-flex rounded-full border-2 border-[#171714] bg-[#d9ff67] px-3.5 py-2 text-xs font-black">이렇게 쓸 수 있어요</span>
              <h2 className="mt-6 text-4xl font-black tracking-[-0.055em] sm:text-6xl">필요한 건 달라도,<br />링크는 하나면 돼요.</h2>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {[
                { label: '크리에이터', title: '작업과 채널을 한 페이지에', description: '포트폴리오, 새 콘텐츠, SNS와 협업 문의를 보기 좋게 모아둘 수 있어요.', icon: Sparkles },
                { label: '작은 브랜드', title: '브랜드 소개부터 판매까지', description: '브랜드 이야기와 상품, 구매 링크, 문의 방법을 한 번에 보여줄 수 있어요.', icon: ShoppingBag },
                { label: '모임과 커뮤니티', title: '공지와 참여 정보를 한곳에', description: '일정, 장소, 공지, 신청 링크를 한 페이지로 간단하게 공유할 수 있어요.', icon: Users },
              ].map(({ label, title, description, icon: Icon }) => (
                <article key={label} className="relative min-h-[360px] overflow-hidden rounded-[34px] border-2 border-[#171714] bg-[#fffdf8] p-7 transition hover:-translate-y-1 hover:shadow-[8px_8px_0_#171714] sm:p-9">
                  <div className="absolute -bottom-14 -right-10 h-52 w-52 rounded-full border-2 border-[#171714] bg-[#f1eee6]" />
                  <span className="inline-flex rounded-full bg-[#d9ff67] px-3 py-1.5 text-xs font-black">{label}</span>
                  <h3 className="mt-6 max-w-xs text-3xl font-black leading-tight tracking-[-0.04em]">{title}</h3>
                  <p className="mt-4 max-w-xs text-sm font-bold leading-6 text-[#4f4b44]">{description}</p>
                  <span className="absolute bottom-7 right-7 flex h-20 w-20 rotate-[5deg] items-center justify-center rounded-[26px] border-2 border-[#171714] bg-[#d9ff67]"><Icon className="h-9 w-9" /></span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y-2 border-[#171714] bg-[#171714] px-5 py-16 text-white sm:px-8 sm:py-24 lg:px-12">
          <div className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <span className="text-xs font-black tracking-[.18em] text-[#d9ff67]">지금은 비공개 베타 기간이에요</span>
              <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-[-0.055em] sm:text-6xl">초대코드가 있다면<br />지금 만들어보세요.</h2>
              <p className="mt-5 font-bold text-white/60">카드 등록 없이 무료로 이용할 수 있어요. 직접 만들고 꾸미면서 LinkZip을 둘러보세요.</p>
            </div>
            <button type="button" onClick={handlePrimaryAction} className="group inline-flex shrink-0 cursor-pointer items-center gap-3 rounded-full border-2 border-[#d9ff67] bg-[#d9ff67] px-7 py-4 text-base font-black text-[#171714] transition hover:-translate-y-1 hover:bg-white">
              {user ? <LayoutDashboard className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
              {user ? '내 링크집 관리하기' : '내 링크집 만들기'}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </section>

        <section id="faq" className="scroll-mt-8 bg-[#fffdf8] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <span className="text-xs font-black tracking-[.2em] text-[#ff5f35]">자주 묻는 질문</span>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] sm:text-5xl">많이 물어보는 것만<br />모아봤어요.</h2>
            </div>
            <div className="divide-y-2 divide-[#171714] border-y-2 border-[#171714]">
              {[
                ['LinkZip은 뭐 하는 서비스인가요?', 'SNS, 포트폴리오, 상품, 문의처럼 보여주고 싶은 내용을 주소 하나에 모아주는 서비스예요.'],
                ['정말 무료로 시작할 수 있나요?', '네. 카드 등록 없이 베이직 플랜으로 시작할 수 있어요. 더 많은 기능이 필요할 때 유료 플랜을 선택하면 됩니다.'],
                ['휴대폰으로도 만들 수 있나요?', '네. 휴대폰과 태블릿에서도 블록을 넣고 순서를 바꾸거나 디자인을 고칠 수 있어요.'],
                ['지금 아무나 가입할 수 있나요?', '아직은 비공개 베타 기간이라 초대코드를 받은 분만 가입할 수 있어요. 이미 가입했다면 바로 로그인하면 됩니다.'],
              ].map(([question, answer]) => (
                <details key={question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black sm:text-lg">
                    {question}<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#171714] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-2xl pb-1 pr-10 pt-3 text-sm font-semibold leading-6 text-[#6d6960]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <BusinessFooter />

      {isInviteOpen && !user?.uid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171714]/65 p-4 backdrop-blur-sm" onClick={() => !isJoining && setIsInviteOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="invite-title" className="relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-[28px] border-2 border-[#171714] bg-[#fffdf8] p-7 text-left shadow-[8px_8px_0_#171714]" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setIsInviteOpen(false)} disabled={isJoining} className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-black/5 hover:text-black disabled:cursor-not-allowed" aria-label="팝업 닫기"><X className="h-4 w-4" /></button>
            <span className="mb-5 flex h-14 w-14 rotate-[-4deg] items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#d9ff67]"><KeyRound className="h-7 w-7" /></span>
            <h2 id="invite-title" className="text-xl font-black">비공개 베타 참여</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">초대받은 분만 새 계정을 만들 수 있어요. 전달받은 초대코드를 입력해주세요.</p>
            <label className="mt-6 block text-xs font-black text-gray-700">초대코드
              <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === 'Enter') void (showEmailSignup ? handleEmailSignup() : handleInviteSignup('google')); }} autoComplete="off" placeholder="LZ-XXXXX-XXXXX" className="mt-2 w-full rounded-2xl border-2 border-[#171714] bg-white px-4 py-3.5 text-base font-black uppercase tracking-wider outline-none transition focus:shadow-[3px_3px_0_#ff5f35]" />
            </label>
            {inviteError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-relaxed text-red-600">{inviteError}</p>}
            {emailSignupMessage && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold leading-relaxed text-emerald-700">{emailSignupMessage}</p>}
            {showEmailSignup ? (
              <div className="mt-5 grid gap-3">
                <input type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} autoComplete="email" placeholder="이메일" className="w-full rounded-2xl border-2 border-[#171714] bg-white px-4 py-3.5 text-base font-bold outline-none focus:shadow-[3px_3px_0_#ff5f35]" />
                <input type="password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleEmailSignup(); }} autoComplete="new-password" placeholder="비밀번호 (8자 이상)" className="w-full rounded-2xl border-2 border-[#171714] bg-white px-4 py-3.5 text-base font-bold outline-none focus:shadow-[3px_3px_0_#ff5f35]" />
                <label className="flex cursor-pointer items-start gap-2 text-xs font-bold leading-5 text-gray-600">
                  <input type="checkbox" checked={signupConsent} onChange={(event) => setSignupConsent(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#171714]" />
                  <span><a href="/terms" target="_blank" rel="noreferrer" className="underline">이용약관</a>과 <a href="/privacy" target="_blank" rel="noreferrer" className="underline">개인정보처리방침</a>에 동의합니다. (필수)</span>
                </label>
                <button type="button" onClick={() => void handleEmailSignup()} disabled={isJoining} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#171714] py-3.5 text-sm font-black text-white disabled:cursor-wait disabled:opacity-55">{emailAuthBusy && <Loader2 className="h-4 w-4 animate-spin" />} 이메일로 가입하기</button>
              <div className="mt-1 flex items-center gap-3">
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-black text-gray-500">SNS로 가입</span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="flex justify-center gap-5">
                <button type="button" onClick={() => void handleInviteSignup('naver')} disabled={isJoining || emailAuthBusy} aria-label="네이버로 가입" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171713] bg-[#03C75A] text-2xl text-white disabled:cursor-wait disabled:opacity-60"><SiNaver /></button>
                <button type="button" onClick={() => void handleInviteSignup('kakao')} disabled={isJoining || emailAuthBusy} aria-label="카카오로 가입" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171713] bg-[#FEE500] text-xl text-[#171713] disabled:cursor-wait disabled:opacity-60"><SiKakao /></button>
                <button type="button" onClick={() => void handleInviteSignup('google')} disabled={isJoining || emailAuthBusy} aria-label="구글로 가입" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171713] bg-white text-2xl text-[#171713] disabled:cursor-wait disabled:opacity-60"><FaGoogle /></button>
              </div>
              <div className="mt-1 flex items-center justify-center gap-2 border-t border-gray-200 pt-4 text-sm">
                <span className="font-bold text-gray-500">이미 계정이 있나요?</span>
                <button type="button" onClick={() => navigate('/login')} className="cursor-pointer font-black text-[#171713] underline underline-offset-4">로그인</button>
              </div>
              </div>
            ) : <div className="mt-5 grid gap-2.5">
              <button type="button" onClick={() => void handleInviteSignup('naver')} disabled={isJoining} aria-busy={joiningProvider === 'naver'} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-[#171714] bg-[#03c75a] py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55">{joiningProvider === 'naver' ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiNaver className="h-4 w-4" />} {joiningProvider === 'naver' ? '네이버 연결 중' : '네이버로 계속하기'}</button>
              <button type="button" onClick={() => void handleInviteSignup('kakao')} disabled={isJoining} aria-busy={joiningProvider === 'kakao'} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-[#171714] bg-[#fee500] py-3.5 text-sm font-black text-[#171714] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55">{joiningProvider === 'kakao' ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiKakao className="h-4 w-4" />} {joiningProvider === 'kakao' ? '카카오 연결 중' : '카카오로 계속하기'}</button>
              <button type="button" onClick={() => void handleInviteSignup('google')} disabled={isJoining} aria-busy={joiningProvider === 'google'} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#171714] py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55">{joiningProvider === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaGoogle className="h-4 w-4" />} {joiningProvider === 'google' ? 'Google 연결 중' : 'Google로 가입'}</button>
              <button type="button" onClick={() => { setShowEmailSignup(false); setIsInviteOpen(false); navigate('/signup'); }} disabled={isJoining} className="w-full cursor-pointer rounded-2xl border-2 border-[#171714] bg-white py-3.5 text-sm font-black transition hover:-translate-y-0.5">이메일로 가입</button>
            </div>}
          </section>
        </div>
      )}

      {isLoginOpen && !user?.uid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171714]/65 p-4 backdrop-blur-sm" onClick={closeLogin}>
          <section role="dialog" aria-modal="true" aria-labelledby="login-title" className="relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-[28px] border-2 border-[#171714] bg-[#fffdf8] p-7 text-left shadow-[8px_8px_0_#171714]" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={closeLogin} className="absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-black/5 hover:text-black" aria-label="로그인 창 닫기"><X className="h-4 w-4" /></button>
            <LinkZipLogo markClassName="h-14 w-14 rotate-[-4deg]" showText={false} />
            <h2 id="login-title" className="mt-5 text-xl font-black">로그인</h2>
                  <p className="mt-2 text-sm font-medium text-gray-500">이메일 또는 SNS 계정으로 로그인해주세요.</p>
            {loginFeedback && <div className={`mt-4 rounded-2xl border-2 p-4 ${loginFeedback.kind === 'account-not-found' ? 'border-[#171714] bg-[#fff2c7]' : 'border-[#efb1a2] bg-[#fff0ec]'}`}>
              <p className="text-sm font-black text-[#171714]">{loginFeedback.title}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-gray-600">{loginFeedback.description}</p>
              {loginFeedback.kind === 'account-not-found' && <button type="button" onClick={openSignupFromLogin} className="mt-3 w-full cursor-pointer rounded-xl bg-[#171714] px-4 py-3 text-sm font-black text-white">회원가입하기</button>}
            </div>}
            {emailLoginMessage && <p className="mt-4 rounded-xl bg-[#eef8e9] px-3 py-2 text-xs font-bold leading-relaxed text-[#315c2c]">{emailLoginMessage}</p>}
            {showEmailLogin ? <div className="mt-6 grid gap-3">
              <input type="email" name="linkzip-modal-login-email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} autoComplete="off" spellCheck={false} placeholder="이메일" className="w-full rounded-2xl border-2 border-[#171714] bg-white px-4 py-3.5 text-base font-bold outline-none focus:shadow-[3px_3px_0_#ff5f35]" />
              <input type="password" name="linkzip-modal-login-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleEmailLogin(); }} autoComplete="new-password" placeholder="비밀번호" className="w-full rounded-2xl border-2 border-[#171714] bg-white px-4 py-3.5 text-base font-bold outline-none focus:shadow-[3px_3px_0_#ff5f35]" />
              <button type="button" onClick={() => void handleEmailLogin()} disabled={emailAuthBusy} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#171714] py-3.5 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60">{emailAuthBusy && <Loader2 className="h-4 w-4 animate-spin" />} 이메일로 로그인</button>
              <div className="flex justify-center text-xs font-black text-gray-500">
                <button type="button" onClick={() => void handlePasswordReset()} disabled={emailAuthBusy} className="cursor-pointer underline underline-offset-2">비밀번호를 잊으셨나요?</button>
              </div>
                    <div className="my-1 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-xs font-black text-gray-500">SNS로 로그인</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                    <div className="flex justify-center gap-4">
                      <button type="button" onClick={handleNaverLogin} disabled={loginProvider !== null} aria-label="네이버로 로그인" title="네이버로 로그인" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171714] bg-[#03c75a] text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">
                        {loginProvider === 'naver' ? <Loader2 className="h-5 w-5 animate-spin" /> : <SiNaver className="h-5 w-5" />}
                      </button>
                      <button type="button" onClick={handleKakaoLogin} disabled={loginProvider !== null} aria-label="카카오로 로그인" title="카카오로 로그인" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171714] bg-[#fee500] text-[#171714] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">
                        {loginProvider === 'kakao' ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="text-2xl font-black leading-none">K</span>}
                      </button>
                      <button type="button" onClick={() => void handleGoogleLogin()} disabled={loginProvider !== null} aria-label="Google로 로그인" title="Google로 로그인" className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-[#171714] bg-white text-[#171714] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">
                        {loginProvider === 'google' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FaGoogle className="h-5 w-5" />}
                      </button>
                    </div>
            </div> : <div className="mt-6 grid gap-2.5">
              <button type="button" onClick={handleNaverLogin} disabled={loginProvider !== null} aria-busy={loginProvider === 'naver'} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-[#171714] bg-[#03c75a] py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{loginProvider === 'naver' ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiNaver className="h-4 w-4" />} {loginProvider === 'naver' ? '네이버로 이동 중' : '네이버로 계속하기'}</button>
              <button type="button" onClick={handleKakaoLogin} disabled={loginProvider !== null} aria-busy={loginProvider === 'kakao'} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-[#171714] bg-[#fee500] py-3.5 text-sm font-black text-[#171714] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{loginProvider === 'kakao' ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiKakao className="h-4 w-4" />} {loginProvider === 'kakao' ? '카카오로 이동 중' : '카카오로 계속하기'}</button>
              <button type="button" onClick={() => void handleGoogleLogin()} disabled={loginProvider !== null} aria-busy={loginProvider === 'google'} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#171714] py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{loginProvider === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaGoogle className="h-4 w-4" />} {loginProvider === 'google' ? 'Google로 이동 중' : 'Google로 로그인'}</button>
              <button type="button" onClick={() => { setShowEmailLogin(true); setEmailLoginMessage(''); setLoginFeedback(null); }} disabled={loginProvider !== null} className="w-full cursor-pointer rounded-2xl border-2 border-[#171714] bg-white py-3.5 text-sm font-black transition hover:-translate-y-0.5">이메일로 로그인</button>
            </div>}
            {loginFeedback?.kind !== 'account-not-found' && <div className="mt-5 flex items-center justify-center gap-2 border-t border-black/10 pt-4 text-sm">
              <span className="font-semibold text-gray-500">처음이신가요?</span>
              <button type="button" onClick={openSignupFromLogin} className="cursor-pointer font-black text-[#171714] underline underline-offset-4">회원가입하기</button>
            </div>}
          </section>
        </div>
      )}

    </div>
  );
};

export default Landing;
