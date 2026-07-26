import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import type { CustomLink, LinkButtonStyle } from '../../store/useStore';

interface LinkStyleEditorModalProps {
  link: CustomLink;
  onClose: () => void;
  onUpdate: (updates: Partial<CustomLink>) => void;
}

const shadowValue = (shadow?: LinkButtonStyle['shadow']) => {
  if (shadow === 'soft') return '0 4px 12px rgba(15, 23, 42, 0.10)';
  if (shadow === 'medium') return '0 8px 20px rgba(15, 23, 42, 0.18)';
  if (shadow === 'strong') return '0 12px 30px rgba(15, 23, 42, 0.28)';
  if (shadow === 'none') return 'none';
  return undefined;
};

export const LinkStyleEditorModal: React.FC<LinkStyleEditorModalProps> = ({ link, onClose, onUpdate }) => {
  const style = link.customStyle || {};
  const updateStyle = (updates: Partial<LinkButtonStyle>) => {
    onUpdate({ customStyle: { ...style, ...updates } });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <aside
        className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black text-purple-600 uppercase tracking-wider">개별 링크 디자인</p>
            <h3 className="font-black text-xl text-gray-900 truncate max-w-[280px]">{link.title || '제목 없는 링크'}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer" title="닫기">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-7">
          <section className="space-y-3">
            <h4 className="text-sm font-black text-gray-900">미리보기</h4>
            <div className="p-6 rounded-3xl bg-gray-100">
              <div
                className="w-full px-5 py-4 text-center transition-all"
                style={{
                  backgroundColor: link.buttonColor || '#111827',
                  color: link.buttonTextColor || '#ffffff',
                  fontFamily: style.fontFamily === 'serif' ? 'serif' : style.fontFamily === 'mono' ? 'monospace' : style.fontFamily === 'sans' ? 'sans-serif' : undefined,
                  fontSize: `${style.fontSize || 15}px`,
                  fontWeight: style.fontWeight || 700,
                  border: `${style.borderWidth ?? 0}px solid ${style.borderColor || '#111827'}`,
                  borderRadius: `${style.borderRadius ?? 999}px`,
                  opacity: (style.opacity ?? 100) / 100,
                  boxShadow: shadowValue(style.shadow),
                }}
              >
                {link.title || '링크 버튼'}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-black text-gray-900">색상</h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-xs font-bold text-gray-600">
                배경색
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2">
                  <input type="color" value={link.buttonColor || '#111827'} onChange={(e) => onUpdate({ buttonColor: e.target.value })} className="w-8 h-8 border-0 bg-transparent cursor-pointer" />
                  <span className="font-mono text-[11px]">{link.buttonColor || '기본값'}</span>
                </div>
              </label>
              <label className="space-y-2 text-xs font-bold text-gray-600">
                글자색
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-2">
                  <input type="color" value={link.buttonTextColor || '#ffffff'} onChange={(e) => onUpdate({ buttonTextColor: e.target.value })} className="w-8 h-8 border-0 bg-transparent cursor-pointer" />
                  <span className="font-mono text-[11px]">{link.buttonTextColor || '기본값'}</span>
                </div>
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-black text-gray-900">글자</h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-xs font-bold text-gray-600">
                폰트
                <select value={style.fontFamily || 'inherit'} onChange={(e) => updateStyle({ fontFamily: e.target.value as LinkButtonStyle['fontFamily'] })} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold">
                  <option value="inherit">전체 디자인 따르기</option>
                  <option value="sans">고딕</option>
                  <option value="serif">명조</option>
                  <option value="mono">고정폭</option>
                </select>
              </label>
              <label className="space-y-2 text-xs font-bold text-gray-600">
                굵기
                <select value={style.fontWeight || 700} onChange={(e) => updateStyle({ fontWeight: Number(e.target.value) as LinkButtonStyle['fontWeight'] })} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold">
                  <option value="400">보통</option><option value="500">중간</option><option value="600">세미볼드</option><option value="700">볼드</option><option value="800">엑스트라볼드</option><option value="900">블랙</option>
                </select>
              </label>
            </div>
            <label className="space-y-2 block text-xs font-bold text-gray-600">
              글자 크기 <span className="float-right text-gray-900">{style.fontSize || 15}px</span>
              <input type="range" min="11" max="24" value={style.fontSize || 15} onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })} className="w-full accent-purple-600" />
            </label>
          </section>

          <section className="space-y-4">
            <h4 className="text-sm font-black text-gray-900">박스</h4>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-xs font-bold text-gray-600">
                테두리 색
                <input type="color" value={style.borderColor || '#111827'} onChange={(e) => updateStyle({ borderColor: e.target.value })} className="w-full h-11 rounded-xl border border-gray-200 p-1 bg-white cursor-pointer" />
              </label>
              <label className="space-y-2 text-xs font-bold text-gray-600">
                그림자
                <select value={style.shadow || 'inherit'} onChange={(e) => updateStyle({ shadow: e.target.value as LinkButtonStyle['shadow'] })} className="w-full p-3 rounded-xl border border-gray-200 bg-white text-xs font-bold">
                  <option value="inherit">전체 디자인 따르기</option><option value="none">없음</option><option value="soft">부드럽게</option><option value="medium">중간</option><option value="strong">강하게</option>
                </select>
              </label>
            </div>
            <label className="space-y-2 block text-xs font-bold text-gray-600">테두리 두께 <span className="float-right text-gray-900">{style.borderWidth ?? 0}px</span><input type="range" min="0" max="8" value={style.borderWidth ?? 0} onChange={(e) => updateStyle({ borderWidth: Number(e.target.value) })} className="w-full accent-purple-600" /></label>
            <label className="space-y-2 block text-xs font-bold text-gray-600">모서리 둥글기 <span className="float-right text-gray-900">{style.borderRadius ?? 999}px</span><input type="range" min="0" max="60" value={Math.min(style.borderRadius ?? 60, 60)} onChange={(e) => updateStyle({ borderRadius: Number(e.target.value) })} className="w-full accent-purple-600" /></label>
            <label className="space-y-2 block text-xs font-bold text-gray-600">투명도 <span className="float-right text-gray-900">{style.opacity ?? 100}%</span><input type="range" min="10" max="100" value={style.opacity ?? 100} onChange={(e) => updateStyle({ opacity: Number(e.target.value) })} className="w-full accent-purple-600" /></label>
          </section>

          <button type="button" onClick={() => onUpdate({ buttonColor: undefined, buttonTextColor: undefined, customStyle: undefined })} className="w-full py-3 rounded-2xl border border-gray-300 text-xs font-black text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 cursor-pointer">
            <RotateCcw className="w-4 h-4" /> 전체 디자인 값으로 초기화
          </button>
        </div>
      </aside>
    </div>
  );
};
