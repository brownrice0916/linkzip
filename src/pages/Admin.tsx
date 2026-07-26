import React, { useState, useEffect } from "react";
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
  X,
  Zap,
  BarChart3,
  Megaphone
} from "lucide-react";
import { auth, logout } from "../lib/firebase";
import clsx from "clsx";

import LinksEditor from "../components/admin/LinksEditor";
import ProfileEditor from "../components/admin/ProfileEditor";
import AppearanceEditor from "../components/admin/AppearanceEditor";
import SettingsEditor from "../components/admin/SettingsEditor";
import GrowthEditor from "../components/admin/GrowthEditor";
import { AnalyticsEditor } from "../components/admin/AnalyticsEditor";
import { MarketingEditor } from "../components/admin/MarketingEditor";

type TabType = "links" | "profile" | "appearance" | "analytics" | "marketing" | "automation" | "settings";
type TargetAction = TabType | "home" | "logout" | null;

const Admin = () => {
  const state = useStore();
  const navigate = useNavigate();
  const { tab: urlTab } = useParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<TabType>("links");
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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
    navigate("/login");
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
    try {
      setSaveStatus("Saving...");

      if (state.user?.uid) {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("../lib/firebase");
        await setDoc(doc(db, "users", state.user.uid), {
          username: state.profile.username || state.user.uid,
          profile: state.profile,
          template: { type: state.templateType, value: state.templateValue },
          design: {
            buttonStyle: state.buttonStyle,
            buttonRoundness: state.buttonRoundness,
            buttonShadow: state.buttonShadow,
            buttonColor: state.buttonColor,
            buttonTextColor: state.buttonTextColor,
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
          updatedAt: new Date().toISOString(),
        });
      }

      // Backup save to localStorage
      try {
        localStorage.setItem("linkzip_saved_state", JSON.stringify({
          profile: state.profile,
          customLinks: state.customLinks,
          socialLinks: state.socialLinks,
          dmRules: state.dmRules,
          alimtalkSettings: state.alimtalkSettings,
          instagramAccount: state.instagramAccount,
        }));
      } catch (e) {
        console.warn("LocalStorage save warning:", e);
      }

      state.markSaved();
      setSaveStatus("Saved successfully!");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error("Failed to save", error);
      setSaveStatus("Error saving!");
      setTimeout(() => setSaveStatus(null), 3000);
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
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden select-none font-sans">
      {/* Sidebar Navigation */}
      <div className="w-18 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-6 z-20 shrink-0 shadow-xs">
        <div
          onClick={() => requestNavigation("home")}
          className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-xl shadow-md cursor-pointer hover:scale-105 transition"
        >
          <Link2 className="w-5 h-5 text-indigo-400" />
        </div>



        <nav className="flex flex-col gap-3 w-full px-2.5">
          <button
            onClick={() => requestNavigation("links")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "links"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[10px] font-bold">Content</span>
          </button>

          <button
            onClick={() => requestNavigation("profile")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "profile"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">Header</span>
          </button>

          <button
            onClick={() => requestNavigation("appearance")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "appearance"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Palette className="w-5 h-5" />
            <span className="text-[10px] font-bold">Design</span>
          </button>

          <button
            onClick={() => requestNavigation("analytics")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "analytics"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span className="text-[10px] font-bold">Analyze</span>
          </button>

          <button
            onClick={() => requestNavigation("marketing")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "marketing"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Megaphone className="w-5 h-5 text-pink-500" />
            <span className="text-[10px] font-bold">Marketing</span>
          </button>

          <button
            onClick={() => requestNavigation("automation")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "automation"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] font-bold">Growth</span>
          </button>

          <button
            onClick={() => requestNavigation("settings")}
            className={clsx(
              "flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "settings"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold">Settings</span>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <button
            onClick={() => requestNavigation("logout")}
            className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA]">
        {/* Top Header Bar */}
        <div className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm text-gray-900 tracking-tight">
              My LinkZip:
            </span>
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-gray-500 hover:text-black underline underline-offset-4 decoration-gray-300 transition truncate max-w-xs"
            >
              {profileUrl}
            </a>
          </div>

          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className="text-xs font-bold text-indigo-600 animate-pulse bg-indigo-50 px-3 py-1 rounded-full">
                {saveStatus}
              </span>
            )}

            {state.isDirty && (
              <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                ● Unsaved Changes
              </span>
            )}

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>

            <button
              onClick={() => window.open(`/${username}`, "_blank")}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white rounded-full text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>

        {/* Editor Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#F3F3F1]">
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 space-y-6">
            
            {/* Section Header with Title (Left) and Undo / Redo / Cancel / Save (Right) */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 capitalize tracking-tight">
                {activeTab === "links" && "Links"}
                {activeTab === "profile" && "Profile"}
                {activeTab === "appearance" && "Design"}
                {activeTab === "analytics" && "Analytics & CTR"}
                {activeTab === "marketing" && "Marketing & DM"}
                {activeTab === "automation" && "Growth"}
                {activeTab === "settings" && "Settings"}
              </h2>

              {/* Controls Row (Matching User Screenshot) */}
              <div className="flex items-center gap-3">
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
                        state.undo();
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
                  Cancel
                </button>

                {/* Save Button (Matching Screenshot Purple/Indigo Pill) */}
                <button
                  onClick={handleManualSave}
                  disabled={!state.isDirty}
                  className={clsx(
                    "px-6 py-2 rounded-full font-extrabold text-xs transition cursor-pointer shadow-md flex items-center gap-1.5",
                    state.isDirty
                      ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white ring-2 ring-purple-300 shadow-lg scale-105"
                      : "bg-[#7C3AED]/50 text-white/70 cursor-not-allowed"
                  )}
                >
                  <span>Save</span>
                </button>
              </div>
            </div>

            {/* Tab Editor Views */}
            {activeTab === "links" && <LinksEditor />}
            {activeTab === "profile" && <ProfileEditor />}
            {activeTab === "appearance" && <AppearanceEditor />}
            {activeTab === "analytics" && <AnalyticsEditor />}
            {activeTab === "marketing" && <MarketingEditor />}
            {activeTab === "automation" && <GrowthEditor />}
            {activeTab === "settings" && <SettingsEditor />}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="sm:hidden border-t border-gray-200 bg-white flex justify-around p-3 pb-safe">
          <button
            onClick={() => requestNavigation("links")}
            className={clsx(
              "flex flex-col items-center gap-1",
              activeTab === "links" ? "text-black font-bold" : "text-gray-400"
            )}
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[10px]">Content</span>
          </button>
          <button
            onClick={() => requestNavigation("profile")}
            className={clsx(
              "flex flex-col items-center gap-1",
              activeTab === "profile" ? "text-black font-bold" : "text-gray-400"
            )}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px]">Header</span>
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
            <span className="text-[10px]">Design</span>
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
            <span className="text-[10px]">Growth</span>
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
            <span className="text-[10px]">Settings</span>
          </button>
        </div>
      </div>

      {/* Right Live Phone Preview (Desktop only) */}
      <div className="hidden lg:flex w-[480px] bg-white border-l border-gray-200 flex-col items-center justify-center p-8 shrink-0 relative overflow-hidden">
        <div className="absolute top-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Live Preview
        </div>
        <LinkTreePreview />
      </div>

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
                  저장되지 않은 변경사항이 있습니다
                </h3>
                <p className="text-xs text-gray-500">
                  이동하기 전에 변경사항을 저장하시겠습니까?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleSaveAndContinue}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                저장하고 이동하기 (Save & Continue)
              </button>
              <button
                onClick={handleDiscardAndContinue}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                저장하지 않고 이동하기 (Discard Changes)
              </button>
              <button
                onClick={() => {
                  setIsUnsavedModalOpen(false);
                  setPendingTarget(null);
                }}
                className="w-full py-2.5 text-gray-500 hover:text-black text-xs font-bold transition cursor-pointer"
              >
                취소 (Keep Editing)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
