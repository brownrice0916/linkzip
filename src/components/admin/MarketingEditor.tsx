import React, { useEffect, useRef, useState } from 'react';
import { useStore, type DMAutomationRule } from '../../store/useStore';
import { 
  Send, 
  Plus, 
  Trash2, 
  Zap, 
  Bell, 
  ExternalLink,
  Bot,
  RotateCcw,
  Pencil
} from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';
import { KakaoAlimtalkWizardModal } from './KakaoAlimtalkWizardModal';
import { InstagramDmRuleCreateWizardModal } from './InstagramDmRuleCreateWizardModal';
import { ConfirmActionButton } from '../ui/ConfirmActionButton';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { entitlementsForPlan } from '../../domain/membershipPlans';
import {
  disconnectInstagramConnection,
  getInstagramConnection,
  listInstagramMedia,
  saveInstagramRules,
  startInstagramConnection,
} from '../../services/instagramService';

// Temporary product switch. Keep connected accounts and saved rules intact
// while preventing status sync, rule edits, and new OAuth connections.
// Paused unless explicitly opted in, so a build that forgets about this flag
// ships the safe state. Set VITE_INSTAGRAM_DM_AUTOMATION=on in
// .env.development.local to exercise the flow locally (recording the Meta
// review screencast, debugging). Deliberately not .env.local: Vite loads that
// one in every mode, production builds included.
const INSTAGRAM_DM_AUTOMATION_PAUSED =
  import.meta.env.VITE_INSTAGRAM_DM_AUTOMATION !== 'on';

