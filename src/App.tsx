import React, { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { deleteUser, onAuthStateChanged, signOut } from "firebase/auth";
import { auth, EMAIL_SIGNUP_PENDING_KEY } from "./lib/firebase";
import { useStore } from "./store/useStore";
import { getUserByUid, saveUserData } from "./services/userService";
import type { PageSticker, ProfileWorkspace } from "./store/useStore";
import { resolveActiveMembershipPlan } from "./domain/membershipPlans";
import UpgradePromptHost from "./components/UpgradePromptHost";
import {
  BETA_ACCESS_ERROR_EVENT,
  BETA_INVITE_SESSION_KEY,
  betaErrorMessage,
  checkBetaAccess,
  redeemBetaInvite,
} from "./services/betaAccessService";
import { LOGIN_INTENT_SESSION_KEY, parkAuthError } from "./constants/authFlow";

const Landing = lazy(() => import("./pages/Landing"));
const OnboardingFlow = lazy(() => import("./pages/onboarding/OnboardingFlow"));
const OnboardingSurvey = lazy(() => import("./pages/onboarding/OnboardingSurvey"));
const LayoutRecommendation = lazy(() => import("./pages/onboarding/LayoutRecommendation"));
const TemplateSelection = lazy(() => import("./pages/onboarding/TemplateSelection"));
const SNSSelection = lazy(() => import("./pages/onboarding/SNSSelection"));
const LinkSetup = lazy(() => import("./pages/onboarding/LinkSetup"));
const ProfileSetup = lazy(() => import("./pages/onboarding/ProfileSetup"));
const Admin = lazy(() => import("./pages/Admin"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const StoreComingSoon = lazy(() => import("./pages/StoreComingSoon"));
const GuestbookPage = lazy(() => import("./pages/GuestbookPage"));
const NoticePage = lazy(() => import("./pages/NoticePage").then((module) => ({ default: module.NoticePage })));
const AnonymousMessagePage = lazy(() => import("./pages/AnonymousMessagePage"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("./pages/PaymentFail"));
const DonationPaymentSuccess = lazy(() => import("./pages/DonationPaymentSuccess"));
const DonationPaymentFail = lazy(() => import("./pages/DonationPaymentFail"));
const PlanPaymentSuccess = lazy(() => import("./pages/PlanPaymentSuccess"));
const PlanPaymentFail = lazy(() => import("./pages/PlanPaymentFail"));
const PlanManagementPage = lazy(() => import("./pages/PlanManagementPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const SiteAdmin = lazy(() => import("./pages/SiteAdmin"));
const BugReportPage = lazy(() => import("./pages/BugReportPage"));
const KakaoAuthComplete = lazy(() => import("./pages/KakaoAuthComplete"));
const NaverAuthComplete = lazy(() => import("./pages/NaverAuthComplete"));

const loadedStickers = (design: any): PageSticker[] => {
  if (Array.isArray(design?.stickers)) return design.stickers;
  if (!design?.sticker) return [];
  return [{
    id: 'legacy-sticker',
    value: design.sticker,
    x: design.stickerX ?? 62,
    y: design.stickerY ?? 22,
    size: 18,
    animated: /^https?:\/\//.test(design.sticker),
  }];
};

const RoutePendingScreen = () => (
  <div aria-hidden="true" className="min-h-[100svh] w-full bg-[#f7f7f4]" />
);

const RouteTransitionBoundary = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  return (
    <Suspense key={pathname} fallback={<RoutePendingScreen />}>
      {children}
    </Suspense>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useStore((state) => state.user);
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  const setUser = useStore((state) => state.setUser);
  const [loading, setLoading] = useState(true);
  const firstPathSegment = window.location.pathname.split('/').filter(Boolean)[0] || '';
  const reservedSingleSegmentRoutes = new Set([
    'admin', 'auth', 'onboarding', 'payment', 'site-admin',
    'terms', 'privacy', 'refund-policy', 'guestbook', 'notice', 'login', 'signup',
  ]);
  const isPublicProfileRoute = (/^\/[^/]+\/?$/.test(window.location.pathname)
    || /^\/[^/]+\/shop\/?$/.test(window.location.pathname))
    && !reservedSingleSegmentRoutes.has(firstPathSegment);
  const routeReady = !loading || isPublicProfileRoute;

  const loadData = useStore((state) => state.loadData);

  useEffect(() => {
    // A public profile never needs the signed-in editor bootstrap. Skipping it
    // prevents an extra user document and beta-access request from competing
    // with the public profile and its images on mobile connections.
    if (isPublicProfileRoute) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Keep the current route hidden until the next account has been resolved.
      // This prevents the previous member's workspace from flashing during
      // social-login returns, logout, and account switches.
      setLoading(true);

      // createUserWithEmailAndPassword signs the browser in immediately. Do
      // not bootstrap an editor session while signup is still redeeming the
      // invite and sending its verification email.
      if (user && sessionStorage.getItem(EMAIL_SIGNUP_PENDING_KEY) === '1') {
        setUser(null);
        setLoading(false);
        return;
      }

      const usesEmailPassword = user?.providerData.some(
        (provider) => provider.providerId === 'password',
      );
      if (user && usesEmailPassword && !user.emailVerified) {
        setUser(null);
        await signOut(auth).catch(() => undefined);
        setLoading(false);
        return;
      }
      // Check localStorage backup
      let localBackup: any = null;
      try {
        const raw = localStorage.getItem("linkzip_saved_state");
        if (raw) localBackup = JSON.parse(raw);
      } catch (e) {
        console.warn("Error reading local backup", e);
      }

      if (user) {
        const userLocalBackup = localBackup?.ownerUid === user.uid ? localBackup : null;
        const loadEmptyAccount = () => loadData({
          profile: { name: '', username: '', bio: '', avatarUrl: '', hideWatermark: false },
          profileWorkspaces: [],
          activeProfileId: 'primary',
          templateType: 'preset',
          templateValue: 'minimalist',
          socialLinks: [],
          customLinks: [],
          buttonStyle: 'solid',
          buttonRoundness: 'full',
          buttonShadow: 'soft',
          buttonColor: undefined,
          buttonTextColor: undefined,
          buttonBorderColor: '#111827',
          buttonBorderWidth: 0,
          buttonOpacity: 100,
          buttonTextOpacity: 100,
          fontFamily: 'Inter',
          titleFontFamily: '',
          pageTextColor: undefined,
          pageTextOpacity: 100,
          backgroundOpacity: 100,
          sticker: '',
          stickerX: 62,
          stickerY: 22,
          stickers: [],
          teamMembers: [],
          dmRules: [],
          alimtalkSettings: { apiKey: '', apiSecret: '', senderPhone: '', templateCode: '', isEnabled: false },
          instagramAccount: '',
          pageViews: 0,
          membershipPlan: 'basic',
          membershipPeriodEndsAt: null,
          membershipGrant: null,
        });
        let resolvedUser: Awaited<ReturnType<typeof getUserByUid>> = null;
        try {
          resolvedUser = await getUserByUid(user.uid);
        } catch (error) {
          console.error("Error checking existing user data", error);
        }

        try {
          const pendingInvite = sessionStorage.getItem(BETA_INVITE_SESSION_KEY);
          let betaAllowed = Boolean(resolvedUser);
          if (pendingInvite) {
            try {
              betaAllowed = (await redeemBetaInvite(pendingInvite)).allowed;
            } finally {
              sessionStorage.removeItem(BETA_INVITE_SESSION_KEY);
            }
          } else if (!betaAllowed) {
            // An existing LinkZip user has already passed the private-beta
            // gate. Rechecking the callable on every social-login return can
            // incorrectly sign that user out when the mobile network is slow
            // or the access check is briefly unavailable.
            betaAllowed = (await checkBetaAccess()).allowed;
          }

          if (betaAllowed) {
            resolvedUser = await getUserByUid(user.uid) || resolvedUser;
          }

          if (!betaAllowed) {
            throw new Error('비공개 베타는 초대코드를 받은 분만 가입할 수 있습니다.');
          }

          setUser(user);
        } catch (error) {
          console.error("Beta access denied", error);
          const message = betaErrorMessage(error);
          setUser(null);
          sessionStorage.removeItem(BETA_INVITE_SESSION_KEY);
          if (!resolvedUser) {
            try {
              if (auth.currentUser?.uid === user.uid) await deleteUser(user);
            } catch {
              await signOut(auth).catch(() => undefined);
            }
          } else {
            await signOut(auth).catch(() => undefined);
          }
          // Landing is unmounted while `loading` gates the router, so the event
          // below can land with no listener. Park the reason so Landing can
          // replay it on mount instead of returning the user to a blank screen.
          // A sign-in handler that already parked a more precise reason wins:
          // it knew this was a login attempt before its intent flag was cleared.
          parkAuthError({
            kind: sessionStorage.getItem(LOGIN_INTENT_SESSION_KEY) === '1' ? 'account-not-found' : 'error',
            detail: message,
          }, { keepExisting: true });
          window.dispatchEvent(new CustomEvent(BETA_ACCESS_ERROR_EVENT, { detail: message }));
          setLoading(false);
          return;
        }

        try {
          if (resolvedUser) {
            const data = resolvedUser.data;
            if (data.username && !(Array.isArray(data.profileWorkspaces) && data.profileWorkspaces.length > 0)) {
              void saveUserData(user.uid, data.username, data).catch((error) => {
                console.warn('Unable to refresh public profile index:', error);
              });
            }
            const legacyWorkspace: ProfileWorkspace = {
              id: 'primary',
              profile: data.profile || userLocalBackup?.profile || { name: '', username: '', bio: '', avatarUrl: '' },
              templateType: data.template?.type || 'preset',
              templateValue: data.template?.value || 'minimalist',
              socialLinks: data.socialLinks || userLocalBackup?.socialLinks || [],
              customLinks: data.customLinks || userLocalBackup?.customLinks || [],
              design: {
                buttonStyle: data.design?.buttonStyle || 'solid',
                buttonRoundness: data.design?.buttonRoundness || 'full',
                buttonShadow: data.design?.buttonShadow || 'soft',
                buttonColor: data.design?.buttonColor,
                buttonTextColor: data.design?.buttonTextColor,
                buttonOpacity: data.design?.buttonOpacity ?? 100,
                buttonTextOpacity: data.design?.buttonTextOpacity ?? 100,
                fontFamily: data.design?.fontFamily || 'Inter',
                titleFontFamily: data.design?.titleFontFamily || '',
                pageTextColor: data.design?.pageTextColor,
                pageTextOpacity: data.design?.pageTextOpacity ?? 100,
                backgroundOpacity: data.design?.backgroundOpacity ?? 100,
                sticker: data.design?.sticker || '',
                stickerX: data.design?.stickerX ?? 62,
                stickerY: data.design?.stickerY ?? 22,
                stickers: loadedStickers(data.design),
              },
            };
            const profileWorkspaces = Array.isArray(data.profileWorkspaces) && data.profileWorkspaces.length > 0
              ? data.profileWorkspaces
              : [legacyWorkspace];
            loadData({
              profileWorkspaces,
              activeProfileId: data.activeProfileId || profileWorkspaces[0].id,
              profile: data.profile || userLocalBackup?.profile || { name: '', username: '', bio: '', avatarUrl: '' },
              templateType: data.template?.type || 'preset',
              templateValue: data.template?.value || 'minimalist',
              socialLinks: data.socialLinks || userLocalBackup?.socialLinks || [],
              customLinks: data.customLinks || userLocalBackup?.customLinks || [],
              buttonStyle: data.design?.buttonStyle || 'solid',
              buttonRoundness: data.design?.buttonRoundness || 'full',
              buttonShadow: data.design?.buttonShadow || 'soft',
              buttonColor: data.design?.buttonColor,
              buttonTextColor: data.design?.buttonTextColor,
              buttonOpacity: data.design?.buttonOpacity ?? 100,
              buttonTextOpacity: data.design?.buttonTextOpacity ?? 100,
              fontFamily: data.design?.fontFamily || 'Inter',
              titleFontFamily: data.design?.titleFontFamily || '',
              pageTextColor: data.design?.pageTextColor,
              pageTextOpacity: data.design?.pageTextOpacity ?? 100,
              backgroundOpacity: data.design?.backgroundOpacity ?? 100,
              sticker: data.design?.sticker || '',
              stickerX: data.design?.stickerX ?? 62,
              stickerY: data.design?.stickerY ?? 22,
              stickers: loadedStickers(data.design),
              teamMembers: data.teamMembers || [],
              dmRules: data.dmRules || userLocalBackup?.dmRules || [],
              alimtalkSettings: data.alimtalkSettings,
              instagramAccount: data.instagramAccount || userLocalBackup?.instagramAccount || '',
              pageViews: data.pageViews || 0,
              membershipPlan: resolveActiveMembershipPlan(data.membershipPlan, data.membershipPeriodEndsAt, Date.now(), data.membershipGrant),
              membershipPeriodEndsAt: data.membershipPeriodEndsAt?.toDate?.().toISOString?.()
                || (typeof data.membershipPeriodEndsAt === 'string' ? data.membershipPeriodEndsAt : null),
              membershipGrant: typeof data.membershipGrant === 'string' ? data.membershipGrant : null,
            });
          } else if (userLocalBackup) {
            loadData(userLocalBackup);
          } else {
            loadEmptyAccount();
          }
        } catch (error) {
          console.error("Error loading user data", error);
          if (userLocalBackup) loadData(userLocalBackup);
          else loadEmptyAccount();
        }
      } else {
        // A signed-out visitor must never inherit the last signed-in editor
        // snapshot. The backup is only an offline fallback for its owner.
        setUser(null);
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, loadData, isPublicProfileRoute]);

  return (
    <>
      {routeReady && <BrowserRouter>
        <RouteTransitionBoundary>
          <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Landing authMode="login" />} />
        <Route path="/signup" element={<Landing authMode="signup" />} />
        <Route path="/auth/kakao/complete" element={<KakaoAuthComplete />} />
        <Route path="/auth/naver/complete" element={<NaverAuthComplete />} />
        <Route path="/site-admin" element={<ProtectedRoute><SiteAdmin /></ProtectedRoute>} />

        {/* Onboarding Flow */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingFlow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/survey"
          element={
            <ProtectedRoute>
              <OnboardingSurvey />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/layout"
          element={
            <ProtectedRoute>
              <LayoutRecommendation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/template"
          element={
            <ProtectedRoute>
              <TemplateSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/sns"
          element={
            <ProtectedRoute>
              <SNSSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/links"
          element={
            <ProtectedRoute>
              <LinkSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding/profile"
          element={
            <ProtectedRoute>
              <ProfileSetup />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/plan"
          element={
            <ProtectedRoute>
              <PlanManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/billing"
          element={
            <ProtectedRoute>
              <PlanManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bug-report"
          element={
            <ProtectedRoute>
              <BugReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/store"
          element={
            <ProtectedRoute>
              <StoreComingSoon />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/:tab"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* Guestbook & Notice Pages */}
        <Route path="/guestbook/:username" element={<GuestbookPage />} />
        <Route path="/:username/guestbook" element={<GuestbookPage />} />
        <Route path="/notice/:username" element={<NoticePage />} />
        <Route path="/:username/notice" element={<NoticePage />} />
        <Route path="/:username/message" element={<AnonymousMessagePage />} />
        <Route path="/:username/shop" element={<StoreComingSoon />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/fail" element={<PaymentFail />} />
        <Route path="/payment/donation/success" element={<DonationPaymentSuccess />} />
        <Route path="/payment/donation/fail" element={<DonationPaymentFail />} />
        <Route path="/payment/plan/success" element={<ProtectedRoute><PlanPaymentSuccess /></ProtectedRoute>} />
        <Route path="/payment/plan/fail" element={<ProtectedRoute><PlanPaymentFail /></ProtectedRoute>} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/privacy" element={<LegalPage />} />
        <Route path="/refund-policy" element={<LegalPage />} />

        {/* Public Profile - Matches anything not defined above */}
        <Route path="/:username" element={<PublicProfile />} />
          </Routes>
        </RouteTransitionBoundary>
        <UpgradePromptHost />
      </BrowserRouter>}
    </>
  );
}

export default App;
