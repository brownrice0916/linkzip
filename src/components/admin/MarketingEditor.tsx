import React, { useState } from 'react';
import { useStore, type DMAutomationRule } from '../../store/useStore';
import { 
  Send, 
  MessageSquare, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  Settings, 
  Zap, 
  Bell, 
  Phone, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Bot,
  HelpCircle
} from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';
import { InstagramDmWizardModal } from './InstagramDmWizardModal';
import { InstagramDmRuleCreateWizardModal } from './InstagramDmRuleCreateWizardModal';
import clsx from 'clsx';

export const MarketingEditor: React.FC = () => {
  const state = useStore();
  const { 
    instagramAccount, 
    dmRules, 
    addDMRule, 
    updateDMRule, 
    removeDMRule, 
    alimtalkSettings, 
    setAlimtalkSettings 
  } = state;

  const [isDmWizardOpen, setIsDmWizardOpen] = useState(false);
  const [isRuleCreateModalOpen, setIsRuleCreateModalOpen] = useState(false);

  // New Rule Quick Input
  const [newKeyword, setNewKeyword] = useState('');
  const [newResponseMessage, setNewResponseMessage] = useState('');
  const [newTargetLink, setNewTargetLink] = useState('');
  const [isAddingRule, setIsAddingRule] = useState(false);

  const handleCreateRule = () => {
    if (!newKeyword.trim() || !newResponseMessage.trim()) {
      alert('키워드와 답장 문구를 입력해주세요.');
      return;
    }

    const newRule: DMAutomationRule = {
      id: `rule-${Date.now()}`,
      keyword: newKeyword.trim(),
      responseMessage: newResponseMessage.trim(),
      targetLinkUrl: newTargetLink.trim() || 'https://linkzip.kr/preview',
      isActive: true,
    };

    addDMRule(newRule);
    setNewKeyword('');
    setNewResponseMessage('');
    setNewTargetLink('');
    setIsAddingRule(false);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans max-w-4xl">
      
      {/* Marketing Header Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-900 via-indigo-900 to-black text-white p-6 sm:p-8 rounded-3xl shadow-lg">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-pink-500/30 border border-pink-400/40 text-pink-200 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300 animate-spin" /> Marketing Hub
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">인스타그램 DM 자동 발송 & 마케팅</h2>
          <p className="text-xs text-purple-200 font-medium">
            인스타그램 댓글/메시지에 자동으로 DM 링크를 발송하고 알림톡 마케팅을 관리합니다.
          </p>
        </div>

        <button
          onClick={() => setIsDmWizardOpen(true)}
          className="px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl transition cursor-pointer font-extrabold text-xs shrink-0 flex items-center gap-2 shadow-md hover:scale-105"
        >
          <FaInstagram className="w-4 h-4" />
          <span>DM 위자드 설정</span>
        </button>
      </div>

      {/* 1. Instagram DM Auto-Sending Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-2xs space-y-6">
        
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
              <FaInstagram className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <span>인스타그램 DM 자동 발송</span>
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1",
                  instagramAccount ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                )}>
                  {instagramAccount ? `🟢 @${instagramAccount} 연동 완료` : "⚪ 연동 필요"}
                </span>
              </h3>
              <p className="text-xs text-gray-500 font-medium">특정 키워드가 포함된 댓글이나 DM에 설정한 답장 메시지와 링크를 자동으로 즉시 발송합니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRuleCreateModalOpen(true)}
              className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>DM 규칙 생성 위자드</span>
            </button>
          </div>
        </div>

        {/* Quick Add DM Automation Rule Form */}
        {isAddingRule ? (
          <div className="p-5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-purple-600" />
                <span>새 DM 자동 발송 규칙 등록</span>
              </h4>
              <button
                onClick={() => setIsAddingRule(false)}
                className="text-xs text-gray-400 hover:text-black font-bold"
              >
                ✕ 닫기
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-600">감지할 키워드</label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="예: 링크, 구매, 굿즈"
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-600">자동 발송 DM 답장 문구</label>
                <input
                  type="text"
                  value={newResponseMessage}
                  onChange={(e) => setNewResponseMessage(e.target.value)}
                  placeholder="요청하신 상품 구매 링크입니다!"
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-600">전송할 목표 URL</label>
                <input
                  type="text"
                  value={newTargetLink}
                  onChange={(e) => setNewTargetLink(e.target.value)}
                  placeholder="https://linkzip.kr/..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingRule(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreateRule}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs"
              >
                규칙 저장
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-700">활성화된 DM 자동 발송 규칙 ({dmRules.length}개)</span>
            <button
              onClick={() => setIsAddingRule(true)}
              className="text-xs font-bold text-purple-600 hover:text-purple-800 underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>간편 규칙 추가</span>
            </button>
          </div>
        )}

        {/* DM Rules Table / Cards */}
        {dmRules.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
            <Bot className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-xs font-bold text-gray-500">등록된 DM 자동 발송 규칙이 없습니다.</p>
            <p className="text-[11px] text-gray-400">상단의 [ + 신규 DM 규칙 추가 ] 버튼을 눌러 첫 번째 자동 답장을 설정해보세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dmRules.map((rule) => (
              <div 
                key={rule.id}
                className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-300 transition"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold text-[10px]">
                      키워드: {rule.keyword}
                    </span>
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      rule.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
                    )}>
                      {rule.isActive ? "● 작동중" : "○ 일시정지"}
                    </span>
                  </div>
                  <p className="text-xs font-extrabold text-gray-900 truncate">
                    💬 "{rule.responseMessage}"
                  </p>
                  <p className="text-[11px] text-purple-600 font-semibold truncate flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>{rule.targetLinkUrl}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => updateDMRule(rule.id, { isActive: !rule.isActive })}
                    className={clsx(
                      "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                      rule.isActive ? "bg-black" : "bg-gray-200"
                    )}
                  >
                    <div
                      className={clsx(
                        "w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                        rule.isActive ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>

                  <button
                    onClick={() => removeDMRule(rule.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    title="규칙 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 2. Kakao Alimtalk & Customer Marketing Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900">카카오 알림톡 & 자동 문자 마케팅</h3>
              <p className="text-xs text-gray-500 font-medium">고객 정보 수집 블록을 통해 수집된 회원에게 주문 알림 및 프로모션 메시지를 자동 발송합니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => alert(`[카카오 알림톡 연동 4단계 가이드]

1단계: 카카오 비즈니스 채널 개설 (카카오톡 채널 관리자센터)
2단계: 알림톡 발송 중계사(SOLAPI / CoolSMS) 가입 및 API Key 발급
3단계: 알림톡 템플릿 등록 및 승인 (템플릿 코드 생성: 예: TP_LINKZIP_01)
4단계: 아래 입력란에 발신번호, API Key, 템플릿 코드를 입력 후 상단 스위치를 [ON]으로 켜주세요!`)}
              className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>연동 방법 안내</span>
            </button>

            <button
              type="button"
              onClick={() => setAlimtalkSettings({ isEnabled: !alimtalkSettings?.isEnabled })}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative cursor-pointer flex items-center px-1 font-black text-[9px]",
                alimtalkSettings?.isEnabled ? "bg-[#00E676] text-white" : "bg-gray-200 text-gray-500"
              )}
            >
              <span className={clsx("transition-transform duration-200 font-extrabold", alimtalkSettings?.isEnabled ? "translate-x-0 ml-0.5" : "translate-x-5")}>
                {alimtalkSettings?.isEnabled ? "ON" : "OFF"}
              </span>
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-xs",
                  alimtalkSettings?.isEnabled ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        {/* Setup Steps Accordion Guide */}
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2 text-xs text-amber-900">
          <div className="font-extrabold flex items-center gap-1.5 text-amber-950">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>카카오 알림톡 4단계 설정 가이드</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] font-medium text-amber-900 leading-relaxed">
            <li><strong>카카오 비즈니스 채널 개설</strong>: 카카오톡 채널 관리자센터에서 비즈니스 채널을 만듭니다.</li>
            <li><strong>발송 API Key 발급</strong>: 솔라피(SOLAPI) 또는 메시지 서비스에 가입하여 API Key를 발급받습니다.</li>
            <li><strong>알림톡 템플릿 승인</strong>: 카카오에 알림톡 문구 템플릿을 등록하고 템플릿 코드를 받습니다.</li>
            <li><strong>설정 완료</strong>: 아래에 발신번호, API Key, 템플릿 코드를 입력하고 스위치를 <strong>[ON]</strong>으로 켭니다.</li>
          </ol>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">발신번호 (사전 등록된 전화번호)</label>
            <input
              type="text"
              value={alimtalkSettings?.senderPhone || ''}
              onChange={(e) => setAlimtalkSettings({ senderPhone: e.target.value })}
              placeholder="010-0000-0000"
              className="w-full p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">카카오 알림톡 템플릿 코드</label>
            <input
              type="text"
              value={alimtalkSettings?.templateCode || ''}
              onChange={(e) => setAlimtalkSettings({ templateCode: e.target.value })}
              placeholder="예: TP_LINKZIP_NOTIFICATION"
              className="w-full p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">SOLAPI / CoolSMS API Key</label>
            <input
              type="text"
              value={alimtalkSettings?.apiKey || ''}
              onChange={(e) => setAlimtalkSettings({ apiKey: e.target.value })}
              placeholder="NCKXXXXXXXXXXXXXXXXX"
              className="w-full p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">API Secret Key</label>
            <input
              type="password"
              value={alimtalkSettings?.apiSecret || ''}
              onChange={(e) => setAlimtalkSettings({ apiSecret: e.target.value })}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
      </div>

      {/* DM Wizard Fullscreen Modal Mount */}
      <InstagramDmWizardModal
        isOpen={isDmWizardOpen}
        onClose={() => setIsDmWizardOpen(false)}
      />

      {/* DM Rule Create Wizard Modal Mount */}
      <InstagramDmRuleCreateWizardModal
        isOpen={isRuleCreateModalOpen}
        onClose={() => setIsRuleCreateModalOpen(false)}
      />

    </div>
  );
};
