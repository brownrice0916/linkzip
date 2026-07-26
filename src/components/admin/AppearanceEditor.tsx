import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  ArrowLeft, 
  Shuffle, 
  Check, 
  Sparkles, 
  ChevronRight, 
  ChevronDown,
  X,
  Square, 
  Smile, 
  Palette, 
  Type, 
  Layers 
} from 'lucide-react';
import clsx from 'clsx';

const themes = [
  { id: 'minimalist', name: 'Minimalist', classes: 'bg-[#FAF9F6] border-gray-200 text-gray-900' },
  { id: 'neon-dark', name: 'Neon Dark', classes: 'bg-gray-900 border-indigo-500 text-white' },
  { id: 'soft-gradient', name: 'Soft Gradient', classes: 'bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400 border-transparent text-white' },
  { id: 'air', name: 'Air', classes: 'bg-gray-100 border-gray-300 text-gray-900' },
  { id: 'neo-pop', name: 'Neo Pop ⚡', classes: 'bg-gradient-to-tr from-yellow-300 via-pink-400 to-indigo-500 border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' },
  { id: 'neo-sunshine', name: 'Neo Sunshine ⚡', classes: 'bg-yellow-300 border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' },
  { id: 'neo-cyber', name: 'Neo Cyber ⚡', classes: 'bg-cyan-300 border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' },
  { id: 'neo-mint', name: 'Neo Mint ⚡', classes: 'bg-emerald-300 border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' },
  { id: 'bloom', name: 'Bloom', classes: 'bg-gradient-to-br from-pink-500 to-rose-600 text-white' },
  { id: 'sunbloom', name: 'Sunbloom', classes: 'bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400 border-amber-300 text-amber-950' },
  { id: 'blocks', name: 'Blocks', classes: 'bg-purple-600 border-purple-800 text-white' },
  { id: 'groove', name: 'Groove', classes: 'bg-gradient-to-r from-amber-500 via-red-500 to-purple-600 text-white' },
  { id: 'lake', name: 'Lake', classes: 'bg-slate-800 border-slate-700 text-white' },
  { id: 'nourish', name: 'Nourish', classes: 'bg-emerald-700 border-emerald-900 text-white' },
];

