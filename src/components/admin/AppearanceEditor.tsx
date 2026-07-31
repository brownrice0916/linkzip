import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../store/useStore';
import { entitlementsForPlan, isAdvancedTheme } from '../../domain/membershipPlans';
import { 
  ArrowLeft, 
  Shuffle, 
  Check, 
  ChevronRight, 
  ChevronDown,
  X,
  Square, 
  Smile, 
  Palette, 
  Type,
  Layers,
  Image as ImageIcon,
  Zap,
  LoaderCircle,
  Trash2,
  UploadCloud
} from 'lucide-react';
import clsx from 'clsx';
import { ColorPickerPopover } from './ColorPickerPopover';
import { getThemeDesignPreset, getThemeWallpaperStyle } from '../../domain/themePresets';
import { designFonts as fonts, isPremiumDesignFont } from '../../domain/designFonts';
import { GiphyPicker } from './GiphyPicker';
import { uploadPublicImage } from '../../services/storageService';

const themes = [
  { id: 'minimalist', nameKo: '미니멀', nameEn: 'Minimalist', classes: 'bg-[#FAF9F6] border-gray-200 text-gray-900' },
  { id: 'neon-dark', nameKo: '네온 다크', nameEn: 'Neon Dark', classes: 'bg-gray-900 border-indigo-500 text-white' },
  { id: 'soft-gradient', nameKo: '소프트 그라데이션', nameEn: 'Soft Gradient', classes: 'bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-300 border-transparent text-indigo-950' },
  { id: 'air', nameKo: '에어', nameEn: 'Air', classes: 'bg-gray-100 border-gray-300 text-gray-900' },
  { id: 'neo-pop', nameKo: '네오 팝', nameEn: 'Neo Pop', classes: 'bg-gradient-to-tr from-yellow-300 via-pink-400 to-indigo-500 border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' },
  { id: 'neo-sunshine', nameKo: '네오 선샤인', nameEn: 'Neo Sunshine', classes: 'bg-amber-400 border-2 border-[#18120B] text-[#18120B] shadow-[3px_3px_0px_0px_rgba(24,18,11,1)]' },
  { id: 'neo-cyber', nameKo: '네오 사이버', nameEn: 'Neo Cyber', classes: 'bg-slate-950 border-2 border-cyan-300 text-cyan-100 shadow-[3px_3px_0px_0px_rgba(34,211,238,.65)]' },
  { id: 'neo-mint', nameKo: '네오 민트', nameEn: 'Neo Mint', classes: 'bg-emerald-300 border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' },
  { id: 'bloom', nameKo: '블룸', nameEn: 'Bloom', classes: 'bg-gradient-to-br from-pink-400 to-rose-600 text-rose-950' },
  { id: 'sunbloom', nameKo: '선블룸', nameEn: 'Sunbloom', classes: 'bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400 border-amber-300 text-amber-950' },
  { id: 'blocks', nameKo: '블록', nameEn: 'Blocks', classes: 'bg-purple-600 border-purple-800 text-white' },
  { id: 'groove', nameKo: '그루브', nameEn: 'Groove', classes: 'bg-gradient-to-r from-amber-500 via-red-500 to-purple-600 text-white' },
  { id: 'lake', nameKo: '레이크', nameEn: 'Lake', classes: 'bg-slate-800 border-slate-700 text-white' },
  { id: 'nourish', nameKo: '너리시', nameEn: 'Nourish', classes: 'bg-emerald-700 border-emerald-900 text-white' },
];

const DEFAULT_STICKER_SIZE = 18;

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
  { id: 'chrome-heart', label: 'Chrome Heart', emoji: '/stickers/chrome-heart-flame.png' },
];

