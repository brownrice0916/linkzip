import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { useStore } from "./store/useStore";

// Pages
import Landing from "./pages/Landing";

import TemplateSelection from "./pages/onboarding/TemplateSelection";
import SNSSelection from "./pages/onboarding/SNSSelection";
import LinkSetup from "./pages/onboarding/LinkSetup";
import ProfileSetup from "./pages/onboarding/ProfileSetup";
import Admin from "./pages/Admin";
import PublicProfile from "./pages/PublicProfile";
import GuestbookPage from "./pages/GuestbookPage";
import NoticePage from "./pages/NoticePage";

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
      if (user) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./lib/firebase');
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            loadData({
              profile: data.profile || { name: '', username: '', bio: '', avatarUrl: '' },
              templateType: data.template?.type || 'preset',
              templateValue: data.template?.value || 'minimalist',
              socialLinks: data.socialLinks || [],
              customLinks: data.customLinks || [],
              buttonStyle: data.design?.buttonStyle || 'solid',
              buttonRoundness: data.design?.buttonRoundness || 'full',
              buttonShadow: data.design?.buttonShadow || 'soft',
              buttonColor: data.design?.buttonColor,
              buttonTextColor: data.design?.buttonTextColor,
              fontFamily: data.design?.fontFamily || 'Inter',
              titleFontFamily: data.design?.titleFontFamily || '',
              pageTextColor: data.design?.pageTextColor,
              sticker: data.design?.sticker || '',
            });
          }
        } catch (error) {
          console.error("Error loading user data", error);
        }
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

        {/* Public Profile - Matches anything not defined above */}
        <Route path="/:username" element={<PublicProfile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
