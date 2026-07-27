import React from 'react';
import { ArrowLeft, Link2, RotateCcw, Type } from 'lucide-react';
import type { CustomLink, LinkButtonStyle } from '../../store/useStore';
import { ColorPickerPopover } from './ColorPickerPopover';
import { designFonts } from '../../domain/designFonts';

type EditorVariant = 'button' | 'collection-list' | 'collection-grid' | 'group-list' | 'group-grid' | 'reservation' | 'social' | 'form' | 'map' | 'sales' | 'affiliate';

interface ThemeDefaults {
  templateType: 'color' | 'preset';
  templateValue: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonOpacity?: number;
  buttonTextOpacity?: number;
  buttonRoundness: 'none' | 'sm' | 'md' | 'full';
  buttonShadow: 'none' | 'soft' | 'strong' | 'hard';
}

interface LinkStyleEditorModalProps {
  link: CustomLink;
  parentCollection?: CustomLink;
  themeDefaults: ThemeDefaults;
  onClose: () => void;
  onUpdate: (updates: Partial<CustomLink>) => void;
  onUpdateChildren?: (updates: Partial<CustomLink>) => void;
  designOnly?: boolean;
}

interface EffectiveDefaults {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  fontSize: number;
  fontWeight: LinkButtonStyle['fontWeight'];
  shadow: LinkButtonStyle['shadow'];
  textOpacity?: number;
}

const getVariant = (link: CustomLink, parentCollection?: CustomLink): EditorVariant => {
  if (parentCollection) return parentCollection.layout === 'grid' || parentCollection.layout === 'carousel' ? 'group-grid' : 'group-list';
  if (link.type === 'collection') return link.layout === 'grid' || link.layout === 'carousel' ? 'collection-grid' : 'collection-list';
  if (link.type === 'reservation') return 'reservation';
  if (link.type === 'sns') return 'social';
  if (link.type === 'customer_info') return 'form';
  if (link.type === 'map') return 'map';
  if (link.type === 'sales' || link.type === 'donation') return 'sales';
  if (link.type === 'affiliate_product') return 'affiliate';
  return 'button';
};

const getThemeButtonColors = (theme: ThemeDefaults) => {
  if (theme.buttonColor) {
    return { backgroundColor: theme.buttonColor, textColor: theme.buttonTextColor || '#111827' };
  }
  if (theme.templateType === 'color' && theme.templateValue === '#0f172a') {
    return { backgroundColor: '#334155', textColor: '#ffffff' };
  }
  if (['neon-dark', 'groove', 'lake', 'nourish'].includes(theme.templateValue)) {
    return { backgroundColor: '#1f2937', textColor: '#ffffff' };
  }
  return { backgroundColor: '#ffffff', textColor: theme.buttonTextColor || '#111827' };
};

const getDefaults = (variant: EditorVariant, theme: ThemeDefaults): EffectiveDefaults => {
  const colors = getThemeButtonColors(theme);
  const radiusMap = { none: 0, sm: 6, md: 12, full: 999 };
  const isGrid = variant.endsWith('grid');
  const isCompact = isGrid || variant === 'reservation' || variant === 'social' || variant === 'form';
  return {
    ...colors,
    borderColor: colors.backgroundColor === '#ffffff' ? '#d1d5db' : colors.backgroundColor,
    borderWidth: colors.backgroundColor === '#ffffff' ? 1 : 0,
    borderRadius: variant === 'reservation' || variant === 'map' ? 16 : radiusMap[theme.buttonRoundness],
    fontSize: isGrid ? 12 : isCompact ? 14 : 15,
    fontWeight: 700,
    shadow: theme.buttonShadow === 'none' ? 'none' : theme.buttonShadow === 'strong' || theme.buttonShadow === 'hard' ? 'strong' : 'soft',
  };
};

const variantLabel: Record<EditorVariant, string> = {
  button: '일반 링크 버튼',
  'collection-list': '컬렉션 내부 링크 전체',
  'collection-grid': '컬렉션 내부 링크 전체',
  'group-list': '그룹 내부 목록 링크',
  'group-grid': '그룹 내부 그리드 링크',
  reservation: '캘린더 카드',
  social: 'SNS 아이콘 그룹',
  form: '정보 입력 폼',
  map: '지도 블록',
  sales: '판매·후원 블록',
  affiliate: '제휴 상품 블록',
};

