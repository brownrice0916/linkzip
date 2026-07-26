import React from 'react';
import { ArrowLeft, Link2, RotateCcw, Type } from 'lucide-react';
import type { CustomLink, LinkButtonStyle } from '../../store/useStore';
import { ColorPickerPopover } from './ColorPickerPopover';

type EditorVariant = 'button' | 'collection-list' | 'collection-grid' | 'group-list' | 'group-grid' | 'reservation' | 'social' | 'form';

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
  if (parentCollection) return parentCollection.layout === 'grid' ? 'group-grid' : 'group-list';
  if (link.type === 'collection') return link.layout === 'grid' ? 'collection-grid' : 'collection-list';
  if (link.type === 'reservation') return 'reservation';
  if (link.type === 'sns') return 'social';
  if (link.type === 'customer_info') return 'form';
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
  if (variant === 'reservation') {
    return { backgroundColor: '#d1e7dd', textColor: '#111827', borderColor: '#b1d8c7', borderWidth: 1, borderRadius: 24, fontSize: 13, fontWeight: 700, shadow: 'soft' };
  }
  if (variant === 'social') {
    return { backgroundColor: '#ffffff', textColor: '#111827', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 999, fontSize: 14, fontWeight: 700, shadow: 'soft' };
  }
  if (variant === 'form') {
    return { backgroundColor: '#ffffff', textColor: '#111827', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 24, fontSize: 14, fontWeight: 700, shadow: 'soft' };
  }
  if (variant === 'group-list' || variant === 'group-grid' || variant === 'collection-list' || variant === 'collection-grid') {
    const isGrid = variant.endsWith('grid');
    return { backgroundColor: '#ffffff', textColor: '#111827', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: isGrid ? 16 : 999, fontSize: isGrid ? 12 : 15, fontWeight: 700, shadow: 'soft' };
  }

  const colors = getThemeButtonColors(theme);
  const radiusMap = { none: 0, sm: 6, md: 12, full: 999 };
  return {
    ...colors,
    borderColor: colors.backgroundColor === '#ffffff' ? '#d1d5db' : colors.backgroundColor,
    borderWidth: colors.backgroundColor === '#ffffff' ? 1 : 0,
    borderRadius: radiusMap[theme.buttonRoundness],
    fontSize: 15,
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
  reservation: '예약 달력 카드',
  social: 'SNS 아이콘 그룹',
  form: '정보 입력 폼',
};

