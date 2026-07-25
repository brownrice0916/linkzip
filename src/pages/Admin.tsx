import React, { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import LinkTreePreview from "../components/LinkTreePreview";
import { useNavigate } from "react-router-dom";
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
  Zap
} from "lucide-react";
import { auth, logout } from "../lib/firebase";
import clsx from "clsx";

import LinksEditor from "../components/admin/LinksEditor";
import ProfileEditor from "../components/admin/ProfileEditor";
import AppearanceEditor from "../components/admin/AppearanceEditor";
import SettingsEditor from "../components/admin/SettingsEditor";
import AutomationEditor from "../components/admin/AutomationEditor";

type TabType = "links" | "profile" | "appearance" | "automation" | "settings";
type TargetAction = TabType | "home" | "logout" | null;

const Admin = () => {
  const state = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("links");
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSave = async () => {
    if (!state.user?.uid) return;
    try {
      setSaveStatus("Saving...");
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
        updatedAt: new Date().toISOString(),
      });

      state.markSaved();
      setSaveStatus("Saved!");
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
      target === "automation" ||
      target === "settings"
    ) {
      setActiveTab(target);
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

        {/* Action Controls: Save / Undo / Redo */}
        <div className="flex flex-col items-center gap-3 w-full px-2 py-3 bg-gray-50 border-y border-gray-100 my-1">
          {/* Save Button */}
          <button
            onClick={handleManualSave}
            disabled={!state.isDirty}
            className={clsx(
              "w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer font-bold text-[10px]",
              state.isDirty
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md ring-2 ring-indigo-300"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
            title="Save changes"
          >
            <span className="text-xs">💾</span>
            <span>Save</span>
          </button>

          {/* Undo / Redo Row */}
          <div className="flex items-center gap-1">
            <button
              onClick={state.undo}
              disabled={state.undoStack.length === 0}
              className={clsx(
                "p-1.5 rounded-xl transition cursor-pointer",
                state.undoStack.length > 0
                  ? "hover:bg-gray-200 text-gray-700"
                  : "text-gray-300 cursor-not-allowed"
              )}
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={state.redo}
              disabled={state.redoStack.length === 0}
              className={clsx(
                "p-1.5 rounded-xl transition cursor-pointer",
                state.redoStack.length > 0
                  ? "hover:bg-gray-200 text-gray-700"
                  : "text-gray-300 cursor-not-allowed"
              )}
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex flex-col gap-4 w-full px-3">
          <button
            onClick={() => requestNavigation("links")}
            className={clsx(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full cursor-pointer",
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
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full cursor-pointer",
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
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === "appearance"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Palette className="w-5 h-5" />
            <span className="text-[10px] font-bold">Design</span>
          </button>

          <button
            onClick={() => requestNavigation("automation")}
            className={clsx(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full cursor-pointer",
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
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full cursor-pointer",
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
          <div className="max-w-2xl mx-auto">
            {activeTab === "links" && <LinksEditor />}
            {activeTab === "profile" && <ProfileEditor />}
            {activeTab === "appearance" && <AppearanceEditor />}
            {activeTab === "automation" && <AutomationEditor />}
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
