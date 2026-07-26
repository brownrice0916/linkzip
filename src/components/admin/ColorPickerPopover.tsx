import React, { useEffect, useMemo, useState } from 'react';
import { Check, Pipette, X } from 'lucide-react';

interface ColorPickerPopoverProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  suggested?: string[];
}

const DEFAULT_COLORS = ['#022B49', '#FFFFFF', '#FDEBDB', '#000000', '#7C3AED', '#EC4899'];
const normalizeHex = (value: string) => /^#[0-9A-F]{6}$/i.test(value) ? value.toUpperCase() : '#FFFFFF';

const hexToHsv = (hex: string) => {
  const color = normalizeHex(hex).slice(1);
  const r = parseInt(color.slice(0, 2), 16) / 255;
  const g = parseInt(color.slice(2, 4), 16) / 255;
  const b = parseInt(color.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  return { h: h < 0 ? h + 360 : h, s: max ? (delta / max) * 100 : 0, v: max * 100 };
};

const hsvToHex = (h: number, s: number, v: number) => {
  const saturation = s / 100;
  const value = v / 100;
  const c = value * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = value - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({ label, value, onChange, opacity, onOpacityChange, suggested = DEFAULT_COLORS }) => {
  const normalized = normalizeHex(value);
  const initialHsv = useMemo(() => hexToHsv(normalized), [normalized]);
  const [isOpen, setIsOpen] = useState(false);
  const [hue, setHue] = useState(initialHsv.h);
  const [saturation, setSaturation] = useState(initialHsv.s);
  const [brightness, setBrightness] = useState(initialHsv.v);
  const [hexDraft, setHexDraft] = useState(normalized);

  useEffect(() => {
    const next = hexToHsv(normalized);
    setHue(next.h);
    setSaturation(next.s);
    setBrightness(next.v);
    setHexDraft(normalized);
  }, [normalized]);

  const updateSaturationAndBrightness = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextSaturation = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
    const nextBrightness = Math.max(0, Math.min(100, 100 - ((event.clientY - bounds.top) / bounds.height) * 100));
    setSaturation(nextSaturation);
    setBrightness(nextBrightness);
    onChange(hsvToHex(hue, nextSaturation, nextBrightness));
  };

  const handleHex = (input: string) => {
    const cleaned = input.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
    setHexDraft(`#${cleaned}`);
    if (cleaned.length === 6) onChange(`#${cleaned}`);
  };

  return (
    <div className="relative min-w-0">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="w-full flex items-center gap-2.5 border border-gray-200 rounded-xl p-2 bg-white hover:border-purple-400 transition cursor-pointer" aria-label={`${label} 색상 선택`}>
        <span className="w-8 h-8 rounded-lg border border-black/10 shadow-inner shrink-0" style={{ backgroundColor: normalized, opacity: (opacity ?? 100) / 100 }} />
        <span className="font-mono text-[11px] font-black text-gray-800 truncate">{normalized}</span>
      </button>

      {isOpen && (
        <div className="absolute z-[90] left-0 top-[calc(100%+8px)] w-[min(340px,calc(100vw-48px))] rounded-3xl border border-gray-200 bg-white p-4 shadow-2xl space-y-4" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between"><span className="text-sm font-black text-gray-900">{label}</span><button type="button" onClick={() => setIsOpen(false)} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 cursor-pointer" aria-label="색상 선택기 닫기"><X className="w-4 h-4" /></button></div>
          <div
            className="relative h-52 rounded-2xl overflow-hidden cursor-crosshair touch-none"
            style={{ backgroundColor: `hsl(${hue} 100% 50%)`, backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)' }}
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); updateSaturationAndBrightness(event); }}
            onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && updateSaturationAndBrightness(event)}
          >
            <span className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)] -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `${saturation}%`, top: `${100 - brightness}%` }} />
          </div>
          <input type="range" min="0" max="360" value={Math.round(hue)} onChange={(event) => { const nextHue = Number(event.target.value); setHue(nextHue); onChange(hsvToHex(nextHue, saturation, brightness)); }} className="color-hue-slider w-full h-3 rounded-full appearance-none cursor-pointer" aria-label="색상 계열" />
          <div className="grid grid-cols-[1fr_52px] gap-2">
            <input type="text" value={hexDraft} onChange={(event) => handleHex(event.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-sm font-black uppercase focus:outline-none focus:ring-2 focus:ring-purple-200" aria-label={`${label} HEX`} />
            <label className="rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center cursor-pointer" title="시스템 색상 선택기"><Pipette className="w-5 h-5" /><input type="color" value={normalized} onChange={(event) => onChange(event.target.value.toUpperCase())} className="sr-only" /></label>
          </div>
          {onOpacityChange && <label className="block space-y-2 text-xs font-bold text-gray-600"><span className="flex justify-between"><span>투명도</span><span className="font-black text-purple-700">{opacity ?? 100}%</span></span><input type="range" min="0" max="100" value={opacity ?? 100} onChange={(event) => onOpacityChange(Number(event.target.value))} className="w-full accent-purple-600" /></label>}
          <div className="border-t border-gray-100 pt-4"><p className="text-xs font-black text-gray-700 mb-3">추천 색상</p><div className="flex flex-wrap gap-2.5">{suggested.map((color) => <button key={color} type="button" onClick={() => onChange(color)} className="relative w-9 h-9 rounded-full border border-gray-300 shadow-sm hover:scale-110 transition cursor-pointer" style={{ backgroundColor: color }}>{normalizeHex(color) === normalized && <Check className={['#FFFFFF', '#FDEBDB'].includes(normalized) ? 'absolute inset-0 m-auto w-4 h-4 text-black' : 'absolute inset-0 m-auto w-4 h-4 text-white'} />}</button>)}</div></div>
        </div>
      )}
    </div>
  );
};
