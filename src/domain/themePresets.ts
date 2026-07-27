export interface ThemeDesignPreset {
  backgroundColor: string;
  pageTextColor: string;
  pageTextOpacity: number;
  backgroundOpacity: number;
  buttonStyle: 'solid' | 'glass' | 'outline';
  buttonRoundness: 'none' | 'sm' | 'md' | 'full';
  buttonShadow: 'none' | 'soft' | 'strong' | 'hard';
  buttonColor: string;
  buttonTextColor: string;
  buttonOpacity: number;
  buttonTextOpacity: number;
  fontFamily: string;
  titleFontFamily: string;
  sticker: string;
}

export const themeDesignPresets: Record<string, ThemeDesignPreset> = {
  minimalist: { backgroundColor: '#FAF9F6', pageTextColor: '#111827', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'solid', buttonRoundness: 'full', buttonShadow: 'soft', buttonColor: '#FFFFFF', buttonTextColor: '#111827', buttonOpacity: 100, buttonTextOpacity: 100, fontFamily: 'Inter', titleFontFamily: '', sticker: '' },
  'neon-dark': { backgroundColor: '#111827', pageTextColor: '#FFFFFF', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'solid', buttonRoundness: 'full', buttonShadow: 'strong', buttonColor: '#1F2937', buttonTextColor: '#818CF8', buttonOpacity: 100, buttonTextOpacity: 100, fontFamily: 'Space Grotesk', titleFontFamily: '', sticker: '' },
  'soft-gradient': { backgroundColor: '#C4B5FD', pageTextColor: '#312E81', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'glass', buttonRoundness: 'full', buttonShadow: 'strong', buttonColor: '#FFFFFF', buttonTextColor: '#312E81', buttonOpacity: 78, buttonTextOpacity: 100, fontFamily: 'Outfit', titleFontFamily: '', sticker: '' },
  air: { backgroundColor: '#F3F4F6', pageTextColor: '#111827', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'solid', buttonRoundness: 'full', buttonShadow: 'soft', buttonColor: '#FFFFFF', buttonTextColor: '#111827', buttonOpacity: 100, buttonTextOpacity: 100, fontFamily: 'DM Sans', titleFontFamily: '', sticker: '' },
  blocks: { backgroundColor: '#9333EA', pageTextColor: '#FFFFFF', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'solid', buttonRoundness: 'sm', buttonShadow: 'strong', buttonColor: '#EC4899', buttonTextColor: '#FFFFFF', buttonOpacity: 100, buttonTextOpacity: 100, fontFamily: 'Syne', titleFontFamily: '', sticker: '' },
  bloom: { backgroundColor: '#E11D48', pageTextColor: '#FFF7F8', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'glass', buttonRoundness: 'full', buttonShadow: 'strong', buttonColor: '#FFF7F8', buttonTextColor: '#881337', buttonOpacity: 84, buttonTextOpacity: 100, fontFamily: 'Lora', titleFontFamily: '', sticker: '' },
  sunbloom: { backgroundColor: '#FCD34D', pageTextColor: '#78350F', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'glass', buttonRoundness: 'full', buttonShadow: 'strong', buttonColor: '#FFFFFF', buttonTextColor: '#78350F', buttonOpacity: 30, buttonTextOpacity: 100, fontFamily: 'Albert Sans', titleFontFamily: '', sticker: '' },
  'neo-pop': { backgroundColor: '#F472B6', pageTextColor: '#000000', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'solid', buttonRoundness: 'sm', buttonShadow: 'hard', buttonColor: '#FFFFFF', buttonTextColor: '#000000', buttonOpacity: 100, buttonTextOpacity: 100, fontFamily: 'Bricolage Grotesque', titleFontFamily: '', sticker: '' },
  'neo-sunshine': { backgroundColor: '#F59E0B', pageTextColor: '#18120B', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'solid', buttonRoundness: 'sm', buttonShadow: 'hard', buttonColor: '#18120B', buttonTextColor: '#FFF7D6', buttonOpacity: 100, buttonTextOpacity: 100, fontFamily: 'Black Han Sans', titleFontFamily: '', sticker: '' },
  'neo-cyber': { backgroundColor: '#07111F', pageTextColor: '#E6FFFB', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'solid', buttonRoundness: 'sm', buttonShadow: 'hard', buttonColor: '#102C3B', buttonTextColor: '#67E8F9', buttonOpacity: 100, buttonTextOpacity: 100, fontFamily: 'Space Mono', titleFontFamily: '', sticker: '' },
  'neo-mint': { backgroundColor: '#34D399', pageTextColor: '#000000', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'solid', buttonRoundness: 'sm', buttonShadow: 'hard', buttonColor: '#FFFFFF', buttonTextColor: '#000000', buttonOpacity: 100, buttonTextOpacity: 100, fontFamily: 'Pretendard', titleFontFamily: '', sticker: '' },
  groove: { backgroundColor: '#EF4444', pageTextColor: '#FFFFFF', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'glass', buttonRoundness: 'full', buttonShadow: 'strong', buttonColor: '#000000', buttonTextColor: '#FFFFFF', buttonOpacity: 40, buttonTextOpacity: 100, fontFamily: 'Epilogue', titleFontFamily: '', sticker: '' },
  lake: { backgroundColor: '#1E293B', pageTextColor: '#F1F5F9', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'solid', buttonRoundness: 'md', buttonShadow: 'strong', buttonColor: '#334155', buttonTextColor: '#F1F5F9', buttonOpacity: 100, buttonTextOpacity: 100, fontFamily: 'IBM Plex Sans', titleFontFamily: '', sticker: '' },
  nourish: { backgroundColor: '#047857', pageTextColor: '#ECFDF5', pageTextOpacity: 100, backgroundOpacity: 100, buttonStyle: 'solid', buttonRoundness: 'md', buttonShadow: 'strong', buttonColor: '#FEF3C7', buttonTextColor: '#064E3B', buttonOpacity: 100, buttonTextOpacity: 100, fontFamily: 'Bitter', titleFontFamily: '', sticker: '' },
};

