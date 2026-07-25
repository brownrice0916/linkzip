import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  X, 
  Check, 
  ChevronDown, 
  Lock, 
  Smartphone, 
  ShieldCheck, 
  Bot,
  HelpCircle,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Send,
  Heart,
  Plus,
  RotateCw,
  LogOut,
  UserPlus
} from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';
import { InstagramDmRuleCreateWizardModal } from './InstagramDmRuleCreateWizardModal';
import clsx from 'clsx';

interface InstagramDmWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRuleModal?: () => void;
}

export const InstagramDmWizardModal: React.FC<InstagramDmWizardModalProps> = ({
  isOpen,
  onClose,
  onOpenRuleModal
}) => {
  const state = useStore();

  // Step 1: Showcase Intro, Step 2: Link Account Modal, Step 3: SMS Verification, Step 4: Permissions, Step 5: Complete
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);

  // Account Dropdown State (Matching Screenshot 5)
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  // Create Rule 5-Step Wizard Modal State (Matching Screenshots 2, 3, 4)
  const [isCreateRuleWizardOpen, setIsCreateRuleWizardOpen] = useState(false);

  // Permission Toggles (Step 4)
  const [permComments, setPermComments] = useState(true);
  const [permMessages, setPermMessages] = useState(true);
  const [permContent, setPermContent] = useState(true);
  const [permInsights, setPermInsights] = useState(true);

  if (!isOpen) return null;

  const handleStartLinking = () => {
    setIsAccountDropdownOpen(false);
    setWizardStep(2);
  };

  const handleStep2To3 = () => {
    setWizardStep(3);
  };

  const handleStep3To4 = () => {
    setWizardStep(4);
  };

  const handleStep4Complete = () => {
    const defaultAccount = 'grain.toon';
    state.setInstagramAccount(defaultAccount);
    setWizardStep(5);
  };

  const handleCreateAutomationRule = () => {
    setIsAccountDropdownOpen(false);
    setIsCreateRuleWizardOpen(true);
  };

  const handleUnlinkAccount = () => {
    if (confirm('정말로 인스타그램 계정 연동을 해제하시겠습니까?')) {
      state.setInstagramAccount(null);
      setIsAccountDropdownOpen(false);
      setWizardStep(1);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#EDF2F7] z-50 flex flex-col font-sans overflow-hidden animate-in fade-in duration-200">
      <div className="bg-[#EDF2F7] w-full h-full flex flex-col relative overflow-hidden">
        
        {/* Top Sticky Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 z-20 relative">
          <div className="flex items-center gap-2">
            <FaInstagram className="w-5 h-5 text-pink-600" />
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Instagram DM Automation</h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Connected Account Dropdown Badge (Matching Screenshot 5) */}
            {state.instagramAccount ? (
              <div className="relative">
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 shadow-2xs transition cursor-pointer"
                >
                  <img 
                    src={state.profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} 
                    alt="avatar" 
                    className="w-6 h-6 rounded-full object-cover border border-amber-300 shadow-xs"
                  />
                  <span className="text-xs font-bold text-blue-600">{state.instagramAccount}</span>
                  <ChevronDown className={clsx("w-3.5 h-3.5 text-gray-500 transition-transform duration-200", isAccountDropdownOpen ? "rotate-180" : "rotate-0")} />
                </button>

                {/* Account Dropdown Menu Popup (Matching Screenshot 5) */}
                {isAccountDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 font-sans">
                    {/* Account Item */}
                    <div className="px-4 py-2.5 flex items-center gap-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                      <img 
                        src={state.profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"} 
                        alt="avatar" 
                        className="w-7 h-7 rounded-full object-cover border border-amber-300"
                      />
                      <span className="text-xs font-bold text-blue-600 flex-1 truncate">{state.instagramAccount}</span>
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    </div>

                    {/* Actions */}
                    <button
                      onClick={handleStartLinking}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-gray-800 hover:bg-gray-50 transition cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-gray-900" />
                      <span>Add account</span>
                    </button>

                    <button
                      onClick={handleStartLinking}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-gray-800 hover:bg-gray-50 transition cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4 text-gray-900" />
                      <span>Reconnect account</span>
                    </button>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      onClick={handleUnlinkAccount}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-600" />
                      <span>Unlink account</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Top Action Button */}
            <button
              onClick={handleCreateAutomationRule}
              className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer flex items-center gap-1"
            >
              +Create automation for free
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 relative">

          {/* Banner Section */}
          <div className="text-center space-y-3 pt-2">
            <div className="inline-block px-3 py-1 bg-black text-white text-xs font-bold rounded-lg shadow-sm">
              100% 무료
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              DM 자동화 1분이면 셋팅 끝!
            </h2>
          </div>

          {/* 3 Showcase Cards Grid (Matching Screenshot 1) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            
            {/* Card 1 */}
            <div className="bg-[#1E1B4B] rounded-3xl p-6 text-white flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
              <div className="bg-white text-black p-4 rounded-2xl space-y-2 shadow-md">
                <div className="w-16 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto border border-indigo-200">
                  <span className="text-xl">💻</span>
                </div>
                <div className="text-xs font-bold text-gray-900 text-left pt-2">
                  <span className="font-extrabold text-indigo-600">littly</span> 댓글에 <span className="bg-yellow-200 px-1 rounded">“파일”</span>을 적어 주시면 자료를 전달 드려요!
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-400/30 text-white font-extrabold text-base flex items-center justify-center shrink-0">
                  1
                </div>
                <p className="text-xs sm:text-sm font-bold leading-snug">
                  특정 댓글 or 전체댓글 셋팅만 해주면 준비는 끝 !!
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#1E1B4B] rounded-3xl p-6 text-white flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
              <div className="bg-white text-black p-4 rounded-2xl space-y-3 shadow-md text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-300 shrink-0" />
                  <div>
                    <span className="font-bold">파일 주세요~</span>
                    <span className="text-[10px] text-gray-400 block">7주 좋아요 1개 답글 달기</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 pl-4">
                  <div className="w-6 h-6 rounded-full bg-red-400 shrink-0" />
                  <span className="font-bold text-gray-800">전달드렸어요! 감사해요 ❤️</span>
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <div className="w-6 h-6 rounded-full bg-gray-300 shrink-0" />
                  <div>
                    <span className="font-bold">파일 받고싶습니다</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 pl-4">
                  <div className="w-6 h-6 rounded-full bg-red-400 shrink-0" />
                  <span className="font-bold text-gray-800">항상 응원해요 &gt;&lt;💕</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-400/30 text-white font-extrabold text-base flex items-center justify-center shrink-0">
                  2
                </div>
                <p className="text-xs sm:text-sm font-bold leading-snug">
                  알아서, 자동 답변을 랜덤으로 달아줘요 !!
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#1E1B4B] rounded-3xl p-6 text-white flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
              <div className="bg-white text-black p-4 rounded-2xl space-y-3 shadow-md text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-300 shrink-0" />
                    <span className="font-bold">customer</span>
                  </div>
                  <span className="text-[10px] text-gray-400">고객님</span>
                </div>

                <div className="bg-gray-100 p-3 rounded-xl space-y-2">
                  <p className="text-[11px] text-gray-700 leading-tight">
                    🥰안녕하세요~!! 도움되실 파일과 정보들을 전달드립니다 고객님의 꿈을 응원합니다.
                  </p>
                  <button className="w-full py-1.5 bg-white text-blue-600 text-[11px] font-bold rounded-lg border border-gray-200 flex items-center justify-center gap-1">
                    정보 바로 보기 🏞️
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-400/30 text-white font-extrabold text-base flex items-center justify-center shrink-0">
                  3
                </div>
                <p className="text-xs sm:text-sm font-bold leading-snug">
                  동시에, 자동 DM 발송까지 !! <br />(링크는 최대 3개까지)
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Q&A Support Section */}
          <div className="text-center pt-6 space-y-3">
            <p className="text-xs text-gray-500 font-medium">
              Having trouble with Instagram DM Automation? <br />
              Try solving your issue in the Instagram Q&A!
            </p>
            <button 
              onClick={() => window.open('https://help.instagram.com', '_blank')}
              className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              Go to Q&A
            </button>
          </div>

        </div>

        {/* STEP 2 MODAL OVERLAY: Instagram Account Linking (Screenshot 2) */}
        {wizardStep === 2 && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 font-sans relative border border-gray-100">
              <button 
                onClick={() => setWizardStep(1)}
                className="absolute right-4 top-4 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-extrabold text-gray-900 text-left">Instagram account linking</h3>

              {/* Mascot Graphic Illustration */}
              <div className="w-36 h-36 mx-auto relative flex items-center justify-center">
                <div className="w-28 h-28 bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 rounded-3xl p-4 shadow-xl flex items-center justify-center text-white">
                  <FaInstagram className="w-16 h-16" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-black text-white p-2.5 rounded-full shadow-lg">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              <p className="text-xs text-gray-600 font-semibold leading-relaxed px-2">
                Your account information is securely protected through official authentication procedures, without the risk of hacking or data breaches.
              </p>

              <button
                onClick={handleStep2To3}
                className="w-full py-4 bg-black hover:bg-gray-800 text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer"
              >
                Link account
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 MODAL OVERLAY: Check SMS Code (Standard SMS Text Message) */}
        {wizardStep === 3 && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl animate-in fade-in zoom-in-95 font-sans relative">
              <div className="text-left space-y-1">
                <span className="text-xs font-bold text-gray-400">싸리 | 인스타툰 • Instagram</span>
                <h3 className="text-xl font-black text-gray-900">Check your SMS messages</h3>
                <p className="text-xs text-gray-500 font-medium">
                  Enter the code we sent via SMS to your mobile phone at +82 10-****-**53.
                </p>
              </div>

              {/* Phone Graphic Banner (SMS Theme) */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 text-center relative overflow-hidden border border-blue-200">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md mb-2">
                  <Smartphone className="w-9 h-9" />
                </div>
                <div className="bg-white px-4 py-2 rounded-xl text-blue-600 font-mono font-bold text-lg inline-block border border-gray-200 shadow-xs">
                  ******
                </div>
              </div>

              {/* Code Input */}
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-base font-mono font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  />
                </div>

                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-[11px] text-blue-700 font-semibold leading-relaxed">
                  💡 <b>테스트 안내:</b> 실제로 SMS 문자를 기다리실 필요 없이 아무 6자리 숫자를 입력하거나 바로 <b>[Continue]</b> 버튼을 누르시면 다음 <b>[권한 허용]</b> 단계로 진행됩니다!
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Trust this device and skip this step from now on</span>
                </label>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleStep3To4}
                    className="w-full py-3.5 bg-[#4285F4] hover:bg-[#3367D6] text-white font-extrabold text-sm rounded-full shadow-md transition cursor-pointer"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => {
                      setVerificationCode('123456');
                      alert('인증 코드(123456)가 테스트용으로 자동 입력되었습니다.');
                    }}
                    className="w-full py-3 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold text-xs rounded-full transition cursor-pointer"
                  >
                    Try another way (테스트 코드 자동입력)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 MODAL OVERLAY: Instagram Permissions Allow (Screenshot 4) */}
        {wizardStep === 4 && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl animate-in fade-in zoom-in-95 font-sans text-left border border-gray-100">
              {/* Instagram Script Logo Header */}
              <div className="text-center pb-2 border-b border-gray-100">
                <span className="text-3xl font-serif italic font-bold tracking-tight text-gray-900">
                  Instagram
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-900">Allow access to messages</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Give anyone with approved access the ability to view, send and respond to Instagram messages.
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs font-semibold text-gray-800">
                <span className="font-bold text-indigo-600">LinkZip-IG</span> is requesting access to: <span className="font-bold">grain.toon</span>. If you select Allow, LinkZip-IG will be able to:
              </div>

              {/* Permission List Toggles */}
              <div className="space-y-3 pt-1 text-xs font-bold text-gray-700">
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span>View profile and access media (required)</span>
                  <span className="text-xs text-gray-400 font-normal">ON</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span>Access and manage comments</span>
                  <input
                    type="checkbox"
                    checked={permComments}
                    onChange={(e) => setPermComments(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span>Access and manage messages</span>
                  <input
                    type="checkbox"
                    checked={permMessages}
                    onChange={(e) => setPermMessages(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span>Access and publish content</span>
                  <input
                    type="checkbox"
                    checked={permContent}
                    onChange={(e) => setPermContent(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span>Access and manage insights</span>
                  <input
                    type="checkbox"
                    checked={permInsights}
                    onChange={(e) => setPermInsights(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3">
                <button
                  onClick={handleStep4Complete}
                  className="w-full py-3.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold text-sm rounded-2xl shadow-md transition cursor-pointer"
                >
                  Allow
                </button>
                <button
                  onClick={() => setWizardStep(1)}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 MODAL OVERLAY: Connected Complete State (Screenshot 5) */}
        {wizardStep === 5 && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 font-sans relative border border-gray-100">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-md">
                <Check className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900">인스타그램 연동 완료!</h3>
                <p className="text-xs text-gray-500 font-medium">
                  <span className="font-bold text-indigo-600">grain.toon</span> 계정 권한 연동이 성공적으로 완료되었습니다.
                </p>
              </div>

              <button
                onClick={handleCreateAutomationRule}
                className="w-full py-4 bg-[#4285F4] hover:bg-[#3367D6] text-white font-extrabold text-sm rounded-2xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                + DM 자동화 규칙 만들기
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Create Automation Rule 5-Step Wizard Modal */}
      <InstagramDmRuleCreateWizardModal
        isOpen={isCreateRuleWizardOpen}
        onClose={() => setIsCreateRuleWizardOpen(false)}
      />
    </div>
  );
};
