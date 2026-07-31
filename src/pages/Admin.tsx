import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import LinkTreePreview from "../components/LinkTreePreview";
import { useNavigate, useParams } from "react-router-dom";
import {
  Link2,
  Palette,
  User as UserIcon,
  Settings,
  LogOut,
  Share2,
  Check,
  Copy,
  Undo2,
  Redo2,
  AlertTriangle,
  Zap,
  BarChart3,
  Megaphone,
  ArrowLeft,
  X,
  Eye,
  Sparkles,
  LayoutGrid,
  House,
  Crown
} from "lucide-react";
import { logout } from "../lib/firebase";
import clsx from "clsx";
import { t } from "../lib/i18n";
import { saveUserProfilesData } from "../services/userService";
import { deleteOwnedProfileImage } from "../services/storageService";
import AdminProfilesHome from "../components/admin/AdminProfilesHome";
import { entitlementsForPlan, isAdvancedTheme } from "../domain/membershipPlans";
import { isPremiumDesignFont } from "../domain/designFonts";
import { requestUpgradePrompt } from "../components/UpgradePromptHost";

const LinksEditor = lazy(() => import("../components/admin/LinksEditor"));
const ProfileEditor = lazy(() => import("../components/admin/ProfileEditor"));
const AppearanceEditor = lazy(() => import("../components/admin/AppearanceEditor"));
const SettingsEditor = lazy(() => import("../components/admin/SettingsEditor"));
const GrowthEditor = lazy(() => import("../components/admin/GrowthEditor"));
const AnalyticsEditor = lazy(() => import("../components/admin/AnalyticsEditor").then((module) => ({ default: module.AnalyticsEditor })));
const MarketingEditor = lazy(() => import("../components/admin/MarketingEditor").then((module) => ({ default: module.MarketingEditor })));

type TabType = "links" | "profile" | "appearance" | "analytics" | "marketing" | "automation" | "settings" | "plan";
type TargetAction = TabType | "home" | "logout" | null;

const resolveAdminTab = (urlTab?: string): TabType => {
  const tab = urlTab?.toLowerCase();
  if (!tab || tab === 'content' || tab === 'links') return 'links';
  if (tab === 'header' || tab === 'profile') return 'profile';
  if (tab === 'design' || tab === 'appearance') return 'appearance';
  if (tab === 'analyze' || tab === 'analytics') return 'analytics';
  if (tab === 'marketing' || tab === 'dm') return 'marketing';
  if (tab === 'growth' || tab === 'automation') return 'automation';
  if (tab === 'settings') return 'settings';
  if (tab === 'plan' || tab === 'billing') return 'plan';
  return 'links';
};

const EditorPendingScreen = () => (
  <div aria-hidden="true" className="min-h-[55svh] w-full rounded-[2rem] bg-white" />
);

