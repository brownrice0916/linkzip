import React, { useState } from "react";
import { Link2, Sparkles, ArrowRight, AlertOctagon } from "lucide-react";
import { FaGoogle } from "react-icons/fa";

const Landing = () => {
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const handleBlockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowBlockedModal(true);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30 overflow-hidden relative font-sans">
      {/* Background Mesh Gradient Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-fuchsia-600/20 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">LinkZip</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleBlockedClick}
            className="hidden md:block px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            Log in
          </button>
          <button
            onClick={handleBlockedClick}
            className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-gray-100 font-semibold text-sm transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
          >
            Sign up
          </button>
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
          onClick={handleBlockedClick}
          className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold text-lg overflow-hidden transition-transform hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] cursor-pointer"
        >
          <FaGoogle className="w-5 h-5 text-black" />
          <span>Get started</span>
          <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="mt-6 text-sm text-gray-500 font-medium">
          Free forever. No credit card required.
        </p>
      </main>

      {/* Blocked Popup Modal */}
      {showBlockedModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowBlockedModal(false)}
        >
          <div 
            className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tight">안돼돌아가</h2>
              <p className="text-sm text-gray-400 font-medium">접근이 제한되었습니다.</p>
            </div>

            <button
              onClick={() => setShowBlockedModal(false)}
              className="w-full py-3.5 bg-white hover:bg-gray-200 text-black text-sm font-bold rounded-full transition shadow-lg cursor-pointer"
            >
              확인 (돌아가기)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