const fonts = [
  // Korean Fonts (한글 폰트)
  { id: 'Pretendard', name: '프리텐다드 (Pretendard)', font: 'Pretendard', badge: 'bolt', category: 'korean' },
  { id: 'Gowun Batang', name: '고운 바탕 (Gowun Batang)', font: 'Gowun Batang', badge: 'bolt', category: 'korean' },
  { id: 'Gowun Dodum', name: '고운 도돋 (Gowun Dodum)', font: 'Gowun Dodum', badge: 'bolt', category: 'korean' },
  { id: 'Black Han Sans', name: '블랙한상스 (Black Han)', font: 'Black Han Sans', badge: 'bolt', category: 'korean' },
  { id: 'Do Hyeon', name: '도현 (Do Hyeon)', font: 'Do Hyeon', badge: 'bolt', category: 'korean' },
  { id: 'Jua', name: '주아 (Jua)', font: 'Jua', badge: 'bolt', category: 'korean' },
  { id: 'Gamja Flower', name: '감자꽃 (Gamja Flower)', font: 'Gamja Flower', badge: 'bolt', category: 'korean' },
  { id: 'Nanum Gothic', name: '나눔고딕 (Nanum Gothic)', font: 'Nanum Gothic', category: 'korean' },
  { id: 'Nanum Myeongjo', name: '나눔명조 (Nanum Myeongjo)', font: 'Nanum Myeongjo', category: 'korean' },
  { id: 'Nanum Pen Script', name: '나눔펜 (Nanum Pen)', font: 'Nanum Pen Script', badge: 'bolt', category: 'korean' },
  { id: 'Sunflower', name: '해바라기 (Sunflower)', font: 'Sunflower', category: 'korean' },
  { id: 'Dongle', name: '동글 (Dongle)', font: 'Dongle', badge: 'bolt', category: 'korean' },
  { id: 'Song Myung', name: '송명 (Song Myung)', font: 'Song Myung', category: 'korean' },

  // English & Global Fonts
  { id: 'Albert Sans', name: 'Albert Sans', font: 'Albert Sans', category: 'global' },
  { id: 'Belanosima', name: 'Belanosima', font: 'Belanosima', badge: 'bolt', category: 'global' },
  { id: 'Bricolage Grotesque', name: 'Bricolage Grotesque', font: 'Bricolage Grotesque', badge: 'bolt', category: 'global' },
  { id: 'DM Sans', name: 'DM Sans', font: 'DM Sans', category: 'global' },
  { id: 'Epilogue', name: 'Epilogue', font: 'Epilogue', category: 'global' },
  { id: 'IBM Plex Sans', name: 'IBM Plex Sans', font: 'IBM Plex Sans', category: 'global' },
  { id: 'Inter', name: 'Inter', font: 'Inter', category: 'global' },
  { id: 'Lato', name: 'Lato', font: 'Lato', badge: 'bolt', category: 'global' },
  { id: 'Manrope', name: 'Manrope', font: 'Manrope', category: 'global' },
  { id: 'Oxanium', name: 'Oxanium', font: 'Oxanium', category: 'global' },
  { id: 'Poppins', name: 'Poppins', font: 'Poppins', badge: 'pro', category: 'global' },
  { id: 'Red Hat Display', name: 'Red Hat Display', font: 'Red Hat Display', category: 'global' },
  { id: 'Roboto', name: 'Roboto', font: 'Roboto', badge: 'bolt', category: 'global' },
  { id: 'Rubik', name: 'Rubik', font: 'Rubik', badge: 'bolt', category: 'global' },
  { id: 'Space Grotesk', name: 'Space Grotesk', font: 'Space Grotesk', badge: 'bolt', category: 'global' },
  { id: 'Syne', name: 'Syne', font: 'Syne', badge: 'bolt', category: 'global' },
  { id: 'BioRhyme', name: 'BioRhyme', font: 'BioRhyme', badge: 'bolt', category: 'global' },
  { id: 'Bitter', name: 'Bitter', font: 'Bitter', badge: 'bolt', category: 'global' },
  { id: 'Caudex', name: 'Caudex', font: 'Caudex', category: 'global' },
  { id: 'Corben', name: 'Corben', font: 'Corben', category: 'global' },
  { id: 'Domine', name: 'Domine', font: 'Domine', category: 'global' },
  { id: 'Hahmlet', name: 'Hahmlet', font: 'Hahmlet', category: 'global' },
  { id: 'IBM Plex Serif', name: 'IBM Plex Serif', font: 'IBM Plex Serif', badge: 'bolt', category: 'global' },
  { id: 'Lora', name: 'Lora', font: 'Lora', badge: 'bolt', category: 'global' },
  { id: 'Space Mono', name: 'Space Mono', font: 'Space Mono', category: 'global' },
  { id: 'Outfit', name: 'Outfit', font: 'Outfit', category: 'global' },
];

const stickers = [
  { id: '', label: 'None', emoji: '🚫' },
  { id: 'cat', label: 'Kitty', emoji: '🐱' },
  { id: 'flower', label: 'Blossom', emoji: '🌸' },
  { id: 'bolt', label: 'Lightning', emoji: '⚡' },
  { id: 'heart', label: 'Sparkle Heart', emoji: '💖' },
  { id: 'sparkles', label: 'Magic', emoji: '✨' },
  { id: 'crown', label: 'Crown', emoji: '👑' },
  { id: 'fire', label: 'Fire', emoji: '🔥' },
  { id: 'rocket', label: 'Rocket', emoji: '🚀' },
  { id: 'avocado', label: 'Avocado', emoji: '🥑' },
];

