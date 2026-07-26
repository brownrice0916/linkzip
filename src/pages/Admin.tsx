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
  Globe,
  ArrowLeft,
  X
} from "lucide-react";
import { logout } from "../lib/firebase";
import clsx from "clsx";
import { t } from "../lib/i18n";
import { saveUserData } from "../services/userService";

const LinksEditor = lazy(() => import("../components/admin/LinksEditor"));
const ProfileEditor = lazy(() => import("../components/admin/ProfileEditor"));
const AppearanceEditor = lazy(() => import("../components/admin/AppearanceEditor"));
const SettingsEditor = lazy(() => import("../components/admin/SettingsEditor"));
const GrowthEditor = lazy(() => import("../components/admin/GrowthEditor"));
const AnalyticsEditor = lazy(() => import("../components/admin/AnalyticsEditor").then((module) => ({ default: module.AnalyticsEditor })));
const MarketingEditor = lazy(() => import("../components/admin/MarketingEditor").then((module) => ({ default: module.MarketingEditor })));

type TabType = "links" | "profile" | "appearance" | "analytics" | "marketing" | "automation" | "settings";
type TargetAction = TabType | "home" | "logout" | null;

const Admin = () => {
  const state = useStore();
  const navigate = useNavigate();
  const { tab: urlTab } = useParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<TabType>("links");
  const [copied, setCopied] = useState(false);
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(true);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const sheetPointerStartY = useRef<number | null>(null);
  const sheetDragOffsetRef = useRef(0);

  // Sync URL parameter to activeTab
  useEffect(() => {
    if (urlTab) {
      const tabLower = urlTab.toLowerCase();
      if (tabLower === 'content' || tabLower === 'links') setActiveTab('links');
      else if (tabLower === 'header' || tabLower === 'profile') setActiveTab('profile');
      else if (tabLower === 'design' || tabLower === 'appearance') setActiveTab('appearance');
      else if (tabLower === 'analyze' || tabLower === 'analytics') setActiveTab('analytics');
      else if (tabLower === 'marketing' || tabLower === 'dm') setActiveTab('marketing');
      else if (tabLower === 'growth' || tabLower === 'automation') setActiveTab('automation');
      else if (tabLower === 'settings') setActiveTab('settings');
    }
  }, [urlTab]);

  // Unsaved changes modal state
  const [pendingTarget, setPendingTarget] = useState<TargetAction>(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);

  const username = state.profile.username || "preview";
  const profileUrl = `${window.location.origin}/${username}`;

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

  const handleManualSave = async () => {
    if (!state.isDirty) return;
    try {
      if (state.user?.uid) {
        await saveUserData(state.user.uid, state.profile.username || state.user.uid, {
          profile: state.profile,
          template: { type: state.templateType, value: state.templateValue },
          design: {
            buttonStyle: state.buttonStyle,
            buttonRoundness: state.buttonRoundness,
            buttonShadow: state.buttonShadow,
            buttonColor: state.buttonColor,
            buttonTextColor: state.buttonTextColor,
            buttonOpacity: state.buttonOpacity,
            buttonTextOpacity: state.buttonTextOpacity,
            fontFamily: state.fontFamily,
            titleFontFamily: state.titleFontFamily,
            pageTextColor: state.pageTextColor,
            sticker: state.sticker,
          },
          socialLinks: state.socialLinks,
          customLinks: state.customLinks,
          teamMembers: state.teamMembers,
          dmRules: state.dmRules,
          alimtalkSettings: state.alimtalkSettings,
          instagramAccount: state.instagramAccount,
          pageViews: state.pageViews,
        });
      }

      // Backup save to localStorage
      try {
        localStorage.setItem("linkzip_saved_state", JSON.stringify({
          profile: state.profile,
          customLinks: state.customLinks,
          socialLinks: state.socialLinks,
          dmRules: state.dmRules,
          instagramAccount: state.instagramAccount,
        }));
      } catch (e) {
        console.warn("LocalStorage save warning:", e);
      }

      state.markSaved();
    } catch (error) {
      console.error("Failed to save", error);
    }
  };

  // Interceptor for Tab Navigation or Page Exit
  const requestNavigation = (target: TargetAction) => {
    if (state.isDirty) {
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
      navigate("/");
    } else if (
      target === "links" ||
      target === "profile" ||
      target === "appearance" ||
      target === "analytics" ||
      target === "marketing" ||
      target === "automation" ||
      target === "settings"
    ) {
      setActiveTab(target);
      setIsMobileEditorOpen(true);
      const urlAlias = target === 'links' ? 'content'
        : target === 'profile' ? 'header'
        : target === 'appearance' ? 'design'
        : target === 'analytics' ? 'analyze'
        : target === 'marketing' ? 'marketing'
        : target === 'automation' ? 'growth'
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

  const handleSaveAndContinue = async () => {
    await handleManualSave();
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

  return (
    <div className={clsx(
      "linkzip-admin admin-shell grid h-screen min-w-[1240px] grid-cols-[400px_minmax(700px,1fr)] grid-rows-[48px_64px_minmax(0,1fr)] gap-4 bg-[#ECEFF1] p-5 overflow-x-auto overflow-y-hidden select-none font-sans text-gray-900",
      isMobileEditorOpen ? "mobile-editor-open" : "mobile-editor-closed"
    )}>
      {/* Sidebar Navigation */}
      <div className="admin-top-nav col-start-2 row-start-2 w-full bg-white border border-gray-200 rounded-[24px] flex flex-row items-center px-3 py-2 gap-2 z-20 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
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

          <button
            onClick={() => requestNavigation("settings")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "settings"
                ? "bg-gray-950 text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold">{t("navSettings", state.language)}</span>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <button
            onClick={() => requestNavigation("logout")}
            className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition cursor-pointer"
            title={t("navLogout", state.language)}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Independent top utility bar */}
      <div className="admin-utility-bar col-start-2 row-start-1 flex items-center justify-between gap-3 min-w-0">
        <div className="flex h-full min-w-0 items-center rounded-full border border-gray-200 bg-white p-1 pl-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <div className="flex min-w-0 items-center gap-3 pr-4">
            <span className="shrink-0 text-xs font-black text-gray-900">{t("myLinkZip", state.language)}</span>
            <a href={profileUrl} target="_blank" rel="noreferrer" className="truncate text-xs font-semibold text-gray-500 underline decoration-gray-300 underline-offset-4 transition hover:text-black">{profileUrl}</a>
          </div>
          <div className="flex h-full shrink-0 items-center gap-1 border-l border-gray-200 pl-1">
            <button onClick={handleCopyLink} className="flex h-full items-center gap-1.5 rounded-full px-3 text-xs font-bold text-gray-700 transition hover:bg-gray-100 cursor-pointer">
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t("copied", state.language) : t("copy", state.language)}
            </button>
            <button onClick={() => window.open(`/${username}`, "_blank")} className="flex h-full items-center gap-1.5 rounded-full bg-gray-950 px-3.5 text-xs font-bold text-white transition hover:bg-gray-800 cursor-pointer">
              <Share2 className="w-3.5 h-3.5" />{t("share", state.language)}
            </button>
          </div>
        </div>

        <div className="flex h-full shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white px-3 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
          <Globe className="w-3.5 h-3.5 text-gray-600" />
          <select value={state.language} onChange={(e) => state.setLanguage(e.target.value as 'ko' | 'en')} className="bg-transparent pr-1 text-xs font-extrabold text-gray-900 focus:outline-hidden cursor-pointer" aria-label="언어 선택">
            <option value="ko">🇰🇷 한국어</option>
            <option value="en">🇺🇸 English</option>
          </select>
        </div>
      </div>

      {/* Mobile editor toolbar */}
      <div className="mobile-admin-toolbar hidden">
        <button type="button" onClick={() => activeTab === "links" ? navigate(-1) : requestNavigation("links")} className="mobile-toolbar-icon" aria-label="뒤로가기"><ArrowLeft /></button>
        <h1 className="mobile-toolbar-title">
          {activeTab === "links" && t("navLinks", state.language)}
          {activeTab === "profile" && t("navProfile", state.language)}
          {activeTab === "appearance" && t("navDesign", state.language)}
          {activeTab === "analytics" && t("navAnalytics", state.language)}
          {activeTab === "marketing" && t("navMarketing", state.language)}
          {activeTab === "automation" && t("navGrowth", state.language)}
          {activeTab === "settings" && t("navSettings", state.language)}
        </h1>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={state.undo} disabled={state.undoStack.length === 0} className="mobile-toolbar-icon" aria-label="실행 취소"><Undo2 /></button>
          <button type="button" onClick={state.redo} disabled={state.redoStack.length === 0} className="mobile-toolbar-icon" aria-label="다시 실행"><Redo2 /></button>
          <button type="button" onClick={() => state.isDirty && state.cancelChanges()} disabled={!state.isDirty} className="mobile-toolbar-cancel">{t("cancel", state.language)}</button>
          <button type="button" onClick={handleManualSave} disabled={!state.isDirty} className="mobile-toolbar-save">{t("save", state.language)}</button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className={clsx("admin-main-panel col-start-2 row-start-3 min-w-[700px] min-h-0 flex flex-col bg-[#F6F6F4] rounded-[24px] border border-gray-200 overflow-hidden shadow-[0_16px_40px_rgba(15,23,42,0.08)]", !isMobileEditorOpen && "mobile-sheet-closed")} style={sheetDragOffset ? { transform: `translateY(${sheetDragOffset}px)` } : undefined}>
        <div className="mobile-sheet-header hidden">
          <div className="mobile-sheet-swipe-zone" onPointerDown={handleSheetPointerDown} onPointerMove={handleSheetPointerMove} onPointerUp={handleSheetPointerEnd} onPointerCancel={handleSheetPointerEnd} aria-label="아래로 밀어 편집 패널 닫기"><span /></div>
          <button type="button" onClick={() => setIsMobileEditorOpen(false)} className="mobile-sheet-close" aria-label="편집 패널 닫기"><X /></button>
        </div>

        {/* Editor Content Body */}
        <div className="admin-editor-body flex-1 overflow-y-auto p-4 sm:p-7 bg-[#F6F6F4]">
          <div className="admin-editor-canvas max-w-3xl mx-auto bg-white rounded-[20px] p-5 sm:p-7 border border-gray-200 space-y-6">
            
            {/* Section Header with Title (Left) and Undo / Redo / Cancel / Save (Right) */}
            <div className="admin-section-header flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 capitalize tracking-tight">
                {activeTab === "links" && t("linksTitle", state.language)}
                {activeTab === "profile" && t("profileTitle", state.language)}
                {activeTab === "appearance" && t("designTitle", state.language)}
                {activeTab === "analytics" && t("analyticsTitle", state.language)}
                {activeTab === "marketing" && t("marketingTitle", state.language)}
                {activeTab === "automation" && t("growthTitle", state.language)}
                {activeTab === "settings" && t("settingsTitle", state.language)}
              </h2>

              {/* Controls Row (Matching User Screenshot) */}
              <div className="admin-section-controls flex items-center gap-3">
                {/* Undo */}
                <button
                  onClick={state.undo}
                  disabled={state.undoStack.length === 0}
                  className={clsx(
                    "p-2 rounded-xl transition cursor-pointer flex items-center justify-center",
                    state.undoStack.length > 0
                      ? "hover:bg-gray-100 text-gray-800"
                      : "text-gray-300 cursor-not-allowed"
                  )}
                  title="Undo"
                >
                  <Undo2 className="w-5 h-5" />
                </button>

                {/* Redo */}
                <button
                  onClick={state.redo}
                  disabled={state.redoStack.length === 0}
                  className={clsx(
                    "p-2 rounded-xl transition cursor-pointer flex items-center justify-center",
                    state.redoStack.length > 0
                      ? "hover:bg-gray-100 text-gray-800"
                      : "text-gray-300 cursor-not-allowed"
                  )}
                  title="Redo"
                >
                  <Redo2 className="w-5 h-5" />
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
                  disabled={!state.isDirty}
                  className={clsx(
                    "px-5 py-2 rounded-full border text-xs font-bold transition cursor-pointer",
                    state.isDirty
                      ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "border-gray-200 text-gray-300 cursor-not-allowed"
                  )}
                >
                  {t("cancel", state.language)}
                </button>

                {/* Save Button */}
                <button
                  onClick={handleManualSave}
                  disabled={!state.isDirty}
                  className={clsx(
                    "px-6 py-2 rounded-full font-extrabold text-xs transition flex items-center gap-1.5",
                    state.isDirty
                      ? "cursor-pointer bg-gray-950 hover:bg-gray-800 text-white shadow-sm active:scale-95"
                      : "cursor-not-allowed bg-gray-100 text-gray-300 border border-gray-200 shadow-none"
                  )}
                >
                  <span>{t("save", state.language)}</span>
                </button>
              </div>
            </div>

            {/* Tab Editor Views */}
            <Suspense fallback={<div className="py-16 text-center text-sm text-gray-500">{state.language === 'ko' ? '편집기 불러오는 중...' : 'Loading editor...'}</div>}>
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
          <button
            onClick={() => requestNavigation("links")}
            className={clsx(
              "flex flex-col items-center gap-1",
              activeTab === "links" ? "text-black font-bold" : "text-gray-400"
            )}
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[10px]">{t("navLinks", state.language)}</span>
          </button>
          <button
            onClick={() => requestNavigation("profile")}
            className={clsx(
              "flex flex-col items-center gap-1",
              activeTab === "profile" ? "text-black font-bold" : "text-gray-400"
            )}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px]">{t("navProfile", state.language)}</span>
          </button>
          <button
            onClick={() => requestNavigation("appearance")}
            className={clsx(
              "flex flex-col items-center gap-1",
              activeTab === "appearance"
                ? "text-black font-bold"
                : "text-gray-400"
            )}
          >
            <Palette className="w-5 h-5" />
            <span className="text-[10px]">{t("navDesign", state.language)}</span>
          </button>
          <button
            onClick={() => requestNavigation("automation")}
            className={clsx(
              "flex flex-col items-center gap-1",
              activeTab === "automation"
                ? "text-purple-600 font-bold"
                : "text-gray-400"
            )}
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px]">{t("navGrowth", state.language)}</span>
          </button>
          <button
            onClick={() => requestNavigation("settings")}
            className={clsx(
              "flex flex-col items-center gap-1",
              activeTab === "settings"
                ? "text-black font-bold"
                : "text-gray-400"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">{t("navSettings", state.language)}</span>
          </button>
        </div>
      </div>

      {/* Right Live Phone Preview (Desktop only) */}
      <div className="admin-live-preview col-start-1 row-start-1 row-span-3 flex w-full bg-[#E5E8EB] rounded-[28px] border border-gray-200 flex-col items-center justify-center p-6 shrink-0 relative overflow-hidden select-none">
        {/* Sleek Borderless Mobile Device Container */}
        <div className="w-[340px] h-[680px] bg-white rounded-[2.5rem] shadow-[0_18px_48px_rgba(15,23,42,0.14)] relative flex flex-col overflow-hidden border border-gray-200">
          <div className="w-full h-full overflow-y-auto scrollbar-none">
            <LinkTreePreview />
          </div>
        </div>
      </div>

      {!isMobileEditorOpen && (
        <div className="mobile-tab-dock hidden" aria-label="모바일 관리자 메뉴">
          <button type="button" onClick={() => requestNavigation("links")}><Link2 /><span>{t("navLinks", state.language)}</span></button>
          <button type="button" onClick={() => requestNavigation("profile")}><UserIcon /><span>{t("navProfile", state.language)}</span></button>
          <button type="button" onClick={() => requestNavigation("appearance")}><Palette /><span>{t("navDesign", state.language)}</span></button>
          <button type="button" onClick={() => requestNavigation("automation")}><Zap /><span>{t("navGrowth", state.language)}</span></button>
          <button type="button" onClick={() => requestNavigation("settings")}><Settings /><span>{t("navSettings", state.language)}</span></button>
        </div>
      )}

      {/* Unsaved Changes Warning Modal */}
      {isUnsavedModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
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

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleSaveAndContinue}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                {state.language === 'ko' ? '저장하고 이동' : 'Save and continue'}
              </button>
              <button
                onClick={handleDiscardAndContinue}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold transition cursor-pointer"
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