export const LinkStyleEditorModal: React.FC<LinkStyleEditorModalProps> = ({
  link,
  parentCollection,
  themeDefaults,
  onClose,
  onUpdate,
  onUpdateChildren,
  designOnly = false,
}) => {
  const style = link.customStyle || {};
  const variant = getVariant(link, parentCollection);
  const defaults = getDefaults(variant, themeDefaults);
  const effective = {
    backgroundColor: link.buttonColor || defaults.backgroundColor,
    textColor: link.buttonTextColor || defaults.textColor,
    borderColor: style.borderColor || defaults.borderColor,
    borderWidth: style.borderWidth ?? defaults.borderWidth,
    borderRadius: style.borderRadius ?? defaults.borderRadius,
    fontSize: style.fontSize ?? defaults.fontSize,
    fontWeight: style.fontWeight ?? defaults.fontWeight,
    opacity: style.opacity ?? themeDefaults.buttonOpacity ?? 100,
    textOpacity: style.textOpacity ?? themeDefaults.buttonTextOpacity ?? 100,
    iconColor: style.iconColor || link.buttonTextColor || defaults.textColor,
    iconOpacity: style.iconOpacity ?? style.textOpacity ?? themeDefaults.buttonTextOpacity ?? 100,
    iconBackgroundColor: style.iconBackgroundColor || link.buttonTextColor || defaults.textColor,
    iconBackgroundOpacity: style.iconBackgroundOpacity ?? 12,
    calendarButtonColor: style.calendarButtonColor || link.buttonTextColor || defaults.textColor,
    calendarButtonOpacity: style.calendarButtonOpacity ?? 100,
    calendarButtonTextColor: style.calendarButtonTextColor || link.buttonColor || defaults.backgroundColor,
    calendarButtonTextOpacity: style.calendarButtonTextOpacity ?? 100,
    shadow: style.shadow && style.shadow !== 'inherit' ? style.shadow : defaults.shadow,
  };
  const isCollection = link.type === 'collection';
  const hasFixedRadius = variant === 'reservation' || variant === 'map';
  const updateVisual = (updates: Partial<CustomLink>) => {
    if (isCollection && onUpdateChildren) onUpdateChildren(updates);
    else onUpdate(updates);
  };
  const updateStyle = (updates: Partial<LinkButtonStyle>) => {
    updateVisual({ customStyle: { ...style, ...updates } });
  };

  return (
    <div className="space-y-7 animate-fade-in pb-20 font-sans">
      <header className="flex items-center gap-4">
        <button type="button" onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100 transition cursor-pointer" aria-label="링크 목록으로 돌아가기"><ArrowLeft className="w-6 h-6" /></button>
        <div className="min-w-0"><h2 className="text-2xl font-black text-gray-950">{designOnly && isCollection ? '컬렉션 전체 디자인' : designOnly ? '개별 디자인' : isCollection ? '컬렉션 상세' : '링크 상세'}</h2><p className="text-xs font-bold text-purple-600 mt-0.5">{variantLabel[variant]}</p></div>
      </header>

      {!designOnly && <section className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
        <div><h3 className="text-xl font-black text-gray-950">정보</h3><p className="text-xs text-gray-400 mt-1">공개 페이지에 표시할 내용입니다.</p></div>
        {!isCollection && <label className="block space-y-2">
          <span className="text-xs font-black text-gray-600 flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> 텍스트</span>
          <input type="text" value={link.title || ''} onChange={(event) => onUpdate({ title: event.target.value })} placeholder="링크 제목을 입력하세요" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
        </label>}
        {variant !== 'map' && <label className="block space-y-2">
          <span className="text-xs font-black text-gray-600 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> 링크 주소</span>
          <input type="url" value={link.url || ''} onChange={(event) => onUpdate({ url: event.target.value })} placeholder="https://example.com" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
        </label>}
      </section>}

      <section className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-6">
        <div><h3 className="text-xl font-black text-gray-950">디자인</h3><p className="text-xs text-gray-400 mt-1">{isCollection ? `컬렉션 안의 링크 ${link.links?.length || 0}개에 한 번에 적용됩니다.` : '이 항목에만 적용되는 스타일입니다.'}</p></div>
          <section className="space-y-4"><h4 className="text-sm font-black text-gray-900">색상</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 text-xs font-bold text-gray-600"><span>{variant === 'button' || variant.includes('group') || variant.includes('collection') ? '버튼 배경색' : '카드 배경색'}</span><ColorPickerPopover label="배경색" value={effective.backgroundColor} opacity={effective.opacity} onChange={(color) => updateVisual({ buttonColor: color })} onOpacityChange={(opacity) => updateVisual({ buttonColor: effective.backgroundColor, customStyle: { ...style, opacity } })} /></div>
            <div className="space-y-2 text-xs font-bold text-gray-600"><span>글자색</span><ColorPickerPopover label="글자색" value={effective.textColor} opacity={effective.textOpacity} onChange={(color) => updateVisual({ buttonTextColor: color })} onOpacityChange={(textOpacity) => updateVisual({ buttonTextColor: effective.textColor, customStyle: { ...style, textOpacity } })} suggested={['#111827', '#FFFFFF', '#4B5563', '#7C3AED', '#DC2626', '#065F46']} /></div>
            {variant !== 'reservation' && variant !== 'map' && <div className="space-y-2 text-xs font-bold text-gray-600"><span>아이콘 색상</span><ColorPickerPopover label="아이콘 색상" value={effective.iconColor} opacity={effective.iconOpacity} onChange={(iconColor) => updateStyle({ iconColor })} onOpacityChange={(iconOpacity) => updateStyle({ iconColor: effective.iconColor, iconOpacity })} suggested={['#111827', '#FFFFFF', '#7C3AED', '#2563EB', '#DC2626', '#059669', '#F59E0B']} /></div>}
            {variant !== 'reservation' && variant !== 'map' && <div className="space-y-2 text-xs font-bold text-gray-600"><span>아이콘 배경색</span><ColorPickerPopover label="아이콘 배경색" value={effective.iconBackgroundColor} opacity={effective.iconBackgroundOpacity} onChange={(iconBackgroundColor) => updateStyle({ iconBackgroundColor })} onOpacityChange={(iconBackgroundOpacity) => updateStyle({ iconBackgroundColor: effective.iconBackgroundColor, iconBackgroundOpacity })} suggested={['#000000', '#FFFFFF', '#7C3AED', '#2563EB', '#FDE68A', '#D1FAE5', '#FCE7F3']} /></div>}
          </div></section>

          {variant === 'reservation' && <section className="space-y-4 rounded-2xl border border-purple-100 bg-purple-50/50 p-4"><div><h4 className="text-sm font-black text-gray-900">캘린더 버튼 스타일</h4><p className="mt-1 text-xs font-medium text-gray-500">일정 카드, 이전·다음 버튼, 일정이 있는 날짜와 표시 색상에 한꺼번에 적용됩니다.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 text-xs font-bold text-gray-600"><span>버튼 배경색</span><ColorPickerPopover label="캘린더 버튼 배경색" value={effective.calendarButtonColor} opacity={effective.calendarButtonOpacity} onChange={(calendarButtonColor) => updateStyle({ calendarButtonColor })} onOpacityChange={(calendarButtonOpacity) => updateStyle({ calendarButtonColor: effective.calendarButtonColor, calendarButtonOpacity })} suggested={['#111827', '#FFFFFF', '#7C3AED', '#2563EB', '#DC2626', '#059669', '#F59E0B']} /></div>
            <div className="space-y-2 text-xs font-bold text-gray-600"><span>글자·표시 색상</span><ColorPickerPopover label="캘린더 글자 및 표시 색상" value={effective.calendarButtonTextColor} opacity={effective.calendarButtonTextOpacity} onChange={(calendarButtonTextColor) => updateStyle({ calendarButtonTextColor })} onOpacityChange={(calendarButtonTextOpacity) => updateStyle({ calendarButtonTextColor: effective.calendarButtonTextColor, calendarButtonTextOpacity })} suggested={['#111827', '#FFFFFF', '#FDE68A', '#BFDBFE', '#FBCFE8', '#D1FAE5']} /></div>
          </div></section>}

          {variant === 'form' && <section className="space-y-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4"><div><h4 className="text-sm font-black text-gray-900">제출 버튼 스타일</h4><p className="mt-1 text-xs font-medium text-gray-500">방문자가 정보를 보낼 때 누르는 버튼에 적용됩니다.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 text-xs font-bold text-gray-600"><span>버튼 배경색</span><ColorPickerPopover label="제출 버튼 배경색" value={link.customerInfoConfig?.submitButtonColor || '#000000'} onChange={(submitButtonColor) => onUpdate({ customerInfoConfig: { mainText: link.customerInfoConfig?.mainText || link.title || '소식을 받아보세요', ...link.customerInfoConfig, submitButtonColor } })} suggested={['#000000', '#7C3AED', '#2563EB', '#DC2626', '#059669', '#F59E0B']} /></div>
            <div className="space-y-2 text-xs font-bold text-gray-600"><span>버튼 글자색</span><ColorPickerPopover label="제출 버튼 글자색" value={link.customerInfoConfig?.submitButtonTextColor || '#FFFFFF'} onChange={(submitButtonTextColor) => onUpdate({ customerInfoConfig: { mainText: link.customerInfoConfig?.mainText || link.title || '소식을 받아보세요', ...link.customerInfoConfig, submitButtonTextColor } })} suggested={['#FFFFFF', '#111827', '#FEF3C7', '#DBEAFE']} /></div>
          </div></section>}

          <section className="space-y-4"><h4 className="text-sm font-black text-gray-900">글자</h4><div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-xs font-bold text-gray-600">폰트<select value={style.fontFamily || 'inherit'} onChange={(e) => updateStyle({ fontFamily: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold"><option value="inherit">전체 디자인 따르기</option><optgroup label="기본 폰트"><option value="sans">기본 고딕</option><option value="serif">기본 명조</option><option value="mono">기본 고정폭</option></optgroup><optgroup label="한글 추천 폰트">{designFonts.filter((font) => font.category === 'korean').map((font) => <option key={font.id} value={font.font}>{font.name}</option>)}</optgroup><optgroup label="글로벌 폰트">{designFonts.filter((font) => font.category === 'global').map((font) => <option key={font.id} value={font.font}>{font.name}</option>)}</optgroup></select></label>
            <label className="space-y-2 text-xs font-bold text-gray-600">굵기<select value={effective.fontWeight} onChange={(e) => updateStyle({ fontWeight: Number(e.target.value) as LinkButtonStyle['fontWeight'] })} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold"><option value="400">보통</option><option value="500">중간</option><option value="600">세미볼드</option><option value="700">볼드</option><option value="800">엑스트라볼드</option><option value="900">블랙</option></select></label>
          </div><label className="space-y-2 block text-xs font-bold text-gray-600">글자 크기 <span className="float-right text-gray-900">{effective.fontSize}px</span><input type="range" min="11" max="24" value={effective.fontSize} onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })} className="w-full accent-purple-600" /></label></section>

          <section className="space-y-4"><h4 className="text-sm font-black text-gray-900">{variant === 'button' || variant.includes('group') || variant.includes('collection') ? '버튼 박스' : '카드 박스'}</h4><div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 text-xs font-bold text-gray-600"><span>테두리 색</span><ColorPickerPopover label="테두리 색" value={effective.borderColor} onChange={(color) => updateStyle({ borderColor: color })} /></div>
            <label className="space-y-2 text-xs font-bold text-gray-600">그림자<select value={style.shadow || 'inherit'} onChange={(e) => updateStyle({ shadow: e.target.value as LinkButtonStyle['shadow'] })} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold"><option value="inherit">유형 기본값</option><option value="none">없음</option><option value="soft">부드럽게</option><option value="medium">중간</option><option value="strong">강하게</option></select></label>
          </div><label className="space-y-2 block text-xs font-bold text-gray-600">테두리 두께 <span className="float-right text-gray-900">{effective.borderWidth}px</span><input type="range" min="0" max="8" value={effective.borderWidth} onChange={(e) => updateStyle({ borderWidth: Number(e.target.value) })} className="w-full accent-purple-600" /></label>{!hasFixedRadius && <label className="space-y-2 block text-xs font-bold text-gray-600">모서리 둥글기 <span className="float-right text-gray-900">{effective.borderRadius >= 999 ? '완전 둥글게' : `${effective.borderRadius}px`}</span><input type="range" min="0" max="60" value={Math.min(effective.borderRadius, 60)} onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })} className="w-full accent-purple-600" /></label>}</section>

        <button type="button" onClick={() => updateVisual({ buttonColor: undefined, buttonTextColor: undefined, customStyle: undefined })} className="w-full py-3 rounded-2xl border border-gray-300 text-xs font-black text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 cursor-pointer"><RotateCcw className="w-4 h-4" /> {variantLabel[variant]} 기본값으로 초기화</button>
      </section>
    </div>
  );
};