const AppearanceEditor = () => {
  const { 
    profile,
    user,
    activeProfileId,
    setProfile,
    templateType, 
    templateValue, 
    setTemplate, 
    buttonStyle, 
    buttonRoundness, 
    buttonColor, 
    buttonTextColor,
    buttonBorderColor,
    buttonBorderWidth,
    buttonOpacity,
    buttonTextOpacity,
    fontFamily,
    titleFontFamily,
    pageTextColor,
    pageTextOpacity,
    backgroundOpacity,
    backgroundImageUrl,
    backgroundImageFit,
    sticker,
    stickers: placedStickers,
    language,
    membershipPlan,
    setDesignSettings 
  } = useStore();
  const entitlements = entitlementsForPlan(membershipPlan);
  const maxPageStickers = entitlements.maxPageStickers;
  const maxAnimatedStickers = entitlements.maxAnimatedStickers;
  const tr = (ko: string, en: string) => language === 'ko' ? ko : en;
  const stickerLabel = (id: string, fallback: string) => language === 'ko' ? ({
    '': '없음', cat: '고양이', flower: '꽃', bolt: '번개', heart: '반짝이는 하트',
    sparkles: '반짝임', crown: '왕관', fire: '불꽃', rocket: '로켓', avocado: '아보카도', 'chrome-heart': '크롬 하트'
  }[id] || fallback) : fallback;
  const buttonStyleLabel = buttonStyle === 'glass' ? tr('글래스', 'Glass') : buttonStyle === 'outline' ? tr('테두리', 'Outline') : tr('단색', 'Solid');
  const selectedPreset = getThemeDesignPreset(templateValue);
  const selectedThemeName = themes.find((theme) => theme.id === templateValue);

  const [currentView, setCurrentView] = useState<'main' | 'theme' | 'buttons' | 'colors' | 'stickers'>('main');
  const [activeFontModal, setActiveFontModal] = useState<'page' | 'title' | null>(null);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const activeStickers = Array.isArray(placedStickers)
    ? placedStickers
    : sticker
      ? [{ id: 'legacy-sticker', value: sticker, x: 62, y: 22, size: DEFAULT_STICKER_SIZE, animated: /^https?:\/\//.test(sticker) }]
      : [];
  const dismissMobileStickerSheet = () => {
    if (window.matchMedia('(max-width: 900px), (pointer: coarse)').matches) {
      window.dispatchEvent(new CustomEvent('linkzip:close-mobile-appearance-sheet'));
    }
  };

  const addSticker = (value: string, animated = false) => {
    if (activeStickers.length >= maxPageStickers) {
      alert(tr(`현재 플랜에서는 스티커를 최대 ${maxPageStickers}개까지 붙일 수 있어요.`, `Your current plan allows up to ${maxPageStickers} stickers.`));
      return;
    }
    if (animated && activeStickers.filter((item) => item.animated).length >= maxAnimatedStickers) {
      alert(maxAnimatedStickers === 0
        ? tr('움직이는 스티커는 스탠다드 플랜부터 사용할 수 있어요.', 'Animated stickers are available from Standard.')
        : tr(`현재 플랜에서는 움직이는 스티커를 최대 ${maxAnimatedStickers}개까지 붙일 수 있어요.`, `Your current plan allows up to ${maxAnimatedStickers} animated stickers.`));
      return;
    }
    const offset = activeStickers.length % 5;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `sticker-${Date.now()}`;
    setDesignSettings({
      sticker: '',
      stickers: [
        ...activeStickers,
        {
          id,
          value,
          x: 50 + (offset - 2) * 8,
          y: 24 + offset * 7,
          size: DEFAULT_STICKER_SIZE,
          animated,
        },
      ],
    });
    dismissMobileStickerSheet();
  };

  const clearAllStickers = () => {
    setDesignSettings({ sticker: '', stickers: [] });
    dismissMobileStickerSheet();
  };

  const handleBackgroundImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!user?.uid) {
      alert(tr('로그인 후 배경 이미지를 업로드해 주세요.', 'Sign in to upload a background image.'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert(tr('이미지 파일만 업로드할 수 있습니다.', 'Only image files can be uploaded.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(tr('배경 이미지는 5MB 이하만 업로드할 수 있습니다.', 'Background images must be 5MB or smaller.'));
      return;
    }
    setUploadingBackground(true);
    try {
      const url = await uploadPublicImage(`profiles/${user.uid}/backgrounds/${activeProfileId || 'primary'}`, file);
      setDesignSettings({ backgroundImageUrl: url, backgroundImageFit: 'cover' });
    } catch (error) {
      console.error('Background image upload failed', error);
      alert(tr('배경 이미지 업로드에 실패했습니다.', 'Failed to upload the background image.'));
    } finally {
      setUploadingBackground(false);
    }
  };

  useEffect(() => {
    const handleExternalView = (event: Event) => {
      const view = (event as CustomEvent<'theme' | 'buttons' | 'colors' | 'stickers'>).detail;
      if (view) setCurrentView(view);
    };
    window.addEventListener('linkzip:appearance-view', handleExternalView);
    return () => window.removeEventListener('linkzip:appearance-view', handleExternalView);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('linkzip:appearance-view-changed', { detail: currentView }));
  }, [currentView]);

  const handleShuffleTheme = () => {
    const availableThemes = entitlements.canUseAdvancedDesign ? themes : themes.slice(0, 4);
    const randomIndex = Math.floor(Math.random() * availableThemes.length);
    const randomTheme = availableThemes[randomIndex];
    setTemplate('preset', randomTheme.id);
  };

  // Render Sub-Views
  if (currentView === 'theme') {
    return (
      <div className="appearance-editor appearance-editor-theme space-y-6 animate-fade-in pb-20 font-sans">
        {/* Sub-Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setCurrentView('main')}
            className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-5 h-5" /> {tr('테마', 'Theme')}
          </button>
          
          <button 
            onClick={handleShuffleTheme}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-xs font-bold bg-white hover:bg-gray-50 shadow-xs transition"
          >
            <Shuffle className="w-4 h-4 text-gray-600" /> {tr('무작위 선택', 'Shuffle')}
          </button>
        </div>

        {/* Theme Grid */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {themes.map((t) => {
              const isSelected = templateType === 'preset' && templateValue === t.id;
              const isLocked = !entitlements.canUseAdvancedDesign && isAdvancedTheme('preset', t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => setTemplate('preset', t.id)}
                  className={clsx(
                    "flex flex-col items-center p-2 rounded-2xl border-2 transition-all text-center relative overflow-hidden group",
                    isSelected ? "border-black bg-gray-50 ring-2 ring-black" : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div style={getThemeWallpaperStyle(t.id)} className={clsx("w-full h-24 rounded-xl border flex flex-col items-center justify-center p-2 mb-2 shadow-xs", t.classes)}>
                    <span className="font-bold text-xs">Aa</span>
                    <div className="w-12 h-2.5 rounded-full bg-current opacity-20 mt-2" />
                  </div>
                  <span className="text-xs font-bold text-gray-900">{language === 'ko' ? t.nameKo : t.nameEn}</span>
                  {isSelected && (
                    <div className="absolute top-3 right-3 bg-black text-white p-1 rounded-full shadow-md">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  {isLocked && <span className="design-premium-badge absolute right-3 top-3" aria-label={tr('유료 디자인', 'Premium design')}><Zap aria-hidden="true" /></span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{tr('배경 직접 설정', 'Custom background')}</h3>
            <p className="mt-1 text-xs text-gray-400">{tr('색상을 고르면 바로 전체 배경에 적용됩니다.', 'Choose a color to apply it to the full background.')}</p>
          </div>
          <ColorPickerPopover
            label={tr('배경 색상', 'Background color')}
            value={templateType === 'color' ? templateValue : selectedPreset.backgroundColor}
            opacity={backgroundOpacity ?? 100}
            onChange={(color) => setTemplate('color', color)}
            onOpacityChange={(opacity) => setDesignSettings({ backgroundOpacity: opacity })}
            suggested={['#FAF9F6', '#FFFFFF', '#FDEBDB', '#022B49', '#000000', '#C9CBEE']}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'buttons') {
    return (
      <div className="appearance-editor appearance-editor-buttons space-y-6 animate-fade-in pb-20 font-sans">
        <button 
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-3 text-xl font-bold text-gray-900 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-6 h-6" /> {tr('버튼', 'Buttons')}
        </button>

        <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100 space-y-8">
          
          {/* Button Style */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-900">{tr('버튼 스타일', 'Button style')}</h3>
            <div className="grid grid-cols-3 gap-3">
              
              {/* Solid */}
              <button
                onClick={() => setDesignSettings({
                  buttonStyle: 'solid',
                  buttonBorderWidth: 0,
                })}
                className={clsx(
                  "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2 bg-white",
                  buttonStyle === 'solid' ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="w-full h-16 bg-gray-300 rounded-xl flex items-center justify-center relative">
                  <div className="w-14 h-6 bg-white rounded-full shadow-xs" />
                </div>
                <span className="text-xs font-bold text-gray-900 mt-1">{tr('단색', 'Solid')}</span>
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
                </div>
                <span className="text-xs font-bold text-gray-900 mt-1">{tr('유리', 'Glass')}</span>
              </button>

              {/* Outline */}
              <button
                onClick={() => setDesignSettings({
                  buttonStyle: 'outline',
                  buttonBorderWidth: buttonBorderWidth && buttonBorderWidth > 0 ? buttonBorderWidth : 2,
                  buttonBorderColor: buttonBorderColor || buttonTextColor || '#111827',
                })}
                className={clsx(
                  "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2 bg-white",
                  buttonStyle === 'outline' ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="w-full h-16 bg-gray-300 rounded-xl flex items-center justify-center">
                  <div className="w-14 h-6 border-2 border-white rounded-full" />
                </div>
                <span className="text-xs font-bold text-gray-900 mt-1">{tr('테두리', 'Outline')}</span>
              </button>
            </div>
          </div>

          {/* Corner Roundness */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900">{tr('모서리 둥글기', 'Corner roundness')}</h3>
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
            <h3 className="text-sm font-bold text-gray-900">{tr('버튼 그림자', 'Button shadow')}</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'none', label: tr('없음', 'None') },
                { id: 'soft', label: tr('부드럽게', 'Soft') },
                { id: 'strong', label: tr('강하게', 'Strong') },
                { id: 'hard', label: tr('또렷하게', 'Hard') },
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
            <div><span className="text-sm font-bold text-gray-900 block">{tr('버튼 색상', 'Button color')}</span><span className="text-[11px] text-gray-400">{tr('색상과 투명도를 함께 조절합니다', 'Adjust color and opacity together')}</span></div>
            <ColorPickerPopover label={tr('버튼 색상', 'Button color')} value={buttonColor || '#FFFFFF'} opacity={buttonOpacity ?? 100} onChange={(color) => setDesignSettings({ buttonColor: color })} onOpacityChange={(nextOpacity) => setDesignSettings({ buttonColor: buttonColor || '#FFFFFF', buttonOpacity: nextOpacity })} suggested={['#022B49', '#FFFFFF', '#FDEBDB', '#000000', '#7C3AED', '#EC4899', '#10B981', '#F59E0B']} />
          </div>

          {/* Button Text Color */}
          <div className="space-y-3">
            <div><span className="text-sm font-bold text-gray-900 block">{tr('버튼 글자색', 'Button text color')}</span><span className="text-[11px] text-gray-400">{tr('글자색과 투명도를 별도로 조절합니다', 'Adjust text color and opacity separately')}</span></div>
            <ColorPickerPopover label={tr('버튼 글자색', 'Button text color')} value={buttonTextColor || '#000000'} opacity={buttonTextOpacity ?? 100} onChange={(color) => setDesignSettings({ buttonTextColor: color })} onOpacityChange={(nextOpacity) => setDesignSettings({ buttonTextColor: buttonTextColor || '#000000', buttonTextOpacity: nextOpacity })} suggested={['#000000', '#FFFFFF', '#111827', '#4B5563', '#7C3AED', '#DC2626']} />
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <div>
              <span className="block text-sm font-bold text-gray-900">{tr('버튼 테두리', 'Button border')}</span>
              <span className="text-[11px] text-gray-400">{tr('테두리 색상과 굵기를 조절합니다', 'Adjust border color and thickness')}</span>
            </div>
            <ColorPickerPopover
              label={tr('테두리 색상', 'Border color')}
              value={buttonBorderColor || buttonTextColor || '#111827'}
              opacity={100}
              onChange={(color) => setDesignSettings({ buttonBorderColor: color })}
              suggested={['#111827', '#FFFFFF', '#D1D5DB', '#7C3AED', '#EC4899', '#10B981']}
            />
            <label className="block space-y-2">
              <span className="flex items-center justify-between text-sm font-bold text-gray-900">
                <span>{tr('테두리 굵기', 'Border thickness')}</span>
                <span className="tabular-nums text-gray-500">{buttonBorderWidth ?? 0}px</span>
              </span>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={buttonBorderWidth ?? 0}
                onChange={(event) => setDesignSettings({ buttonBorderWidth: Number(event.target.value) })}
                className="w-full accent-black"
              />
            </label>
          </div>

        </div>
      </div>
    );
  }

  if (currentView === 'colors') {
    return (
      <div className="appearance-editor appearance-editor-colors space-y-6 animate-fade-in pb-20 font-sans">
        <button 
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-5 h-5" /> {tr('색상 및 글자', 'Colors & Text')}
        </button>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          {/* Page font Modal Trigger */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-bold text-gray-900">{tr('페이지 글꼴', 'Page font')}</span>
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
              <span className="text-sm font-bold text-gray-900 block">{tr('제목 글꼴', 'Alternative title font')}</span>
              <span className="text-xs text-gray-400">{tr('기본적으로 페이지 글꼴을 따릅니다', 'Matches page font by default')}</span>
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
          {activeFontModal && createPortal(
            <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
              <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-[24px] border border-[#d8d2c7] bg-[#fffdf8] p-5 shadow-[0_22px_65px_rgba(0,0,0,0.30)] animate-in fade-in zoom-in-95 sm:p-6">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 shrink-0 relative">
                  <h3 className="text-base font-bold text-gray-900 mx-auto">
                    {activeFontModal === 'page' ? tr('페이지 글꼴', 'Page font') : tr('제목 글꼴', 'Title font')}
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
                      {tr('자동 (페이지 글꼴과 동일)', 'Auto (same as page font)')}
                    </button>
                  )}

                  {/* Korean Fonts Section */}
                  <div>
                    <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-[#b45309]">
                      🇰🇷 한글 추천 폰트
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {fonts.filter(f => f.category === 'korean').map((f) => {
                        const isSelected = activeFontModal === 'page' 
                          ? (fontFamily === f.font || fontFamily === f.id)
                          : (titleFontFamily === f.font);
                        const isLocked = !entitlements.canUseAdvancedDesign && isPremiumDesignFont(f.font);
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
                              "font-option-card h-14 px-3 rounded-2xl flex items-center justify-center text-sm transition-all relative overflow-hidden cursor-pointer",
                              isSelected 
                                ? "border-2 border-black bg-[#F5F5F0] shadow-xs font-bold text-gray-900" 
                                : "bg-[#F7F7F5] hover:bg-gray-200 text-gray-800 font-medium border border-transparent"
                            )}
                          >
                            <span className="truncate pr-1 mx-auto text-center" style={{ fontFamily: `'${f.font}', sans-serif` }}>
                              {f.name.split(' (')[0]}
                            </span>
                            {isLocked && <span className="design-premium-badge absolute right-2" aria-label={tr('유료 글꼴', 'Premium font')}><Zap aria-hidden="true" /></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Global Fonts Section */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#ff5f35] mb-2 px-1">
                      🌐 글로벌 폰트
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {fonts.filter(f => f.category !== 'korean').map((f) => {
                        const isSelected = activeFontModal === 'page' 
                          ? (fontFamily === f.font || fontFamily === f.id)
                          : (titleFontFamily === f.font);
                        const isLocked = !entitlements.canUseAdvancedDesign && isPremiumDesignFont(f.font);
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
                              "font-option-card h-14 px-3 rounded-2xl flex items-center justify-center text-sm transition-all relative overflow-hidden cursor-pointer",
                              isSelected 
                                ? "border-2 border-black bg-[#F5F5F0] shadow-xs font-bold text-gray-900" 
                                : "bg-[#F7F7F5] hover:bg-gray-200 text-gray-800 font-medium border border-transparent"
                            )}
                          >
                            <span className="truncate pr-1 mx-auto text-center" style={{ fontFamily: `'${f.font}', sans-serif` }}>
                              {f.name}
                            </span>
                            {isLocked && <span className="design-premium-badge absolute right-2" aria-label={tr('유료 글꼴', 'Premium font')}><Zap aria-hidden="true" /></span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>,
            document.body,
          )}

          <hr className="border-gray-100" />

          {/* Page Text Color */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-700">{tr('페이지 글자색', 'Page text color')}</span>
            <ColorPickerPopover
              label={tr('페이지 글자색', 'Page text color')}
              value={pageTextColor || selectedPreset.pageTextColor}
              opacity={pageTextOpacity ?? 100}
              onChange={(color) => setDesignSettings({ pageTextColor: color })}
              onOpacityChange={(opacity) => setDesignSettings({ pageTextColor: pageTextColor || '#000000', pageTextOpacity: opacity })}
              suggested={['#000000', '#FFFFFF', '#111827', '#4B5563', '#7C3AED', '#DC2626']}
            />
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-700">{tr('배경 색상', 'Wallpaper background color')}</span>
            <ColorPickerPopover
              label={tr('배경 색상', 'Wallpaper background color')}
              value={templateType === 'color' ? templateValue : selectedPreset.backgroundColor}
              opacity={backgroundOpacity ?? 100}
              onChange={(color) => setTemplate('color', color)}
              onOpacityChange={(opacity) => setDesignSettings({ backgroundOpacity: opacity })}
              suggested={['#FAF9F6', '#FFFFFF', '#FDEBDB', '#022B49', '#000000', '#C9CBEE']}
            />
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-gray-900">{tr('배경 이미지 직접 업로드', 'Upload a background image')}</span>
                  {!entitlements.canUseAdvancedDesign && <span className="design-premium-badge" aria-label={tr('유료 기능', 'Premium feature')}><Zap aria-hidden="true" /></span>}
                </div>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-gray-400">{tr('모든 플랜에서 미리볼 수 있고, 저장은 스탠다드부터 가능합니다.', 'Preview on every plan. Saving requires Standard or above.')}</p>
              </div>
            </div>

            {backgroundImageUrl ? (
              <div className="overflow-hidden rounded-2xl border-2 border-[#171714] bg-[#f4f1e8]">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img src={backgroundImageUrl} alt={tr('업로드한 배경 미리보기', 'Uploaded background preview')} className={clsx('h-full w-full', backgroundImageFit === 'contain' ? 'object-contain' : backgroundImageFit === 'tile' ? 'object-none' : 'object-cover')} />
                  <div className="absolute right-3 top-3 flex gap-2">
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-[#171714] bg-white px-3 py-2 text-[10px] font-black text-[#171714] shadow-[2px_2px_0_#171714]">
                      <UploadCloud className="h-3.5 w-3.5" /> {tr('교체', 'Replace')}
                      <input type="file" accept="image/*" onChange={handleBackgroundImageUpload} disabled={uploadingBackground} className="hidden" />
                    </label>
                    <button type="button" onClick={() => setDesignSettings({ backgroundImageUrl: '' })} className="flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-[#171714] bg-[#ff5f35] px-3 py-2 text-[10px] font-black text-[#171714] shadow-[2px_2px_0_#171714]"><Trash2 className="h-3.5 w-3.5" /> {tr('제거', 'Remove')}</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 border-t-2 border-[#171714] bg-white p-2">
                  {([
                    ['cover', tr('화면 채우기', 'Cover')],
                    ['contain', tr('전체 보기', 'Contain')],
                    ['tile', tr('반복', 'Tile')],
                  ] as const).map(([fit, label]) => (
                    <button key={fit} type="button" onClick={() => setDesignSettings({ backgroundImageFit: fit })} className={clsx('cursor-pointer rounded-xl px-2 py-2.5 text-[10px] font-black transition', (backgroundImageFit || 'cover') === fit ? 'bg-[#171714] text-white' : 'text-gray-500 hover:bg-[#f4f1e8]')}>{label}</button>
                  ))}
                </div>
              </div>
            ) : (
              <label className={clsx('flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition', uploadingBackground ? 'cursor-wait border-gray-300 bg-gray-50' : 'border-[#171714] bg-[#fffdf8] hover:-translate-y-0.5 hover:bg-[#ffcf4a]/20')}>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#ffcf4a] text-[#171714] shadow-[3px_3px_0_#ff5f35]">
                  {uploadingBackground ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                </span>
                <strong className="mt-4 text-xs font-black text-gray-950">{uploadingBackground ? tr('업로드 중...', 'Uploading...') : tr('배경 이미지 선택', 'Choose a background image')}</strong>
                <span className="mt-1 text-[10px] font-semibold text-gray-400">JPG, PNG, WEBP · {tr('최대 5MB', 'up to 5MB')}</span>
                <input type="file" accept="image/*" onChange={handleBackgroundImageUpload} disabled={uploadingBackground} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'stickers') {
    return (
      <div className="appearance-editor appearance-editor-stickers space-y-6 animate-fade-in pb-20 font-sans">
        <button 
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-5 h-5" /> {tr('스티커', 'Stickers')}
        </button>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">{tr('페이지 꾸미기', 'Decorate your page')}</h3>
            <p className="text-xs text-gray-400">{tr('드래그로 이동하고, PC에서는 모서리 핸들을 끌거나 모바일에서는 두 손가락으로 크기를 조절하세요.', 'Drag to move. Resize with the corner handle on desktop or pinch with two fingers on mobile.')}</p>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
            {stickers.map((s) => {
              const isSelected = s.emoji === '🚫' ? activeStickers.length === 0 : activeStickers.some((item) => item.value === s.emoji);
              return (
                <button
                  key={s.id}
                  onClick={() => s.emoji === '🚫' ? clearAllStickers() : addSticker(s.emoji)}
                  disabled={s.emoji !== '🚫' && activeStickers.length >= maxPageStickers}
                  className={clsx(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1 aspect-square",
                    isSelected ? "border-black bg-gray-50 ring-2 ring-black scale-105" : "border-gray-200 hover:bg-gray-50",
                    s.emoji !== '🚫' && activeStickers.length >= maxPageStickers && "cursor-not-allowed opacity-45"
                  )}
                >
                  {/^(?:https?:\/\/|\/)/.test(s.emoji) ? <img src={s.emoji} alt="" className="h-12 w-12 object-contain" /> : <span className="text-3xl">{s.emoji}</span>}
                  <span className="text-[10px] font-bold text-gray-600">{stickerLabel(s.id, s.label)}</span>
                </button>
              );
            })}
          </div>
          {activeStickers.length > 0 && <button type="button" onClick={() => setDesignSettings({ stickers: activeStickers.map((item, index) => ({ ...item, x: 50 + ((index % 5) - 2) * 8, y: 24 + (index % 5) * 7 })) })} className="w-full rounded-2xl border border-gray-200 py-3 text-xs font-black text-gray-700 transition hover:bg-gray-50">{tr('전체 위치 초기화', 'Reset all positions')}</button>}
          <div className="border-t border-gray-100 pt-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div><h3 className="text-sm font-black text-gray-900">{tr('움직이는 스티커', 'Animated stickers')}</h3><p className="mt-1 text-xs font-medium text-gray-400">{maxAnimatedStickers === 0 ? tr('스탠다드 플랜부터 사용할 수 있습니다.', 'Available from Standard.') : tr(`현재 플랜에서 최대 ${maxAnimatedStickers}개까지 추가할 수 있습니다.`, `Add up to ${maxAnimatedStickers} on your plan.`)}</p></div>
              {!entitlements.canUseAnimatedStickers && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#171714] bg-[#d9ff67] px-2 py-1 text-[9px] font-black"><Zap className="h-3 w-3" /> {tr('스탠다드', 'Standard')}</span>}
            </div>
            <GiphyPicker kind="stickers" onSelect={(url) => addSticker(url, true)} />
          </div>
        </div>
      </div>
    );
  }

  // Main Design Menu Overview (Screenshot 1)
  return (
    <div className="appearance-editor appearance-editor-main space-y-8 animate-fade-in pb-20 font-sans">
      
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
            <h3 className="font-bold text-gray-900 text-sm">{tr('테마', 'Theme')}</h3>
            <p className="text-xs text-gray-400">{templateType === 'preset' ? (language === 'ko' ? selectedThemeName?.nameKo : selectedThemeName?.nameEn) : tr('사용자 지정 색상', 'Custom Color')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 group-hover:text-black">
          {tr('설정', 'Custom')} <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Customize Section List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">{tr('세부 설정', 'Customize')}</h3>

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
              <span className="font-bold text-sm text-gray-900">{tr('배경·색상·글꼴', 'Background, colors & font')}</span>
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
              <span className="font-bold text-sm text-gray-900">{tr('버튼', 'Buttons')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 group-hover:text-black capitalize">
              {buttonStyleLabel} <ChevronRight className="w-4 h-4" />
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
              <span className="font-bold text-sm text-gray-900">{tr('스티커', 'Stickers')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 group-hover:text-black">
              {sticker ? sticker : tr('페이지 꾸미기', 'Decorate page')} <ChevronRight className="w-4 h-4" />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default AppearanceEditor;
