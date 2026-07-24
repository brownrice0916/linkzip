import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  ArrowLeft, 
  Shuffle, 
  Check, 
  Sparkles, 
  ChevronRight, 
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
  { id: 'blocks', name: 'Blocks', classes: 'bg-purple-600 border-purple-800 text-white' },
  { id: 'bloom', name: 'Bloom', classes: 'bg-gradient-to-br from-pink-500 to-rose-600 text-white' },
  { id: 'grid', name: 'Grid', classes: 'bg-lime-200 border-black text-black' },
  { id: 'groove', name: 'Groove', classes: 'bg-gradient-to-r from-amber-500 via-red-500 to-purple-600 text-white' },
  { id: 'lake', name: 'Lake', classes: 'bg-slate-800 border-slate-700 text-white' },
  { id: 'nourish', name: 'Nourish', classes: 'bg-emerald-700 border-emerald-900 text-white' },
];

const fonts = [
  { id: 'sans', name: 'Inter (Sans)' },
  { id: 'mono', name: 'Space Mono' },
  { id: 'serif', name: 'Playfair (Serif)' },
  { id: 'outfit', name: 'Outfit (Modern)' },
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

const presetColors = ['#000000', '#FFFFFF', '#FAF9F6', '#0F172A', '#E0E7FF', '#FCE7F3', '#DC2626', '#16A34A', '#2563EB', '#7C3AED'];

const AppearanceEditor = () => {
  const { 
    templateType, 
    templateValue, 
    setTemplate, 
    buttonStyle, 
    buttonRoundness, 
    buttonColor, 
    buttonTextColor,
    fontFamily,
    pageTextColor,
    sticker,
    setDesignSettings 
  } = useStore();

  const [currentView, setCurrentView] = useState<'main' | 'theme' | 'buttons' | 'colors' | 'stickers'>('main');

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
          className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-5 h-5" /> Buttons
        </button>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-8">
          
          {/* Button Style */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Button style</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setDesignSettings({ buttonStyle: 'solid' })}
                className={clsx(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                  buttonStyle === 'solid' ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="w-16 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
                  <div className="w-10 h-4 bg-white rounded-md" />
                </div>
                <span className="text-xs font-bold text-gray-900">Solid</span>
              </button>

              <button
                onClick={() => setDesignSettings({ buttonStyle: 'glass' })}
                className={clsx(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                  buttonStyle === 'glass' ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="w-16 h-8 bg-gray-200/60 backdrop-blur-sm border border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="w-10 h-4 bg-gray-400/50 rounded-md" />
                </div>
                <span className="text-xs font-bold text-gray-900">Glass</span>
              </button>

              <button
                onClick={() => setDesignSettings({ buttonStyle: 'outline' })}
                className={clsx(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                  buttonStyle === 'outline' ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="w-16 h-8 border-2 border-gray-400 rounded-lg flex items-center justify-center">
                  <div className="w-10 h-4 bg-transparent border border-gray-400 rounded-md" />
                </div>
                <span className="text-xs font-bold text-gray-900">Outline</span>
              </button>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Corner Roundness */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Corner roundness</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'none', label: 'Square', shape: 'rounded-none' },
                { id: 'sm', label: 'Soft', shape: 'rounded-md' },
                { id: 'md', label: 'Curved', shape: 'rounded-xl' },
                { id: 'full', label: 'Pill', shape: 'rounded-full' },
              ].map((r) => {
                const isSelected = buttonRoundness === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setDesignSettings({ buttonRoundness: r.id as any })}
                    className={clsx(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2",
                      isSelected ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <div className={clsx("w-8 h-8 border-2 border-gray-700", r.shape)} />
                    <span className="text-[11px] font-bold text-gray-800">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Button Color & Text Color */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Button color</span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={buttonColor || '#000000'}
                  onChange={(e) => setDesignSettings({ buttonColor: e.target.value })}
                  className="w-8 h-8 rounded-xl cursor-pointer border border-gray-200"
                />
                <span className="text-xs font-mono font-bold uppercase">{buttonColor || '#000000'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">Button text color</span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={buttonTextColor || '#FFFFFF'}
                  onChange={(e) => setDesignSettings({ buttonTextColor: e.target.value })}
                  className="w-8 h-8 rounded-xl cursor-pointer border border-gray-200"
                />
                <span className="text-xs font-mono font-bold uppercase">{buttonTextColor || '#FFFFFF'}</span>
              </div>
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
          {/* Font Family */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">Page font</label>
            <div className="grid grid-cols-2 gap-3">
              {fonts.map((f) => {
                const isSelected = fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setDesignSettings({ fontFamily: f.id })}
                    className={clsx(
                      "p-3 rounded-xl border-2 text-left transition-all",
                      isSelected ? "border-black bg-gray-50 ring-1 ring-black font-bold" : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <span className="text-sm">{f.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

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

        </div>
      </div>

    </div>
  );
};

export default AppearanceEditor;