const presetColors = [
  '#111827', '#FFFFFF', '#F8FAFC', '#CBD5E1',
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#EC4899',
];

const AppearanceEditor = () => {
  const { 
    profile,
    setProfile,
    templateType, 
    templateValue, 
    setTemplate, 
    buttonStyle, 
    buttonRoundness, 
    buttonColor, 
    buttonTextColor,
    buttonOpacity,
    fontFamily,
    titleFontFamily,
    pageTextColor,
    sticker,
    setDesignSettings 
  } = useStore();

  const [currentView, setCurrentView] = useState<'main' | 'theme' | 'buttons' | 'colors' | 'stickers'>('main');
  const [activeFontModal, setActiveFontModal] = useState<'page' | 'title' | null>(null);
  const [isButtonColorPanelOpen, setIsButtonColorPanelOpen] = useState(false);
  const [buttonHexDraft, setButtonHexDraft] = useState((buttonColor || '#FFFFFF').replace('#', ''));

  useEffect(() => {
    setButtonHexDraft((buttonColor || '#FFFFFF').replace('#', '').toUpperCase());
  }, [buttonColor]);

  const handleShuffleTheme = () => {
    const randomIndex = Math.floor(Math.random() * themes.length);
    const randomTheme = themes[randomIndex];
    setTemplate('preset', randomTheme.id);
  };

  // Render Sub-Views
  if (currentView === 'theme') {
    return (
      <div className="space-y-6 animate-fade-in pb-20 font-sans">
        {/* Sub-Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setCurrentView('main')}
            className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-5 h-5" /> Theme
          </button>
          
          <button 
            onClick={handleShuffleTheme}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-xs font-bold bg-white hover:bg-gray-50 shadow-xs transition"
          >
            <Shuffle className="w-4 h-4 text-gray-600" /> Shuffle
          </button>
        </div>

        {/* Theme Grid */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {themes.map((t) => {
              const isSelected = templateType === 'preset' && templateValue === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTemplate('preset', t.id)}
                  className={clsx(
                    "flex flex-col items-center p-2 rounded-2xl border-2 transition-all text-center relative overflow-hidden group",
                    isSelected ? "border-black bg-gray-50 ring-2 ring-black" : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className={clsx("w-full h-24 rounded-xl border flex flex-col items-center justify-center p-2 mb-2 shadow-xs", t.classes)}>
                    <span className="font-bold text-xs">Aa</span>
                    <div className="w-12 h-2.5 rounded-full bg-current opacity-20 mt-2" />
                  </div>
                  <span className="text-xs font-bold text-gray-900">{t.name}</span>
                  {isSelected && (
                    <div className="absolute top-3 right-3 bg-black text-white p-1 rounded-full shadow-md">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'buttons') {
    return (
      <div className="space-y-6 animate-fade-in pb-20 font-sans">
        <button 
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-3 text-xl font-bold text-gray-900 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-6 h-6" /> Buttons
        </button>

        <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100 space-y-8">
          
          {/* Button Style */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-900">Button style</h3>
            <div className="grid grid-cols-3 gap-3">
              
              {/* Solid */}
              <button
                onClick={() => setDesignSettings({ buttonStyle: 'solid' })}
                className={clsx(
                  "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2 bg-white",
                  buttonStyle === 'solid' ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="w-full h-16 bg-gray-300 rounded-xl flex items-center justify-center relative">
                  <div className="w-14 h-6 bg-white rounded-full shadow-xs" />
                </div>
                <span className="text-xs font-bold text-gray-900 mt-1">Solid</span>
              </button>

              {/* Glass */}
              <button
                onClick={() => setDesignSettings({ buttonStyle: 'glass' })}
                className={clsx(
                  "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2 bg-white",
                  buttonStyle === 'glass' ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="w-full h-16 bg-gray-300 rounded-xl flex items-center justify-center relative">
                  <div className="w-14 h-6 bg-white/40 border border-white/60 rounded-full" />
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs">
                    ⚡
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-900 mt-1">Glass</span>
              </button>

              {/* Outline */}
              <button
                onClick={() => setDesignSettings({ buttonStyle: 'outline' })}
                className={clsx(
                  "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2 bg-white",
                  buttonStyle === 'outline' ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="w-full h-16 bg-gray-300 rounded-xl flex items-center justify-center">
                  <div className="w-14 h-6 border-2 border-white rounded-full" />
                </div>
                <span className="text-xs font-bold text-gray-900 mt-1">Outline</span>
              </button>
            </div>
          </div>

          {/* Corner Roundness */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Corner roundness</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'none', svgPath: "M5 19V5h14" },
                { id: 'sm', svgPath: "M5 19V9a4 4 0 0 1 4-4h10" },
                { id: 'md', svgPath: "M5 19V12a7 7 0 0 1 7-7h7" },
                { id: 'full', svgPath: "M5 19C5 11 11 5 19 5" },
              ].map((r) => {
                const isSelected = buttonRoundness === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setDesignSettings({ buttonRoundness: r.id as any })}
                    className={clsx(
                      "flex items-center justify-center p-3 h-14 rounded-2xl border-2 transition-all bg-white",
                      isSelected ? "border-blue-600 text-blue-600 ring-1 ring-blue-600" : "border-gray-200 text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                      <path d={r.svgPath} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Button Shadow */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Button shadow</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'none', label: 'None' },
                { id: 'soft', label: 'Soft' },
                { id: 'strong', label: 'Strong' },
                { id: 'hard', label: 'Hard' },
              ].map((s) => {
                const isSelected = (useStore.getState().buttonShadow || 'soft') === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setDesignSettings({ buttonShadow: s.id as any })}
                    className={clsx(
                      "py-3 rounded-2xl border-2 transition-all text-xs font-bold bg-white text-center",
                      isSelected ? "border-black text-black ring-1 ring-black" : "border-gray-200 text-gray-700 hover:border-gray-300"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Button Color & Opacity */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-gray-900 block">Button color</span>
                <span className="text-[11px] text-gray-400">색상과 투명도를 함께 조절합니다</span>
              </div>
              <button
                type="button"
                onClick={() => setIsButtonColorPanelOpen((open) => !open)}
                className="flex items-center gap-2.5 px-3 py-2 border border-gray-200 rounded-2xl bg-white shadow-xs hover:border-purple-300 transition cursor-pointer"
              >
                <span
                  className="w-7 h-7 rounded-lg border border-black/10 shadow-inner"
                  style={{ backgroundColor: buttonColor || '#FFFFFF', opacity: (buttonOpacity ?? 100) / 100 }}
                />
                <span className="text-xs font-mono font-bold text-gray-800 uppercase">{buttonColor || '#FFFFFF'}</span>
                <Palette className="w-4 h-4 text-purple-600" />
              </button>
            </div>

            {isButtonColorPanelOpen && (
              <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/50 p-5 space-y-5 shadow-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-900"><Sparkles className="w-4 h-4 text-purple-600" /> 추천 컬러</div>
                  <button type="button" onClick={() => setIsButtonColorPanelOpen(false)} className="p-1.5 rounded-full hover:bg-white text-gray-400 cursor-pointer" title="닫기"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-8 gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setDesignSettings({ buttonColor: color })}
                      className={clsx(
                        "aspect-square rounded-xl border-2 transition hover:scale-110 cursor-pointer relative",
                        (buttonColor || '#FFFFFF').toUpperCase() === color ? "border-purple-600 ring-2 ring-purple-200" : "border-white shadow-sm"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    >
                      {(buttonColor || '#FFFFFF').toUpperCase() === color && <Check className={clsx("w-3.5 h-3.5 absolute inset-0 m-auto", ['#FFFFFF', '#F8FAFC', '#CBD5E1'].includes(color) ? 'text-black' : 'text-white')} />}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-[52px_1fr] gap-3 items-center">
                  <label className="w-13 h-11 rounded-xl border border-gray-200 bg-white overflow-hidden cursor-pointer p-1">
                    <input type="color" value={buttonColor || '#FFFFFF'} onChange={(e) => setDesignSettings({ buttonColor: e.target.value.toUpperCase() })} className="w-full h-full border-0 p-0 cursor-pointer bg-transparent" title="직접 색상 선택" />
                  </label>
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                    <span className="text-gray-400 font-black">#</span>
                    <input
                      type="text"
                      value={buttonHexDraft}
                      maxLength={6}
                      onChange={(e) => {
                        const hex = e.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6);
                        setButtonHexDraft(hex.toUpperCase());
                        if (hex.length === 6) setDesignSettings({ buttonColor: `#${hex.toUpperCase()}` });
                      }}
                      className="flex-1 text-xs font-mono font-black text-gray-800 uppercase focus:outline-none"
                      aria-label="버튼 색상 HEX"
                    />
                  </div>
                </div>

                <label className="block space-y-2 text-xs font-bold text-gray-600">
                  <span className="flex justify-between"><span>투명도</span><span className="text-purple-700 font-black">{buttonOpacity ?? 100}%</span></span>
                  <input type="range" min="10" max="100" value={buttonOpacity ?? 100} onChange={(e) => setDesignSettings({ buttonOpacity: Number(e.target.value) })} className="w-full accent-purple-600" />
                  <div className="h-10 rounded-xl border border-black/10 flex items-center justify-center text-xs font-black" style={{ backgroundColor: buttonColor || '#FFFFFF', opacity: (buttonOpacity ?? 100) / 100, color: buttonTextColor || '#111827' }}>버튼 미리보기</div>
                </label>
              </div>
            )}
          </div>

          {/* Button Text Color */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">Button text color</span>
            <div className="flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-2xl bg-white shadow-xs">
              <label className="w-6 h-6 rounded-lg cursor-pointer border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center" style={{ backgroundColor: buttonTextColor || '#000000' }}>
                <input
                  type="color"
                  value={buttonTextColor || '#000000'}
                  onChange={(e) => setDesignSettings({ buttonTextColor: e.target.value })}
                  className="opacity-0 w-full h-full cursor-pointer"
                />
              </label>
              <input
                type="text"
                value={buttonTextColor || '#000000'}
                onChange={(e) => setDesignSettings({ buttonTextColor: e.target.value })}
                className="w-20 text-xs font-mono font-bold text-gray-800 uppercase focus:outline-none"
              />
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (currentView === 'colors') {
    return (
      <div className="space-y-6 animate-fade-in pb-20 font-sans">
        <button 
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-5 h-5" /> Colors & Text
        </button>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          {/* Page font Modal Trigger */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold text-gray-900">Page font</span>
            <button
              onClick={() => setActiveFontModal('page')}
              className="px-5 py-2.5 rounded-2xl bg-[#F7F7F5] border border-gray-200 text-sm font-bold text-gray-900 hover:bg-gray-200 hover:border-gray-300 transition-all shadow-xs cursor-pointer flex items-center gap-2"
            >
              <span style={{ fontFamily: `'${fontFamily}', sans-serif` }}>
                {fontFamily || 'Inter'}
              </span>
            </button>
          </div>

          {/* Title font Modal Trigger */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-sm font-bold text-gray-900 block">Alternative title font</span>
              <span className="text-xs text-gray-400">Matches page font by default</span>
            </div>
            <button
              onClick={() => setActiveFontModal('title')}
              className="px-5 py-2.5 rounded-2xl bg-[#F7F7F5] border border-gray-200 text-sm font-bold text-gray-900 hover:bg-gray-200 hover:border-gray-300 transition-all shadow-xs cursor-pointer flex items-center gap-2"
            >
              <span style={{ fontFamily: titleFontFamily ? `'${titleFontFamily}', sans-serif` : `'${fontFamily}', sans-serif` }}>
                {titleFontFamily || 'Auto'}
              </span>
            </button>
          </div>

          {/* Modal Overlay */}
          {activeFontModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 shrink-0 relative">
                  <h3 className="text-base font-bold text-gray-900 mx-auto">
                    {activeFontModal === 'page' ? 'Page font' : 'Title font'}
                  </h3>
                  <button
                    onClick={() => setActiveFontModal(null)}
                    className="absolute right-0 top-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Font Grid */}
                <div className="overflow-y-auto flex-1 pr-1 space-y-4">
                  {/* Title font Auto Option */}
                  {activeFontModal === 'title' && (
                    <button
                      onClick={() => {
                        setDesignSettings({ titleFontFamily: '' });
                        setActiveFontModal(null);
                      }}
                      className={clsx(
                        "w-full h-14 rounded-2xl flex items-center justify-center text-sm font-bold transition-all mb-3 cursor-pointer",
                        !titleFontFamily ? "border-2 border-black bg-[#F5F5F0]" : "bg-[#F7F7F5] hover:bg-gray-200 border border-transparent"
                      )}
                    >
                      Auto (Page font와 동일하게 적용)
                    </button>
                  )}

                  {/* Korean Fonts Section */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-2 px-1">
                      🇰🇷 한글 추천 폰트
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {fonts.filter(f => f.category === 'korean').map((f) => {
                        const isSelected = activeFontModal === 'page' 
                          ? (fontFamily === f.font || fontFamily === f.id)
                          : (titleFontFamily === f.font);
                        return (
                          <button
                            key={f.id}
                            onClick={() => {
                              if (activeFontModal === 'page') {
                                setDesignSettings({ fontFamily: f.font });
                              } else {
                                setDesignSettings({ titleFontFamily: f.font });
                              }
                              setActiveFontModal(null);
                            }}
                            className={clsx(
                              "h-14 px-3 rounded-2xl flex items-center justify-center text-sm transition-all relative overflow-hidden cursor-pointer",
                              isSelected 
                                ? "border-2 border-black bg-[#F5F5F0] shadow-xs font-bold text-gray-900" 
                                : "bg-[#F7F7F5] hover:bg-gray-200 text-gray-800 font-medium border border-transparent"
                            )}
                          >
                            <span className="truncate pr-1 mx-auto text-center" style={{ fontFamily: `'${f.font}', sans-serif` }}>
                              {f.name.split(' (')[0]}
                            </span>
                            {f.badge && (
                              <span className="w-5 h-5 rounded-full bg-stone-400/50 text-white flex items-center justify-center text-[10px] shrink-0 absolute right-2">
                                ⚡
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Global Fonts Section */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 mb-2 px-1">
                      🌐 글로벌 폰트
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {fonts.filter(f => f.category !== 'korean').map((f) => {
                        const isSelected = activeFontModal === 'page' 
                          ? (fontFamily === f.font || fontFamily === f.id)
                          : (titleFontFamily === f.font);
                        return (
                          <button
                            key={f.id}
                            onClick={() => {
                              if (activeFontModal === 'page') {
                                setDesignSettings({ fontFamily: f.font });
                              } else {
                                setDesignSettings({ titleFontFamily: f.font });
                              }
                              setActiveFontModal(null);
                            }}
                            className={clsx(
                              "h-14 px-3 rounded-2xl flex items-center justify-center text-sm transition-all relative overflow-hidden cursor-pointer",
                              isSelected 
                                ? "border-2 border-black bg-[#F5F5F0] shadow-xs font-bold text-gray-900" 
                                : "bg-[#F7F7F5] hover:bg-gray-200 text-gray-800 font-medium border border-transparent"
                            )}
                          >
                            <span className="truncate pr-1 mx-auto text-center" style={{ fontFamily: `'${f.font}', sans-serif` }}>
                              {f.name}
                            </span>
                            {f.badge && (
                              <span className="w-5 h-5 rounded-full bg-stone-400/50 text-white flex items-center justify-center text-[10px] shrink-0 absolute right-2">
                                ⚡
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          <hr className="border-gray-100" />

          {/* Page Text Color */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">Page text color</span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={pageTextColor || '#000000'}
                onChange={(e) => setDesignSettings({ pageTextColor: e.target.value })}
                className="w-8 h-8 rounded-xl cursor-pointer border border-gray-200"
              />
              <span className="text-xs font-mono font-bold uppercase">{pageTextColor || '#000000'}</span>
            </div>
          </div>

          {/* Background Color */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">Wallpaper background color</span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={templateType === 'color' ? templateValue : '#FAF9F6'}
                onChange={(e) => setTemplate('color', e.target.value)}
                className="w-8 h-8 rounded-xl cursor-pointer border border-gray-200"
              />
              <span className="text-xs font-mono font-bold uppercase">{templateValue}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'stickers') {
    return (
      <div className="space-y-6 animate-fade-in pb-20 font-sans">
        <button 
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-5 h-5" /> Stickers
        </button>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Decorate your page</h3>
            <p className="text-xs text-gray-400">Choose a sticker badge for your profile avatar.</p>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
            {stickers.map((s) => {
              const isSelected = sticker === s.emoji || (s.emoji === '🚫' && !sticker);
              return (
                <button
                  key={s.id}
                  onClick={() => setDesignSettings({ sticker: s.emoji === '🚫' ? '' : s.emoji })}
                  className={clsx(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1 aspect-square",
                    isSelected ? "border-black bg-gray-50 ring-2 ring-black scale-105" : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <span className="text-[10px] font-bold text-gray-600">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Main Design Menu Overview (Screenshot 1)
  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Design</h2>
        <p className="text-sm text-gray-500">Customize themes, buttons, fonts, and decorations.</p>
      </div>

      {/* Top Theme Banner Card */}
      <div 
        onClick={() => setCurrentView('theme')}
        className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-gray-400 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-200 via-pink-200 to-indigo-200 flex items-center justify-center border border-gray-200 font-bold text-sm shadow-xs">
            Aa
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Theme</h3>
            <p className="text-xs text-gray-400 capitalize">{templateType === 'preset' ? templateValue : 'Custom Color'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 group-hover:text-black">
          Custom <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Customize Section List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Customize</h3>

        <div className="space-y-3">
          
          {/* Wallpaper / Colors Row */}
          <div 
            onClick={() => setCurrentView('colors')}
            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-gray-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                <Palette className="w-5 h-5 text-amber-700" />
              </div>
              <span className="font-bold text-sm text-gray-900">Colors & Font</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 group-hover:text-black">
              {fontFamily.toUpperCase()} <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Buttons Row */}
          <div 
            onClick={() => setCurrentView('buttons')}
            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-gray-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                <Square className="w-5 h-5 text-indigo-700" />
              </div>
              <span className="font-bold text-sm text-gray-900">Buttons</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 group-hover:text-black capitalize">
              {buttonStyle} <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Stickers Row */}
          <div 
            onClick={() => setCurrentView('stickers')}
            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-gray-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-pink-100 border border-pink-200 flex items-center justify-center">
                <Smile className="w-5 h-5 text-pink-600" />
              </div>
              <span className="font-bold text-sm text-gray-900">Stickers</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 group-hover:text-black">
              {sticker ? sticker : 'Decorate page'} <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Branding Watermark Removal Toggle Card */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <span className="font-bold text-sm text-gray-900 block">Hide LinkZip Branding</span>
                <span className="text-xs text-gray-400">Remove "Powered by LinkZip" watermark on your page</span>
              </div>
            </div>
            <button
              onClick={() => setProfile({ ...profile, hideWatermark: !profile?.hideWatermark })}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative p-1 cursor-pointer",
                profile.hideWatermark ? "bg-purple-600" : "bg-gray-300"
              )}
            >
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform shadow-xs",
                  profile.hideWatermark ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

export default AppearanceEditor;
