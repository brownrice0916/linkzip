import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import LinkTreePreview from '../components/LinkTreePreview';
import { useNavigate } from 'react-router-dom';
import { Link2, Palette, User as UserIcon, LogOut, Share2, Check, Copy } from 'lucide-react';
import { auth, logout } from '../lib/firebase';
import clsx from 'clsx';

import LinksEditor from '../components/admin/LinksEditor';
import ProfileEditor from '../components/admin/ProfileEditor';
import AppearanceEditor from '../components/admin/AppearanceEditor';

const Admin = () => {
  const navigate = useNavigate();
  const state = useStore();
  const [activeTab, setActiveTab] = useState<'links' | 'profile' | 'appearance'>('links');
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...'>('Saved');
  const [copied, setCopied] = useState(false);

  const username = state.profile.username || 'preview';
  const profileUrl = `${window.location.origin}/${username}`;

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

  // Auto-save logic
  useEffect(() => {
    if (!state.user?.uid) return;
    
    setSaveStatus('Saving...');
    const timeout = setTimeout(async () => {
      try {
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
        setSaveStatus('Saved');
      } catch (error) {
        console.error("Auto-save failed", error);
        setSaveStatus('Saved');
      }
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [
    state.profile, 
    state.templateType, 
    state.templateValue, 
    state.buttonStyle, 
    state.buttonRoundness, 
    state.buttonColor, 
    state.buttonTextColor, 
    state.fontFamily, 
    state.pageTextColor, 
    state.sticker, 
    state.socialLinks, 
    state.customLinks, 
    state.user
  ]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* 1. Leftmost Vertical Navigation Bar (Icon Sidebar) */}
      <div className="hidden sm:flex flex-col items-center justify-between w-20 bg-white border-r border-gray-200 py-6 z-20 shrink-0 shadow-sm">
        
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shadow-md font-black text-base tracking-tighter">
            LZ
          </div>
          <span className="text-[10px] font-black tracking-wider text-gray-900 uppercase">LinkZip</span>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-6 w-full px-2">
          
          <button
            onClick={() => setActiveTab('links')}
            className={clsx(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full",
              activeTab === 'links' 
                ? "bg-black text-white shadow-md" 
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Link2 className="w-5 h-5" />
            <span className="text-[10px] font-bold">Content</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={clsx(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full",
              activeTab === 'profile' 
                ? "bg-black text-white shadow-md" 
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold">Header</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={clsx(
              "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full",
              activeTab === 'appearance' 
                ? "bg-black text-white shadow-md" 
                : "text-gray-500 hover:bg-gray-100 hover:text-black"
            )}
          >
            <Palette className="w-5 h-5" />
            <span className="text-[10px] font-bold">Design</span>
          </button>

        </div>

        {/* Bottom Actions */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>

      </div>

      {/* 2. Main Editor Panel */}
      <div className="flex-1 flex flex-col h-full bg-white relative z-10 overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-gray-200 bg-white">
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-bold transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            <button 
              onClick={() => window.open(`/${username}`, '_blank')} 
              className="flex items-center gap-1.5 px-4 py-1.5 bg-black text-white rounded-full text-xs font-bold hover:bg-gray-800 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>

        {/* Editor Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#F3F3F1]">
          <div className="max-w-2xl mx-auto">
            {activeTab === 'links' && <LinksEditor />}
            {activeTab === 'profile' && <ProfileEditor />}
            {activeTab === 'appearance' && <AppearanceEditor />}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="sm:hidden border-t border-gray-200 bg-white flex justify-around p-3 pb-safe">
          <button onClick={() => setActiveTab('links')} className={clsx("flex flex-col items-center gap-1", activeTab === 'links' ? 'text-black font-bold' : 'text-gray-400')}>
            <Link2 className="w-5 h-5" />
            <span className="text-[10px]">Content</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={clsx("flex flex-col items-center gap-1", activeTab === 'profile' ? 'text-black font-bold' : 'text-gray-400')}>
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px]">Header</span>
          </button>
          <button onClick={() => setActiveTab('appearance')} className={clsx("flex flex-col items-center gap-1", activeTab === 'appearance' ? 'text-black font-bold' : 'text-gray-400')}>
            <Palette className="w-5 h-5" />
            <span className="text-[10px]">Design</span>
          </button>
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-gray-400 hover:text-red-500">
            <LogOut className="w-5 h-5" />
            <span className="text-[10px]">Logout</span>
          </button>
        </div>

      </div>

      {/* 3. Live Phone Preview Area */}
      <div className="hidden lg:flex w-[42%] xl:w-[38%] bg-[#F3F3F1] items-center justify-center p-8 relative border-l border-gray-200">
        
        {/* Mobile Phone Frame Mockup */}
        <div className="relative w-[340px] h-[720px] bg-white rounded-[3rem] shadow-2xl border-[12px] border-black overflow-hidden z-10 scale-95 origin-center">
          <div className="absolute top-0 inset-x-0 h-6 bg-black rounded-b-3xl w-40 mx-auto z-50" />
          <div className="h-full w-full overflow-y-auto hide-scrollbar bg-white">
            <LinkTreePreview 
              profile={state.profile}
              templateType={state.templateType}
              templateValue={state.templateValue}
              socialLinks={state.socialLinks}
              customLinks={state.customLinks}
            />
          </div>
        </div>

      </div>

    </div>
  );
};

export default Admin;