export const getThemeDesignPreset = (themeId: string | undefined) => themeDesignPresets[themeId || ''] || themeDesignPresets.minimalist;

export interface ThemeWallpaperStyle {
  backgroundColor: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
}

export const themeWallpaperStyles: Record<string, ThemeWallpaperStyle> = {
  minimalist: { backgroundColor: '#FAF9F6', backgroundImage: 'radial-gradient(circle at 18% 12%, rgba(255,255,255,.95) 0 14%, transparent 38%), linear-gradient(145deg, #FAF9F6 0%, #F1EEE8 100%)' },
  'neon-dark': { backgroundColor: '#111827', backgroundImage: 'radial-gradient(circle at 15% 12%, rgba(99,102,241,.42), transparent 34%), radial-gradient(circle at 88% 76%, rgba(236,72,153,.28), transparent 38%), linear-gradient(155deg, #070B18, #17152B 58%, #0F172A)' },
  'soft-gradient': { backgroundColor: '#C4B5FD', backgroundImage: 'radial-gradient(circle at 16% 18%, rgba(255,255,255,.7), transparent 28%), radial-gradient(circle at 82% 22%, rgba(251,207,232,.85), transparent 36%), radial-gradient(circle at 55% 86%, rgba(165,180,252,.9), transparent 42%), linear-gradient(145deg, #FBCFE8, #C4B5FD)' },
  air: { backgroundColor: '#F3F4F6', backgroundImage: 'radial-gradient(circle at 75% 8%, rgba(186,230,253,.6), transparent 30%), radial-gradient(circle at 12% 85%, rgba(224,231,255,.8), transparent 36%), linear-gradient(180deg, #FFFFFF, #F4F7FB)' },
  blocks: { backgroundColor: '#9333EA', backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,.11) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.11) 1px, transparent 1px), linear-gradient(145deg, #7E22CE, #C026D3)', backgroundSize: '42px 42px, 42px 42px, auto' },
  bloom: { backgroundColor: '#E11D48', backgroundImage: 'radial-gradient(circle at 18% 20%, rgba(254,205,211,.48), transparent 26%), radial-gradient(circle at 82% 28%, rgba(251,113,133,.65), transparent 32%), radial-gradient(circle at 50% 85%, rgba(190,24,93,.65), transparent 38%), linear-gradient(145deg, #FB7185, #BE185D)' },
  sunbloom: { backgroundColor: '#FCD34D', backgroundImage: 'radial-gradient(circle at 50% -10%, rgba(255,255,255,.85), transparent 36%), repeating-radial-gradient(circle at 10% 90%, rgba(255,255,255,.16) 0 2px, transparent 3px 14px), linear-gradient(150deg, #FDE68A, #FBBF24)' },
  'neo-pop': { backgroundColor: '#F472B6', backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,.26) 25%, transparent 25%) -18px 0/36px 36px, linear-gradient(225deg, rgba(255,255,255,.18) 25%, transparent 25%) -18px 0/36px 36px, linear-gradient(145deg, #FDE047, #F472B6 48%, #818CF8)' },
  'neo-sunshine': { backgroundColor: '#F59E0B', backgroundImage: 'repeating-conic-gradient(from -18deg at 84% 12%, rgba(255,255,255,.22) 0 7deg, transparent 7deg 18deg), radial-gradient(circle at 84% 12%, #FFF7C2 0 6%, transparent 6.5% 28%), radial-gradient(circle, rgba(24,18,11,.16) 1.3px, transparent 1.3px), linear-gradient(150deg, #FDE047, #F59E0B 66%, #EA580C)', backgroundSize: 'auto, auto, 20px 20px, auto' },
  'neo-cyber': { backgroundColor: '#07111F', backgroundImage: 'linear-gradient(rgba(34,211,238,.11) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.11) 1px, transparent 1px), radial-gradient(circle at 18% 16%, rgba(6,182,212,.35), transparent 34%), radial-gradient(circle at 84% 78%, rgba(139,92,246,.28), transparent 38%), linear-gradient(145deg, #020617, #0F2135)', backgroundSize: '34px 34px, 34px 34px, auto, auto, auto' },
  'neo-mint': { backgroundColor: '#34D399', backgroundImage: 'radial-gradient(circle at 18% 16%, rgba(255,255,255,.5), transparent 30%), radial-gradient(circle at 82% 82%, rgba(168,85,247,.38), transparent 36%), linear-gradient(145deg, #6EE7B7, #2DD4BF)' },
  groove: { backgroundColor: '#EF4444', backgroundImage: 'repeating-linear-gradient(120deg, rgba(255,255,255,.12) 0 12px, transparent 12px 34px), radial-gradient(circle at 12% 12%, #F59E0B, transparent 34%), linear-gradient(145deg, #EF4444, #7E22CE)' },
  lake: { backgroundColor: '#1E293B', backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(125,211,252,.3), transparent 38%), repeating-radial-gradient(ellipse at 50% 110%, rgba(148,163,184,.12) 0 2px, transparent 3px 18px), linear-gradient(180deg, #0F172A, #334155)' },
  nourish: { backgroundColor: '#047857', backgroundImage: 'radial-gradient(ellipse at 12% 12%, rgba(254,243,199,.24), transparent 34%), radial-gradient(ellipse at 88% 76%, rgba(110,231,183,.28), transparent 38%), linear-gradient(145deg, #065F46, #047857 56%, #115E59)' },
};

export const getThemeWallpaperStyle = (themeId: string | undefined) => themeWallpaperStyles[themeId || ''] || themeWallpaperStyles.minimalist;
