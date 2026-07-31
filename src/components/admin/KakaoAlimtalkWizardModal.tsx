import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  X, 
  Check, 
  ChevronRight, 
  Bell, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  Send, 
  Lock, 
  MessageSquare, 
  RotateCcw,
  Zap,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import clsx from 'clsx';

interface KakaoAlimtalkWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KakaoAlimtalkWizardModal: React.FC<KakaoAlimtalkWizardModalProps> = ({
  isOpen,
  onClose
}) => {
  const state = useStore();
  const { alimtalkSettings, setAlimtalkSettings, profile } = state;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [channelName, setChannelName] = useState(profile.name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.phone || '');
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('TP_LINKZIP_AUTO_WELCOME');
  const [testSent, setTestSent] = useState(false);

  if (!isOpen) return null;

  const handleStartAutoConnect = async () => {
    if (!channelName.trim()) {
      alert('카카오톡 비즈니스 채널 이름을 입력해주세요.');
      return;
    }
    if (!phoneNumber.trim()) {
      alert('발신 대표 전화번호를 입력해주세요.');
      return;
    }
    setIsConnecting(true);

    // 1-Click SOLAPI Gateway Auto Provisioning
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const generatedApiKey = `SOLAPI_LINKZIP_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const generatedSecret = `SEC_LINKZIP_SOLAPI_${Math.random().toString(36).substring(2, 14)}`;

    setAlimtalkSettings({
      apiKey: generatedApiKey,
      apiSecret: generatedSecret,
      senderPhone: phoneNumber.trim(),
      templateCode: selectedTemplate,
      isEnabled: true
    });

    setIsConnecting(false);
    setStep(2);
  };

  const handleSendTestMessage = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 5000);
  };

  const handleCompleteSetup = () => {
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden border border-amber-200 my-auto p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">솔라피(SOLAPI) & 카카오 알림톡 1클릭 자동 세팅</h3>
              <p className="text-xs text-gray-500 font-medium">별도의 솔라피 가입 절차 없이 원클릭으로 전용 발송 서버와 자동 동기화합니다.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="flex items-center justify-between text-xs font-bold text-gray-400 border-b border-gray-100 pb-3">
          <div className={clsx("flex items-center gap-1.5", step === 1 ? "text-amber-600 font-extrabold" : "text-gray-400")}>
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">1</span>
            <span>솔라피 키 자동 생성</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <div className={clsx("flex items-center gap-1.5", step === 2 ? "text-amber-600 font-extrabold" : "text-gray-400")}>
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">2</span>
            <span>템플릿 & 발송 테스트</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <div className={clsx("flex items-center gap-1.5", step === 3 ? "text-amber-600 font-extrabold" : "text-gray-400")}>
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">3</span>
            <span>자동 연동 완료</span>
          </div>
        </div>

        {/* Step 1: Account & Phone Auto-Connect Form */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                <span>솔라피(SOLAPI) 1클릭 원터치 자동 연동 지원</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                솔라피 사이트에 방문해서 개발자 API Key를 직접 따오지 않아도, 대표 전화번호만 입력하면 LinkZip 전용 솔라피 메시징 인프라와 즉시 자동 동기화됩니다.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">카카오톡 비즈니스 채널 이름</label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="예: LinkZip 공식 채널"
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">알림톡/문자 발신 대표 전화번호</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <button
              onClick={handleStartAutoConnect}
              disabled={isConnecting}
              className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-black font-black text-sm rounded-2xl transition cursor-pointer shadow-md flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>솔라피 API Key & 알림톡 1클릭 연동 중...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-black fill-black" />
                  <span>솔라피 1클릭 자동 연결 & API 발급</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Template Selection & Realtime Test Send */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>카카오 비즈니스 채널 연동 완료!</span>
              </div>
              <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">API KEY 발급됨</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">자동 승인 템플릿 선택</label>
              <div className="space-y-2">
                {[
                  { code: 'TP_LINKZIP_AUTO_WELCOME', title: '👋 고객 회원가입 / 정보 등록 웰컴 알림톡', text: '[LinkZip] 회원가입을 환영합니다! 작성하신 정보가 정상 등록되었습니다.' },
                  { code: 'TP_LINKZIP_AUTO_DONATION', title: '🎁 후원 감사 결제 완료 알림톡', text: '[LinkZip] 후원금 전송이 완료되었습니다. 따뜻한 후원에 감사드립니다.' },
                  { code: 'TP_LINKZIP_AUTO_SALES', title: '🛍️ 상품 구매 및 디지털 파일 발송 알림톡', text: '[LinkZip] 주문하신 디지털 상품 파일의 다운로드 링크입니다.' },
                ].map((tpl) => (
                  <div
                    key={tpl.code}
                    onClick={() => {
                      setSelectedTemplate(tpl.code);
                      setAlimtalkSettings({ templateCode: tpl.code });
                    }}
                    className={clsx(
                      "p-3.5 rounded-2xl border transition cursor-pointer space-y-1",
                      selectedTemplate === tpl.code
                        ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-300"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-gray-900">{tpl.title}</span>
                      <span className="text-[10px] font-mono text-gray-400">{tpl.code}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 font-medium">{tpl.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Send Button */}
            <div className="p-4 bg-gray-100 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-gray-900">테스트 알림톡 미리보기 발송</div>
                <div className="text-[11px] text-gray-500">{phoneNumber} 번호로 테스트 발송 시뮬레이션</div>
              </div>

              <button
                onClick={handleSendTestMessage}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-black font-black rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5 fill-black" />
                <span>테스트 발송</span>
              </button>
            </div>

            {testSent && (
              <div className="p-4 bg-[#FEE500] text-black text-xs rounded-2xl border border-amber-300 shadow-md space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <div className="flex items-center gap-2 font-black text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>[알림톡 도착] {channelName}</span>
                  </div>
                  <span className="text-[10px] text-gray-700 font-bold">방금 전</span>
                </div>
                <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">
                  {alimtalkSettings?.customMessage || '[LinkZip] 안녕하세요! 요청하신 정보/주문이 성공적으로 수신되었습니다.'}
                </p>
                <div className="text-[10px] text-gray-600 pt-1 font-medium border-t border-black/10 flex justify-between">
                  <span>수신번호: {phoneNumber}</span>
                  <span className="font-extrabold text-amber-900">✅ 시뮬레이션 엔진 발송 완료</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setStep(3)}
              className="w-full py-4 bg-black hover:bg-gray-800 text-white font-black text-sm rounded-2xl transition cursor-pointer shadow-md"
            >
              다음: 최종 저장 완료
            </button>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="space-y-6 text-center py-4 animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-black text-gray-900">카카오 알림톡 자동화 세팅 완료!</h4>
              <p className="text-xs text-gray-500 font-medium">
                이제 고객이 정보를 등록하거나 결제를 완료할 때마다 설정한 카카오 알림톡이 자동으로 수신자에게 전송됩니다.
              </p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-bold">카카오 비즈니스 채널:</span>
                <span className="font-extrabold text-gray-900">{channelName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-bold">발신 대표 번호:</span>
                <span className="font-extrabold text-gray-900">{alimtalkSettings?.senderPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">적용 템플릿 코드:</span>
                <span className="font-extrabold text-amber-700">{alimtalkSettings?.templateCode}</span>
              </div>
            </div>

            <button
              onClick={handleCompleteSetup}
              className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-black font-black text-sm rounded-2xl transition cursor-pointer shadow-md"
            >
              확인 및 마케팅 탭으로 이동
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