const Admin = () => {
  const state = useStore();
  const navigate = useNavigate();
  const { tab: urlTab } = useParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<TabType>(() => resolveAdminTab(urlTab));
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isSaveToastVisible, setIsSaveToastVisible] = useState(false);
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(true);
  const [activeAppearanceView, setActiveAppearanceView] = useState<'main' | 'theme' | 'buttons' | 'colors' | 'stickers'>('main');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const sheetPointerStartY = useRef<number | null>(null);
  const sheetDragOffsetRef = useRef(0);
  const contentRevisionRef = useRef(0);
  const saveToastTimerRef = useRef<number | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileAccountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (state.language !== 'ko') state.setLanguage('ko');
  }, [state.language, state.setLanguage]);

  useEffect(() => () => {
    if (saveToastTimerRef.current !== null) {
      window.clearTimeout(saveToastTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const syncAppearanceView = (event: Event) => {
      const view = (event as CustomEvent<'main' | 'theme' | 'buttons' | 'colors' | 'stickers'>).detail;
      if (view) setActiveAppearanceView(view);
    };
    window.addEventListener('linkzip:appearance-view-changed', syncAppearanceView);
    return () => window.removeEventListener('linkzip:appearance-view-changed', syncAppearanceView);
  }, []);

  useEffect(() => {
    const closeMobileAppearanceSheet = () => {
      setSheetDragOffset(0);
      sheetPointerStartY.current = null;
      sheetDragOffsetRef.current = 0;
      setIsMobileEditorOpen(false);
    };
    window.addEventListener('linkzip:close-mobile-appearance-sheet', closeMobileAppearanceSheet);
    return () => window.removeEventListener('linkzip:close-mobile-appearance-sheet', closeMobileAppearanceSheet);
  }, []);

  // Sync URL parameter to activeTab
  useEffect(() => {
    const nextTab = resolveAdminTab(urlTab);
    setActiveTab(nextTab);
    if (nextTab === 'links' || nextTab === 'analytics' || nextTab === 'automation' || nextTab === 'settings') {
      setIsMobileEditorOpen(true);
    }
    if (nextTab === 'appearance') {
        // Enter the design workspace with its editor open. The full-screen
        // preview must only be opened by an explicit preview action.
        setIsMobileEditorOpen(true);
    }
  }, [urlTab]);

  // Unsaved changes modal state
  const [pendingTarget, setPendingTarget] = useState<TargetAction>(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);

  const username = state.profile.username || "preview";
  const profileUrl = `${window.location.origin}/${username}`;
  const hasManualEditActions = activeTab === "profile" || activeTab === "appearance";
  const usesMobileStandalonePage = activeTab === "links" || activeTab === "analytics" || activeTab === "automation" || activeTab === "settings";

  // Prevent browser refresh/close if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.isDirty]);

  useEffect(() => {
    const closeAccountMenu = (event: PointerEvent) => {
      const target = event.target as Node;
      const isInsideDesktopMenu = accountMenuRef.current?.contains(target);
      const isInsideMobileMenu = mobileAccountMenuRef.current?.contains(target);
      if (!isInsideDesktopMenu && !isInsideMobileMenu) setIsAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeAccountMenu);
    return () => document.removeEventListener('pointerdown', closeAccountMenu);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getLockedDesignFeatures = () => {
    if (activeTab !== 'appearance' || !state.isDirty) return [];
    const currentEntitlements = entitlementsForPlan(state.membershipPlan);
    const savedDesign = state.savedSnapshot;
    const lockedAdvancedTheme = !currentEntitlements.canUseAdvancedDesign
      && isAdvancedTheme(state.templateType, state.templateValue)
      && (state.templateType !== savedDesign?.templateType || state.templateValue !== savedDesign?.templateValue);
    const lockedPageFont = !currentEntitlements.canUseAdvancedDesign
      && isPremiumDesignFont(state.fontFamily)
      && state.fontFamily !== savedDesign?.fontFamily;
    const lockedTitleFont = !currentEntitlements.canUseAdvancedDesign
      && isPremiumDesignFont(state.titleFontFamily)
      && state.titleFontFamily !== savedDesign?.titleFontFamily;
    const lockedBackgroundImage = !currentEntitlements.canUseAdvancedDesign
      && Boolean(state.backgroundImageUrl)
      && state.backgroundImageUrl !== savedDesign?.backgroundImageUrl;
    const savedAnimatedStickerCounts = (savedDesign?.stickers || [])
      .filter((item) => item.animated)
      .reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.value]: (counts[item.value] || 0) + 1 }), {});
    const currentAnimatedStickerCounts = (state.stickers || [])
      .filter((item) => item.animated)
      .reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.value]: (counts[item.value] || 0) + 1 }), {});
    const lockedAnimatedSticker = !currentEntitlements.canUseAnimatedStickers
      && Object.entries(currentAnimatedStickerCounts).some(([value, count]) => count > (savedAnimatedStickerCounts[value] || 0));

    return [
      lockedAdvancedTheme ? '고급 테마' : '',
      lockedPageFont || lockedTitleFont ? '고급 글꼴' : '',
      lockedBackgroundImage ? '직접 업로드한 배경 이미지' : '',
      lockedAnimatedSticker ? '움직이는 스티커' : '',
    ].filter(Boolean);
  };

  const showLockedDesignUpgradePrompt = () => {
    const lockedFeatures = getLockedDesignFeatures();
    if (lockedFeatures.length === 0) return false;

    // A paid design choice only opens the upgrade prompt. It must never
    // cascade into the generic save/discard navigation confirmation.
    setIsUnsavedModalOpen(false);
    setPendingTarget(null);
    requestUpgradePrompt({
      featureLabel: '디자인 저장',
      title: '이 디자인을 저장하려면 업그레이드가 필요해요',
      description: `${lockedFeatures.join(', ')}은(는) 스탠다드 플랜부터 저장할 수 있습니다. 현재 미리보기는 그대로 유지됩니다.`,
    });
    return true;
  };

  const handleManualSave = async (showSuccessToast = false) => {
    if (!state.isDirty || isSaving) return false;
    if (showLockedDesignUpgradePrompt()) return false;
    setIsSaving(true);
    setSaveError('');
    const previousProfile = state.savedSnapshot?.profile;
    try {
      state.syncActiveProfileWorkspace();
      const latestState = useStore.getState();
      if (state.user?.uid) {
        await saveUserProfilesData(state.user.uid, latestState.profileWorkspaces, latestState.activeProfileId, {
          teamMembers: latestState.teamMembers,
          alimtalkSettings: latestState.alimtalkSettings,
          pageViews: latestState.pageViews,
        });
        const usedProfileImages = new Set(latestState.profileWorkspaces.flatMap((workspace) => [workspace.profile.avatarUrl, workspace.profile.bannerUrl, workspace.profile.logoUrl, workspace.design.backgroundImageUrl].filter(Boolean) as string[]));
        await Promise.all([
          deleteOwnedProfileImage(previousProfile?.avatarUrl, state.user.uid, usedProfileImages),
          deleteOwnedProfileImage(previousProfile?.bannerUrl, state.user.uid, usedProfileImages),
          deleteOwnedProfileImage(previousProfile?.logoUrl, state.user.uid, usedProfileImages),
          deleteOwnedProfileImage(state.savedSnapshot?.backgroundImageUrl, state.user.uid, usedProfileImages),
        ]);
      }

      // Backup save to localStorage
      try {
        localStorage.setItem("linkzip_saved_state", JSON.stringify({
          ownerUid: state.user?.uid,
          profile: state.profile,
          customLinks: state.customLinks,
          socialLinks: state.socialLinks,
          profileWorkspaces: latestState.profileWorkspaces,
          activeProfileId: latestState.activeProfileId,
        }));
      } catch (e) {
        console.warn("LocalStorage save warning:", e);
      }

      state.markSaved();
      if (showSuccessToast) {
        if (saveToastTimerRef.current !== null) {
          window.clearTimeout(saveToastTimerRef.current);
        }
        setIsSaveToastVisible(true);
        saveToastTimerRef.current = window.setTimeout(() => {
          setIsSaveToastVisible(false);
          saveToastTimerRef.current = null;
        }, 2200);
      }
      return true;
    } catch (error) {
      console.error("Failed to save", error);
      const rawMessage = error instanceof Error ? error.message : '';
      const isPermissionError = rawMessage.toLowerCase().includes('permission');
      setSaveError(isPermissionError
        ? (state.language === 'ko'
          ? '저장 권한을 확인하지 못했어요. 다시 로그인한 뒤 한 번 더 시도해 주세요.'
          : 'We could not verify permission to save. Sign in again and retry.')
        : (rawMessage || (state.language === 'ko' ? '저장에 실패했습니다.' : 'Failed to save.')));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'links' || activeTab === 'automation') contentRevisionRef.current += 1;
  }, [activeTab, state.profile, state.customLinks, state.socialLinks]);

  useEffect(() => {
    if ((activeTab !== 'links' && activeTab !== 'automation') || !state.isDirty || isSaving) return;
    const scheduledRevision = contentRevisionRef.current;
    const timer = window.setTimeout(() => {
      void handleManualSave().then((saved) => {
        if (saved && contentRevisionRef.current !== scheduledRevision) {
          useStore.setState({ isDirty: true });
        }
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [activeTab, state.isDirty, state.profile, state.customLinks, state.socialLinks, isSaving]);

  // Interceptor for Tab Navigation or Page Exit
  const requestNavigation = (target: TargetAction) => {
    if (state.isDirty) {
      if (showLockedDesignUpgradePrompt()) return;
      if (activeTab === 'links' || activeTab === 'automation') {
        void handleManualSave().then((saved) => {
          if (saved) executeNavigation(target);
        });
        return;
      }
      setPendingTarget(target);
      setIsUnsavedModalOpen(true);
    } else {
      executeNavigation(target);
    }
  };

  const executeNavigation = (target: TargetAction) => {
    if (target === "logout") {
      handleLogout();
    } else if (target === "home") {
      navigate("/admin");
    } else if (
      target === "links" ||
      target === "profile" ||
      target === "appearance" ||
      target === "analytics" ||
      target === "marketing" ||
      target === "automation" ||
      target === "settings" ||
      target === "plan"
    ) {
      setActiveTab(target);
      setIsMobileEditorOpen(true);
      const urlAlias = target === 'links' ? 'content'
        : target === 'profile' ? 'header'
        : target === 'appearance' ? 'design'
        : target === 'analytics' ? 'analyze'
        : target === 'marketing' ? 'marketing'
        : target === 'automation' ? 'growth'
        : target === 'plan' ? 'plan'
        : 'settings';
      navigate(`/admin/${urlAlias}`);
    }
  };

  const handleSheetPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    sheetPointerStartY.current = event.clientY;
    sheetDragOffsetRef.current = 0;
    setSheetDragOffset(0);
  };

  const handleSheetPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (sheetPointerStartY.current === null) return;
    const distance = Math.max(0, event.clientY - sheetPointerStartY.current);
    const nextOffset = Math.min(distance, 220);
    sheetDragOffsetRef.current = nextOffset;
    setSheetDragOffset(nextOffset);
  };

  const handleSheetPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (sheetDragOffsetRef.current >= 56) setIsMobileEditorOpen(false);
    sheetPointerStartY.current = null;
    sheetDragOffsetRef.current = 0;
    setSheetDragOffset(0);
  };

  const openAppearanceView = (view: 'theme' | 'colors' | 'buttons' | 'stickers') => {
    setActiveAppearanceView(view);
    setIsMobileEditorOpen(true);
    window.dispatchEvent(new CustomEvent('linkzip:appearance-view', { detail: view }));
  };

  const closeMobilePreview = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    sheetPointerStartY.current = null;
    sheetDragOffsetRef.current = 0;
    setSheetDragOffset(0);
    setIsMobileEditorOpen(true);
  };

  const handleSaveAndContinue = async () => {
    const saved = await handleManualSave();
    if (!saved) return;
    setIsUnsavedModalOpen(false);
    if (pendingTarget) {
      executeNavigation(pendingTarget);
      setPendingTarget(null);
    }
  };

  const handleDiscardAndContinue = () => {
    state.cancelChanges();
    setIsUnsavedModalOpen(false);
    if (pendingTarget) {
      executeNavigation(pendingTarget);
      setPendingTarget(null);
    }
  };

  if (!urlTab) return <AdminProfilesHome />;

  return (
    <div className={clsx(
      "linkzip-admin admin-shell grid h-screen min-w-[1240px] grid-cols-[460px_minmax(700px,1fr)] grid-rows-[64px_minmax(0,1fr)] gap-4 bg-[#ECEFF1] p-5 overflow-x-auto overflow-y-hidden select-none font-sans text-gray-900",
      isMobileEditorOpen ? "mobile-editor-open" : "mobile-editor-closed",
      activeTab === 'appearance' && activeAppearanceView === 'stickers' && "mobile-appearance-stickers",
      usesMobileStandalonePage && "mobile-standalone-page",
      `admin-tab-${activeTab}`
    )}>
      {/* Sidebar Navigation */}
      <div className="admin-top-nav col-start-2 row-start-1 w-full bg-white border border-gray-200 rounded-[24px] flex flex-row items-center px-3 py-2 gap-2 z-20 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <nav className="admin-nav-items flex flex-row items-center gap-1.5 min-w-0">
          <button
            onClick={() => requestNavigation("links")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "links"
                ? "bg-gray-950 text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[10px] font-bold">{t("navLinks", state.language)}</span>
          </button>

          <button
            onClick={() => requestNavigation("profile")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "profile"
                ? "bg-gray-950 text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">{t("navProfile", state.language)}</span>
          </button>

          <button
            onClick={() => requestNavigation("appearance")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "appearance"
                ? "bg-gray-950 text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Palette className="w-5 h-5" />
            <span className="text-[10px] font-bold">{t("navDesign", state.language)}</span>
          </button>

          <button
            onClick={() => requestNavigation("analytics")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "analytics"
                ? "bg-gray-950 text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-bold">{t("navAnalytics", state.language)}</span>
          </button>

          <button
            onClick={() => requestNavigation("marketing")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "marketing"
                ? "bg-gray-950 text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Megaphone className="w-5 h-5" />
            <span className="text-[10px] font-bold">{t("navMarketing", state.language)}</span>
          </button>

          <button
            onClick={() => requestNavigation("automation")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "automation"
                ? "bg-gray-950 text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-bold">{t("navGrowth", state.language)}</span>
          </button>

        </nav>
      </div>

      {/* Mobile editor toolbar */}
      <div className="mobile-admin-toolbar hidden">
        <button type="button" onClick={() => activeTab === "links" ? requestNavigation('home') : requestNavigation("links")} className="mobile-toolbar-icon" aria-label="뒤로가기"><ArrowLeft /></button>
        <div className="ml-auto flex items-center gap-1">
          {!usesMobileStandalonePage && <>
            <button type="button" onClick={state.undo} disabled={state.undoStack.length === 0} className="mobile-toolbar-icon" aria-label="실행 취소"><Undo2 /></button>
            <button type="button" onClick={state.redo} disabled={state.redoStack.length === 0} className="mobile-toolbar-icon" aria-label="다시 실행"><Redo2 /></button>
            <button type="button" onClick={() => state.isDirty && state.cancelChanges()} disabled={!state.isDirty} className="mobile-toolbar-cancel">{t("cancel", state.language)}</button>
            <button type="button" onClick={() => void handleManualSave(true)} disabled={!state.isDirty || isSaving} className="mobile-toolbar-save">{t("save", state.language)}</button>
          </>}
          {activeTab !== 'appearance' && <div ref={mobileAccountMenuRef} className="mobile-toolbar-account relative">
            <button type="button" onClick={() => setIsAccountMenuOpen((open) => !open)} className="mobile-toolbar-avatar" aria-label={state.language === 'ko' ? '계정 메뉴 열기' : 'Open account menu'} aria-expanded={isAccountMenuOpen}>
              {state.profile.avatarUrl ? <img src={state.profile.avatarUrl} alt="" /> : <UserIcon />}
            </button>
            {isAccountMenuOpen && (
              <div className="mobile-account-menu">
                <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">{state.profile.avatarUrl ? <img src={state.profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-full w-full p-2 text-gray-400" />}</div>
                  <div className="min-w-0"><p className="truncate text-sm font-black">{state.profile.name || state.profile.username}</p><p className="truncate text-[11px] font-semibold text-gray-400">linkzip.kr/{state.profile.username}</p></div>
                </div>
                <button type="button" onClick={() => { setIsAccountMenuOpen(false); requestNavigation('home'); }}><LayoutGrid /><span>{state.language === 'ko' ? '프로필 목록' : 'All profiles'}</span></button>
                <button type="button" onClick={() => { setIsAccountMenuOpen(false); requestNavigation('settings'); }}><Settings /><span>{state.language === 'ko' ? '설정' : 'Settings'}</span></button>
                <button type="button" onClick={() => { setIsAccountMenuOpen(false); requestNavigation('plan'); }}><Crown /><span>{state.language === 'ko' ? '플랜 관리' : 'Plan management'}</span></button>
                <button type="button" className="logout" onClick={() => { setIsAccountMenuOpen(false); requestNavigation('logout'); }}><LogOut /><span>{t('navLogout', state.language)}</span></button>
              </div>
            )}
          </div>}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className={clsx("admin-main-panel col-start-2 row-start-2 min-w-[700px] min-h-0 flex flex-col bg-[#F6F6F4] rounded-[24px] border border-gray-200 overflow-hidden shadow-[0_16px_40px_rgba(15,23,42,0.08)]", !isMobileEditorOpen && "mobile-sheet-closed")} style={sheetDragOffset ? { transform: `translateY(${sheetDragOffset}px)` } : undefined}>
        <div className="mobile-sheet-header hidden">
          <div className="mobile-sheet-swipe-zone" onPointerDown={handleSheetPointerDown} onPointerMove={handleSheetPointerMove} onPointerUp={handleSheetPointerEnd} onPointerCancel={handleSheetPointerEnd} aria-label="아래로 밀어 편집 패널 닫기"><span /></div>
          <button type="button" onClick={() => setIsMobileEditorOpen(false)} className="mobile-sheet-close" aria-label="편집 패널 닫기"><X /></button>
        </div>

        {/* Editor Content Body */}
        <div className="admin-editor-body flex-1 overflow-y-auto bg-white p-0">
          <div className="admin-editor-canvas mx-auto w-full max-w-none space-y-6 rounded-[24px] border-0 bg-white p-5 shadow-none sm:p-7">
            
            {/* Section Header with Title (Left) and Undo / Redo / Cancel / Save (Right) */}
            <div className={clsx(
              "admin-section-header flex items-center justify-between gap-4 border-b border-gray-100",
              hasManualEditActions
                ? "sticky top-0 z-[100] -mx-5 -mt-5 rounded-t-[28px] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.10)] sm:-mx-7 sm:-mt-7 sm:px-7 sm:py-5"
                : "pb-4",
            )}>
              <h2 className={clsx("font-black text-gray-900 capitalize tracking-tight", hasManualEditActions ? "text-[26px]" : "text-2xl")}>
                {activeTab === "links" && t("linksTitle", state.language)}
                {activeTab === "profile" && t("profileTitle", state.language)}
                {activeTab === "appearance" && t("designTitle", state.language)}
                {activeTab === "analytics" && t("analyticsTitle", state.language)}
                {activeTab === "marketing" && t("marketingTitle", state.language)}
                {activeTab === "automation" && t("growthTitle", state.language)}
                {activeTab === "settings" && t("settingsTitle", state.language)}
                {activeTab === "plan" && (state.language === 'ko' ? '플랜 관리' : 'Plan management')}
              </h2>

              {/* Controls Row (Matching User Screenshot) */}
              {hasManualEditActions && <div className="admin-section-controls flex items-center gap-2.5 sm:gap-3">
                {/* Undo */}
                <button
                  onClick={state.undo}
                  disabled={state.undoStack.length === 0}
                  className={clsx(
                    "flex h-11 w-11 items-center justify-center rounded-full transition cursor-pointer",
                    state.undoStack.length > 0
                      ? "hover:bg-gray-100 text-gray-800"
                      : "text-gray-300 cursor-not-allowed"
                  )}
                  title="Undo"
                >
                  <Undo2 className="w-6 h-6" />
                </button>

                {/* Redo */}
                <button
                  onClick={state.redo}
                  disabled={state.redoStack.length === 0}
                  className={clsx(
                    "flex h-11 w-11 items-center justify-center rounded-full transition cursor-pointer",
                    state.redoStack.length > 0
                      ? "hover:bg-gray-100 text-gray-800"
                      : "text-gray-300 cursor-not-allowed"
                  )}
                  title="Redo"
                >
                  <Redo2 className="w-6 h-6" />
                </button>

                {/* Cancel Button */}
                <button
                  onClick={() => {
                    if (state.isDirty) {
                      if (confirm('변경사항을 취소하시겠습니까?')) {
                        state.cancelChanges();
                      }
                    }
                  }}
                  disabled={!state.isDirty || isSaving}
                  className={clsx(
                    "h-12 min-w-[92px] rounded-full border px-6 text-sm font-black transition cursor-pointer",
                    state.isDirty && !isSaving
                      ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "border-gray-200 text-gray-300 cursor-not-allowed"
                  )}
                >
                  {t("cancel", state.language)}
                </button>

                {/* Save Button */}
                <button
                  onClick={() => void handleManualSave(true)}
                  disabled={!state.isDirty || isSaving}
                  className={clsx(
                    "flex h-12 min-w-[116px] items-center justify-center rounded-full px-8 text-base font-black transition",
                    state.isDirty && !isSaving
                      ? "cursor-pointer bg-gray-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.28)] hover:bg-black hover:shadow-[0_12px_30px_rgba(15,23,42,0.36)] active:scale-95"
                      : "cursor-not-allowed border border-gray-200 bg-gray-200 text-gray-500 shadow-none"
                  )}
                >
                  <span>{t("save", state.language)}</span>
                </button>
              </div>}
            </div>
            {saveError && <p role="alert" className="-mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{saveError}</p>}

            {/* Tab Editor Views */}
            <Suspense key={activeTab} fallback={<EditorPendingScreen />}>
              {activeTab === "links" && <LinksEditor />}
              {activeTab === "profile" && <ProfileEditor />}
              {activeTab === "appearance" && <AppearanceEditor />}
              {activeTab === "analytics" && <AnalyticsEditor />}
              {activeTab === "marketing" && <MarketingEditor />}
              {activeTab === "automation" && <GrowthEditor />}
              {activeTab === "settings" && <SettingsEditor />}
            </Suspense>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="admin-mobile-bottom-nav sm:hidden border-t border-gray-200 bg-white flex justify-around p-3 pb-safe">
          {activeTab === 'appearance' ? <>
            <button onClick={() => openAppearanceView('theme')} className="flex flex-col items-center gap-1 text-gray-500"><LayoutGrid className="w-5 h-5" /><span className="text-[10px]">{state.language === 'ko' ? '테마' : 'Theme'}</span></button>
            <button onClick={() => openAppearanceView('colors')} className="flex flex-col items-center gap-1 text-gray-500"><Palette className="w-5 h-5" /><span className="text-[10px]">{state.language === 'ko' ? '색상' : 'Colors'}</span></button>
            <button onClick={() => openAppearanceView('buttons')} className="flex flex-col items-center gap-1 text-gray-500"><Link2 className="w-5 h-5" /><span className="text-[10px]">{state.language === 'ko' ? '버튼' : 'Buttons'}</span></button>
            <button onClick={() => openAppearanceView('stickers')} className="flex flex-col items-center gap-1 text-gray-500"><Sparkles className="w-5 h-5" /><span className="text-[10px]">{state.language === 'ko' ? '스티커' : 'Stickers'}</span></button>
          </> : <><button
            onClick={() => requestNavigation("links")}
            className={clsx(
              "flex flex-col items-center gap-1",
              activeTab === "links" ? "text-black font-bold" : "text-gray-400"
            )}
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[10px]">{state.language === 'ko' ? '링크' : 'Links'}</span>
          </button>
          <button
            onClick={() => setIsMobileEditorOpen(false)}
            className={clsx(
              "flex flex-col items-center gap-1",
              !isMobileEditorOpen ? "text-black font-bold" : "text-gray-400"
            )}
          >
            <Eye className="w-5 h-5" />
            <span className="text-[10px]">{state.language === 'ko' ? '프리뷰' : 'Preview'}</span>
          </button>
          <button
            onClick={() => requestNavigation("appearance")}
            className="flex flex-col items-center gap-1 text-gray-400"
          >
            <Palette className="w-5 h-5" />
            <span className="text-[10px]">{state.language === 'ko' ? '디자인' : 'Design'}</span>
          </button>
          <button
            onClick={() => requestNavigation("analytics")}
            className={clsx(
              "flex flex-col items-center gap-1",
              activeTab === "analytics"
                ? "text-[#ff5f35] font-bold"
                : "text-gray-400"
            )}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px]">{state.language === 'ko' ? '분석' : 'Insights'}</span>
          </button>
          <button
            onClick={() => requestNavigation("automation")}
            className={clsx(
              "flex flex-col items-center gap-1",
              activeTab === "automation" ? "text-[#ff5f35] font-bold" : "text-gray-400"
            )}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px]">{state.language === 'ko' ? '고객' : 'Audience'}</span>
          </button>
          </>}
        </div>
      </div>

      {/* Right Live Phone Preview (Desktop only) */}
      <div className="admin-live-preview col-start-1 row-start-1 row-span-2 flex w-full bg-transparent border-0 flex-col items-center justify-center p-6 shrink-0 relative overflow-hidden select-none">
        <div className="admin-desktop-action-rail absolute left-3 top-4 z-20 flex flex-col gap-2">
          <button type="button" onClick={() => requestNavigation('home')} className="admin-desktop-rail-button" aria-label={state.language === 'ko' ? '홈으로 이동' : 'Go home'} title={state.language === 'ko' ? '홈' : 'Home'}><House /></button>
          <button type="button" onClick={() => requestNavigation('settings')} className={clsx('admin-desktop-rail-button', activeTab === 'settings' && 'is-active')} aria-label={state.language === 'ko' ? '설정 열기' : 'Open settings'} title={t('navSettings', state.language)}><Settings /></button>
        </div>

        <div ref={accountMenuRef} className="admin-desktop-account absolute bottom-4 left-3 z-30">
          <button type="button" onClick={() => setIsAccountMenuOpen((open) => !open)} className="admin-desktop-avatar-button" aria-label={state.language === 'ko' ? '계정 메뉴 열기' : 'Open account menu'} aria-expanded={isAccountMenuOpen}>
            {state.profile.avatarUrl ? <img src={state.profile.avatarUrl} alt="" /> : <UserIcon />}
          </button>
          {isAccountMenuOpen && (
            <div className="admin-desktop-account-menu">
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">{state.profile.avatarUrl ? <img src={state.profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-full w-full p-2 text-gray-400" />}</div>
                <div className="min-w-0"><div className="flex items-center gap-1.5"><p className="truncate text-sm font-black">{state.profile.name || state.profile.username}</p><span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-gray-500">{state.membershipPlan}</span></div><p className="truncate text-[11px] font-semibold text-gray-400">linkzip.kr/{state.profile.username}</p></div>
              </div>
              <button type="button" onClick={() => { setIsAccountMenuOpen(false); requestNavigation('home'); }}><LayoutGrid /><span>{state.language === 'ko' ? '프로필 목록' : 'All profiles'}</span></button>
              <button type="button" onClick={() => { setIsAccountMenuOpen(false); requestNavigation('plan'); }}><Crown /><span>{state.language === 'ko' ? '플랜 관리' : 'Plan management'}</span></button>
              <button type="button" className="logout" onClick={() => { setIsAccountMenuOpen(false); requestNavigation('logout'); }}><LogOut /><span>{t('navLogout', state.language)}</span></button>
            </div>
          )}
        </div>
        <div className="admin-preview-stack flex flex-col items-center justify-center gap-3">
          {/* Large live phone preview */}
          <div data-map-popup-container className="admin-preview-device relative flex max-w-[390px] flex-col overflow-hidden rounded-[3rem] border-[8px] border-[#D9DDE4] bg-white shadow-[0_22px_58px_rgba(15,23,42,0.18)]" style={{ height: 'clamp(560px, calc(100vh - 150px), 780px)' }}>
            <div className="h-full w-full overflow-y-auto scrollbar-none">
              <LinkTreePreview
                stickerEditable={activeTab === 'appearance'}
                beforeSalesOrder={async () => !useStore.getState().isDirty || handleManualSave()}
              />
            </div>
          </div>

          {/* Profile URL belongs to the preview, not the editor toolbar. */}
          <div className="admin-preview-url flex h-12 w-full items-center gap-2 rounded-full border border-gray-200 bg-white px-4 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <span className="shrink-0 text-xs font-black text-gray-900">URL</span>
            <a href={profileUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs font-bold text-blue-600 underline decoration-blue-300 underline-offset-3 transition hover:text-blue-800">{profileUrl}</a>
            <button type="button" onClick={handleCopyLink} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-black" aria-label={copied ? t('copied', state.language) : t('copy', state.language)} title={copied ? t('copied', state.language) : t('copy', state.language)}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => window.open(`/${username}`, "_blank")} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-950 hover:text-white" aria-label={t('share', state.language)} title={t('share', state.language)}>
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {!isMobileEditorOpen && activeTab !== 'appearance' && (
          <button type="button" onClick={closeMobilePreview} className="mobile-preview-close hidden" aria-label={state.language === 'ko' ? '프리뷰 닫기' : 'Close preview'}>
            <X />
            <span>{state.language === 'ko' ? '닫기' : 'Close'}</span>
          </button>
        )}
      </div>

      {!isMobileEditorOpen && (
        <div className="mobile-tab-dock hidden" aria-label="모바일 관리자 메뉴">
          {activeTab === 'appearance' ? <>
            <button type="button" onClick={() => openAppearanceView('theme')}><LayoutGrid /><span>{state.language === 'ko' ? '테마' : 'Theme'}</span></button>
            <button type="button" onClick={() => openAppearanceView('colors')}><Palette /><span>{state.language === 'ko' ? '색상' : 'Colors'}</span></button>
            <button type="button" onClick={() => openAppearanceView('buttons')}><Link2 /><span>{state.language === 'ko' ? '버튼' : 'Buttons'}</span></button>
            <button type="button" onClick={() => openAppearanceView('stickers')}><Sparkles /><span>{state.language === 'ko' ? '스티커' : 'Stickers'}</span></button>
          </> : <>
            <button type="button" onClick={() => requestNavigation("links")}><Link2 /><span>{state.language === 'ko' ? '링크' : 'Links'}</span></button>
            <button type="button" className="text-black"><Eye /><span>{state.language === 'ko' ? '프리뷰' : 'Preview'}</span></button>
            <button type="button" onClick={() => requestNavigation("appearance")}><Palette /><span>{state.language === 'ko' ? '디자인' : 'Design'}</span></button>
            <button type="button" onClick={() => requestNavigation("analytics")}><BarChart3 /><span>{state.language === 'ko' ? '분석' : 'Insights'}</span></button>
            <button type="button" onClick={() => requestNavigation("automation")}><UserIcon /><span>{state.language === 'ko' ? '고객' : 'Audience'}</span></button>
          </>}
        </div>
      )}

      {isSaveToastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-[30000] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border-2 border-[#171714] bg-[#d9ff67] px-5 py-3 text-sm font-black text-[#171714] shadow-[4px_4px_0_#171714] animate-in fade-in slide-in-from-bottom-2 sm:bottom-8"
        >
          <Check className="h-4 w-4" />
          {state.language === 'ko' ? '저장 완료' : 'Saved'}
        </div>
      )}

      {/* Unsaved Changes Warning Modal */}
      {isUnsavedModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#171714]/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-[24px] border border-[#d8d2c7] bg-[#fffdf8] p-5 font-sans shadow-[0_22px_65px_rgba(0,0,0,0.30)] animate-in fade-in zoom-in-95 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e7b83d] bg-[#ffcf4a] font-bold text-[#171714]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {state.language === 'ko' ? '저장하지 않은 변경사항' : 'Unsaved changes'}
                </h3>
                <p className="text-xs text-gray-500">
                  {state.language === 'ko' ? '이동하기 전에 저장할까요?' : 'Save before leaving?'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleSaveAndContinue}
                className="w-full cursor-pointer rounded-2xl bg-[#171714] py-3 text-xs font-black text-white transition hover:bg-black"
              >
                {state.language === 'ko' ? '저장하고 이동' : 'Save and continue'}
              </button>
              <button
                onClick={handleDiscardAndContinue}
                className="w-full cursor-pointer rounded-2xl border border-[#d8d2c7] bg-[#f4f1e8] py-3 text-xs font-black text-[#171714] transition hover:bg-[#ebe6da]"
              >
                {state.language === 'ko' ? '저장하지 않고 이동' : 'Discard and continue'}
              </button>
              <button
                onClick={() => {
                  setIsUnsavedModalOpen(false);
                  setPendingTarget(null);
                }}
                className="w-full py-2.5 text-gray-500 hover:text-black text-xs font-bold transition cursor-pointer"
              >
                {state.language === 'ko' ? '계속 편집' : 'Keep editing'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Admin;
