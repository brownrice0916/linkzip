import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, Search, UploadCloud, X } from 'lucide-react';
import { availableIcons } from '../../lib/icons';
import { uploadPublicImage } from '../../services/storageService';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';

interface ThumbnailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentType?: 'image' | 'icon' | 'none';
  currentImageUrl?: string;
  currentIconName?: string;
  currentAspectRatio?: string;
  currentPositionX?: number;
  currentPositionY?: number;
  currentZoom?: number;
  imageOnly?: boolean;
  onSave: (updates: {
    thumbnailType: 'image' | 'icon' | 'none';
    icon?: string;
    iconName?: string;
    imageAspectRatio?: string;
    imagePositionX?: number;
    imagePositionY?: number;
    imageZoom?: number;
  }) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const parseAspectRatio = (value: string) => {
  const [width, height] = value.split(':').map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 4 / 3;
  return width / height;
};

type CropRect = { x: number; y: number; size: number };
type CropMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

const cropRectFromView = (positionX: number, positionY: number, zoom: number): CropRect => {
  const size = clamp(10000 / Math.max(zoom, 100), 15, 100);
  return {
    x: clamp(positionX - size / 2, 0, 100 - size),
    y: clamp(positionY - size / 2, 0, 100 - size),
    size,
  };
};

export const ThumbnailModal: React.FC<ThumbnailModalProps> = ({
  isOpen,
  onClose,
  currentType = 'none',
  currentImageUrl = '',
  currentIconName = 'link',
  currentAspectRatio = '4:3',
  currentPositionX = 50,
  currentPositionY = 50,
  currentZoom = 100,
  imageOnly = false,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'icon' | 'none'>(imageOnly ? 'image' : currentType);
  const [draftImageUrl, setDraftImageUrl] = useState(currentImageUrl);
  const [draftIconName, setDraftIconName] = useState(currentIconName || 'link');
  const [cropAspectRatio, setCropAspectRatio] = useState(() => parseAspectRatio(currentAspectRatio));
  const [cropRect, setCropRect] = useState<CropRect>(() => cropRectFromView(currentPositionX, currentPositionY, currentZoom));
  const [positionX, setPositionX] = useState(currentPositionX);
  const [positionY, setPositionY] = useState(currentPositionY);
  const [zoom, setZoom] = useState(currentZoom);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const cropFrameRef = useRef<HTMLDivElement | null>(null);
  const cropInteractionRef = useRef<{
    mode: CropMode;
    pointerX: number;
    pointerY: number;
    rect: CropRect;
    frameWidth: number;
    frameHeight: number;
  } | null>(null);
  const { user, language } = useStore();
  const tr = (ko: string, en: string) => language === 'ko' ? ko : en;

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [isOpen]);

  const filteredIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableIcons;
    return availableIcons.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [searchQuery]);

  const handleCropPointerDown = (event: React.PointerEvent<HTMLElement>, mode: CropMode) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const frame = cropFrameRef.current;
    if (!frame) return;
    const bounds = frame.getBoundingClientRect();
    cropInteractionRef.current = {
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      rect: cropRect,
      frameWidth: bounds.width,
      frameHeight: bounds.height,
    };
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const interaction = cropInteractionRef.current;
    if (!interaction) return;
    event.preventDefault();
    event.stopPropagation();
    const dx = ((event.clientX - interaction.pointerX) / interaction.frameWidth) * 100;
    const dy = ((event.clientY - interaction.pointerY) / interaction.frameHeight) * 100;
    const source = interaction.rect;
    let next = source;

    if (interaction.mode === 'move') {
      next = {
        ...source,
        x: clamp(source.x + dx, 0, 100 - source.size),
        y: clamp(source.y + dy, 0, 100 - source.size),
      };
    } else {
      const right = source.x + source.size;
      const bottom = source.y + source.size;
      let sizeX = source.size;
      let sizeY = source.size;
      let maxSize = 100;

      if (interaction.mode === 'nw') {
        sizeX = right - (source.x + dx);
        sizeY = bottom - (source.y + dy);
        maxSize = Math.min(right, bottom);
      } else if (interaction.mode === 'ne') {
        sizeX = source.size + dx;
        sizeY = bottom - (source.y + dy);
        maxSize = Math.min(100 - source.x, bottom);
      } else if (interaction.mode === 'sw') {
        sizeX = right - (source.x + dx);
        sizeY = source.size + dy;
        maxSize = Math.min(right, 100 - source.y);
      } else {
        sizeX = source.size + dx;
        sizeY = source.size + dy;
        maxSize = Math.min(100 - source.x, 100 - source.y);
      }

      const nextSize = clamp((sizeX + sizeY) / 2, 15, maxSize);
      next = {
        size: nextSize,
        x: interaction.mode === 'nw' || interaction.mode === 'sw' ? right - nextSize : source.x,
        y: interaction.mode === 'nw' || interaction.mode === 'ne' ? bottom - nextSize : source.y,
      };
    }

    setCropRect(next);
    setPositionX(next.x + next.size / 2);
    setPositionY(next.y + next.size / 2);
    setZoom(Math.round(10000 / next.size));
  };

  const handleCropPointerEnd = (event: React.PointerEvent<HTMLElement>) => {
    event.stopPropagation();
    cropInteractionRef.current = null;
  };

  if (!isOpen) return null;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;
    try {
      setUploading(true);
      const url = await uploadPublicImage(`thumbnails/${user.uid}`, file);
      setDraftImageUrl(url);
      setActiveTab('image');
      setPositionX(50);
      setPositionY(50);
      setZoom(100);
      setCropRect({ x: 0, y: 0, size: 100 });
      setCropAspectRatio(4 / 3);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert(tr('이미지 업로드에 실패했습니다.', 'Image upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const handleApply = () => {
    if (activeTab === 'image') {
      if (!draftImageUrl) return;
      onSave({
        thumbnailType: 'image',
        icon: draftImageUrl,
        iconName: '',
        imageAspectRatio: `${Math.round(cropAspectRatio * 1000)}:1000`,
        imagePositionX: positionX,
        imagePositionY: positionY,
        imageZoom: zoom,
      });
    } else if (activeTab === 'icon') {
      onSave({ thumbnailType: 'icon', icon: '', iconName: draftIconName });
    } else {
      onSave({ thumbnailType: 'none', icon: '', iconName: '' });
    }
    onClose();
  };

  const applyDisabled = activeTab === 'image' && !draftImageUrl;
  return createPortal(
    <div className="thumbnail-modal-backdrop fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" aria-labelledby="thumbnail-modal-title" className="thumbnail-modal-panel flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="thumbnail-modal-header flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 id="thumbnail-modal-title" className="thumbnail-modal-title text-xl font-black tracking-tight text-gray-950">{imageOnly ? tr('이미지 편집', 'Edit image') : tr('썸네일', 'Thumbnail')}</h2>
            <p className="thumbnail-modal-description mt-1 text-xs font-semibold text-gray-500">{imageOnly ? tr('선택 상자를 움직이고 모서리를 당겨 자를 영역을 정해 주세요.', 'Move the selection and drag a corner to choose the crop area.') : tr('이미지, 아이콘 또는 표시 안 함을 선택해 주세요.', 'Choose an image, icon, or none.')}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label={imageOnly ? tr('이미지 편집창 닫기', 'Close image editor') : tr('썸네일 선택창 닫기', 'Close thumbnail picker')}><X className="h-5 w-5" /></button>
        </div>

        {!imageOnly && <div className="thumbnail-modal-tabs shrink-0 px-6 pt-5">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-gray-100 p-1.5">
            {([
              ['image', tr('이미지', 'Image')],
              ['icon', tr('아이콘', 'Icon')],
              ['none', tr('없음', 'None')],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setActiveTab(value)} className={clsx('cursor-pointer rounded-xl px-3 py-2.5 text-xs font-black transition', activeTab === value ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black')}>{label}</button>
            ))}
          </div>
        </div>}

        <div className="thumbnail-modal-body min-h-0 flex-1 overflow-y-auto p-6">
          {activeTab === 'image' && (
            <div className="space-y-4">
              {!draftImageUrl ? (
                <label className="flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-black hover:bg-white">
                  <UploadCloud className="h-9 w-9 text-gray-400" />
                  <span className="text-sm font-black text-gray-700">{uploading ? tr('업로드 중...', 'Uploading...') : tr('이미지 업로드', 'Upload image')}</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                </label>
              ) : (
                <>
                  <div
                    ref={cropFrameRef}
                    className="thumbnail-crop-frame relative w-full touch-none overflow-hidden rounded-2xl border border-gray-300 bg-gray-100 select-none"
                    style={{ aspectRatio: cropAspectRatio }}
                  >
                    <img
                      src={draftImageUrl}
                      alt={tr('이미지 자르기 미리보기', 'Crop preview')}
                      draggable={false}
                      onLoad={(event) => {
                        const image = event.currentTarget;
                        if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                          setCropAspectRatio(image.naturalWidth / image.naturalHeight);
                          if (zoom === 100) {
                            setCropRect({ x: 0, y: 0, size: 100 });
                            setPositionX(50);
                            setPositionY(50);
                          }
                        }
                      }}
                      className="pointer-events-none h-full w-full object-contain"
                    />
                    <div
                      className="thumbnail-crop-box absolute touch-none border-2 border-white cursor-move"
                      style={{
                        left: `${cropRect.x}%`,
                        top: `${cropRect.y}%`,
                        width: `${cropRect.size}%`,
                        height: `${cropRect.size}%`,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(0, 0, 0, 0.45)',
                      }}
                      onPointerDown={(event) => handleCropPointerDown(event, 'move')}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerEnd}
                      onPointerCancel={handleCropPointerEnd}
                    >
                      <span className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/50" />
                      <span className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/50" />
                      <span className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/50" />
                      <span className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/50" />
                      {(['nw', 'ne', 'sw', 'se'] as CropMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          aria-label={tr('자르기 영역 크기 조절', 'Resize crop area')}
                          className={`thumbnail-crop-handle thumbnail-crop-handle-${mode}`}
                          onPointerDown={(event) => handleCropPointerDown(event, mode)}
                          onPointerMove={handleCropPointerMove}
                          onPointerUp={handleCropPointerEnd}
                          onPointerCancel={handleCropPointerEnd}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-center text-[10px] font-bold text-gray-500">{tr('상자 안을 드래그해 이동하고, 모서리를 당겨 자를 크기를 조절하세요.', 'Drag inside to move and pull a corner to resize the crop.')}</p>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-black text-gray-700 transition hover:border-black hover:text-black">
                    <ImageIcon className="h-4 w-4" />{tr('다른 이미지 선택', 'Choose another image')}
                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                  </label>
                </>
              )}
            </div>
          )}

          {activeTab === 'icon' && (
            <div className="space-y-4">
              <label className="thumbnail-icon-search relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={tr('아이콘 검색', 'Search icons')} className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-black focus:bg-white" />
              </label>
              <div className="thumbnail-icon-grid grid grid-cols-4 gap-3 sm:grid-cols-6">
                {filteredIcons.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} type="button" onClick={() => setDraftIconName(item.id)} className={clsx('thumbnail-icon-option flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 transition', draftIconName === item.id ? 'border-black bg-black text-white ring-2 ring-gray-200' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50')}>
                      <Icon className="h-5 w-5" />
                      <span className="w-full truncate text-center text-[9px] font-bold">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'none' && (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-3xl bg-gray-50 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm"><X className="h-6 w-6" /></span>
              <div><p className="text-sm font-black text-gray-800">{tr('이미지와 아이콘을 표시하지 않습니다.', 'No image or icon will be shown.')}</p><p className="mt-1 text-xs font-medium text-gray-500">{tr('텍스트만 있는 기본 링크로 표시돼요.', 'The link will use text only.')}</p></div>
            </div>
          )}
        </div>

        <div className="thumbnail-modal-footer grid shrink-0 grid-cols-2 gap-3 border-t border-gray-100 bg-white p-5">
          <button type="button" onClick={onClose} className="h-12 cursor-pointer rounded-2xl border border-gray-300 bg-white text-sm font-black text-gray-700 transition hover:bg-gray-50">{tr('취소', 'Cancel')}</button>
          <button type="button" onClick={handleApply} disabled={applyDisabled} className="h-12 cursor-pointer rounded-2xl bg-black text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">{tr('적용', 'Apply')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
