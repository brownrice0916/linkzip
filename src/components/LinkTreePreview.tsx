import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useStore,
  type UserProfile,
  type SocialLink,
  type CustomLink,
  type DesignSettings,
  type NoticeConfig,
  type ReservationScheduleItem,
} from "../store/useStore";
import { STOREFRONT_AVAILABLE } from "../config/featureFlags";
import { EllipsisVertical, Link2, X, Mail, Copy, Check, Share2, Bell, ExternalLink, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ShoppingBag, FileDown, MapPin, HandHeart, MoveDiagonal2, Trash2 } from "lucide-react";
import { getLinkIcon } from "../lib/icons";
import { getSocialUrl, normalizeSocialPlatform } from "../lib/social";
import { DonationVisitorModal } from "./DonationVisitorModal";
import { DonationFeed } from "./DonationFeed";
import { CustomerInfoVisitorCard } from "./CustomerInfoVisitorCard";
import { SubscriptionVisitorSheet } from "./SubscriptionVisitorSheet";
import { ProfileShareModal } from "./ProfileShareModal";
import { SalesVisitorModal } from "./SalesVisitorModal";
import clsx from "clsx";
import { recordPublicLinkClick } from "../services/analyticsService";
import { MapIllustration } from "./MapIllustration";
import { getThemeDesignPreset, getThemeWallpaperStyle } from "../domain/themePresets";
import BusinessFooter from "./BusinessFooter";
import { getPublicFileDownloadUrl } from "../services/storageService";
import { ensureDesignFontLoaded } from "../services/fontLoader";

interface LinkTreePreviewProps {
  profile?: UserProfile;
  templateType?: "color" | "preset";
  templateValue?: string;
  socialLinks?: SocialLink[];
  customLinks?: CustomLink[];
  isPublic?: boolean;
  showLinkZipBranding?: boolean;
  ownerUid?: string;
  design?: Partial<DesignSettings>;
  stickerEditable?: boolean;
  beforeSalesOrder?: () => Promise<boolean>;
}

