import React, { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useStore } from "./store/useStore";
import { getUserByUid, saveUserData } from "./services/userService";
import type { ProfileWorkspace } from "./store/useStore";
import { normalizeMembershipPlan } from "./domain/membershipPlans";

const Landing = lazy(() => import("./pages/Landing"));
const TemplateSelection = lazy(() => import("./pages/onboarding/TemplateSelection"));
const SNSSelection = lazy(() => import("./pages/onboarding/SNSSelection"));
const LinkSetup = lazy(() => import("./pages/onboarding/LinkSetup"));
const ProfileSetup = lazy(() => import("./pages/onboarding/ProfileSetup"));
const Admin = lazy(() => import("./pages/Admin"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const GuestbookPage = lazy(() => import("./pages/GuestbookPage"));
const NoticePage = lazy(() => import("./pages/NoticePage").then((module) => ({ default: module.NoticePage })));
const AnonymousMessagePage = lazy(() => import("./pages/AnonymousMessagePage"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("./pages/PaymentFail"));
const DonationPaymentSuccess = lazy(() => import("./pages/DonationPaymentSuccess"));
const DonationPaymentFail = lazy(() => import("./pages/DonationPaymentFail"));
const PlanPaymentSuccess = lazy(() => import("./pages/PlanPaymentSuccess"));
const PlanPaymentFail = lazy(() => import("./pages/PlanPaymentFail"));
const LegalPage = lazy(() => import("./pages/LegalPage"));

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

  const loadData = useStore((state) => state.loadData);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      // Check localStorage backup
      let localBackup: any = null;
      try {
        const raw = localStorage.getItem("linkzip_saved_state");
        if (raw) localBackup = JSON.parse(raw);
      } catch (e) {
        console.warn("Error reading local backup", e);
      }

      if (user) {
        try {
          const resolvedUser = await getUserByUid(user.uid);
          
          if (resolvedUser) {
            const data = resolvedUser.data;
            if (data.username && !(Array.isArray(data.profileWorkspaces) && data.profileWorkspaces.length > 0)) {
              void saveUserData(user.uid, data.username, data).catch((error) => {
                console.warn('Unable to refresh public profile index:', error);
              });
            }
            const legacyWorkspace: ProfileWorkspace = {
              id: 'primary',
              profile: data.profile || localBackup?.profile || { name: '', username: '', bio: '', avatarUrl: '' },
              templateType: data.template?.type || 'preset',
              templateValue: data.template?.value || 'minimalist',
              socialLinks: data.socialLinks || localBackup?.socialLinks || [],
              customLinks: data.customLinks || localBackup?.customLinks || [],
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
              },
            };
            const profileWorkspaces = Array.isArray(data.profileWorkspaces) && data.profileWorkspaces.length > 0
              ? data.profileWorkspaces
              : [legacyWorkspace];
            loadData({
              profileWorkspaces,
              activeProfileId: data.activeProfileId || profileWorkspaces[0].id,
              profile: data.profile || localBackup?.profile || { name: '', username: '', bio: '', avatarUrl: '' },
              templateType: data.template?.type || 'preset',
              templateValue: data.template?.value || 'minimalist',
              socialLinks: data.socialLinks || localBackup?.socialLinks || [],
              customLinks: data.customLinks || localBackup?.customLinks || [],
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
              teamMembers: data.teamMembers || [],
              dmRules: data.dmRules || localBackup?.dmRules || [],
              alimtalkSettings: data.alimtalkSettings,
              instagramAccount: data.instagramAccount || localBackup?.instagramAccount || '',
              pageViews: data.pageViews || 0,
              membershipPlan: normalizeMembershipPlan(data.membershipPlan),
            });
          } else if (localBackup) {
            loadData(localBackup);
          }
        } catch (error) {
          console.error("Error loading user data", error);
          if (localBackup) loadData(localBackup);
        }
      } else if (localBackup) {
        loadData(localBackup);
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, loadData]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50">Loading...</div>}>
        <Routes>
        <Route path="/" element={<Landing />} />

        {/* Onboarding Flow */}
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
