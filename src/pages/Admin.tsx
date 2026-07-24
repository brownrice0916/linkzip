import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import LinkTreePreview from '../components/LinkTreePreview';
import { useNavigate } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { auth, logout } from '../lib/firebase';
import clsx from 'clsx';

import LinksEditor from '../components/admin/LinksEditor';
import ProfileEditor from '../components/admin/ProfileEditor';
import AppearanceEditor from '../components/admin/AppearanceEditor';
import SettingsEditor from '../components/admin/SettingsEditor';

type TabType = 'links' | 'profile' | 'appearance' | 'settings';
type TargetAction = TabType | 'home' | 'logout' | null;

const Admin = () => {
  const navigate = useNavigate();
  const state = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('links');
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...'>('Saved');
  const [copied, setCopied] = useState(false);

  // Unsaved changes navigation prompt state
  const [pendingTarget, setPendingTarget] = useState<TargetAction>(null);

  const username = state.profile.username || 'preview';
  const profileUrl = `${window.location.origin}/${username}`;

  // Prevent browser refresh/close if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
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
      setSaveStatus('Saving...');
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await setDoc(doc(db, 'users', state.user.uid), {
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
        updatedAt: new Date()
      });
      state.markSaved();
      setSaveStatus('Saved');
    } catch (error) {
      console.error("Save failed", error);
      setSaveStatus('Saved');
    }
  };

  // Safe navigation interceptor
  const requestNavigation = (target: TargetAction) => {
    if (target === activeTab) return;
    if (state.isDirty) {
      setPendingTarget(target);
    } else {
      executeNavigation(target);
    }
  };

  const executeNavigation = (target: TargetAction) => {
    if (target === 'logout') {
      handleLogout();
    } else if (target === 'home') {
      navigate('/');
    } else if (target === 'links' || target === 'profile' || target === 'appearance' || target === 'settings') {
      setActiveTab(target);
    }
  };

  const handleConfirmSaveAndContinue = async () => {
    await handleManualSave();
    const target = pendingTarget;
    setPendingTarget(null);
    executeNavigation(target);
  };

  const handleConfirmDiscardAndContinue = () => {
    state.cancelChanges();
    const target = pendingTarget;
    setPendingTarget(null);
    executeNavigation(target);
  };

  const handleCancelPrompt = () => {
    setPendingTarget(null);
  };

  const sectionTitleMap: Record<TabType, string> = {
    links: 'Content',
    profile: 'Header',
    appearance: 'Design',
    settings: 'Settings'
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* 1. Leftmost Vertical Navigation Bar (Icon Sidebar) */}
      <div className="hidden sm:flex flex-col items-center justify-between w-20 bg-white border-r border-gray-200 py-6 z-20 shrink-0 shadow-sm">
        
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => requestNavigation('home')}>
          <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shadow-md font-black text-base tracking-tighter">
            LZ
          </div>
          <span className="text-[10px] font-black tracking-wider text-gray-900 uppercase">LinkZip</span>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-6 w-full px-2">
          
          <button
            onClick={() => requestNavigation('links')}
            className={clsx(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === 'links' 
                ? "bg-black text-white shadow-md" 
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[10px] font-bold">Content</span>
          </button>

          <button
            onClick={() => requestNavigation('profile')}
            className={clsx(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === 'profile' 
                ? "bg-black text-white shadow-md" 
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">Header</span>
          </button>

          <button
            onClick={() => requestNavigation('appearance')}
            className={clsx(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === 'appearance' 
                ? "bg-black text-white shadow-md" 
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Palette className="w-5 h-5" />
            <span className="text-[10px] font-bold">Design</span>
          </button>

          <button
            onClick={() => requestNavigation('settings')}
            className={clsx(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full cursor-pointer",
              activeTab === 'settings' 
                ? "bg-black text-white shadow-md" 
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold">Settings</span>
          </button>

        </div>

        {/* Logout */}
        <button
          onClick={() => requestNavigation('logout')}
          title="Logout"
          className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>

      </div>

      {/* 2. Main Editor Panel */}
      <div className="flex-1 flex flex-col h-full bg-white relative z-10 overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="h-16 flex items-center justify-between p-4 px-6 border-b border-gray-200 bg-white transition-all">
          {state.isDirty ? (
            /* Dirty State Bar (Matching User Screenshot: SectionTitle Undo Redo Cancel Save) */
            <div className="w-full flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-gray-900 tracking-tight">
                  {sectionTitleMap[activeTab]}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => state.undo()}
                    disabled={state.undoStack.length === 0}
                    className={clsx(
                      "p-2 rounded-xl transition cursor-pointer",
                      state.undoStack.length > 0 ? "text-gray-900 hover:bg-gray-100" : "text-gray-300 cursor-not-allowed"
                    )}
                    title="Undo"
                  >
                    <Undo2 className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => state.redo()}
                    disabled={state.redoStack.length === 0}
                    className={clsx(
                      "p-2 rounded-xl transition cursor-pointer",
                      state.redoStack.length > 0 ? "text-gray-900 hover:bg-gray-100" : "text-gray-300 cursor-not-allowed"
                    )}
                    title="Redo"
                  >
                    <Redo2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => state.cancelChanges()}
                  className="px-5 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-bold text-gray-900 transition shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleManualSave}
                  className="px-6 py-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-bold shadow-md shadow-purple-500/20 transition cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            /* Clean Saved State Bar */
            <>
              <div className="flex items-center gap-3 truncate">
                <span className="text-xs font-semibold text-gray-500">Your LinkZip:</span>
                <a 
                  href={`/${username}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm font-bold text-black hover:underline truncate"
                >
                  {window.location.host}/{username}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-400">{saveStatus}</span>
                
                <button 
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-bold transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>

                <button 
                  onClick={() => window.open(`/${username}`, '_blank')} 
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white rounded-full text-xs font-bold hover:bg-gray-800 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </>
          )}
        </div>

        {/* Editor Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#F3F3F1]">
          <div className="max-w-2xl mx-auto">
            {activeTab === 'links' && <LinksEditor />}
            {activeTab === 'profile' && <ProfileEditor />}
            {activeTab === 'appearance' && <AppearanceEditor />}
            {activeTab === 'settings' && <SettingsEditor />}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="sm:hidden border-t border-gray-200 bg-white flex justify-around p-3 pb-safe">
          <button onClick={() => requestNavigation('links')} className={clsx("flex flex-col items-center gap-1", activeTab === 'links' ? 'text-black font-bold' : 'text-gray-400')}>
            <Link2 className="w-5 h-5" />
            <span className="text-[10px]">Content</span>
          </button>
          <button onClick={() => requestNavigation('profile')} className={clsx("flex flex-col items-center gap-1", activeTab === 'profile' ? 'text-black font-bold' : 'text-gray-400')}>
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px]">Header</span>
          </button>
          <button onClick={() => requestNavigation('appearance')} className={clsx("flex flex-col items-center gap-1", activeTab === 'appearance' ? 'text-black font-bold' : 'text-gray-400')}>
            <Palette className="w-5 h-5" />
            <span className="text-[10px]">Design</span>
          </button>
          <button onClick={() => requestNavigation('settings')} className={clsx("flex flex-col items-center gap-1", activeTab === 'settings' ? 'text-black font-bold' : 'text-gray-400')}>
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">Settings</span>
          </button>
          <button onClick={() => requestNavigation('logout')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-red-500">
            <LogOut className="w-5 h-5" />
            <span className="text-[10px]">Logout</span>
          </button>
        </div>

      </div>

      {/* 3. Right Live Phone Preview (Desktop only) */}
      <div className="hidden lg:flex w-[480px] bg-[#EFEFEF] border-l border-gray-200 items-center justify-center p-6 shrink-0 relative overflow-hidden">
        <div className="scale-[0.9] origin-center">
          <LinkTreePreview 
            profile={state.profile}
            templateType={state.templateType}
            templateValue={state.templateValue}
            socialLinks={state.socialLinks}
            customLinks={state.customLinks}
          />
        </div>
      </div>

      {/* Unsaved Changes Prompt Modal */}
      {pendingTarget !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 font-sans">
            <div className="flex items-center gap-3 mb-4 text-amber-500">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">저장되지 않은 변경사항</h3>
                <p className="text-xs text-gray-500 font-medium">Unsaved Changes</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 font-medium mb-6 leading-relaxed">
              페이지를 이동하기 전에 변경한 내용을 저장하시겠습니까? 저장하지 않으면 작성한 내용이 손실될 수 있습니다.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmSaveAndContinue}
                className="w-full py-3 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-bold shadow-md shadow-purple-500/20 transition cursor-pointer"
              >
                저장하고 이동 (Save & Continue)
              </button>

              <button
                onClick={handleConfirmDiscardAndContinue}
                className="w-full py-3 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-bold text-gray-800 transition cursor-pointer"
              >
                저장하지 않고 이동 (Discard Changes)
              </button>

              <button
                onClick={handleCancelPrompt}
                className="w-full py-2.5 text-xs font-bold text-gray-400 hover:text-gray-700 transition cursor-pointer"
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
