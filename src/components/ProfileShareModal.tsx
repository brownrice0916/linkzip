import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import type { UserProfile } from '../store/useStore';

interface ProfileShareModalProps {
  profile: UserProfile;
  url: string;
  contained?: boolean;
  onClose: () => void;
}

const downloadBlob = (blob: Blob, filename: string) => {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
};

export const ProfileShareModal: React.FC<ProfileShareModalProps> = ({ profile, url, contained = false, onClose }) => {
  const [copied, setCopied] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const creatorName = profile.name || profile.username || 'LinkZip';
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (!contained) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (!contained) {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contained, onClose]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: creatorName, url }).catch(() => undefined);
      return;
    }
    await handleCopy();
  };

  const downloadPng = () => {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    canvas?.toBlob((blob) => blob && downloadBlob(blob, `${profile.username || 'linkzip'}-qr.png`), 'image/png');
  };

  const downloadSvg = () => {
    const svg = svgWrapRef.current?.querySelector('svg');
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    downloadBlob(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), `${profile.username || 'linkzip'}-qr.svg`);
  };

  return (
    <div
      className={`${contained ? 'absolute' : 'fixed'} inset-0 z-[10000] flex items-center justify-center overflow-hidden overscroll-none bg-black/60 p-4 backdrop-blur-[2px]`}
      onClick={onClose}
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-share-title"
        className="relative w-full max-w-[390px] overflow-hidden rounded-[2rem] bg-white text-gray-950 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="공유 창 닫기" className="absolute right-4 top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-sm transition hover:scale-105 hover:bg-white">
          <X className="h-5 w-5" />
        </button>

        <div className="bg-gradient-to-br from-sky-200 via-slate-300 to-stone-300 px-6 pb-7 pt-12 text-center">
          <div className="mx-auto h-24 w-24 overflow-hidden rounded-[1.75rem] bg-white/70 shadow-sm ring-1 ring-white/70">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${creatorName} 프로필`} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl font-black">LZ</div>}
          </div>
          <h2 id="profile-share-title" className="mt-4 text-lg font-black">{displayUrl}</h2>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button type="button" onClick={handleCopy} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black shadow-md transition hover:-translate-y-0.5">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? '복사됨' : '복사'}
            </button>
            <button type="button" onClick={handleShare} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black shadow-md transition hover:-translate-y-0.5">
              <Share2 className="h-4 w-4" />공유
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center px-6 py-7">
          <div ref={canvasWrapRef} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <QRCodeCanvas value={url} size={176} level="M" marginSize={1} />
          </div>
          <div ref={svgWrapRef} className="hidden" aria-hidden="true"><QRCodeSVG value={url} size={176} level="M" marginSize={1} /></div>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={downloadPng} className="cursor-pointer rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold transition hover:bg-gray-50">PNG 저장</button>
            <button type="button" onClick={downloadSvg} className="cursor-pointer rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold transition hover:bg-gray-50">SVG 저장</button>
          </div>
        </div>
      </section>
    </div>
  );
};
