import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Image as ImageIcon, Minus, Plus, X } from "lucide-react";

interface ProfileImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  fileName: string;
  onClose: () => void;
  onApply: (file: File) => Promise<void> | void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const ProfileImageCropModal: React.FC<ProfileImageCropModalProps> = ({
  isOpen,
  imageSrc,
  fileName,
  onClose,
  onApply,
}) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [imageSrc, isOpen]);

  if (!isOpen) return null;

  const getMetrics = () => {
    const frameSize = frameRef.current?.getBoundingClientRect().width || 1;
    const baseScale = Math.max(frameSize / naturalSize.width, frameSize / naturalSize.height);
    return {
      frameSize,
      width: naturalSize.width * baseScale * zoom,
      height: naturalSize.height * baseScale * zoom,
    };
  };

  const constrainOffset = (next: { x: number; y: number }, nextZoom = zoom) => {
    const frameSize = frameRef.current?.getBoundingClientRect().width || 1;
    const baseScale = Math.max(frameSize / naturalSize.width, frameSize / naturalSize.height);
    const width = naturalSize.width * baseScale * nextZoom;
    const height = naturalSize.height * baseScale * nextZoom;
    return {
      x: clamp(next.x, -(width - frameSize) / 2, (width - frameSize) / 2),
      y: clamp(next.y, -(height - frameSize) / 2, (height - frameSize) / 2),
    };
  };

  const handleZoom = (nextZoom: number) => {
    const value = clamp(nextZoom, 1, 3);
    setZoom(value);
    setOffset((current) => constrainOffset(current, value));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setOffset(constrainOffset({
      x: drag.offsetX + event.clientX - drag.x,
      y: drag.offsetY + event.clientY - drag.y,
    }));
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleApply = async () => {
    const image = new Image();
    image.src = imageSrc;
    await image.decode();
    const { frameSize, width, height } = getMetrics();
    const imageLeft = (frameSize - width) / 2 + offset.x;
    const imageTop = (frameSize - height) / 2 + offset.y;
    const sourceX = clamp((-imageLeft / width) * image.naturalWidth, 0, image.naturalWidth);
    const sourceY = clamp((-imageTop / height) * image.naturalHeight, 0, image.naturalHeight);
    const sourceWidth = clamp((frameSize / width) * image.naturalWidth, 1, image.naturalWidth - sourceX);
    const sourceHeight = clamp((frameSize / height) * image.naturalHeight, 1, image.naturalHeight - sourceY);

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 640;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 640, 640);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9),
    );
    if (!blob) return;

    setSaving(true);
    try {
      const baseName = fileName.replace(/\.[^.]+$/, "") || "profile";
      await onApply(new File([blob], `${baseName}-cropped.webp`, { type: "image/webp", lastModified: Date.now() }));
    } finally {
      setSaving(false);
    }
  };

  const { width, height } = getMetrics();

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" aria-labelledby="profile-crop-title" className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 id="profile-crop-title" className="text-lg font-black text-gray-950">프로필 이미지 자르기</h2>
            <p className="mt-1 text-xs font-semibold text-gray-500">이미지를 움직이고 확대해서 보일 영역을 맞춰 주세요.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label="프로필 이미지 자르기 닫기"><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div
            ref={frameRef}
            className="relative mx-auto aspect-square w-full max-w-sm touch-none cursor-grab overflow-hidden rounded-3xl bg-gray-100 active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <img
              src={imageSrc}
              alt="프로필 이미지 자르기 미리보기"
              draggable={false}
              onLoad={(event) => setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width,
                height,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-white shadow-[0_0_0_999px_rgba(0,0,0,0.42),inset_0_0_0_1px_rgba(0,0,0,0.25)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"><span className="rounded-full bg-black/65 px-3 py-1.5 text-[11px] font-bold text-white">드래그해서 위치 이동</span></div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button type="button" onClick={() => handleZoom(zoom - 0.15)} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-200 hover:border-black" aria-label="축소"><Minus className="h-4 w-4" /></button>
            <label className="flex min-w-0 flex-1 items-center gap-3 text-xs font-black text-gray-600">
              <ImageIcon className="h-4 w-4 shrink-0" />
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => handleZoom(Number(event.target.value))} className="w-full cursor-pointer accent-black" aria-label="프로필 이미지 확대 비율" />
            </label>
            <button type="button" onClick={() => handleZoom(zoom + 0.15)} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-gray-200 hover:border-black" aria-label="확대"><Plus className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-gray-100 p-5">
          <button type="button" onClick={onClose} disabled={saving} className="h-12 cursor-pointer rounded-2xl border border-gray-300 bg-white text-sm font-black text-gray-700 hover:bg-gray-50 disabled:cursor-wait">취소</button>
          <button type="button" onClick={handleApply} disabled={saving} className="h-12 cursor-pointer rounded-2xl bg-black text-sm font-black text-white hover:bg-gray-800 disabled:cursor-wait disabled:bg-gray-300">{saving ? "저장 중..." : "적용"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
