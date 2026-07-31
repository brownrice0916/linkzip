export interface DesignFontOption {
  id: string;
  name: string;
  font: string;
  badge?: 'bolt' | 'pro';
  category: 'korean' | 'global';
}

// Keep a small, useful starter set: two Korean-friendly sans fonts and one
// global default. Free options intentionally have no badge in the picker.
export const BASIC_DESIGN_FONT_IDS = ['Pretendard', 'Gowun Dodum', 'Inter'] as const;

export const isPremiumDesignFont = (value: unknown) =>
  typeof value === 'string'
  && value.length > 0
  && !BASIC_DESIGN_FONT_IDS.includes(value as (typeof BASIC_DESIGN_FONT_IDS)[number]);

export const designFonts: DesignFontOption[] = [
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
