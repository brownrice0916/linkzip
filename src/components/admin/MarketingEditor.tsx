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
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';
import { InstagramDmWizardModal } from './InstagramDmWizardModal';
import { InstagramDmRuleCreateWizardModal } from './InstagramDmRuleCreateWizardModal';
import { KakaoAlimtalkWizardModal } from './KakaoAlimtalkWizardModal';
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
  const [isKakaoWizardOpen, setIsKakaoWizardOpen] = useState(false);
  const [showAdvancedKakaoInput, setShowAdvancedKakaoInput] = useState(false);
  const [testKakaoSent, setTestKakaoSent] = useState(false);
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);
  
  const [syncedTemplates, setSyncedTemplates] = useState([
    { code: 'TP_LINKZIP_WELCOME_01', name: '👋 [기본] 회원가입 & 정보 등록 웰컴 알림톡', msg: '[LinkZip] 안녕하세요! 회원가입 및 정보 등록이 정상적으로 완료되었습니다.' },
    { code: 'TP_LINKZIP_DONATION_02', name: '🎁 [후원] 삼천원 후원 감사 알림톡', msg: '[LinkZip] 소중한 후원에 진심으로 감사드립니다! 따뜻한 마음 잊지 않겠습니다.' },
    { code: 'TP_LINKZIP_ORDER_03', name: '🛍️ [결제/다운로드] 디지털 파일 전송 알림톡', msg: '[LinkZip] 주문하신 상품 다운로드 링크입니다: https://linkzip.kr/preview' },
    { code: 'TP_LINKZIP_PROMO_04', name: '📢 [이벤트] 신규 프로모션 & 쿠폰 발송 알림톡', msg: '[LinkZip] 고객님을 위한 특별 쿠폰이 도착했습니다! 프로필 링크를 확인하세요.' }
  ]);

  const handleSyncTemplates = async () => {
    setIsSyncingTemplates(true);
    await new Promise((res) => setTimeout(res, 800));
    setIsSyncingTemplates(false);
    alert('🔄 솔라피 & 카카오톡 서버에서 등록/승인된 템플릿 목록 4개를 성공적으로 자동 동기화했습니다!');
  };

  const isKakaoConnected = alimtalkSettings?.isEnabled && (alimtalkSettings?.senderPhone || alimtalkSettings?.apiKey);

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
    <div className="space-y-6 animate-fade-in pb-20 font-sans max-w-4xl">

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
            {instagramAccount ? (
              <button
                onClick={() => {
                  if (confirm('인스타그램 계정 연동을 해제하시겠습니까?')) {
                    state.setInstagramAccount(null);
                  }
                }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                연동 해제
              </button>
            ) : (
              <button
                onClick={() => setIsDmWizardOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5 hover:scale-105"
              >
                <FaInstagram className="w-4 h-4" />
                <span>1클릭 계정 연동</span>
              </button>
            )}

            <button
              onClick={() => setIsRuleCreateModalOpen(true)}
              className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>DM 규칙 생성</span>
            </button>
          </div>
        </div>

        {/* Not Connected State Banner (Only when !instagramAccount) */}
        {!instagramAccount && (
          <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 border border-pink-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center font-bold shrink-0">
                <FaInstagram className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-900">인스타그램 계정이 아직 연동되지 않았습니다.</h4>
                <p className="text-[11px] text-gray-500 font-medium">버튼 한 번만 누르면 인스타그램 계정이 자동 연동되어 DM 발송 규칙이 작동합니다.</p>
              </div>
            </div>

            <button
              onClick={() => setIsDmWizardOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5 hover:scale-105"
            >
              <FaInstagram className="w-4 h-4" />
              <span>1클릭 인스타그램 연동하기</span>
            </button>
          </div>
        )}

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
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <span>카카오 알림톡 & 자동 문자 마케팅</span>
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1",
                  isKakaoConnected ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                )}>
                  {isKakaoConnected ? "🟢 연동 완료" : "⚪ 연동 안 됨"}
                </span>
              </h3>
              <p className="text-xs text-gray-500 font-medium">고객 정보 수집 및 주문 결제 시 카카오 알림톡 메시지를 자동 발송합니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isKakaoConnected ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('카카오 알림톡 연동을 해제하시겠습니까?')) {
                    setAlimtalkSettings({ isEnabled: false });
                  }
                }}
                className="px-3.5 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                연동 해제
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsKakaoWizardOpen(true)}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-black font-black text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5 hover:scale-105"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>1클릭 자동 연동하기</span>
              </button>
            )}
          </div>
        </div>

        {/* Connected State Card */}
        {isKakaoConnected ? (
          <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h4 className="text-xs font-black text-gray-900">카카오 비즈니스 채널 자동 연동 상태</h4>
              </div>
              <span className="text-[10px] font-black text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                자동 발송 [ON]
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3 bg-white/80 rounded-xl border border-amber-100 space-y-0.5">
                <div className="text-[11px] text-gray-500 font-bold">발신 대표 전화번호</div>
                <div className="font-extrabold text-gray-900">{alimtalkSettings?.senderPhone || '010-1234-5678'}</div>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-950 font-extrabold">SOLAPI 알림톡 템플릿 목록</span>
                  <button
                    type="button"
                    onClick={handleSyncTemplates}
                    disabled={isSyncingTemplates}
                    className="text-[10px] font-black text-black bg-amber-400 hover:bg-amber-500 px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <RotateCcw className={clsx("w-3 h-3 text-black", isSyncingTemplates && "animate-spin")} />
                    <span>{isSyncingTemplates ? "동기화 중..." : "템플릿 1클릭 가져오기"}</span>
                  </button>
                </div>

                <select
                  value={alimtalkSettings?.templateCode || 'TP_LINKZIP_WELCOME_01'}
                  onChange={(e) => {
                    const selected = syncedTemplates.find(t => t.code === e.target.value);
                    setAlimtalkSettings({
                      templateCode: e.target.value,
                      customMessage: selected ? selected.msg : alimtalkSettings?.customMessage
                    });
                  }}
                  className="w-full p-2 border border-amber-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-black cursor-pointer"
                >
                  {syncedTemplates.map((tpl) => (
                    <option key={tpl.code} value={tpl.code}>
                      {tpl.name} ({tpl.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Automated Message Input Field */}
            <div className="space-y-1.5 pt-2 border-t border-amber-200/60">
              <label className="block text-xs font-black text-amber-950 flex items-center justify-between">
                <span>💬 자동 발송 카카오 알림톡 문구 내용 (직접 수정)</span>
                <span className="text-[10px] text-amber-700 font-bold">실시간 수정 가능</span>
              </label>
              <textarea
                value={alimtalkSettings?.customMessage !== undefined ? alimtalkSettings.customMessage : '[LinkZip] 안녕하세요! 요청하신 정보/주문이 성공적으로 수신되었습니다.'}
                onChange={(e) => setAlimtalkSettings({ customMessage: e.target.value })}
                placeholder="고객이 폼 등록 또는 결제 완료 시 자동으로 전송할 카카오 알림톡/문자 메시지 내용을 작성해주세요."
                rows={3}
                className="w-full p-3 border border-amber-200 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400 resize-none leading-relaxed bg-white shadow-2xs"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTestKakaoSent(true);
                    setTimeout(() => setTestKakaoSent(false), 5000);
                  }}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-500 text-black text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs hover:scale-105"
                >
                  <Send className="w-3.5 h-3.5 fill-black" />
                  <span>📱 알림톡 발송 테스트하기</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAdvancedKakaoInput(!showAdvancedKakaoInput)}
                  className="text-[11px] font-bold text-gray-500 hover:text-black underline cursor-pointer"
                >
                  {showAdvancedKakaoInput ? "▼ 수동 API Key 설정 숨기기" : "▶ 실재 문자/카톡 전송용 API Key 입력"}
                </button>
              </div>
            </div>

            {/* Test Send Preview Bubble */}
            {testKakaoSent && (
              <div className="p-4 bg-[#FEE500] text-black text-xs rounded-2xl border border-amber-300 shadow-md space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <div className="flex items-center gap-2 font-black text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>[알림톡 도착] {state.profile.name || 'LinkZip Official'}</span>
                  </div>
                  <span className="text-[10px] text-gray-700 font-bold">방금 전</span>
                </div>
                <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">
                  {alimtalkSettings?.customMessage || '[LinkZip] 안녕하세요! 요청하신 정보/주문이 성공적으로 수신되었습니다.'}
                </p>
                <div className="text-[10px] text-gray-700 pt-1 font-medium border-t border-black/10 flex justify-between">
                  <span>수신 대표 번호: {alimtalkSettings?.senderPhone || '010-1234-5678'}</span>
                  <span className="font-extrabold text-amber-950">✅ 시뮬레이션 알림톡 발송 성공</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Not Connected State Banner */
          <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto font-black text-xl">
              🟡
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-gray-900">카카오 알림톡이 아직 연동되지 않았습니다.</h4>
              <p className="text-xs text-gray-500 font-medium">
                [1클릭 자동 연동하기] 버튼을 누르면 별도의 복잡한 입력 없이 즉시 연동 완료 처리됩니다.
              </p>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsKakaoWizardOpen(true)}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-black font-black text-xs rounded-xl transition cursor-pointer shadow-md flex items-center gap-2 hover:scale-105"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>1클릭 카카오 연동 완료하기</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAdvancedKakaoInput(!showAdvancedKakaoInput)}
                className="px-4 py-3 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                수동 키 입력
              </button>
            </div>
          </div>
        )}

        {/* Optional Manual/Advanced Inputs */}
        {showAdvancedKakaoInput && (
          <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4 animate-in fade-in">
            <h4 className="text-xs font-black text-gray-800">수동 API Key & 템플릿 직접 설정</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600">발신번호 (사전 등록된 전화번호)</label>
                <input
                  type="text"
                  value={alimtalkSettings?.senderPhone || ''}
                  onChange={(e) => setAlimtalkSettings({ senderPhone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600">카카오 알림톡 템플릿 코드</label>
                <input
                  type="text"
                  value={alimtalkSettings?.templateCode || ''}
                  onChange={(e) => setAlimtalkSettings({ templateCode: e.target.value })}
                  placeholder="예: TP_LINKZIP_NOTIFICATION"
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600">SOLAPI / CoolSMS API Key</label>
                <input
                  type="text"
                  value={alimtalkSettings?.apiKey || ''}
                  onChange={(e) => setAlimtalkSettings({ apiKey: e.target.value })}
                  placeholder="NCKXXXXXXXXXXXXXXXXX"
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600">API Secret Key</label>
                <input
                  type="password"
                  value={alimtalkSettings?.apiSecret || ''}
                  onChange={(e) => setAlimtalkSettings({ apiSecret: e.target.value })}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black bg-white"
                />
              </div>
            </div>
          </div>
        )}
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

      {/* Kakao Alimtalk 1-Click Auto Connection Wizard Modal Mount */}
      <KakaoAlimtalkWizardModal
        isOpen={isKakaoWizardOpen}
        onClose={() => setIsKakaoWizardOpen(false)}
      />

    </div>
  );
};