const getScheduleDate = (value: string | undefined, fallbackYear: number) => {
  const match = value?.match(/(?:(\d{4})[-./])?(\d{1,2})[-./](\d{1,2})/);
  if (!match) return null;
  const year = match[1] ? Number(match[1]) : fallbackYear;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

const isScheduleOnCalendarDay = (schedule: ReservationScheduleItem, year: number, month: number, day: number) => {
  const fallbackYear = new Date().getFullYear();
  const start = getScheduleDate(schedule.startDate, fallbackYear);
  let end = getScheduleDate(schedule.endDate, start?.getFullYear() || fallbackYear) || start;
  if (!start || !end) return false;
  if (!/\d{4}/.test(schedule.endDate || '') && end.getTime() < start.getTime()) {
    end = new Date(end.getFullYear() + 1, end.getMonth(), end.getDate());
  }
  const target = new Date(year, month - 1, day);
  return target.getTime() >= start.getTime() && target.getTime() <= end.getTime();
};

const getInitialCalendarView = (schedules: ReservationScheduleItem[]) => {
  const today = new Date();
  const firstScheduleDate = schedules.map((schedule) => getScheduleDate(schedule.startDate, today.getFullYear())).find(Boolean);
  const initialDate = firstScheduleDate || today;
  return { year: initialDate.getFullYear(), month: initialDate.getMonth() + 1 };
};

const isSchedulePast = (schedule: ReservationScheduleItem, now = new Date()) => {
  const fallbackYear = now.getFullYear();
  const start = getScheduleDate(schedule.startDate, fallbackYear);
  let end = getScheduleDate(schedule.endDate, start?.getFullYear() || fallbackYear) || start;
  if (!start || !end) return false;
  if (!/\d{4}/.test(schedule.endDate || '') && end.getTime() < start.getTime()) {
    end = new Date(end.getFullYear() + 1, end.getMonth(), end.getDate());
  }
  const endHour = schedule.endDate && schedule.endHour ? Number(schedule.endHour) : 23;
  end.setHours(Number.isFinite(endHour) ? endHour : 23, 59, 59, 999);
  return end.getTime() < now.getTime();
};

const isScheduleInCalendarMonth = (schedule: ReservationScheduleItem, year: number, month: number) => {
  const start = getScheduleDate(schedule.startDate, year);
  let end = getScheduleDate(schedule.endDate, start?.getFullYear() || year) || start;
  if (!start || !end) return false;
  if (!/\d{4}/.test(schedule.endDate || '') && end.getTime() < start.getTime()) {
    end = new Date(end.getFullYear() + 1, end.getMonth(), end.getDate());
  }
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  return start.getTime() <= monthEnd.getTime() && end.getTime() >= monthStart.getTime();
};

const formatCompactScheduleDate = (schedule: ReservationScheduleItem) => {
  const date = getScheduleDate(schedule.startDate, new Date().getFullYear());
  if (!date) return schedule.startDate;
  const hour = Number(schedule.startHour);
  if (!schedule.startHour || !Number.isFinite(hour)) return `${date.getDate()}일 시간 미정`;
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour % 12 || 12;
  return `${date.getDate()}일 ${period} ${displayHour}시`;
};

const formatScheduleTime = (schedule: ReservationScheduleItem) =>
  schedule.startHour ? `${String(schedule.startHour).padStart(2, '0')}:00` : '시간 미정';

const colorWithOpacity = (color: string, opacity: number) => {
  const clampedOpacity = Math.max(0, Math.min(100, opacity));
  if (clampedOpacity === 100) return color;
  const hex = color.trim().match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${clampedOpacity / 100})`;
  }
  return `color-mix(in srgb, ${color} ${clampedOpacity}%, transparent)`;
};

const getThumbnailImageStyle = (link: CustomLink): React.CSSProperties => {
  const zoom = Math.max(100, link.imageZoom ?? 100) / 100;
  const visibleFraction = 1 / zoom;
  const centerX = Math.max(0, Math.min(1, (link.imagePositionX ?? 50) / 100));
  const centerY = Math.max(0, Math.min(1, (link.imagePositionY ?? 50) / 100));
  const cropX = Math.max(0, Math.min(1 - visibleFraction, centerX - visibleFraction / 2));
  const cropY = Math.max(0, Math.min(1 - visibleFraction, centerY - visibleFraction / 2));

  return {
    objectPosition: 'center',
    transformOrigin: 'top left',
    // The crop editor stores the visible rectangle as its centre and zoom.
    // Recreate that rectangle exactly instead of zooming around the image centre.
    transform: `scale(${zoom}) translate(${-cropX * 100}%, ${-cropY * 100}%)`,
  };
};

const getPreviewLinkTitle = (link: CustomLink): string => {
  const title = link.title || "";
  return link.type === "notice" || link.url?.includes("/notice")
    ? "공지사항"
    : title;
};

const findSubscriptionBlock = (blocks: CustomLink[]): CustomLink | undefined => {
  for (const block of blocks) {
    if (block.isVisible === false) continue;
    if (
      block.type === 'customer_info' &&
      block.customerInfoConfig?.receiveEmail !== false &&
      (block.customerInfoConfig?.displayMode || 'header') === 'header'
    ) return block;
    if (block.type === 'collection' && block.links?.length) {
      const nestedBlock = findSubscriptionBlock(block.links);
      if (nestedBlock) return nestedBlock;
    }
  }
  return undefined;
};

const LinkTreePreview: React.FC<LinkTreePreviewProps> = (props) => {
  const store = useStore();
  const profile = props.profile || store.profile;
  const templateType = props.templateType || store.templateType;
  const templateValue = props.templateValue || store.templateValue;
  const socialLinks = props.socialLinks || store.socialLinks;
  const customLinks = props.customLinks || store.customLinks;
  const ownerUid = props.ownerUid || store.user?.uid;
  const recordLinkClick = (linkId: string) => {
    if (isPublic && ownerUid) {
      void recordPublicLinkClick(ownerUid, linkId).catch((error) => {
        console.warn('Unable to record link click:', error);
      });
    } else {
      store.recordLinkClick(linkId);
    }
  };
  const isPublic = props.isPublic || false;

  const getLinkDestination = (link: CustomLink) => {
    const affiliateUrl = link.type === 'affiliate_product' ? link.affiliateProductConfig?.affiliateUrl : undefined;
    const mapQuery = link.type === 'map' ? link.mapConfig?.query.trim() : undefined;
    const rawUrl = affiliateUrl?.trim() || (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : link.url?.trim()) || '';
    const isGuestbook =
      link.iconName === 'pen-tool' ||
      link.title?.includes('방명록') ||
      link.title?.toLowerCase().includes('guestbook') ||
      rawUrl.includes('guestbook');
    const isNotice =
      link.type === 'notice' ||
      link.iconName === 'megaphone' ||
      link.title?.includes('공지') ||
      link.title?.toLowerCase().includes('notice') ||
      rawUrl.includes('notice');

    if (isGuestbook) {
      return { href: `/${profile.username || 'preview'}/guestbook`, isInternal: true };
    }
    if (isNotice) {
      return { href: `/${profile.username || 'preview'}/notice`, isInternal: true };
    }
    if (rawUrl.match(/^https?:\/\//) || rawUrl.startsWith('/')) {
      return { href: rawUrl, isInternal: rawUrl.startsWith('/') };
    }
    return { href: rawUrl ? `https://${rawUrl}` : '#', isInternal: false };
  };

  const getPreviewLinkIcon = (link: CustomLink) => {
    if (link.url?.includes('/guestbook') || link.title?.includes('방명록')) return getLinkIcon('book');
    if (link.type === 'notice' || link.url?.includes('/notice')) return getLinkIcon('megaphone');
    if (link.type === 'donation') return HandHeart;
    if (link.type === 'file') return getLinkIcon(link.iconName || 'paperclip');
    return getLinkIcon(link.iconName);
  };

  const [activeDonationBlock, setActiveDonationBlock] = useState<CustomLink | null>(null);
  const [activeSalesBlock, setActiveSalesBlock] = useState<CustomLink | null>(null);
  const [activeMapBlock, setActiveMapBlock] = useState<CustomLink | null>(null);
  const [activeNoticeBlock, setActiveNoticeBlock] = useState<CustomLink | null>(null);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);
  const [activeMapContainer, setActiveMapContainer] = useState<HTMLElement | null>(null);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [expandedReservationIds, setExpandedReservationIds] = useState<Record<string, boolean>>({});
  const [activeCalendarDay, setActiveCalendarDay] = useState<{ blockId: string; day: number } | null>(null);
  const [calendarViews, setCalendarViews] = useState<Record<string, { year: number; month: number }>>({});
  const collectionCarouselRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [collectionCarouselNavigation, setCollectionCarouselNavigation] = useState<Record<string, { canGoBack: boolean; canGoForward: boolean }>>({});
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [stickerDragPositions, setStickerDragPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [stickerResizeSizes, setStickerResizeSizes] = useState<Record<string, number>>({});
  const stickerResizeSizeRef = useRef<Record<string, number>>({});
  const stickerPointersRef = useRef<Record<string, Record<number, { x: number; y: number }>>>({});
  const stickerPinchRef = useRef<Record<string, { distance: number; size: number }>>({});
  const stickerResizeRef = useRef<Record<string, { pointerId: number; x: number; y: number; size: number }>>({});
  const [activeStickerDragId, setActiveStickerDragId] = useState<string | null>(null);
  const [isStickerOverTrash, setIsStickerOverTrash] = useState(false);
  const [stickerTrashTarget, setStickerTrashTarget] = useState<{ x: number; y: number; radius: number } | null>(null);
  const stickerTrashHoverRef = useRef(false);

  useEffect(() => {
    if (!isSubscriptionOpen) return;

    const previewScroller = !isPublic ? previewContainerRef.current?.parentElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousPreviewOverflow = previewScroller?.style.overflow;
    const previousPreviewTouchAction = previewScroller?.style.touchAction;

    if (isPublic) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else if (previewScroller) {
      previewScroller.style.overflow = 'hidden';
      previewScroller.style.touchAction = 'none';
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSubscriptionOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      if (previewScroller) {
        previewScroller.style.overflow = previousPreviewOverflow || '';
        previewScroller.style.touchAction = previousPreviewTouchAction || '';
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPublic, isSubscriptionOpen]);

  useEffect(() => {
    if (isPublic) return;
    const handlePreviewFocus = (event: Event) => {
      const blockId = (event as CustomEvent<{ blockId?: string }>).detail?.blockId;
      if (!blockId || !previewContainerRef.current) return;
      const target = Array.from(previewContainerRef.current.querySelectorAll<HTMLElement>("[data-preview-block-id]"))
        .find((element) => element.dataset.previewBlockId === blockId);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      target.animate(
        [
          { filter: "brightness(1)", transform: "scale(1)" },
          { filter: "brightness(1.12)", transform: "scale(1.015)" },
          { filter: "brightness(1)", transform: "scale(1)" },
        ],
        { duration: 650, easing: "ease-out" },
      );
    };
    window.addEventListener("linkzip:focus-preview-block", handlePreviewFocus);
    return () => window.removeEventListener("linkzip:focus-preview-block", handlePreviewFocus);
  }, [isPublic]);
  const updateCollectionCarouselNavigation = (collectionId: string) => {
    const carousel = collectionCarouselRefs.current[collectionId];
    if (!carousel) return;
    const maxScrollLeft = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    const edgeThreshold = 12;
    const next = { canGoBack: carousel.scrollLeft > edgeThreshold, canGoForward: carousel.scrollLeft < maxScrollLeft - edgeThreshold };
    setCollectionCarouselNavigation((current) => {
      const previous = current[collectionId];
      if (previous?.canGoBack === next.canGoBack && previous?.canGoForward === next.canGoForward) return current;
      return { ...current, [collectionId]: next };
    });
  };
  const scrollCollectionCarousel = (collectionId: string, direction: -1 | 1) => {
    const carousel = collectionCarouselRefs.current[collectionId];
    if (!carousel) return;
    carousel.scrollBy({ left: direction * carousel.clientWidth * 0.45, behavior: 'smooth' });
  };
  const isColor = templateType === "color";
  const presetDesign = getThemeDesignPreset(templateValue);
  const presetWallpaper = getThemeWallpaperStyle(templateValue);
  const designSource = props.design || store;
  const usePresetDefaults = !isColor && (!designSource.buttonColor || !designSource.buttonTextColor || !designSource.pageTextColor);
  const buttonStyle = usePresetDefaults ? presetDesign.buttonStyle : (designSource.buttonStyle ?? store.buttonStyle);
  const buttonRoundness = usePresetDefaults ? presetDesign.buttonRoundness : (designSource.buttonRoundness ?? store.buttonRoundness);
  const buttonShadow = usePresetDefaults ? presetDesign.buttonShadow : (designSource.buttonShadow ?? store.buttonShadow);
  const buttonColor = usePresetDefaults ? presetDesign.buttonColor : designSource.buttonColor;
  const buttonTextColor = usePresetDefaults ? presetDesign.buttonTextColor : designSource.buttonTextColor;
  const buttonBorderColor = designSource.buttonBorderColor ?? store.buttonBorderColor ?? buttonTextColor ?? '#111827';
  const buttonBorderWidth = designSource.buttonBorderWidth ?? store.buttonBorderWidth ?? (buttonStyle === 'outline' ? 2 : 0);
  const effectiveButtonBorderWidth = buttonStyle === 'solid'
    ? 0
    : buttonStyle === 'glass'
      ? Math.max(buttonBorderWidth, 1)
      : buttonBorderWidth;
  const buttonOpacity = usePresetDefaults ? presetDesign.buttonOpacity : (designSource.buttonOpacity ?? store.buttonOpacity);
  const buttonTextOpacity = usePresetDefaults ? presetDesign.buttonTextOpacity : (designSource.buttonTextOpacity ?? store.buttonTextOpacity);
  const fontFamily = usePresetDefaults ? presetDesign.fontFamily : (designSource.fontFamily || store.fontFamily);
  const titleFontFamily = usePresetDefaults ? presetDesign.titleFontFamily : (designSource.titleFontFamily ?? store.titleFontFamily);

  useEffect(() => {
    ensureDesignFontLoaded(fontFamily);
    ensureDesignFontLoaded(titleFontFamily);
  }, [fontFamily, titleFontFamily]);
  const pageTextColor = usePresetDefaults ? presetDesign.pageTextColor : designSource.pageTextColor;
  const pageTextOpacity = usePresetDefaults ? presetDesign.pageTextOpacity : (designSource.pageTextOpacity ?? store.pageTextOpacity);
  const backgroundOpacity = usePresetDefaults ? presetDesign.backgroundOpacity : (designSource.backgroundOpacity ?? store.backgroundOpacity);
  const backgroundImageUrl = props.design ? designSource.backgroundImageUrl : store.backgroundImageUrl;
  const backgroundImageFit = (props.design ? designSource.backgroundImageFit : store.backgroundImageFit) ?? 'cover';
  const legacySticker = designSource.sticker ?? (props.design ? '' : store.sticker) ?? presetDesign.sticker;
  const configuredStickers = designSource.stickers ?? (props.design ? undefined : store.stickers);
  const pageStickers = Array.isArray(configuredStickers)
    ? configuredStickers
    : legacySticker
      ? [{
          id: 'legacy-sticker',
          value: legacySticker,
          x: designSource.stickerX ?? store.stickerX ?? 62,
          y: designSource.stickerY ?? store.stickerY ?? 22,
          size: 18,
          animated: /^https?:\/\//.test(legacySticker),
        }]
      : [];
  const hasFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

  const getStickerPosition = (clientX: number, clientY: number) => {
    const bounds = previewContainerRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.max(5, Math.min(95, ((clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(3, Math.min(97, ((clientY - bounds.top) / bounds.height) * 100)),
    };
  };

  const getStickerTrashTarget = () => {
    if (hasFinePointer) return null;
    const bounds = previewContainerRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const radius = Math.max(34, Math.min(46, bounds.width * 0.1));
    const bottomInset = 120;
    return {
      x: bounds.left + bounds.width / 2,
      y: Math.min(bounds.bottom - radius - bottomInset, window.innerHeight - radius - bottomInset),
      radius,
    };
  };

  const updateStickerTrashHover = (clientX: number, clientY: number) => {
    const target = stickerTrashTarget || getStickerTrashTarget();
    if (!target) return false;
    const isOver = Math.hypot(clientX - target.x, clientY - target.y) <= target.radius + 18;
    stickerTrashHoverRef.current = isOver;
    setIsStickerOverTrash(isOver);
    return isOver;
  };

  const clearStickerDragUi = () => {
    setActiveStickerDragId(null);
    setIsStickerOverTrash(false);
    setStickerTrashTarget(null);
    stickerTrashHoverRef.current = false;
  };

  const handleStickerPointerDown = (event: React.PointerEvent<HTMLDivElement>, stickerId: string) => {
    if (!props.stickerEditable || props.design) return;
    // Mobile Safari does not consistently expose a second finger through the
    // Pointer Events stream once the first pointer has been captured. Touch
    // gestures are handled separately below so pinch-to-resize stays reliable.
    if (event.pointerType === 'touch') return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const trashTarget = getStickerTrashTarget();
    setActiveStickerDragId(stickerId);
    setStickerTrashTarget(trashTarget);
    setIsStickerOverTrash(false);
    stickerTrashHoverRef.current = false;
    const pointers = stickerPointersRef.current[stickerId] || {};
    pointers[event.pointerId] = { x: event.clientX, y: event.clientY };
    stickerPointersRef.current[stickerId] = pointers;
    const points = Object.values(pointers);
    if (points.length >= 2) {
      const [first, second] = points;
      stickerPinchRef.current[stickerId] = {
        distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        size: pageStickers.find((item) => item.id === stickerId)?.size ?? 18,
      };
      setStickerDragPositions((current) => {
        const next = { ...current };
        delete next[stickerId];
        return next;
      });
      setIsStickerOverTrash(false);
      stickerTrashHoverRef.current = false;
      return;
    }
    const next = getStickerPosition(event.clientX, event.clientY);
    if (next) setStickerDragPositions((current) => ({ ...current, [stickerId]: next }));
  };

  const handleStickerPointerMove = (event: React.PointerEvent<HTMLDivElement>, stickerId: string) => {
    if (event.pointerType === 'touch') return;
    if (!props.stickerEditable || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const pointers = stickerPointersRef.current[stickerId];
    if (!pointers?.[event.pointerId]) return;
    pointers[event.pointerId] = { x: event.clientX, y: event.clientY };
    const points = Object.values(pointers);
    const pinch = stickerPinchRef.current[stickerId];
    if (points.length >= 2 && pinch) {
      const [first, second] = points;
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const size = Math.max(8, Math.min(40, pinch.size * (distance / pinch.distance)));
      stickerResizeSizeRef.current[stickerId] = size;
      setStickerResizeSizes((current) => ({ ...current, [stickerId]: size }));
      setIsStickerOverTrash(false);
      stickerTrashHoverRef.current = false;
      return;
    }
    updateStickerTrashHover(event.clientX, event.clientY);
    const next = getStickerPosition(event.clientX, event.clientY);
    if (next) setStickerDragPositions((current) => ({ ...current, [stickerId]: next }));
  };

  const finishStickerDrag = (event: React.PointerEvent<HTMLDivElement>, stickerId: string) => {
    if (!props.stickerEditable || props.design) return;
    if (event.pointerType === 'touch') return;
    const pointers = stickerPointersRef.current[stickerId];
    if (!pointers?.[event.pointerId]) return;
    const wasPinching = Boolean(stickerPinchRef.current[stickerId]);
    if (wasPinching) {
      const size = stickerResizeSizeRef.current[stickerId] ?? pageStickers.find((item) => item.id === stickerId)?.size ?? 18;
      store.setDesignSettings({
        sticker: '',
        stickers: pageStickers.map((item) => item.id === stickerId ? { ...item, size } : item),
      });
      delete stickerPointersRef.current[stickerId];
      delete stickerPinchRef.current[stickerId];
      delete stickerResizeSizeRef.current[stickerId];
      setStickerResizeSizes((current) => {
        const next = { ...current };
        delete next[stickerId];
        return next;
      });
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      clearStickerDragUi();
      return;
    }
    const shouldDelete = event.type === 'pointerup' && stickerTrashHoverRef.current;
    const next = getStickerPosition(event.clientX, event.clientY) || stickerDragPositions[stickerId];
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (shouldDelete) store.setDesignSettings({
      sticker: '',
      stickers: pageStickers.filter((item) => item.id !== stickerId),
    });
    else if (next) store.setDesignSettings({
      sticker: '',
      stickers: pageStickers.map((item) => item.id === stickerId ? { ...item, x: next.x, y: next.y } : item),
    });
    setStickerDragPositions((current) => {
      const nextPositions = { ...current };
      delete nextPositions[stickerId];
      return nextPositions;
    });
    delete stickerPointersRef.current[stickerId];
    clearStickerDragUi();
  };

  const handleStickerTouchStart = (event: React.TouchEvent<HTMLDivElement>, stickerId: string) => {
    if (!props.stickerEditable || props.design) return;
    event.preventDefault();
    event.stopPropagation();

    setActiveStickerDragId(stickerId);
    setStickerTrashTarget(getStickerTrashTarget());
    setIsStickerOverTrash(false);
    stickerTrashHoverRef.current = false;

    const touches = Array.from(event.touches);
    if (touches.length >= 2) {
      const [first, second] = touches;
      stickerPinchRef.current[stickerId] = {
        distance: Math.max(1, Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)),
        size: stickerResizeSizes[stickerId] ?? pageStickers.find((item) => item.id === stickerId)?.size ?? 18,
      };
      setStickerDragPositions((current) => {
        const next = { ...current };
        delete next[stickerId];
        return next;
      });
      return;
    }

    const touch = touches[0];
    if (!touch) return;
    const next = getStickerPosition(touch.clientX, touch.clientY);
    if (next) setStickerDragPositions((current) => ({ ...current, [stickerId]: next }));
  };

  const handleStickerTouchMove = (event: React.TouchEvent<HTMLDivElement>, stickerId: string) => {
    if (!props.stickerEditable || props.design) return;
    event.preventDefault();
    event.stopPropagation();

    const touches = Array.from(event.touches);
    if (touches.length >= 2) {
      const [first, second] = touches;
      const pinch = stickerPinchRef.current[stickerId];
      const distance = Math.max(1, Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY));
      if (!pinch) {
        stickerPinchRef.current[stickerId] = {
          distance,
          size: stickerResizeSizes[stickerId] ?? pageStickers.find((item) => item.id === stickerId)?.size ?? 18,
        };
        return;
      }
      const size = Math.max(8, Math.min(40, pinch.size * (distance / pinch.distance)));
      stickerResizeSizeRef.current[stickerId] = size;
      setStickerResizeSizes((current) => ({ ...current, [stickerId]: size }));
      setIsStickerOverTrash(false);
      stickerTrashHoverRef.current = false;
      return;
    }

    // Once a pinch has started, lifting one finger must not turn the remaining
    // finger into a drag and unexpectedly move the sticker.
    if (stickerPinchRef.current[stickerId]) return;
    const touch = touches[0];
    if (!touch) return;
    updateStickerTrashHover(touch.clientX, touch.clientY);
    const next = getStickerPosition(touch.clientX, touch.clientY);
    if (next) setStickerDragPositions((current) => ({ ...current, [stickerId]: next }));
  };

  const finishStickerTouch = (event: React.TouchEvent<HTMLDivElement>, stickerId: string) => {
    if (!props.stickerEditable || props.design) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.touches.length > 0) return;

    const wasPinching = Boolean(stickerPinchRef.current[stickerId]);
    if (wasPinching) {
      const size = stickerResizeSizeRef.current[stickerId] ?? pageStickers.find((item) => item.id === stickerId)?.size ?? 18;
      store.setDesignSettings({
        sticker: '',
        stickers: pageStickers.map((item) => item.id === stickerId ? { ...item, size } : item),
      });
    } else {
      const touch = event.changedTouches[0];
      const next = touch ? getStickerPosition(touch.clientX, touch.clientY) : stickerDragPositions[stickerId];
      const shouldDelete = Boolean(touch) && stickerTrashHoverRef.current;
      if (shouldDelete) {
        store.setDesignSettings({ sticker: '', stickers: pageStickers.filter((item) => item.id !== stickerId) });
      } else if (next) {
        store.setDesignSettings({
          sticker: '',
          stickers: pageStickers.map((item) => item.id === stickerId ? { ...item, x: next.x, y: next.y } : item),
        });
      }
    }

    delete stickerPinchRef.current[stickerId];
    delete stickerResizeSizeRef.current[stickerId];
    setStickerResizeSizes((current) => {
      const next = { ...current };
      delete next[stickerId];
      return next;
    });
    setStickerDragPositions((current) => {
      const next = { ...current };
      delete next[stickerId];
      return next;
    });
    clearStickerDragUi();
  };

  const handleStickerResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>, stickerId: string, size: number) => {
    if (!props.stickerEditable || props.design) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    stickerResizeRef.current[stickerId] = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, size };
  };

  const handleStickerResizePointerMove = (event: React.PointerEvent<HTMLButtonElement>, stickerId: string) => {
    const start = stickerResizeRef.current[stickerId];
    const bounds = previewContainerRef.current?.getBoundingClientRect();
    if (!start || start.pointerId !== event.pointerId || !bounds) return;
    event.preventDefault();
    event.stopPropagation();
    const diagonalDelta = ((event.clientX - start.x) + (event.clientY - start.y)) / 2;
    const size = Math.max(8, Math.min(40, start.size + (diagonalDelta / bounds.width) * 100));
    stickerResizeSizeRef.current[stickerId] = size;
    setStickerResizeSizes((current) => ({ ...current, [stickerId]: size }));
  };

  const finishStickerResize = (event: React.PointerEvent<HTMLButtonElement>, stickerId: string) => {
    const start = stickerResizeRef.current[stickerId];
    if (!start || start.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const size = stickerResizeSizeRef.current[stickerId] ?? start.size;
    store.setDesignSettings({
      sticker: '',
      stickers: pageStickers.map((item) => item.id === stickerId ? { ...item, size } : item),
    });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    delete stickerResizeRef.current[stickerId];
    delete stickerResizeSizeRef.current[stickerId];
    setStickerResizeSizes((current) => {
      const next = { ...current };
      delete next[stickerId];
      return next;
    });
  };

  const removeStickerDirectly = (event: React.MouseEvent<HTMLButtonElement>, stickerId: string) => {
    event.preventDefault();
    event.stopPropagation();
    store.setDesignSettings({
      sticker: '',
      stickers: pageStickers.filter((item) => item.id !== stickerId),
    });
  };

  let fontClass = "font-sans";
  if (fontFamily === "mono") fontClass = "font-mono";
  if (fontFamily === "serif") fontClass = "font-serif";

  let roundnessClass = "rounded-full";
  if (buttonRoundness === "none") roundnessClass = "rounded-none";
  if (buttonRoundness === "sm") roundnessClass = "rounded-md";
  if (buttonRoundness === "md") roundnessClass = "rounded-xl";
  if (buttonRoundness === "full") roundnessClass = "rounded-full";

  const buttonRadiusMap: Record<typeof buttonRoundness, string> = {
    none: '0px',
    sm: '6px',
    md: '12px',
    full: '9999px',
  };
  // A fully-rounded link is 68px tall, so its visible radius stops at 34px.
  // Reusing 9999px on tall cards turns image groups and calendars into ovals.
  // Large surfaces follow the same visual radius as a link without becoming pills.
  const cardRadiusMap: Record<typeof buttonRoundness, string> = {
    none: '0px',
    sm: '6px',
    md: '12px',
    full: '34px',
  };
  const buttonShadowMap: Record<typeof buttonShadow, string> = {
    none: 'none',
    soft: '0 4px 12px rgba(15, 23, 42, 0.10)',
    strong: '0 12px 30px rgba(15, 23, 42, 0.28)',
    hard: '4px 4px 0 rgba(0, 0, 0, 1)',
  };

  let shadowClass = "shadow-sm";
  if (buttonShadow === "none") shadowClass = "shadow-none";
  if (buttonShadow === "soft") shadowClass = "shadow-sm";
  if (buttonShadow === "strong") shadowClass = "shadow-lg";
  if (buttonShadow === "hard")
    shadowClass =
      "border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  let containerClass = `flex flex-col items-center w-full min-h-screen transition-colors duration-200 relative`;
  let containerStyle: React.CSSProperties = {
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : "sans-serif",
    ...(!isColor ? presetWallpaper : {}),
  };
  if (backgroundImageUrl) {
    containerStyle.backgroundImage = `url("${backgroundImageUrl.replace(/["\\]/g, '\\$&')}")`;
    containerStyle.backgroundPosition = 'center';
    containerStyle.backgroundRepeat = backgroundImageFit === 'tile' ? 'repeat' : 'no-repeat';
    containerStyle.backgroundSize = backgroundImageFit === 'tile' ? 'auto' : backgroundImageFit;
  }

  let textClass = "text-gray-900";
  if (pageTextColor) {
    containerStyle.color = colorWithOpacity(pageTextColor, pageTextOpacity ?? 100);
    textClass = "";
  }

  let themeDefaultBtnClass = "bg-black text-white hover:bg-gray-800 shadow-sm";

  // Preset & Color Theme Styles
  if (isColor) {
    containerStyle.backgroundColor = colorWithOpacity(templateValue, backgroundOpacity ?? 100);
    const isDark = templateValue === "#0f172a";
    if (!pageTextColor) textClass = isDark ? "text-white" : "text-gray-900";
    themeDefaultBtnClass = isDark
      ? "bg-white/10 text-white border border-white/20 hover:bg-white/20"
      : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-100 shadow-sm";
  } else {
    if (templateValue === "minimalist") {
      containerClass += " bg-[#FAF9F6]";
      themeDefaultBtnClass =
        "bg-white text-gray-900 border border-gray-300 hover:bg-gray-100 shadow-sm";
    } else if (templateValue === "neon-dark") {
      containerClass += " bg-gray-900";
      if (!pageTextColor) textClass = "text-white";
      themeDefaultBtnClass =
        "bg-gray-800 border-2 border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]";
    } else if (templateValue === "soft-gradient") {
      containerClass +=
        " bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400";
      if (!pageTextColor) textClass = "text-indigo-950";
      themeDefaultBtnClass =
        "bg-white/80 backdrop-blur-md border border-white/90 text-indigo-950 hover:bg-white/95 shadow-lg";
    } else if (templateValue === "air") {
      containerClass += " bg-gray-100";
      themeDefaultBtnClass =
        "bg-white text-gray-900 border border-gray-200 shadow-sm hover:bg-gray-50";
    } else if (templateValue === "blocks") {
      containerClass += " bg-purple-600";
      if (!pageTextColor) textClass = "text-white";
      themeDefaultBtnClass =
        "bg-pink-500 text-white font-bold hover:bg-pink-600 shadow-md";
    } else if (templateValue === "bloom") {
      containerClass += " bg-gradient-to-br from-pink-500 to-rose-600";
      if (!pageTextColor) textClass = "text-white";
      themeDefaultBtnClass =
        "bg-rose-50/85 backdrop-blur-md text-rose-950 border border-white/70 hover:bg-white/95 shadow-md";
    } else if (templateValue === "sunbloom") {
      containerClass +=
        " bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400";
      if (!pageTextColor) textClass = "text-amber-950";
      themeDefaultBtnClass =
        "bg-white/30 backdrop-blur-md text-amber-950 border border-white/50 hover:bg-white/40 shadow-md font-semibold";
    } else if (templateValue === "neo-pop") {
      containerClass +=
        " bg-gradient-to-tr from-yellow-300 via-pink-400 to-indigo-500";
      if (!pageTextColor) textClass = "text-black";
      themeDefaultBtnClass =
        "bg-white text-black border-3 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-all";
    } else if (templateValue === "neo-sunshine") {
      containerClass +=
        " bg-gradient-to-tr from-yellow-300 via-amber-400 to-orange-500";
      if (!pageTextColor) textClass = "text-black";
      themeDefaultBtnClass =
        "bg-[#18120B] text-amber-50 border-2 border-[#18120B] font-bold shadow-[4px_4px_0px_0px_rgba(255,247,214,.75)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-all";
    } else if (templateValue === "neo-cyber") {
      containerClass +=
        " bg-gradient-to-tr from-slate-950 via-cyan-950 to-indigo-950";
      if (!pageTextColor) textClass = "text-cyan-50";
      themeDefaultBtnClass =
        "bg-cyan-950 text-cyan-300 border-2 border-cyan-400 font-bold shadow-[4px_4px_0px_0px_rgba(34,211,238,.55)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-all";
    } else if (templateValue === "neo-mint") {
      containerClass +=
        " bg-gradient-to-tr from-emerald-300 via-teal-400 to-purple-500";
      if (!pageTextColor) textClass = "text-black";
      themeDefaultBtnClass =
        "bg-white text-black border-3 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-all";
    } else if (templateValue === "groove") {
      containerClass +=
        " bg-gradient-to-r from-amber-500 via-red-500 to-purple-600";
      if (!pageTextColor) textClass = "text-white";
      themeDefaultBtnClass =
        "bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-black/60 shadow-md";
    } else if (templateValue === "lake") {
      containerClass += " bg-slate-800";
      if (!pageTextColor) textClass = "text-slate-100";
      themeDefaultBtnClass =
        "bg-slate-700/80 border border-slate-600 text-slate-100 hover:bg-slate-700 shadow-md";
    } else if (templateValue === "nourish") {
      containerClass += " bg-emerald-700";
      if (!pageTextColor) textClass = "text-emerald-50";
      themeDefaultBtnClass =
        "bg-amber-100 text-emerald-950 font-bold hover:bg-amber-200 shadow-md";
    }
  }
  let buttonClass = `w-full py-4 px-4 font-medium transition-[transform,background-color,color,border-color,box-shadow] duration-150 transform hover:scale-[1.01] active:scale-[0.985] text-center flex items-center justify-between ${roundnessClass} ${shadowClass}`;
  let customButtonStyle: React.CSSProperties = {};
  if (buttonColor) {
    customButtonStyle.backgroundColor = colorWithOpacity(
      buttonColor,
      buttonStyle === 'glass' ? Math.min(buttonOpacity ?? 32, 32) : (buttonOpacity ?? 100),
    );
  }
  if (buttonTextColor) customButtonStyle.color = colorWithOpacity(buttonTextColor, buttonTextOpacity ?? 100);
  customButtonStyle.borderStyle = 'solid';
  customButtonStyle.borderColor = buttonStyle === 'glass' ? 'rgba(255, 255, 255, 0.42)' : buttonBorderColor;
  customButtonStyle.borderWidth = `${effectiveButtonBorderWidth}px`;
  // Keep these two global controls authoritative for every visible block.
  // Some themes and image/card layouts carry their own Tailwind shadow/radius,
  // so inline values are required to prevent those defaults from winning.
  customButtonStyle.borderRadius = buttonRadiusMap[buttonRoundness];
  customButtonStyle.boxShadow = buttonShadowMap[buttonShadow];

  const getCustomLinkStyle = (link: CustomLink): React.CSSProperties => {
    const style = link.customStyle;

    const backgroundColor = link.buttonColor || buttonColor;
    const textColor = link.buttonTextColor || buttonTextColor;
    const backgroundOpacity = style?.opacity
      ?? (buttonStyle === 'glass' ? Math.min(buttonOpacity ?? 32, 32) : (buttonOpacity ?? 100));
    const textOpacity = style?.textOpacity ?? buttonTextOpacity ?? 100;

    return {
      ...customButtonStyle,
      ...(backgroundColor ? { backgroundColor: colorWithOpacity(backgroundColor, backgroundOpacity) } : {}),
      ...(textColor ? { color: colorWithOpacity(textColor, textOpacity) } : {}),
      ...(style?.fontFamily === 'sans' ? { fontFamily: 'sans-serif' } : {}),
      ...(style?.fontFamily === 'serif' ? { fontFamily: 'serif' } : {}),
      ...(style?.fontFamily === 'mono' ? { fontFamily: 'monospace' } : {}),
      ...(style?.fontFamily && !['inherit', 'sans', 'serif', 'mono'].includes(style.fontFamily) ? { fontFamily: `'${style.fontFamily}', sans-serif` } : {}),
      ...(style?.fontSize ? { fontSize: `${style.fontSize}px` } : {}),
      ...(style?.fontWeight ? { fontWeight: style.fontWeight } : {}),
      ...(style?.borderColor ? { borderColor: style.borderColor } : {}),
      ...(buttonStyle !== 'solid' && style?.borderWidth !== undefined ? { borderWidth: `${style.borderWidth}px` } : {}),
    };
  };

  const getCustomCardStyle = (link: CustomLink): React.CSSProperties => ({
    ...getCustomLinkStyle(link),
    borderRadius: cardRadiusMap[buttonRoundness],
  });

  const getCustomLinkIconStyle = (link: CustomLink): React.CSSProperties => {
    const iconColor = link.customStyle?.iconColor;
    if (!iconColor) return {};
    return { color: colorWithOpacity(iconColor, link.customStyle?.iconOpacity ?? 100) };
  };

  const getThemedLinkIconContainerStyle = (link: CustomLink): React.CSSProperties => {
    const style = link.customStyle;
    const iconColor = style?.iconColor || link.buttonTextColor || buttonTextColor || pageTextColor;
    const iconBackgroundColor = style?.iconBackgroundColor || link.buttonTextColor || buttonTextColor || pageTextColor;
    return {
      ...(iconColor ? { color: colorWithOpacity(iconColor, style?.iconOpacity ?? buttonTextOpacity ?? 100) } : {}),
      ...(iconBackgroundColor ? { backgroundColor: colorWithOpacity(iconBackgroundColor, style?.iconBackgroundColor ? (style.iconBackgroundOpacity ?? 100) : 12) } : {}),
    };
  };

  const buttonSurfaceClass = buttonStyle === "glass"
    ? "bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30"
    : buttonStyle === "outline"
      ? "bg-transparent border-2 border-current hover:bg-black/5"
      : themeDefaultBtnClass;
  buttonClass += ` ${buttonSurfaceClass}`;

  let socialIconClass = "w-7 h-7 hover:scale-110 transition-transform";
  const socialControlStyle: React.CSSProperties = {
    ...(buttonColor ? { backgroundColor: colorWithOpacity(buttonColor, buttonOpacity ?? 100) } : {}),
    ...(buttonTextColor ? { color: colorWithOpacity(buttonTextColor, buttonTextOpacity ?? 100) } : {}),
  };

  const getSocialIconStyle = (link?: CustomLink): React.CSSProperties => {
    const style = link?.customStyle;
    const iconColor = style?.iconColor || link?.buttonTextColor || buttonTextColor || pageTextColor;

    return {
      backgroundColor: 'transparent',
      color: iconColor
        ? colorWithOpacity(iconColor, style?.iconOpacity ?? buttonTextOpacity ?? 100)
        : 'currentColor',
      borderColor: 'currentColor',
      borderStyle: 'solid',
      borderWidth: '1px',
      borderRadius: '9999px',
      boxShadow: 'none',
    };
  };

  const [emailCopied, setEmailCopied] = useState(false);
  const [shareModalItem, setShareModalItem] = useState<{
    title: string;
    url?: string;
    top: number;
    left: number;
  } | null>(null);
  const [isProfileShareOpen, setIsProfileShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!isProfileShareOpen || isPublic) return;
    const previewScroller = previewContainerRef.current?.parentElement;
    if (!previewScroller) return;

    const previousOverflow = previewScroller.style.overflow;
    const previousTouchAction = previewScroller.style.touchAction;
    previewScroller.style.overflow = 'hidden';
    previewScroller.style.touchAction = 'none';

    return () => {
      previewScroller.style.overflow = previousOverflow;
      previewScroller.style.touchAction = previousTouchAction;
    };
  }, [isProfileShareOpen, isPublic]);

  const shareUrl = `${window.location.origin}/${profile.username || "preview"}`;
  const subscriptionBlock = findSubscriptionBlock(customLinks);
  const showStoreButton = STOREFRONT_AVAILABLE && profile.storefront?.enabled === true && profile.storefront.showOnProfile !== false;
  const storeUrl = `/${profile.username || "preview"}/shop`;
  const visibleCustomLinks = customLinks.filter((block) => (
    block.isVisible !== false &&
    (block.blockKind !== "store" || (STOREFRONT_AVAILABLE && (profile.storefront?.enabled === true || !isPublic)))
  ));

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (profile.email) {
      navigator.clipboard.writeText(profile.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const handleOpenShareModal = (
    e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
    linkItem: { title: string; url?: string },
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const anchor = e.currentTarget.getBoundingClientRect();
    const portalContainer = isPublic ? null : previewContainerRef.current;
    const containerBounds = portalContainer?.getBoundingClientRect();
    const menuWidth = 132;
    const availableWidth = containerBounds?.width ?? window.innerWidth;
    const relativeRight = anchor.right - (containerBounds?.left ?? 0);
    setShareModalItem({
      ...linkItem,
      top: anchor.bottom - (containerBounds?.top ?? 0) + 6,
      left: Math.max(8, Math.min(availableWidth - menuWidth - 8, relativeRight - menuWidth)),
    });
    setLinkCopied(false);
  };

  const handleOpenMap = (event: React.MouseEvent<HTMLElement>, block: CustomLink) => {
    recordLinkClick(block.id);
    setActiveMapContainer(event.currentTarget.closest<HTMLElement>('[data-map-popup-container]'));
    setActiveMapBlock(block);
  };

  const getNoticesForBlock = (block: CustomLink): NoticeConfig[] => {
    const notices = block.notices?.length
      ? block.notices
      : block.noticeConfig
        ? [block.noticeConfig]
        : [];
    return notices.slice(0, 3);
  };

  const handleOpenNotice = (event: React.MouseEvent<HTMLElement>, block: CustomLink) => {
    event.preventDefault();
    event.stopPropagation();
    const notices = getNoticesForBlock(block);
    recordLinkClick(block.id);
    setExpandedNoticeId(notices[0]?.id || null);
    setActiveNoticeBlock(block);
  };

  return (
    <>
      {activeStickerDragId && stickerTrashTarget && createPortal(
        <div
          aria-hidden="true"
          className={clsx(
            "pointer-events-none fixed z-[10000] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 text-white shadow-[0_14px_36px_rgba(0,0,0,0.28)] transition-all duration-150",
            isStickerOverTrash ? "scale-115 border-white bg-[#ff3b30]" : "border-white/90 bg-[#171714]/88 backdrop-blur-md",
          )}
          style={{ left: stickerTrashTarget.x, top: stickerTrashTarget.y, width: stickerTrashTarget.radius * 2, height: stickerTrashTarget.radius * 2 }}
        >
          <Trash2 className={clsx("transition-transform", isStickerOverTrash ? "h-8 w-8 scale-110" : "h-7 w-7")} />
          <span className="mt-1 text-[9px] font-black">삭제</span>
        </div>,
        document.body,
      )}
      <div
        ref={previewContainerRef}
        data-public-profile={isPublic ? 'true' : undefined}
        className={clsx(
          containerClass,
          isPublic
            ? "rounded-none sm:rounded-[2.5rem] sm:my-10 shadow-xl overflow-hidden max-w-[480px] mx-auto"
            : ""
        )}
        style={containerStyle}
      >
        {pageStickers.map((pageSticker, index) => {
          const dragPosition = stickerDragPositions[pageSticker.id];
          const stickerX = dragPosition?.x ?? pageSticker.x;
          const stickerY = dragPosition?.y ?? pageSticker.y;
          const stickerSize = Math.max(8, Math.min(40, stickerResizeSizes[pageSticker.id] ?? pageSticker.size ?? 18));
          return (
          <div
            key={pageSticker.id}
            role={props.stickerEditable ? "button" : undefined}
            tabIndex={props.stickerEditable ? 0 : undefined}
            aria-label={props.stickerEditable ? `${index + 1}번 스티커 위치 이동` : undefined}
            title={props.stickerEditable ? "드래그해서 스티커를 이동하세요" : undefined}
            onPointerDown={(event) => handleStickerPointerDown(event, pageSticker.id)}
            onPointerMove={(event) => handleStickerPointerMove(event, pageSticker.id)}
            onPointerUp={(event) => finishStickerDrag(event, pageSticker.id)}
            onPointerCancel={(event) => finishStickerDrag(event, pageSticker.id)}
            onTouchStart={(event) => handleStickerTouchStart(event, pageSticker.id)}
            onTouchMove={(event) => handleStickerTouchMove(event, pageSticker.id)}
            onTouchEnd={(event) => finishStickerTouch(event, pageSticker.id)}
            onTouchCancel={(event) => finishStickerTouch(event, pageSticker.id)}
            className={clsx(
              "group absolute z-40 select-none drop-shadow-lg",
              props.stickerEditable ? "cursor-grab rounded-2xl ring-2 ring-white/80 active:cursor-grabbing active:scale-105" : "pointer-events-none"
            )}
            style={{ left: `${stickerX}%`, top: `${stickerY}%`, width: `${stickerSize}%`, transform: 'translate(-50%, -50%)', touchAction: 'none' }}
          >
            {/^(?:https?:\/\/|\/)/.test(pageSticker.value) ? <img src={pageSticker.value} alt="" draggable={false} className="h-auto w-full object-contain" /> : <span className="block text-center leading-none" style={{ fontSize: `${Math.max(24, stickerSize * 3)}px` }}>{pageSticker.value}</span>}
            {props.stickerEditable && !props.design && hasFinePointer && (
              <button
                type="button"
                aria-label={`${index + 1}번 스티커 삭제`}
                title="스티커 삭제"
                onClick={(event) => removeStickerDirectly(event, pageSticker.id)}
                onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
                className="absolute -right-3 -top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#171714] text-white opacity-0 shadow-lg transition hover:scale-110 hover:bg-[#ff3b30] group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {props.stickerEditable && !props.design && hasFinePointer && (
              <button
                type="button"
                aria-label={`${index + 1}번 스티커 크기 조절`}
                title="드래그해서 크기를 조절하세요"
                onPointerDown={(event) => handleStickerResizePointerDown(event, pageSticker.id, stickerSize)}
                onPointerMove={(event) => handleStickerResizePointerMove(event, pageSticker.id)}
                onPointerUp={(event) => finishStickerResize(event, pageSticker.id)}
                onPointerCancel={(event) => finishStickerResize(event, pageSticker.id)}
                className="absolute -bottom-3 -right-3 flex h-8 w-8 cursor-nwse-resize items-center justify-center rounded-full border-2 border-white bg-[#171714] text-white opacity-0 shadow-lg transition hover:scale-110 group-hover:opacity-100 group-focus-within:opacity-100"
                style={{ touchAction: 'none' }}
              >
                <MoveDiagonal2 className="h-4 w-4" />
              </button>
            )}
          </div>
          );
        })}
        {/* Banner Header Image (Only for banner layout - flush to top edge) */}
        {profile.profileLayout === "banner" && (
          <div className="w-full h-48 sm:h-52 bg-gray-200 relative shrink-0 overflow-hidden">
            {profile.bannerUrl ? (
              <img
                src={profile.bannerUrl}
                alt="배너 이미지"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                Banner Image Preview
              </div>
            )}
          </div>
        )}

        {/* Top Header Icons */}
        <div
          className={clsx(
            "w-full flex justify-between items-center p-6 z-30",
            profile.profileLayout === "banner"
              ? "absolute top-0 left-0 right-0"
              : "relative"
          )}
        >
          {/* <div
            className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition shadow-2xs",
              profile.profileLayout === "banner"
                ? "bg-white/40 backdrop-blur-md hover:bg-white/60 text-gray-900"
                : "bg-black/5 hover:bg-black/10"
            )}
          >
            <Link2
              className={clsx(
                "w-5 h-5",
                profile.profileLayout === "banner" ? "text-gray-900" : textClass
              )}
            />
          </div> */}
          <button
            type="button"
            aria-label="프로필 공유"
            title="프로필 공유"
            onClick={() => setIsProfileShareOpen(true)}
            className={clsx(
              "w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition shadow-2xs hover:scale-105",
              profile.profileLayout === "banner"
                ? "bg-white/70 backdrop-blur-md hover:bg-white/90 text-gray-900"
                : "bg-black/5 hover:bg-black/10"
            )}
          >
            <Share2 className={clsx("w-5 h-5", profile.profileLayout === "banner" ? "text-gray-900" : textClass)} />
          </button>

          <div className="flex items-center gap-2">
            {showStoreButton && (
              <a
                href={storeUrl}
                target={isPublic ? undefined : '_blank'}
                rel={isPublic ? undefined : 'noopener noreferrer'}
                aria-label="스토어 가기"
                title="스토어 가기"
                className={clsx(
                  "flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs font-black shadow-2xs transition hover:scale-105",
                  profile.profileLayout === "banner"
                    ? "bg-white/80 text-gray-900 backdrop-blur-md hover:bg-white"
                    : "bg-black/5 hover:bg-black/10",
                  profile.profileLayout === "banner" ? undefined : textClass,
                )}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>스토어</span>
              </a>
            )}
            {subscriptionBlock && (
              <button
                type="button"
                aria-label="이 페이지 구독하기"
                title="구독하기"
                onClick={() => setIsSubscriptionOpen(true)}
                className={clsx(
                  "w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition shadow-2xs hover:scale-105",
                  profile.profileLayout === "banner"
                    ? "bg-white/70 backdrop-blur-md hover:bg-white/90 text-gray-900"
                    : "bg-black/5 hover:bg-black/10"
                )}
              >
                <Bell className={clsx("w-5 h-5", profile.profileLayout === "banner" ? "text-gray-900" : textClass)} />
              </button>
            )}
            {!showStoreButton && !subscriptionBlock && <span aria-hidden="true" className="h-11 w-11" />}
          </div>
        </div>

        <div className="w-full px-6 flex flex-col items-center pb-24 relative z-10">
          {/* Profile Avatar based on Layout */}
          <div className="relative">
            {profile.profileLayout === "hero" ? (
              <div className="w-full max-w-[320px] relative overflow-hidden mb-4 shrink-0 flex flex-col items-center">
                <div
                  className="relative w-full aspect-square max-h-[300px] overflow-hidden flex items-center justify-center"
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 98%)",
                    maskImage:
                      "linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 98%)",
                  }}
                >
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
              </div>
            ) : profile.profileLayout === "banner" ? (
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-white shadow-md -mt-12 shrink-0 z-20 bg-white">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    width={640}
                    height={640}
                    className="w-full h-full bg-black/5 object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-black/5" />
                )}
              </div>
            ) : (
              /* Classic Default - Pure Avatar Image without backgrounds or borders */
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 shrink-0 flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    width={640}
                    height={640}
                    className="w-full h-full bg-black/5 object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-black/5" />
                )}
              </div>
            )}
          </div>

          {/* Profile Title / Logo */}
          {profile.titleStyle === "logo" && profile.logoUrl ? (
            <div className="mb-2 max-w-[220px] max-h-16 flex items-center justify-center">
              <img
                src={profile.logoUrl}
                alt="로고"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="max-h-14 w-auto object-contain"
              />
            </div>
          ) : (
            <h1
              className={clsx(
                "text-[22px] font-bold tracking-tight mb-1 text-center",
                textClass
              )}
              style={{
                ...(profile.titleColor ? { color: profile.titleColor } : {}),
                ...(titleFontFamily
                  ? { fontFamily: `'${titleFontFamily}', sans-serif` }
                  : {}),
              }}
            >
              {profile.name || profile.username || "사용자 이름"}
            </h1>
          )}

          {/* Bio */}
          {profile.showBio !== false && (
            <p
              className={clsx(
                "text-sm text-center font-medium mb-2 max-w-xs",
                textClass,
                "opacity-80"
              )}
            >
              {profile.bio || "소개를 입력해 주세요"}
            </p>
          )}

          {/* Contact Email Badge (Click to Copy) */}
          {profile.showEmail !== false && profile.email && (
            <button
              type="button"
              onClick={handleCopyEmail}
              className={clsx(
                "inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold mb-5 px-3.5 py-1.5 rounded-full transition cursor-pointer shadow-2xs group hover:scale-105",
                templateValue.startsWith("neo-")
                  ? "bg-black text-white border-2 border-black"
                  : "bg-black/5 hover:bg-black/10 text-gray-900",
                textClass,
                "opacity-90"
              )}
              title="이메일 주소 복사"
              style={socialControlStyle}
            >
              <Mail className="w-3.5 h-3.5 opacity-80" />
              <span>{profile.email}</span>
              {emailCopied ? (
                <span className="text-[10px] font-bold text-green-500 flex items-center gap-0.5 ml-0.5 animate-in zoom-in-50">
                  <Check className="w-3.5 h-3.5 text-green-500" /> 복사됨
                </span>
              ) : (
                <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100 ml-0.5 transition" />
              )}
            </button>
          )}

          {/* Social Icons */}
          {socialLinks.length > 0 && (
            <div className="flex gap-4 mb-8 flex-wrap justify-center items-center">
              {socialLinks.map((link) => {
                const Icon = getLinkIcon(link.platform);
                const targetUrl = link.url || "#";
                return (
                  <a
                    key={link.id || link.platform}
                    href={
                      targetUrl.match(/^https?:\/\//)
                        ? targetUrl
                        : `https://${targetUrl}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordLinkClick(`social-${link.id || link.platform}`)}
                    className={clsx(
                      "w-11 h-11 flex items-center justify-center transition hover:scale-110",
                      textClass
                    )}
                    style={getSocialIconStyle()}
                    title={link.platform}
                  >
                    <Icon className="w-7 h-7 object-contain" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Custom Links & Collections */}
          <div className="w-full space-y-4 mb-12">
            {visibleCustomLinks.map((block) => {
              if (block.type === "collection") {
                const collectionTitle = block.title.trim();
                const collectionLinks = (block.links || []).filter((link) =>
                  link.isVisible !== false &&
                  (link.blockKind !== "store" || (STOREFRONT_AVAILABLE && (profile.storefront?.enabled === true || !isPublic))) &&
                  (link.type !== 'map' || Boolean(link.mapConfig?.query.trim()))
                );
                const collectionStyle = block.collectionStyle || (block.layout && block.layout !== 'list' ? 'image' : 'classic');
                const effectiveCollectionLayout = (collectionStyle === 'image' ? 'grid' : (block.layout || 'list')) as 'list' | 'grid' | 'carousel';
                if (collectionLinks.length === 0) {
                  if (isPublic || collectionStyle !== 'image') return null;
                  const placeholderColumns = block.collectionColumns === 3 ? 3 : 2;
                  return (
                    <div key={block.id} data-preview-block-id={block.id} className="w-full pt-2" aria-label={`${placeholderColumns}열 이미지 그룹 미리보기`}>
                      {collectionTitle && <h3 className={clsx("mb-3 pl-1 text-sm font-bold", textClass)}>{collectionTitle}</h3>}
                      <div className={clsx("grid gap-3", placeholderColumns === 3 ? "grid-cols-3" : "grid-cols-2")} aria-hidden="true">
                        {Array.from({ length: placeholderColumns }).map((_, index) => (
                          <div
                            key={index}
                            data-preview-block-surface={`${block.id}-placeholder-${index}`}
                            className="aspect-[3/4] overflow-hidden border border-dashed border-current bg-white/5 opacity-35 backdrop-blur-[1px]"
                            style={{ ...getCustomCardStyle(block), padding: 0 }}
                          >
                            <div className="flex h-full flex-col items-center justify-center gap-2">
                              <span className="h-8 w-8 rounded-full border border-dashed border-current" />
                              <span className="h-1.5 w-1/2 rounded-full bg-current opacity-40" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (effectiveCollectionLayout === "carousel") {
                  const carouselNavigation = collectionCarouselNavigation[block.id];
                  const canGoBack = carouselNavigation?.canGoBack ?? false;
                  const canGoForward = carouselNavigation?.canGoForward ?? (collectionLinks.length > 2);
                  return (
                    <div key={block.id} data-preview-block-id={block.id} className="w-full pt-2">
                      {collectionTitle && <h3 className={clsx("mb-3 pl-1 text-sm font-bold", textClass)}>{collectionTitle}</h3>}
                      <div className="group/carousel relative">
                        <div
                          ref={(element) => { collectionCarouselRefs.current[block.id] = element; }}
                          onScroll={() => updateCollectionCarouselNavigation(block.id)}
                          className="-mx-4 -my-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                          {collectionLinks.map((link) => {
                            const isImage = link.thumbnailType === "image" || (!link.thumbnailType && link.icon);
                            const isNone = link.thumbnailType === "none";
                            const IconComp = getPreviewLinkIcon(link);
                            const destination = getLinkDestination(link);
                            if (link.type === 'image') {
                              return (
                                <a
                                  key={link.id}
                                  data-preview-block-surface={link.id}
                                  href={destination.href}
                                  target={destination.isInternal ? '_self' : '_blank'}
                                  rel="noopener noreferrer"
                                  onClick={() => recordLinkClick(link.id)}
                                  className={clsx("flex aspect-[3/4] w-[43%] min-w-[43%] snap-start flex-col overflow-hidden rounded-xl shadow-sm transition hover:-translate-y-1 hover:shadow-lg", buttonSurfaceClass)}
                                  style={{ ...getCustomCardStyle(link), padding: 0 }}
                                >
                                  <span className="image-card-media relative min-h-0 w-full flex-1 overflow-hidden">
                                    {link.icon ? (
                                      <img src={link.icon} alt={link.title || '이미지 링크'} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="flex h-full w-full items-center justify-center bg-black/5 text-xs font-bold opacity-60">이미지 추가</span>
                                    )}
                                  </span>
                                  {link.title && link.title !== '이미지 링크' && (
                                    <div className="image-card-caption flex min-h-14 items-center justify-center px-3 py-2 text-center text-sm font-black leading-tight">{link.title}</div>
                                  )}
                                </a>
                              );
                            }
                            return (
                              <a
                                key={link.id}
                                data-preview-block-surface={link.id}
                                href={destination.href}
                                target={destination.isInternal ? "_self" : "_blank"}
                                rel="noopener noreferrer"
                                onClick={() => recordLinkClick(link.id)}
                                className="flex aspect-square w-[43%] min-w-[43%] snap-start flex-col items-center justify-center rounded-3xl border border-white/30 bg-white/20 p-3 backdrop-blur-md transition hover:-translate-y-1 hover:shadow-lg"
                                style={{
                                  ...(isColor && templateValue !== "#0f172a" ? { backgroundColor: "rgba(0,0,0,0.05)", borderColor: "rgba(0,0,0,0.1)" } : {}),
                                  ...getCustomCardStyle(link),
                                }}
                              >
                                {!isNone && <div className="mb-3 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full" style={getThemedLinkIconContainerStyle(link)}>{isImage && link.icon ? <img src={link.icon} alt={link.title} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <IconComp className="h-6 w-6" />}</div>}
                                <span className={clsx("line-clamp-3 text-center text-sm font-bold leading-snug", textClass)}>{link.title || "링크 제목"}</span>
                              </a>
                            );
                          })}
                        </div>
                        {canGoBack && <button type="button" onClick={() => scrollCollectionCarousel(block.id, -1)} className="absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/70 text-gray-800 opacity-80 shadow-sm backdrop-blur-md transition hover:scale-105 hover:bg-white/90 hover:opacity-100" aria-label="이전 컬렉션 링크"><ChevronLeft className="h-5 w-5" /></button>}
                        {canGoForward && <button type="button" onClick={() => scrollCollectionCarousel(block.id, 1)} className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/70 text-gray-800 opacity-80 shadow-sm backdrop-blur-md transition hover:scale-105 hover:bg-white/90 hover:opacity-100" aria-label="다음 컬렉션 링크"><ChevronRight className="h-5 w-5" /></button>}
                      </div>
                    </div>
                  );
                }
                if (effectiveCollectionLayout === "grid") {
                  const linkCount = collectionLinks.length;
                  const isEven = linkCount > 0 && linkCount % 2 === 0;
                  const gridColsClass = collectionStyle === 'image'
                    ? (block.collectionColumns === 3 ? "grid-cols-3" : "grid-cols-2")
                    : (isEven ? "grid-cols-2" : "grid-cols-3");

                  return (
                    <div key={block.id} data-preview-block-id={block.id} className="w-full pt-2">
                      {collectionTitle && (
                        <h3
                          className={clsx(
                            "font-bold text-sm mb-3 pl-1",
                            textClass
                          )}
                        >
                          {collectionTitle}
                        </h3>
                      )}
                      <div className={clsx("grid gap-3", gridColsClass)}>
                        {collectionLinks.map((link) => {
                          const isImage =
                            link.thumbnailType === "image" ||
                            (!link.thumbnailType && link.icon);
                          const isIcon =
                            link.thumbnailType === "icon" ||
                            (!link.thumbnailType && link.iconName);
                          const isNone = link.thumbnailType === "none";
                          const IconComp = getPreviewLinkIcon(link);
                          const destination = getLinkDestination(link);

                          if (collectionStyle === 'image' || link.type === 'image') {
                            return (
                              <a
                                key={link.id}
                                data-preview-block-surface={link.id}
                                href={destination.href}
                                target={destination.isInternal ? '_self' : '_blank'}
                                rel="noopener noreferrer"
                                onClick={() => recordLinkClick(link.id)}
                                className={clsx("flex aspect-[3/4] min-w-0 flex-col overflow-hidden rounded-xl shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg", buttonSurfaceClass)}
                                style={{ ...getCustomCardStyle(link), padding: 0 }}
                              >
                                <span className="image-card-media relative min-h-0 w-full flex-1 overflow-hidden">
                                  {isImage && link.icon ? (
                                    <img src={link.icon} alt={link.title || '이미지 링크'} loading="lazy" decoding="async" className="h-full w-full object-cover" style={getThumbnailImageStyle(link)} />
                                  ) : isIcon ? (
                                    <span className="flex h-full w-full items-center justify-center"><IconComp className="h-8 w-8 opacity-60" /></span>
                                  ) : (
                                    <span className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-bold opacity-45">썸네일 없음</span>
                                  )}
                                </span>
                                {link.title && link.title !== '이미지 링크' && (
                                  <div className={clsx("image-card-caption flex min-h-14 items-center justify-center px-2 py-2 text-center font-black leading-tight", block.collectionColumns === 3 ? "text-[13px]" : "text-[15px]")}>{link.title}</div>
                                )}
                              </a>
                            );
                          }

                          return (
                            <a
                              key={link.id}
                              data-preview-block-surface={link.id}
                              href={destination.href}
                              target={destination.isInternal ? "_self" : "_blank"}
                              rel="noopener noreferrer"
                              onClick={() => recordLinkClick(link.id)}
                              className={clsx(
                                "rounded-2xl flex flex-col items-center justify-center p-2 bg-white/20 backdrop-blur-md border border-white/20 hover:scale-105 transition-transform",
                                isEven ? "aspect-[4/3]" : "aspect-square"
                              )}
                              style={{
                                ...(isColor && templateValue !== "#0f172a"
                                  ? {
                                      backgroundColor: "rgba(0,0,0,0.05)",
                                      borderColor: "rgba(0,0,0,0.1)",
                                    }
                                  : {}),
                                ...getCustomCardStyle(link),
                              }}
                            >
                              {!isNone && (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 overflow-hidden shrink-0" style={getThemedLinkIconContainerStyle(link)}>
                                  {isImage && link.icon ? (
                                    <img
                                      src={link.icon}
                                      alt={link.title}
                    width={640}
                    height={640}
                    className="w-full h-full bg-black/5 object-cover"
                                    />
                                  ) : (
                                    <IconComp
                                      className="w-5 h-5"
                                    />
                                  )}
                                </div>
                              )}
                              <span
                                className={clsx(
                                  "text-[10px] font-bold text-center line-clamp-2 leading-tight",
                                  textClass
                                )}
                              >
                                {link.title || "링크 제목"}
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else {
                  // List Layout
                  return (
                    <div key={block.id} data-preview-block-id={block.id} className="w-full pt-2">
                      {collectionTitle && (
                        <h3
                          className={clsx(
                            "font-bold text-sm mb-3 pl-1",
                            textClass
                          )}
                        >
                          {collectionTitle}
                        </h3>
                      )}
                      <div className="space-y-3">
                        {collectionLinks.map((link) => {
                          const isImage =
                            link.thumbnailType === "image" ||
                            (!link.thumbnailType && link.icon);
                          const isIcon =
                            link.thumbnailType === "icon" ||
                            (!link.thumbnailType && link.iconName);
                          const isNone = link.thumbnailType === "none";
                          const IconComp = getPreviewLinkIcon(link);
                          const destination = getLinkDestination(link);

                          if (link.type === 'image') {
                            return (
                              <a
                                key={link.id}
                                data-preview-block-surface={link.id}
                                href={destination.href}
                                target={destination.isInternal ? '_self' : '_blank'}
                                rel="noopener noreferrer"
                                onClick={() => recordLinkClick(link.id)}
                                className={clsx('block w-full overflow-hidden rounded-xl transition-transform hover:-translate-y-0.5', shadowClass, buttonSurfaceClass)}
                                style={{ ...getCustomCardStyle(link), padding: 0, height: 'auto' }}
                              >
                                <div className="image-card-media w-full overflow-hidden">
                                  {link.icon ? (
                                    <img src={link.icon} alt={link.title || '이미지 링크'} loading="lazy" decoding="async" className="block h-auto w-full object-cover" />
                                  ) : (
                                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-black/5 text-sm font-bold opacity-60">이미지 추가</div>
                                  )}
                                </div>
                                {link.title && link.title !== '이미지 링크' && (
                                  <div className="image-card-caption flex min-h-14 items-center justify-center px-5 py-3 text-center text-sm font-bold">{link.title}</div>
                                )}
                              </a>
                            );
                          }

                          return (
                            <div key={link.id} className="relative w-full">
                            <a
                              data-preview-block-surface={link.id}
                              href={destination.href}
                              target={destination.isInternal ? "_self" : "_blank"}
                              rel="noopener noreferrer"
                              onClick={() => recordLinkClick(link.id)}
                              className={clsx(buttonClass, "relative min-h-[68px]")}
                              style={getCustomLinkStyle(link)}
                            >
                              {!isNone && (
                                <div
                                  className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full"
                                  style={getThemedLinkIconContainerStyle(link)}
                                >
                                  {isImage && link.icon ? (
                                    <img
                                      src={link.icon}
                                      alt={link.title}
                                      className="w-full h-full object-cover"
                                      style={getThumbnailImageStyle(link)}
                                    />
                                  ) : (
                                    <IconComp className="w-5 h-5" />
                                  )}
                                </div>
                              )}
                              <span className="pointer-events-none absolute inset-x-16 top-1/2 -translate-y-1/2 truncate text-center font-semibold text-[15px]">
                                {link.title || "링크 제목"}
                              </span>
                            </a>
                            <button
                              type="button"
                              onClick={(e) => handleOpenShareModal(e, link)}
                              className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition hover:bg-black/10"
                              aria-label={`${link.title || '링크'} 공유`}
                              title="링크 공유"
                            >
                              <EllipsisVertical className="h-4 w-4 opacity-55 hover:opacity-100" />
                            </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              }

              // Normal standalone link
              const isImage =
                block.thumbnailType === "image" ||
                (!block.thumbnailType && block.icon);
              const usesDefaultFileIcon =
                block.type === "file" && !block.icon && !block.iconName;
              const isNoticeBlock =
                block.type === "notice" ||
                block.url?.includes("/notice") ||
                block.title?.includes("공지");
              const isIcon =
                !isNoticeBlock && (
                  block.thumbnailType === "icon" ||
                  (!block.thumbnailType && block.iconName) ||
                  usesDefaultFileIcon
                );
              const isNone = !isNoticeBlock && block.thumbnailType === "none" && !usesDefaultFileIcon;
              const IconComp = getPreviewLinkIcon(block);

              if (block.type === 'image') {
                const destination = getLinkDestination(block);
                const hasCaption = Boolean(block.title && block.title !== '이미지 링크');
                return (
                  <a
                    key={block.id}
                    data-preview-block-id={block.id}
                    data-preview-block-surface={block.id}
                    href={destination.href}
                    target={destination.isInternal ? '_self' : '_blank'}
                    rel="noopener noreferrer"
                    onClick={() => recordLinkClick(block.id)}
                    className={clsx(
                      'group block w-full overflow-hidden transition-transform hover:-translate-y-0.5',
                      shadowClass,
                      'rounded-xl',
                      buttonSurfaceClass,
                    )}
                    style={{
                      ...getCustomCardStyle(block),
                      padding: 0,
                      height: 'auto',
                    }}
                  >
                    <div className="image-card-media w-full overflow-hidden">
                      {block.icon ? (
                        <img
                          src={block.icon}
                          alt={block.title || '이미지 링크'}
                          className="block h-auto w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center bg-black/5 px-6 text-center text-sm font-bold opacity-60">
                          관리 화면에서 이미지를 추가해주세요
                        </div>
                      )}
                    </div>
                    {hasCaption && (
                      <div className="image-card-caption flex min-h-14 items-center justify-between gap-3 px-5 py-3">
                        <span className="min-w-0 flex-1 truncate text-center text-[15px] font-bold">{block.title}</span>
                        <EllipsisVertical className="h-5 w-5 shrink-0 opacity-55" />
                      </div>
                    )}
                  </a>
                );
              }

              if (block.type === 'donation') {
                return (
                  <div key={block.id} data-preview-block-id={block.id} className="w-full">
                    <button
                      type="button"
                      onClick={() => {
                        recordLinkClick(block.id);
                        setActiveDonationBlock(block);
                      }}
                      className={buttonClass}
                      style={getCustomLinkStyle(block)}
                    >
                      {!isNone && (
                        <div className={clsx("w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden", templateValue.startsWith("neo-") ? "bg-[#E54D26] text-white border-2 border-black font-bold" : "bg-[#E54D26]/10 text-[#E54D26]")} style={getThemedLinkIconContainerStyle(block)}>
                          {isImage && block.icon ? <img src={block.icon} alt={block.title} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <IconComp className="w-5 h-5" />}
                        </div>
                      )}
                      <span className="flex-1 text-center font-bold text-[15px]">{block.donationConfig?.mainText || block.donationConfig?.buttonText || block.title || "도네이션"}</span>
                      <span aria-hidden="true" className="h-9 w-9 shrink-0" />
                    </button>
                    <DonationFeed ownerUid={ownerUid} blockId={block.id} style={getCustomLinkStyle(block)} />
                  </div>
                );
              }

              if (block.type === 'file') {
                const downloadUrl = getPublicFileDownloadUrl(
                  block.fileConfig?.filePath,
                  block.fileConfig?.fileUrl,
                  block.fileConfig?.fileName,
                );
                const hasDownloadFile = Boolean(downloadUrl);
                return (
                  <div
                    key={block.id}
                    data-preview-block-id={block.id}
                    className={clsx(buttonClass, "relative", !hasDownloadFile && "cursor-not-allowed opacity-60")}
                    style={getCustomCardStyle(block)}
                  >
                    {hasDownloadFile && (
                      <a
                        href={downloadUrl}
                        download={block.fileConfig?.fileName || 'download'}
                        onClick={() => recordLinkClick(block.id)}
                        className="absolute inset-0 z-0 rounded-[inherit]"
                        aria-label={`${block.fileConfig?.title || block.title || "파일"} 다운로드`}
                      />
                    )}
                    {!isNone && (
                      <div
                        className={clsx(
                          "relative z-[1] pointer-events-none w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                          templateValue.startsWith("neo-")
                            ? "bg-cyan-500 text-white border-2 border-black font-bold"
                            : "bg-cyan-50 text-cyan-600"
                        )}
                        style={getThemedLinkIconContainerStyle(block)}
                      >
                        {isImage && block.icon ? (
                          <img src={block.icon} alt={block.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <IconComp className="w-5 h-5" />
                        )}
                      </div>
                    )}
                    <div className="relative z-[1] pointer-events-none flex-1 text-center truncate">
                      <span className="font-bold text-[15px] block truncate">
                        {(block.fileConfig?.title || block.title || "파일 다운로드").replace(/^[📁📂🗂]\uFE0F?\s*/u, "")}
                      </span>
                      {block.fileConfig?.fileName && (
                        <span className="text-[11px] opacity-70 block truncate">
                          {block.fileConfig.fileName} ({block.fileConfig.fileSize || '파일'})
                        </span>
                      )}
                    </div>
                    {hasDownloadFile ? (
                      <a
                        href={downloadUrl}
                        download={block.fileConfig?.fileName || 'download'}
                        onClick={(event) => {
                          event.stopPropagation();
                          recordLinkClick(block.id);
                        }}
                        className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-black/10"
                        aria-label={`${block.fileConfig?.title || block.title || "파일"} 바로 다운로드`}
                        title="파일 다운로드"
                      >
                        <FileDown className="h-5 w-5" />
                      </a>
                    ) : (
                      <span
                        className="relative z-10 flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-full opacity-40"
                        aria-label="업로드된 파일 없음"
                        title="업로드된 파일 없음"
                      >
                        <FileDown className="h-5 w-5" />
                      </span>
                    )}
                  </div>
                );
              }

              if (block.type === 'sns') {
                const items = block.snsLinks || [];
                return (
                  <div key={block.id} data-preview-block-id={block.id} className="w-full flex items-center justify-center gap-3.5 py-3 flex-wrap">
                    {items.map((item) => {
                      const Icon = getLinkIcon(normalizeSocialPlatform(item.platform));
                      const isPhone = item.platform === 'phone';
                      const targetUrl = isPhone 
                        ? `tel:${item.value}`
                        : getSocialUrl(item.platform, item.value);

                      return (
                        <a
                          key={item.id}
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => recordLinkClick(block.id)}
                          style={getSocialIconStyle(block)}
                          className="w-12 h-12 flex items-center justify-center hover:scale-110 transition cursor-pointer"
                          title={item.platform}
                        >
                          <span style={getCustomLinkIconStyle(block)}><Icon className="w-7 h-7" /></span>
                        </a>
                      );
                    })}
                  </div>
                );
              }

              if (block.type === 'reservation') {
                const config = block.reservationConfig || {
                  headerText: "",
                  schedules: [],
                  autoNotification: false
                };
                const today = new Date();
                // The admin preview must reflect every saved item immediately, including
                // dates that have already passed. The public page still hides past items.
                const previewSchedules = isPublic
                  ? config.schedules.filter((schedule) => !isSchedulePast(schedule, today))
                  : config.schedules;
                const initialCalendarView = getInitialCalendarView(previewSchedules);
                const calendarView = calendarViews[block.id] || initialCalendarView;
                const calendarYear = calendarView.year;
                const calendarMonth = calendarView.month;
                const visibleSchedules = previewSchedules.filter((schedule) => isScheduleInCalendarMonth(schedule, calendarYear, calendarMonth));
                const firstWeekday = new Date(calendarYear, calendarMonth - 1, 1).getDay();
                const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
                const isScheduleListExpanded = expandedReservationIds[block.id] ?? false;
                const reservationBackgroundColor = block.buttonColor || buttonColor || '#FFFFFF';
                const reservationTextColor = block.buttonTextColor || buttonTextColor || pageTextColor || '#111827';
                const reservationControlBackground = block.customStyle?.calendarButtonColor || reservationTextColor;
                const reservationControlText = block.customStyle?.calendarButtonTextColor || reservationBackgroundColor;
                const reservationControlStyle: React.CSSProperties = {
                  backgroundColor: colorWithOpacity(reservationControlBackground, block.customStyle?.calendarButtonOpacity ?? 100),
                  color: colorWithOpacity(reservationControlText, block.customStyle?.calendarButtonTextOpacity ?? 100),
                  borderColor: colorWithOpacity(reservationControlText, Math.min(block.customStyle?.calendarButtonTextOpacity ?? 100, 72)),
                  borderStyle: 'solid',
                  borderWidth: '1px',
                  boxShadow: `inset 0 0 0 1px ${colorWithOpacity(reservationControlText, 18)}`,
                };
                const schedulesForDay = (day: number) => visibleSchedules.filter((schedule) => isScheduleOnCalendarDay(schedule, calendarYear, calendarMonth, day));
                const changeCalendarMonth = (offset: number) => {
                  const nextDate = new Date(calendarYear, calendarMonth - 1 + offset, 1);
                  setCalendarViews((current) => ({ ...current, [block.id]: { year: nextDate.getFullYear(), month: nextDate.getMonth() + 1 } }));
                  setActiveCalendarDay(null);
                };
                return (
                  <div
                    key={block.id}
                    data-preview-block-id={block.id}
                    className={clsx(
                      "relative w-full p-5 space-y-4 transition-all",
                      activeCalendarDay?.blockId === block.id ? "overflow-visible" : "overflow-hidden",
                      roundnessClass,
                      shadowClass,
                      buttonStyle === 'glass' && "bg-white/20 backdrop-blur-md border border-white/30",
                      buttonStyle === 'outline' && "bg-transparent border-2 border-current",
                      buttonStyle === 'solid' && themeDefaultBtnClass,
                      activeCalendarDay?.blockId === block.id ? "z-[200]" : "z-0"
                    )}
                    data-preview-block-surface={block.id}
                    style={getCustomCardStyle(block)}
                  >
                    {/* Calendar Header with Navigation */}
                    <div className="flex items-center justify-center gap-4 px-2">
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(-1)}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold opacity-90 transition hover:scale-105 hover:opacity-100 cursor-pointer"
                        style={reservationControlStyle}
                        aria-label={`${calendarYear}년 ${calendarMonth}월 이전 달`}
                      >
                        &lt;
                      </button>
                      <span className="font-extrabold text-base tracking-tight">{calendarYear}.{String(calendarMonth).padStart(2, '0')}</span>
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(1)}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold opacity-90 transition hover:scale-105 hover:opacity-100 cursor-pointer"
                        style={reservationControlStyle}
                        aria-label={`${calendarYear}년 ${calendarMonth}월 다음 달`}
                      >
                        &gt;
                      </button>
                    </div>

                    {/* Weekdays Row */}
                    <div className="grid grid-cols-7 text-center text-xs font-extrabold opacity-75">
                      <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-semibold">
                      {Array.from({ length: firstWeekday }, (_, index) => <span key={`empty-${index}`} />)}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                        const daySchedules = schedulesForDay(d);
                        const hasSchedule = daySchedules.length > 0;
                        const isSelected = activeCalendarDay?.blockId === block.id && activeCalendarDay.day === d;
                        const isToday = today.getFullYear() === calendarYear && today.getMonth() + 1 === calendarMonth && today.getDate() === d;
                        const weekdayIndex = (firstWeekday + d - 1) % 7;
                        return (
                          <button
                            type="button"
                            key={d}
                            disabled={!hasSchedule}
                            onClick={() => hasSchedule && setActiveCalendarDay(isSelected ? null : { blockId: block.id, day: d })}
                            className={clsx(
                              "group relative h-11 w-11 mx-auto rounded-full flex items-center justify-center transition-all text-xs",
                              isSelected ? "z-[220]" : "z-0",
                              isToday ? "font-black text-[13px]" : "font-semibold",
                              isSelected
                                ? "shadow-md scale-105"
                                : hasSchedule
                                  ? "opacity-90 hover:opacity-100 hover:scale-110 hover:shadow-md cursor-pointer"
                                  : "opacity-70 cursor-default"
                            )}
                            style={hasSchedule ? reservationControlStyle : undefined}
                            aria-label={hasSchedule ? `${calendarMonth}월 ${d}일 일정 ${daySchedules.length}개` : `${calendarMonth}월 ${d}일`}
                          >
                            {d}
                            {hasSchedule && <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full border border-current bg-current transition-transform group-hover:scale-125" />}
                            {isSelected && (
                              <span
                                className={clsx(
                                  "absolute z-[999] top-10 w-max max-w-[min(12rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-gray-950 text-white px-3 py-2.5 text-left shadow-2xl border border-white/10 cursor-default",
                                  weekdayIndex <= 1 && "left-0",
                                  weekdayIndex >= 5 && "right-0",
                                  weekdayIndex > 1 && weekdayIndex < 5 && "left-1/2 -translate-x-1/2"
                                )}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <span className="block space-y-1.5">{daySchedules.map((schedule) => <span key={schedule.id} className="block border-t border-white/15 pt-1.5 first:border-0 first:pt-0"><span className="flex max-w-full items-baseline gap-2"><span className="min-w-0 whitespace-normal break-words text-[11px] font-black">{schedule.title}</span><span className="shrink-0 text-[9px] font-semibold text-white/60">{formatScheduleTime(schedule)}</span></span></span>)}</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Scheduled Events: stacked when collapsed */}
                    <div className="pt-1">
                      <button type="button" disabled={visibleSchedules.length === 0} onClick={() => setExpandedReservationIds((current) => ({ ...current, [block.id]: !isScheduleListExpanded }))} className="flex min-h-11 w-full items-center justify-between px-1 text-xs font-black enabled:cursor-pointer group">
                        <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> 예정 일정 {visibleSchedules.length}개</span>
                        {visibleSchedules.length > 0 && <span className="flex items-center gap-1 text-[10px] opacity-70 group-hover:opacity-100">{isScheduleListExpanded ? '접기' : '펼치기'}<ChevronDown className={clsx("w-3.5 h-3.5 transition-transform", isScheduleListExpanded && "rotate-180")} /></span>}
                      </button>
                      {visibleSchedules.length === 0 ? <div className="py-3 text-center text-xs opacity-65">예정된 일정이 없습니다.</div> : isScheduleListExpanded ? (
                        <div className="space-y-2">{visibleSchedules.map((sched) => (
                          <div key={sched.id} className="p-3 rounded-2xl flex items-center gap-3 border border-current/20 shadow-2xs animate-in fade-in slide-in-from-top-1" style={reservationControlStyle}>
                            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2"><div className="truncate text-xs font-extrabold">{sched.title}</div><div className="shrink-0 text-[10px] font-bold opacity-65">{formatCompactScheduleDate(sched)}</div></div>
                          </div>
                        ))}</div>
                      ) : (
                        <button type="button" onClick={() => setExpandedReservationIds((current) => ({ ...current, [block.id]: true }))} className="relative block w-full h-[78px] cursor-pointer group" aria-label={`예정 일정 ${visibleSchedules.length}개 펼치기`}>
                          {visibleSchedules.slice(0, 3).reverse().map((sched, reverseIndex, visible) => {
                            const depth = visible.length - reverseIndex - 1;
                            return <span key={sched.id} className="absolute inset-x-0 top-0 p-3 rounded-2xl flex items-center gap-3 border border-current/20 shadow-sm text-left transition-transform group-hover:-translate-y-1" style={{ ...reservationControlStyle, transform: `translateY(${depth * 7}px) scale(${1 - depth * 0.025})`, zIndex: 10 - depth }}><span className="flex min-w-0 flex-1 items-baseline justify-between gap-2"><span className="truncate text-xs font-extrabold">{sched.title}</span><span className="shrink-0 text-[10px] font-bold opacity-65">{formatCompactScheduleDate(sched)}</span></span><ChevronDown className="w-4 h-4 opacity-65 shrink-0" /></span>;
                          })}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              if (block.type === 'customer_info') {
                if ((block.customerInfoConfig?.displayMode || 'header') === 'header') return null;
                const storedConfig = block.customerInfoConfig;
                const config = {
                  ...(storedConfig || { receiveEmail: true, receivePhone: false, receiveName: false }),
                  mainText: !storedConfig?.mainText || storedConfig.mainText === 'subscribe to our letter' ? '소식을 받아보세요' : storedConfig.mainText,
                  detailText: storedConfig?.detailText === 'sent every monday' ? '새 소식을 정기적으로 보내드려요' : (storedConfig?.detailText || ''),
                  submitButtonText: !storedConfig?.submitButtonText || storedConfig.submitButtonText === 'Submit' ? '제출하기' : storedConfig.submitButtonText,
                };

                return (
                  <CustomerInfoVisitorCard
                    key={block.id}
                    block={block}
                    config={config}
                    ownerUid={ownerUid}
                    previewBlockId={block.id}
                    style={getCustomLinkStyle(block)}
                    themeActionColor={block.buttonTextColor || buttonTextColor || pageTextColor || '#111827'}
                    themeActionTextColor={block.buttonColor || buttonColor || '#FFFFFF'}
                  />
                );
              }

              if (block.type === 'anonymous_message') {
                const MessageIcon = getLinkIcon(block.iconName || 'message-circle');
                return (
                  <a key={block.id} data-preview-block-id={block.id} href={`/${profile.username || 'preview'}/message`} onClick={() => recordLinkClick(block.id)} className={clsx(buttonClass, "relative min-h-[68px]")} style={getCustomLinkStyle(block)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full" style={getThemedLinkIconContainerStyle(block)}><MessageIcon className="h-5 w-5" /></span>
                    <span className="pointer-events-none absolute inset-x-16 top-1/2 -translate-y-1/2 truncate text-center text-[15px] font-bold">{block.title || '익명 메시지 보내기'}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => handleOpenShareModal(event, block)}
                      className="absolute right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition hover:bg-black/10"
                      title="링크 공유"
                    >
                      <EllipsisVertical className="h-4 w-4 opacity-55 hover:opacity-100" />
                    </span>
                  </a>
                );
              }

              if (block.type === 'affiliate_product') {
                const affiliate = block.affiliateProductConfig;
                const affiliateImageUrl = affiliate?.imageUrl || block.icon || '';
                const productUrl = getLinkDestination(block).href;
                const currency = affiliate?.currency || 'KRW';
                const formattedPrice = affiliate?.price !== undefined
                  ? new Intl.NumberFormat(store.language === 'ko' ? 'ko-KR' : 'en-US', { style: 'currency', currency, maximumFractionDigits: currency === 'KRW' || currency === 'JPY' ? 0 : 2 }).format(affiliate.price)
                  : '';
                if ((affiliate?.displayMode || 'compact') === 'compact') {
                  return (
                    <a key={block.id} data-preview-block-id={block.id} href={productUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => recordLinkClick(block.id)} className={buttonClass} style={getCustomLinkStyle(block)}>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/5">{affiliateImageUrl ? <img src={affiliateImageUrl} alt={block.title} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <ShoppingBag className="h-5 w-5 opacity-50" />}</span>
                      <span className="min-w-0 flex-1 text-center"><span className="block truncate text-[15px] font-bold">{block.title || (store.language === 'ko' ? '추천 상품' : 'Recommended product')}</span>{formattedPrice && <span className="mt-0.5 block text-xs font-semibold opacity-65">{formattedPrice}</span>}</span>
                      <ExternalLink className="h-4 w-4 shrink-0 opacity-45" />
                    </a>
                  );
                }
                return (
                  <a key={block.id} data-preview-block-id={block.id} href={productUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => recordLinkClick(block.id)} className={clsx(buttonClass, "group !block overflow-hidden !p-0 text-left")} style={getCustomCardStyle(block)}>
                    <div className="aspect-[16/10] w-full overflow-hidden bg-black/5">{affiliateImageUrl ? <img src={affiliateImageUrl} alt={block.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center"><ShoppingBag className="h-10 w-10 opacity-30" /></div>}</div>
                    <div className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="truncate text-[15px] font-extrabold">{block.title || (store.language === 'ko' ? '추천 상품' : 'Recommended product')}</p>{formattedPrice && <p className="mt-1 text-sm font-bold opacity-70">{formattedPrice}</p>}</div><ExternalLink className="h-5 w-5 shrink-0 opacity-50 transition group-hover:opacity-100" /></div>
                  </a>
                );
              }

              if (block.type === 'map') {
                const mapQuery = block.mapConfig?.query.trim() || '';
                if (!mapQuery) return null;
                if (block.mapConfig?.displayMode === 'classic') {
                  return (
                    <button key={block.id} data-preview-block-id={block.id} type="button" onClick={(event) => handleOpenMap(event, block)} className={buttonClass} style={getCustomLinkStyle(block)}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5"><MapPin className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1 text-center"><span className="block truncate text-[15px] font-bold">{block.title || (store.language === 'ko' ? '오시는 길' : 'Location')}</span><span className="mt-0.5 block truncate text-xs font-medium opacity-65">{mapQuery}</span></span>
                    </button>
                  );
                }
                return (
                  <button key={block.id} data-preview-block-id={block.id} type="button" onClick={(event) => handleOpenMap(event, block)} className={clsx(buttonClass, "group !block overflow-hidden !p-0 text-left")} style={getCustomCardStyle(block)}>
                    <MapIllustration className="h-36 w-full transition duration-300 group-hover:scale-[1.02]" />
                    <span className="flex items-center gap-3 p-4"><MapPin className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-bold">{block.title || (store.language === 'ko' ? '지도에서 보기' : 'View map')}</span><span className="mt-0.5 block truncate text-xs font-medium opacity-65">{mapQuery}</span></span></span>
                  </button>
                );
              }

              if (block.type === 'sales') {
                const salesConfig = block.salesConfig;
                const firstProduct = salesConfig?.products?.[0];
                const productCount = salesConfig?.products?.length || 0;
                const displayPrice = firstProduct
                  ? (firstProduct.discountPrice ?? firstProduct.price)
                  : null;
                const formattedPrice = displayPrice !== null
                  ? `${new Intl.NumberFormat(store.language === 'ko' ? 'ko-KR' : 'en-US').format(displayPrice)}${store.language === 'ko' ? '원' : ' KRW'}`
                  : '';
                const hasDiscount = Boolean(
                  firstProduct
                  && firstProduct.discountPrice != null
                  && firstProduct.price > 0
                  && firstProduct.discountPrice < firstProduct.price,
                );
                const discountPercent = hasDiscount && firstProduct
                  ? Math.round((1 - (firstProduct.discountPrice as number) / firstProduct.price) * 100)
                  : 0;
                const formattedOriginalPrice = hasDiscount && firstProduct
                  ? `${new Intl.NumberFormat(store.language === 'ko' ? 'ko-KR' : 'en-US').format(firstProduct.price)}${store.language === 'ko' ? '원' : ' KRW'}`
                  : '';
                const salesTitle = (salesConfig?.mainText || block.title || "실물 상품 판매").replace(/^[🛍️\s]+/u, "");
                const SalesProductIcon = salesConfig?.salesType === 'digital_file' ? FileDown : ShoppingBag;

                if (firstProduct || salesConfig?.image) {
                  if (block.linkLayout === 'image') {
                    return (
                      <button
                        key={block.id}
                        data-preview-block-id={block.id}
                        type="button"
                        onClick={() => {
                          recordLinkClick(block.id);
                          setActiveSalesBlock(block);
                        }}
                        className={clsx(buttonClass, "group !block overflow-hidden !p-0 text-left")}
                        style={getCustomCardStyle(block)}
                      >
                        <span className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-black/5">
                          {salesConfig?.image ? (
                            <img
                              src={salesConfig.image}
                              alt={firstProduct?.name || salesTitle}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <SalesProductIcon className="h-10 w-10 opacity-30" />
                          )}
                        </span>
                        <span className="relative flex min-h-16 items-center justify-between gap-3 px-4 py-3">
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="truncate text-[15px] font-extrabold">{firstProduct?.name || salesTitle}</span>
                            {hasDiscount && <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">{discountPercent}% 할인</span>}
                            {productCount > 1 && <span className="shrink-0 text-xs font-semibold opacity-55">+{productCount - 1}</span>}
                          </span>
                          <span className="shrink-0 text-right">
                            {formattedOriginalPrice && <span className="block text-[10px] font-semibold line-through opacity-45">{formattedOriginalPrice}</span>}
                            {formattedPrice && <span className="block text-sm font-black">{formattedPrice}</span>}
                          </span>
                        </span>
                      </button>
                    );
                  }
                  return (
                    <button
                      key={block.id}
                      data-preview-block-id={block.id}
                      type="button"
                      onClick={() => {
                        recordLinkClick(block.id);
                        setActiveSalesBlock(block);
                      }}
                      className={clsx(buttonClass, "group !min-h-[88px] !justify-start !gap-4 !px-3 !py-3 text-left")}
                      style={getCustomCardStyle(block)}
                    >
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black/5">
                        {salesConfig?.image ? (
                          <img
                            src={salesConfig.image}
                            alt={firstProduct?.name || salesTitle}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <SalesProductIcon className="h-7 w-7 opacity-40" />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[15px] font-extrabold">{firstProduct?.name || salesTitle}</span>
                          {hasDiscount && <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">{discountPercent}% 할인</span>}
                          {productCount > 1 && <span className="shrink-0 text-xs font-semibold opacity-55">+{productCount - 1}</span>}
                        </span>
                        <span className="shrink-0 text-right">
                          {formattedOriginalPrice && <span className="block text-[10px] font-semibold line-through opacity-45">{formattedOriginalPrice}</span>}
                          {formattedPrice && <span className="block text-sm font-black">{formattedPrice}</span>}
                        </span>
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={block.id}
                    data-preview-block-id={block.id}
                    type="button"
                    onClick={() => {
                      recordLinkClick(block.id);
                      setActiveSalesBlock(block);
                    }}
                    className={buttonClass}
                    style={getCustomLinkStyle(block)}
                  >
                    {!isNone && (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={getThemedLinkIconContainerStyle(block)}>
                        {isImage && block.icon ? (
                          <img src={block.icon} alt={block.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <IconComp className="w-5 h-5" />
                        )}
                      </div>
                    )}
                    <span className="flex-1 text-center font-bold text-[15px]">
                      {salesTitle}
                    </span>
                  </button>
                );
              }

              const destination = getLinkDestination(block);

              if (block.linkLayout === 'image') {
                const imageRatio = (block.imageAspectRatio || '4:3').replace(':', ' / ');
                return (
                  <div key={block.id} data-preview-block-id={block.id} className="relative w-full">
                  <a
                    href={destination.href}
                    target={destination.isInternal ? "_self" : "_blank"}
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      if (isNoticeBlock) handleOpenNotice(event, block);
                      else recordLinkClick(block.id);
                    }}
                    className={clsx('group block w-full overflow-hidden transition-transform hover:-translate-y-0.5', shadowClass, 'rounded-xl', buttonSurfaceClass)}
                    style={{ ...getCustomCardStyle(block), padding: 0, height: 'auto' }}
                  >
                    <span className="image-card-media relative block w-full overflow-hidden" style={{ aspectRatio: imageRatio }}>
                      {block.icon ? (
                        <img
                          src={block.icon}
                          alt={block.title || '링크 이미지'}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          style={getThumbnailImageStyle(block)}
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center px-6 text-center text-sm font-bold opacity-50">이미지를 추가해 주세요</span>
                      )}
                    </span>
                    <span className="image-card-caption relative flex min-h-14 items-center justify-center px-12 py-3">
                      <span className="w-full truncate text-center text-[15px] font-bold">{getPreviewLinkTitle(block) || '링크 제목'}</span>
                    </span>
                  </a>
                  <button type="button" onClick={(event) => handleOpenShareModal(event, block)} className="absolute bottom-1.5 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-black/10" aria-label={`${block.title || '링크'} 공유`} title="링크 공유">
                    <EllipsisVertical className="h-4 w-4 opacity-55" />
                  </button>
                  </div>
                );
              }

              return (
                <div key={block.id} data-preview-block-id={block.id} className="relative w-full">
                <a
                  href={destination.href}
                  target={destination.isInternal ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    if (isNoticeBlock) handleOpenNotice(event, block);
                    else recordLinkClick(block.id);
                  }}
                  className={clsx(buttonClass, "relative min-h-[68px]")}
                  style={getCustomLinkStyle(block)}
                >
                  {!isNone && (
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full"
                      style={getThemedLinkIconContainerStyle(block)}
                    >
                      {isImage && block.icon ? (
                        <img
                          src={block.icon}
                          alt={block.title}
                          className="w-full h-full object-cover"
                          style={getThumbnailImageStyle(block)}
                        />
                      ) : (
                        <IconComp className="w-5 h-5" />
                      )}
                    </div>
                  )}
                  <span className="pointer-events-none absolute inset-x-16 top-1/2 -translate-y-1/2 truncate text-center font-bold text-[15px]">
                    {getPreviewLinkTitle(block) || "링크 제목"}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={(e) => handleOpenShareModal(e, block)}
                  className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full transition hover:bg-black/10"
                  aria-label={`${block.title || '링크'} 공유`}
                  title="링크 공유"
                >
                  <EllipsisVertical className="h-4 w-4 opacity-55 hover:opacity-100" />
                </button>
                </div>
              );
            })}
            {visibleCustomLinks.length === 0 && (
              <div
                className={clsx(
                  "text-center py-4 opacity-50 text-sm font-medium",
                  textClass
                )}
              >
                No links added yet.
              </div>
            )}
          </div>

          <div className="mt-auto pt-8 flex flex-col items-center">
      {(props.showLinkZipBranding ?? (store.membershipPlan === 'basic')) && (
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-[calc(100%_-_1rem)] max-w-lg items-center justify-center gap-2 rounded-2xl border-2 border-black bg-white px-5 py-3 text-sm font-black text-black shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] cursor-pointer"
              >
                <Link2 className="h-4.5 w-4.5 shrink-0" />
                <span className="whitespace-nowrap">{store.language === "ko" ? "마이 링크집 만들기" : "Create my LinkZip"}</span>
              </a>
            )}
            <BusinessFooter compact showBusinessDetails={false} />
          </div>
        </div>

      </div>

      {activeNoticeBlock && createPortal(
        <div
          className={clsx(
            isPublic ? "fixed" : "absolute",
            "inset-0 z-[210] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5",
          )}
          role="presentation"
          onClick={() => setActiveNoticeBlock(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-popup-title"
            className="flex max-h-[88%] w-full max-w-xl flex-col overflow-hidden rounded-t-[1.75rem] border border-gray-200 bg-white text-gray-950 shadow-2xl sm:max-h-[80%] sm:rounded-[1.75rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff2c7] text-[#a44b00]">
                <Bell className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="notice-popup-title" className="truncate text-lg font-black">공지사항</h2>
                <p className="text-xs font-semibold text-gray-500">{getNoticesForBlock(activeNoticeBlock).length}개의 공지가 있어요.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveNoticeBlock(null)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 hover:text-black"
                aria-label="공지 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
              {getNoticesForBlock(activeNoticeBlock).length > 0 ? (
                <div className="space-y-3">
                  {getNoticesForBlock(activeNoticeBlock).map((notice, index) => {
                    const noticeId = notice.id || `notice-${index}`;
                    const isExpanded = expandedNoticeId === noticeId;
                    const cleanTitle = (notice.title || '공지사항').replace(/^\s*(?:📢|📣|📯)\s*/u, '');
                    return (
                      <article key={noticeId} className="overflow-hidden rounded-2xl border border-gray-200 bg-[#fffdfa]">
                        <button
                          type="button"
                          className="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left"
                          onClick={() => setExpandedNoticeId(isExpanded ? null : noticeId)}
                          aria-expanded={isExpanded}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black shadow-sm">{index + 1}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{cleanTitle}</span>
                          {notice.date && <time className="shrink-0 text-[11px] font-bold text-gray-400">{notice.date}</time>}
                          <ChevronDown className={clsx("h-4 w-4 shrink-0 text-gray-400 transition-transform", isExpanded && "rotate-180")} />
                        </button>
                        {isExpanded && (
                          <div className="border-t border-gray-200 px-4 py-4 text-sm font-medium leading-7 text-gray-700 whitespace-pre-wrap">
                            {notice.content || '등록된 내용이 없습니다.'}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl bg-gray-50 px-5 py-10 text-center text-sm font-semibold text-gray-500">등록된 공지가 없습니다.</div>
              )}
            </div>
          </section>
        </div>,
        isPublic
          ? document.body
          : (previewContainerRef.current?.closest<HTMLElement>('[data-map-popup-container]') || previewContainerRef.current || document.body)
      )}

      {activeMapBlock && createPortal(
        <div className={clsx(activeMapContainer ? "absolute" : "fixed", "inset-[5%] z-[200] flex flex-col overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white text-gray-950 shadow-2xl font-sans")}>
          <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="min-w-0 flex-1"><h2 className="truncate text-base font-black">{activeMapBlock.title || (store.language === 'ko' ? '오시는 길' : 'Location')}</h2><p className="truncate text-xs font-semibold text-gray-500">{activeMapBlock.mapConfig?.query}</p></div>
            <button type="button" onClick={() => setActiveMapBlock(null)} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:scale-105 hover:bg-gray-200 hover:text-black" aria-label={store.language === 'ko' ? '지도 닫기' : 'Close map'} title={store.language === 'ko' ? '닫기' : 'Close'}><X className="h-5 w-5" /></button>
          </div>
          <iframe title={`${activeMapBlock.title || '지도'} 전체화면 지도`} src={`https://www.google.com/maps?q=${encodeURIComponent(activeMapBlock.mapConfig?.query || '')}&output=embed`} className="min-h-0 flex-1 border-0" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
        </div>,
        activeMapContainer || document.body
      )}

      {isSubscriptionOpen && subscriptionBlock && createPortal(
        <SubscriptionVisitorSheet
          block={subscriptionBlock}
          config={{
            mainText: subscriptionBlock.customerInfoConfig?.mainText || '구독하기',
            detailText: subscriptionBlock.customerInfoConfig?.detailText || '중요한 소식을 빠르게 만나보세요!',
            receiveEmail: true,
            submitButtonColor: subscriptionBlock.customerInfoConfig?.submitButtonColor || buttonColor || '#111827',
            submitButtonTextColor: subscriptionBlock.customerInfoConfig?.submitButtonTextColor || buttonTextColor || '#FFFFFF',
          }}
          profile={profile}
          ownerUid={ownerUid}
          contained={!isPublic}
          onClose={() => setIsSubscriptionOpen(false)}
        />,
        isPublic
          ? document.body
          : (previewContainerRef.current?.closest<HTMLElement>('[data-map-popup-container]') || previewContainerRef.current || document.body)
      )}

      {isProfileShareOpen && createPortal(
        <ProfileShareModal
          profile={profile}
          url={shareUrl}
          contained={!isPublic}
          onClose={() => setIsProfileShareOpen(false)}
        />,
        isPublic
          ? document.body
          : (previewContainerRef.current?.closest<HTMLElement>('[data-map-popup-container]') || previewContainerRef.current || document.body)
      )}

      {/* 링크별 빠른 작업 메뉴 */}
      {shareModalItem && createPortal(
        <>
          <button
            type="button"
            aria-label="링크 메뉴 닫기"
            className={clsx(isPublic ? "fixed" : "absolute", "inset-0 z-[9998] cursor-default")}
            onClick={() => setShareModalItem(null)}
          />
          <div
            className={clsx(
              isPublic ? "fixed" : "absolute",
              "z-[9999] flex w-[132px] items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white p-1.5 text-gray-700 shadow-2xl",
            )}
            style={{ top: shareModalItem.top, left: shareModalItem.left }}
            role="menu"
            aria-label={`${shareModalItem.title || "링크"} 빠른 작업`}
          >
            <button
              type="button"
              title="링크 복사"
              aria-label="링크 복사"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition hover:bg-gray-100 hover:text-black"
              onClick={() => {
                const rawUrl = shareModalItem.url || shareUrl;
                const fullUrl = /^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
                navigator.clipboard.writeText(fullUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 1600);
              }}
            >
              {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <button
              type="button"
              title="공유"
              aria-label="공유"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition hover:bg-gray-100 hover:text-black"
              onClick={() => {
                const rawUrl = shareModalItem.url || shareUrl;
                const fullUrl = /^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
                if (navigator.share) {
                  navigator.share({ title: shareModalItem.title, url: fullUrl }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(fullUrl);
                }
                setShareModalItem(null);
              }}
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="새 탭에서 열기"
              aria-label="새 탭에서 열기"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition hover:bg-gray-100 hover:text-black"
              onClick={() => {
                const rawUrl = shareModalItem.url || shareUrl;
                const fullUrl = /^https?:\/\//.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
                window.open(fullUrl, "_blank", "noopener,noreferrer");
                setShareModalItem(null);
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </>,
        isPublic ? document.body : (previewContainerRef.current || document.body),
      )}

      {/* Visitor Donation Modal */}
      {activeDonationBlock && (
        <DonationVisitorModal
          isOpen={!!activeDonationBlock}
          onClose={() => setActiveDonationBlock(null)}
          donationConfig={activeDonationBlock.donationConfig}
          creatorName={profile.name || profile.username || '크리에이터'}
          ownerUid={ownerUid}
          blockId={activeDonationBlock.id}
          targetUsername={profile.username}
        />
      )}

      {/* Visitor Sales Product Modal */}
      {activeSalesBlock && (
        <SalesVisitorModal
          isOpen={!!activeSalesBlock}
          onClose={() => setActiveSalesBlock(null)}
          block={activeSalesBlock}
          profile={profile}
          ownerUid={ownerUid}
          beforeCreateOrder={props.beforeSalesOrder}
        />
      )}
    </>
  );
};

export default LinkTreePreview;