export const MarketingEditor: React.FC = () => {
  const state = useStore();
  const navigate = useNavigate();
  const planEntitlements = entitlementsForPlan(state.membershipPlan);
  const { 
    instagramAccount, 
    dmRules, 
    updateDMRule, 
    removeDMRule, 
    alimtalkSettings, 
    setAlimtalkSettings 
  } = state;

  const [isKakaoWizardOpen, setIsKakaoWizardOpen] = useState(false);
  const [isInstagramRuleWizardOpen, setIsInstagramRuleWizardOpen] = useState(false);
  const [editingInstagramRule, setEditingInstagramRule] = useState<DMAutomationRule | null>(null);
  const [showAdvancedKakaoInput, setShowAdvancedKakaoInput] = useState(false);
  const [testKakaoSent, setTestKakaoSent] = useState(false);
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);
  const [isInstagramLoading, setIsInstagramLoading] = useState(true);
  const [instagramError, setInstagramError] = useState('');
  // Shown so the owner can tell at a glance which account is linked -- and so the
  // Meta app review screencast demonstrates what instagram_business_basic is
  // actually used for, which is what the submitted justification claims.
  const [instagramProfile, setInstagramProfile] = useState({ name: '', profilePictureUrl: '' });
  const [isProfileImageBroken, setIsProfileImageBroken] = useState(false);
  const [instagramConnectionIssue, setInstagramConnectionIssue] = useState('');
  const [rulesSaveState, setRulesSaveState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [rulesSaveError, setRulesSaveError] = useState('');
  const [monthlyDmUsage, setMonthlyDmUsage] = useState(0);
  const [monthlyDmLimit, setMonthlyDmLimit] = useState(planEntitlements.maxInstagramDeliveriesPerMonth);
  const instagramStatusLoaded = useRef(false);

  useEffect(() => {
    if (INSTAGRAM_DM_AUTOMATION_PAUSED) {
      setIsInstagramLoading(false);
      return;
    }
    let active = true;
    const loadConnection = async () => {
      setIsInstagramLoading(true);
      setInstagramError('');
      useStore.setState((current) => ({
        instagramAccount: '',
        dmRules: current.dmRules.filter((rule) => !(
          rule.id === 'rule-1'
          && rule.keyword === '링크'
          && rule.targetLinkUrl === 'https://linkzip.kr/preview'
        )),
      }));
      try {
        const status = await getInstagramConnection();
        if (!active) return;
        setMonthlyDmUsage(status.monthlyUsage || 0);
        setMonthlyDmLimit(status.monthlyLimit ?? planEntitlements.maxInstagramDeliveriesPerMonth);
        if (status.connected) {
          if (status.diagnosticError) {
            setInstagramConnectionIssue(
              `Meta 연결 상태를 확인하지 못했습니다: ${status.diagnosticError}`,
            );
          } else if (status.missingScopes?.length) {
            setInstagramConnectionIssue(
              `계정 토큰에 필요한 권한이 없습니다: ${status.missingScopes.join(', ')}. 계정 연동을 해제한 뒤 다시 연동해주세요.`,
            );
          } else if (status.missingWebhookFields?.length) {
            setInstagramConnectionIssue(
              `Meta 웹훅 구독이 빠져 있습니다: ${status.missingWebhookFields.join(', ')}. 계정 연동을 해제한 뒤 다시 연동해주세요.`,
            );
          } else {
            setInstagramConnectionIssue('');
          }
        }
        let loadedRules = status.connected ? status.rules || [] : [];
        if (status.connected && loadedRules.some((rule) => (
          rule.targetMode !== 'next' && rule.postIds?.length && !rule.postThumbnailUrl
        ))) {
          try {
            const media = await listInstagramMedia();
            const mediaById = new Map(media.map((item) => [item.id, item]));
            loadedRules = loadedRules.map((rule) => {
              const post = rule.postIds?.[0] ? mediaById.get(rule.postIds[0]) : undefined;
              return post ? {
                ...rule,
                postThumbnailUrl: post.thumbnailUrl || post.mediaUrl,
                postCaption: post.caption,
              } : rule;
            });
          } catch (mediaError) {
            console.warn('Failed to load Instagram thumbnails', mediaError);
          }
        }
        setInstagramProfile(status.connected
          ? { name: status.name || '', profilePictureUrl: status.profilePictureUrl || '' }
          : { name: '', profilePictureUrl: '' });
        setIsProfileImageBroken(false);
        useStore.setState({
          instagramAccount: status.connected ? status.username || '연결된 계정' : '',
          dmRules: loadedRules,
        });
        instagramStatusLoaded.current = true;

        const result = new URLSearchParams(window.location.search).get('instagram');
        if (result === 'connected') {
          window.history.replaceState({}, '', window.location.pathname);
        } else if (result === 'error') {
          setInstagramError('인스타그램 연결을 완료하지 못했습니다. 앱 역할과 권한 설정을 확인해주세요.');
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (error) {
        if (!active) return;
        setInstagramError(
          error instanceof Error && error.message !== 'internal'
            ? error.message
            : '인스타그램 연결 서버를 확인하지 못했습니다.',
        );
      } finally {
        if (active) setIsInstagramLoading(false);
      }
    };
    void loadConnection();
    return () => { active = false; };
  }, [planEntitlements.maxInstagramDeliveriesPerMonth]);

  useEffect(() => {
    if (INSTAGRAM_DM_AUTOMATION_PAUSED) return;
    if (!instagramStatusLoaded.current || !instagramAccount) return;
    const timeout = window.setTimeout(async () => {
      setRulesSaveState('saving');
      setRulesSaveError('');
      try {
        await saveInstagramRules(dmRules);
        setRulesSaveState('idle');
      } catch (error) {
        console.error('Failed to save Instagram automation rules', error);
        setRulesSaveState('error');
        const rawMessage = error instanceof Error ? error.message : '';
        setRulesSaveError(
          rawMessage.includes('Target URL')
            ? '게시물 이미지 주소가 너무 길어 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'
            : rawMessage.includes('로그인이 필요') || rawMessage.includes('unauthenticated')
              ? '로그인이 만료되었습니다. 다시 로그인해주세요.'
              : rawMessage.includes('인스타그램 계정을 먼저 연결') || rawMessage.includes('failed-precondition')
                ? '인스타그램 계정을 다시 연결해주세요.'
                : '규칙을 서버에 저장하지 못했습니다. 잠시 후 다시 시도해주세요.',
        );
      }
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [dmRules, instagramAccount]);

  const handleInstagramConnect = async () => {
    if (INSTAGRAM_DM_AUTOMATION_PAUSED) return;
    setIsInstagramLoading(true);
    setInstagramError('');
    try {
      await startInstagramConnection();
    } catch (error) {
      setInstagramError(
        error instanceof Error && error.message !== 'internal'
          ? error.message
          : '인스타그램 로그인을 시작하지 못했습니다.',
      );
      setIsInstagramLoading(false);
    }
  };

  const handleInstagramDisconnect = async () => {
    if (INSTAGRAM_DM_AUTOMATION_PAUSED) return;
    setIsInstagramLoading(true);
    setInstagramError('');
    try {
      await disconnectInstagramConnection();
      setInstagramProfile({ name: '', profilePictureUrl: '' });
      useStore.setState({ instagramAccount: '' });
    } catch (error) {
      // 'internal' is what a callable reports for anything it did not raise as an
      // HttpsError -- a network failure included -- and showing that bare word
      // reads like a glitch rather than an answer.
      setInstagramError(
        error instanceof Error && error.message !== 'internal'
          ? error.message
          : '연동을 해제하지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setIsInstagramLoading(false);
    }
  };
  
  const [syncedTemplates] = useState([
    { code: 'TP_LINKZIP_WELCOME_01', name: '👋 [기본] 회원가입 & 정보 등록 웰컴 알림톡', msg: '[LinkZip] 안녕하세요! 회원가입 및 정보 등록이 정상적으로 완료되었습니다.' },
    { code: 'TP_LINKZIP_DONATION_02', name: '🎁 [후원] 삼천원 후원 감사 알림톡', msg: '[LinkZip] 소중한 후원에 진심으로 감사드립니다! 따뜻한 마음 잊지 않겠습니다.' },
    { code: 'TP_LINKZIP_ORDER_03', name: '🛍️ [결제/다운로드] 디지털 파일 전송 알림톡', msg: '[LinkZip] 주문하신 상품의 다운로드 링크를 확인해주세요.' },
    { code: 'TP_LINKZIP_PROMO_04', name: '📢 [이벤트] 신규 프로모션 & 쿠폰 발송 알림톡', msg: '[LinkZip] 고객님을 위한 특별 쿠폰이 도착했습니다! 프로필 링크를 확인하세요.' }
  ]);

  const handleSyncTemplates = async () => {
    setIsSyncingTemplates(true);
    await new Promise((res) => setTimeout(res, 800));
    setIsSyncingTemplates(false);
    alert('🔄 솔라피 & 카카오톡 서버에서 등록/승인된 템플릿 목록 4개를 성공적으로 자동 동기화했습니다!');
  };

  const isKakaoConnected = alimtalkSettings?.isEnabled && (alimtalkSettings?.senderPhone || alimtalkSettings?.apiKey);
  const showInstagramAvatar = Boolean(
    instagramAccount && instagramProfile.profilePictureUrl && !isProfileImageBroken,
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20 font-sans max-w-4xl">

      {/* 1. Instagram DM Auto-Sending Section */}
      <div className="relative overflow-hidden bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-2xs space-y-6" aria-disabled={INSTAGRAM_DM_AUTOMATION_PAUSED}>
        
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-10 h-10 overflow-hidden rounded-xl bg-gray-950 text-white flex items-center justify-center font-bold">
                {showInstagramAvatar ? (
                  <img
                    src={instagramProfile.profilePictureUrl}
                    alt={`@${instagramAccount} 프로필 사진`}
                    // Instagram's CDN rejects requests that carry our origin.
                    referrerPolicy="no-referrer"
                    onError={() => setIsProfileImageBroken(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FaInstagram className="w-5 h-5" />
                )}
              </div>
              {showInstagramAvatar && (
                // The avatar takes over the slot that carried the Instagram mark,
                // so keep the mark as a corner badge.
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-950 text-white ring-2 ring-white">
                  <FaInstagram className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <span>인스타그램 DM 자동 발송</span>
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1",
                  instagramAccount ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                )}>
                  {instagramAccount
                    ? `🟢 @${instagramAccount}${instagramProfile.name ? ` · ${instagramProfile.name}` : ''} 연동 완료`
                    : "⚪ 연동 필요"}
                </span>
              </h3>
              <p className="text-xs text-gray-500 font-medium">특정 키워드가 포함된 댓글이나 DM에 설정한 답장 메시지와 링크를 자동으로 즉시 발송합니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {instagramAccount ? (
              <ConfirmActionButton
                label="연동 해제"
                question="연동을 해제할까요?"
                onConfirm={() => void handleInstagramDisconnect()}
                disabled={isInstagramLoading}
                className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 text-xs font-bold rounded-xl transition cursor-pointer"
              />
            ) : (
              <button
                onClick={() => void handleInstagramConnect()}
                disabled={isInstagramLoading}
                className="px-4 py-2.5 bg-gray-950 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <FaInstagram className="w-4 h-4" />
                <span>{isInstagramLoading ? '확인 중...' : '인스타그램 계정 연동'}</span>
              </button>
            )}

            <button
              onClick={() => {
                setEditingInstagramRule(null);
                setIsInstagramRuleWizardOpen(true);
              }}
              disabled={!instagramAccount || isInstagramLoading || (planEntitlements.maxInstagramRules !== null && dmRules.length >= planEntitlements.maxInstagramRules)}
              className="px-4 py-2.5 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>DM 자동화 생성</span>
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-[10px] font-black text-gray-400">자동화 규칙</p>
            <p className="mt-1 text-sm font-black text-gray-900">{dmRules.length} / 무제한</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-[10px] font-black text-gray-400">이번 달 DM 발송</p>
            <p className="mt-1 text-sm font-black text-gray-900">{monthlyDmUsage.toLocaleString()} / {monthlyDmLimit === null ? '무제한' : `${monthlyDmLimit.toLocaleString()}건`}</p>
          </div>
        </div>

        {instagramError && (
          <div role="alert" className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700">
            {instagramError}
          </div>
        )}

        {instagramConnectionIssue && (
          <div role="alert" className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-xs font-bold text-amber-800">
            {instagramConnectionIssue}
          </div>
        )}

        <div className="flex items-center">
            <span className="text-xs font-extrabold text-gray-700 flex items-center gap-2">
              활성화된 DM 자동 발송 규칙 ({dmRules.length}개)
              {instagramAccount && rulesSaveState === 'error' && <span className="text-red-600">서버 저장 실패</span>}
            </span>
        </div>

        {instagramAccount && rulesSaveState === 'error' && rulesSaveError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
            {rulesSaveError}
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
                className="p-4 bg-gray-50/80 border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#ff5f35] transition"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    {rule.targetMode === 'next' ? (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-[#FFDA44] text-black">
                        <span className="text-xl font-black">NEXT</span>
                        <span className="mt-0.5 text-[9px] font-bold">게시물 대기</span>
                      </div>
                    ) : rule.postThumbnailUrl ? (
                      <img
                        src={rule.postThumbnailUrl}
                        alt={rule.postCaption || '자동화 대상 게시물'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                        <FaInstagram className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-[#171714] bg-[#ffcf4a] px-2.5 py-0.5 text-[10px] font-extrabold text-[#171714]">
                      키워드: {rule.keyword}
                    </span>
                    {rule.targetMode === 'next' && (
                      <span className="rounded-full bg-[#FFDA44] px-2 py-0.5 text-[10px] font-black text-black">
                        NEXT · 다음 게시물 대기
                      </span>
                    )}
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
                  {rule.postCaption && rule.targetMode !== 'next' && (
                    <p className="truncate text-[11px] font-semibold text-gray-500">
                      게시물 · {rule.postCaption}
                    </p>
                  )}
                  <p className="text-[11px] text-[#ff5f35] font-semibold truncate flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    <span>{rule.targetLinkUrl}</span>
                  </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInstagramRule(rule);
                      setIsInstagramRuleWizardOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:text-black transition cursor-pointer"
                    title="자동화 수정"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>수정</span>
                  </button>
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

        {INSTAGRAM_DM_AUTOMATION_PAUSED && (
          <div className="absolute inset-0 z-40 flex cursor-not-allowed items-center justify-center rounded-3xl bg-[#f4f1e8]/94 p-5 backdrop-blur-[2px]">
            <div className="w-full max-w-md rounded-[26px] border-2 border-[#171714] bg-[#fffdf8] px-7 py-8 text-center shadow-[6px_6px_0_#171714]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#ffcf4a] shadow-[3px_3px_0_#ff5f35]">
                <FaInstagram className="h-6 w-6" />
              </div>
              <span className="mt-5 inline-flex rounded-full bg-[#171714] px-3 py-1 text-[10px] font-black text-white">일시 중단</span>
              <h4 className="mt-3 text-xl font-black tracking-[-0.04em] text-[#171714]">인스타그램 DM 자동 발송 점검 중</h4>
              <p className="mt-2 text-xs font-bold leading-5 text-gray-500">기능 안정화를 위해 잠시 이용을 막아두었습니다.<br />기존 계정 연동과 자동화 규칙은 삭제되지 않습니다.</p>
            </div>
          </div>
        )}

      </div>

      {/* 2. Kakao Alimtalk & Customer Marketing Card */}
      <div
        className="relative overflow-hidden bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-2xs space-y-6"
        aria-disabled="true"
      >
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
              <ConfirmActionButton
                label="연동 해제"
                question="연동을 해제할까요?"
                onConfirm={() => setAlimtalkSettings({ isEnabled: false })}
                className="px-3.5 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
              />
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
                <div className="font-extrabold text-gray-900">{alimtalkSettings?.senderPhone || '발신 번호 미등록'}</div>
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
                    <span>[알림톡 도착] {state.profile.name || '채널명 미등록'}</span>
                  </div>
                  <span className="text-[10px] text-gray-700 font-bold">방금 전</span>
                </div>
                <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">
                  {alimtalkSettings?.customMessage || '[LinkZip] 안녕하세요! 요청하신 정보/주문이 성공적으로 수신되었습니다.'}
                </p>
                <div className="text-[10px] text-gray-700 pt-1 font-medium border-t border-black/10 flex justify-between">
                  <span>수신 대표 번호: {alimtalkSettings?.senderPhone || '미등록'}</span>
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

        <div className="absolute inset-0 z-40 flex cursor-not-allowed items-center justify-center rounded-3xl bg-[#f4f1e8]/94 p-5 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-[26px] border-2 border-[#171714] bg-[#fffdf8] px-7 py-8 text-center shadow-[6px_6px_0_#171714]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#ffcf4a] shadow-[3px_3px_0_#ff5f35]">
              <Bell className="h-6 w-6" />
            </div>
            <span className="mt-5 inline-flex rounded-full bg-[#171714] px-3 py-1 text-[10px] font-black text-white">준비 중</span>
            <h4 className="mt-3 text-xl font-black tracking-[-0.04em] text-[#171714]">카카오 알림톡 자동 발송 준비 중</h4>
            <p className="mt-2 text-xs font-bold leading-5 text-gray-500">더 안정적인 발송을 위해 기능을 준비하고 있습니다.<br />정식 제공 전까지 잠시만 기다려 주세요.</p>
          </div>
        </div>
      </div>

      {/* Kakao Alimtalk 1-Click Auto Connection Wizard Modal Mount */}
      <KakaoAlimtalkWizardModal
        isOpen={isKakaoWizardOpen}
        onClose={() => setIsKakaoWizardOpen(false)}
      />
      <InstagramDmRuleCreateWizardModal
        isOpen={!INSTAGRAM_DM_AUTOMATION_PAUSED && isInstagramRuleWizardOpen}
        editingRule={editingInstagramRule}
        onClose={() => {
          setIsInstagramRuleWizardOpen(false);
          setEditingInstagramRule(null);
        }}
      />

    </div>
  );
};