export const LinkStyleEditorModal: React.FC<LinkStyleEditorModalProps> = ({
  link,
  parentCollection,
  themeDefaults,
  onClose,
  onUpdate,
  onUpdateChildren,
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
    shadow: style.shadow && style.shadow !== 'inherit' ? style.shadow : defaults.shadow,
  };
  const isCollection = link.type === 'collection';
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
        <div className="min-w-0"><h2 className="text-2xl font-black text-gray-950">{isCollection ? '컬렉션 상세' : '링크 상세'}</h2><p className="text-xs font-bold text-purple-600 mt-0.5">{variantLabel[variant]}</p></div>
      </header>

      <section className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
        <div><h3 className="text-xl font-black text-gray-950">정보</h3><p className="text-xs text-gray-400 mt-1">공개 페이지에 표시할 내용입니다.</p></div>
        {!isCollection && <label className="block space-y-2">
          <span className="text-xs font-black text-gray-600 flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> 텍스트</span>
          <input type="text" value={link.title || ''} onChange={(event) => onUpdate({ title: event.target.value })} placeholder="링크 제목을 입력하세요" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
        </label>}
        <label className="block space-y-2">
          <span className="text-xs font-black text-gray-600 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> 링크 주소</span>
          <input type="url" value={link.url || ''} onChange={(event) => onUpdate({ url: event.target.value })} placeholder="https://example.com" className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400" />
        </label>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-6">
        <div><h3 className="text-xl font-black text-gray-950">디자인</h3><p className="text-xs text-gray-400 mt-1">{isCollection ? `컬렉션 안의 링크 ${link.links?.length || 0}개에 한 번에 적용됩니다.` : '이 항목에만 적용되는 스타일입니다.'}</p></div>
          <section className="space-y-4"><h4 className="text-sm font-black text-gray-900">색상</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 text-xs font-bold text-gray-600"><span>{variant === 'button' || variant.includes('group') || variant.includes('collection') ? '버튼 배경색' : '카드 배경색'}</span><ColorPickerPopover label="배경색" value={effective.backgroundColor} opacity={effective.opacity} onChange={(color) => updateVisual({ buttonColor: color })} onOpacityChange={(opacity) => updateVisual({ buttonColor: effective.backgroundColor, customStyle: { ...style, opacity } })} /></div>
            <div className="space-y-2 text-xs font-bold text-gray-600"><span>글자색</span><ColorPickerPopover label="글자색" value={effective.textColor} opacity={effective.textOpacity} onChange={(color) => updateVisual({ buttonTextColor: color })} onOpacityChange={(textOpacity) => updateVisual({ buttonTextColor: effective.textColor, customStyle: { ...style, textOpacity } })} suggested={['#111827', '#FFFFFF', '#4B5563', '#7C3AED', '#DC2626', '#065F46']} /></div>
          </div></section>

          <section className="space-y-4"><h4 className="text-sm font-black text-gray-900">글자</h4><div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-xs font-bold text-gray-600">폰트<select value={style.fontFamily || 'inherit'} onChange={(e) => updateStyle({ fontFamily: e.target.value as LinkButtonStyle['fontFamily'] })} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold"><option value="inherit">전체 디자인 따르기</option><option value="sans">고딕</option><option value="serif">명조</option><option value="mono">고정폭</option></select></label>
            <label className="space-y-2 text-xs font-bold text-gray-600">굵기<select value={effective.fontWeight} onChange={(e) => updateStyle({ fontWeight: Number(e.target.value) as LinkButtonStyle['fontWeight'] })} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold"><option value="400">보통</option><option value="500">중간</option><option value="600">세미볼드</option><option value="700">볼드</option><option value="800">엑스트라볼드</option><option value="900">블랙</option></select></label>
          </div><label className="space-y-2 block text-xs font-bold text-gray-600">글자 크기 <span className="float-right text-gray-900">{effective.fontSize}px</span><input type="range" min="11" max="24" value={effective.fontSize} onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })} className="w-full accent-purple-600" /></label></section>

          <section className="space-y-4"><h4 className="text-sm font-black text-gray-900">{variant === 'button' || variant.includes('group') || variant.includes('collection') ? '버튼 박스' : '카드 박스'}</h4><div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 text-xs font-bold text-gray-600"><span>테두리 색</span><ColorPickerPopover label="테두리 색" value={effective.borderColor} onChange={(color) => updateStyle({ borderColor: color })} /></div>
            <label className="space-y-2 text-xs font-bold text-gray-600">그림자<select value={style.shadow || 'inherit'} onChange={(e) => updateStyle({ shadow: e.target.value as LinkButtonStyle['shadow'] })} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold"><option value="inherit">유형 기본값</option><option value="none">없음</option><option value="soft">부드럽게</option><option value="medium">중간</option><option value="strong">강하게</option></select></label>
          </div><label className="space-y-2 block text-xs font-bold text-gray-600">테두리 두께 <span className="float-right text-gray-900">{effective.borderWidth}px</span><input type="range" min="0" max="8" value={effective.borderWidth} onChange={(e) => updateStyle({ borderWidth: Number(e.target.value) })} className="w-full accent-purple-600" /></label><label className="space-y-2 block text-xs font-bold text-gray-600">모서리 둥글기 <span className="float-right text-gray-900">{effective.borderRadius >= 999 ? '완전 둥글게' : `${effective.borderRadius}px`}</span><input type="range" min="0" max="60" value={Math.min(effective.borderRadius, 60)} onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })} className="w-full accent-purple-600" /></label></section>

        <button type="button" onClick={() => updateVisual({ buttonColor: undefined, buttonTextColor: undefined, customStyle: undefined })} className="w-full py-3 rounded-2xl border border-gray-300 text-xs font-black text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 cursor-pointer"><RotateCcw className="w-4 h-4" /> {variantLabel[variant]} 기본값으로 초기화</button>
      </section>
    </div>
  );
};
