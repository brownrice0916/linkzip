import React from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle } from "../lib/firebase";
import { useStore } from "../store/useStore";
import { Link2, Sparkles, ArrowRight, LayoutDashboard } from "lucide-react";
import { FaGoogle } from "react-icons/fa";

const Landing = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);

  const handleGoogleLogin = async () => {
    try {
      const user = await signInWithGoogle();
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        navigate("/admin");
      } else {
        navigate("/onboarding/template");
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
                onClick={handleGoogleLogin}
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
          onClick={user ? () => navigate('/admin') : handleGoogleLogin}
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
    </div>
  );
};

export default Landing;
