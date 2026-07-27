import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useStore,
  type UserProfile,
  type SocialLink,
  type CustomLink,
  type DesignSettings,
  type ReservationScheduleItem,
} from "../store/useStore";
import { User, MoreHorizontal, Link2, X, Mail, Copy, Check, Share2, ExternalLink, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ShoppingBag, MapPin, HandHeart } from "lucide-react";
import { getLinkIcon } from "../lib/icons";
import { getSocialUrl, normalizeSocialPlatform } from "../lib/social";
import { DonationVisitorModal } from "./DonationVisitorModal";
import { DonationFeed } from "./DonationFeed";
import { CustomerInfoVisitorCard } from "./CustomerInfoVisitorCard";
import { SalesVisitorModal } from "./SalesVisitorModal";
import clsx from "clsx";
import { recordPublicLinkClick } from "../services/analyticsService";
import { MapIllustration } from "./MapIllustration";
import { getThemeDesignPreset, getThemeWallpaperStyle } from "../domain/themePresets";

interface LinkTreePreviewProps {
  profile?: UserProfile;
  templateType?: "color" | "preset";
  templateValue?: string;
  socialLinks?: SocialLink[];
  customLinks?: CustomLink[];
  isPublic?: boolean;
  ownerUid?: string;
  design?: Partial<DesignSettings>;
  stickerEditable?: boolean;
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
    return getLinkIcon(link.iconName);
  };

  const [activeDonationBlock, setActiveDonationBlock] = useState<CustomLink | null>(null);
  const [activeSalesBlock, setActiveSalesBlock] = useState<CustomLink | null>(null);
  const [activeMapBlock, setActiveMapBlock] = useState<CustomLink | null>(null);
  const [activeMapContainer, setActiveMapContainer] = useState<HTMLElement | null>(null);
  const [expandedReservationIds, setExpandedReservationIds] = useState<Record<string, boolean>>({});
  const [activeCalendarDay, setActiveCalendarDay] = useState<{ blockId: string; day: number } | null>(null);
  const [calendarViews, setCalendarViews] = useState<Record<string, { year: number; month: number }>>({});
  const collectionCarouselRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [collectionCarouselNavigation, setCollectionCarouselNavigation] = useState<Record<string, { canGoBack: boolean; canGoForward: boolean }>>({});
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [stickerDragPosition, setStickerDragPosition] = useState<{ x: number; y: number } | null>(null);
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
  const buttonOpacity = usePresetDefaults ? presetDesign.buttonOpacity : (designSource.buttonOpacity ?? store.buttonOpacity);
  const buttonTextOpacity = usePresetDefaults ? presetDesign.buttonTextOpacity : (designSource.buttonTextOpacity ?? store.buttonTextOpacity);
  const fontFamily = usePresetDefaults ? presetDesign.fontFamily : (designSource.fontFamily || store.fontFamily);
  const titleFontFamily = usePresetDefaults ? presetDesign.titleFontFamily : (designSource.titleFontFamily ?? store.titleFontFamily);
  const pageTextColor = usePresetDefaults ? presetDesign.pageTextColor : designSource.pageTextColor;
  const pageTextOpacity = usePresetDefaults ? presetDesign.pageTextOpacity : (designSource.pageTextOpacity ?? store.pageTextOpacity);
  const backgroundOpacity = usePresetDefaults ? presetDesign.backgroundOpacity : (designSource.backgroundOpacity ?? store.backgroundOpacity);
  const sticker = usePresetDefaults ? presetDesign.sticker : (designSource.sticker ?? store.sticker);
  const stickerX = stickerDragPosition?.x ?? designSource.stickerX ?? store.stickerX ?? 62;
  const stickerY = stickerDragPosition?.y ?? designSource.stickerY ?? store.stickerY ?? 22;

  const getStickerPosition = (clientX: number, clientY: number) => {
    const bounds = previewContainerRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.max(5, Math.min(95, ((clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(3, Math.min(97, ((clientY - bounds.top) / bounds.height) * 100)),
    };
  };

  const handleStickerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!props.stickerEditable || props.design) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = getStickerPosition(event.clientX, event.clientY);
    if (next) setStickerDragPosition(next);
  };

  const handleStickerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!props.stickerEditable || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const next = getStickerPosition(event.clientX, event.clientY);
    if (next) setStickerDragPosition(next);
  };

  const finishStickerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!props.stickerEditable || props.design) return;
    const next = getStickerPosition(event.clientX, event.clientY) || stickerDragPosition;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (next) store.setDesignSettings({ stickerX: next.x, stickerY: next.y });
    setStickerDragPosition(null);
  };

  let fontClass = "font-sans";
  if (fontFamily === "mono") fontClass = "font-mono";
  if (fontFamily === "serif") fontClass = "font-serif";

  let roundnessClass = "rounded-full";
  if (buttonRoundness === "none") roundnessClass = "rounded-none";
  if (buttonRoundness === "sm") roundnessClass = "rounded-md";
  if (buttonRoundness === "md") roundnessClass = "rounded-xl";
  if (buttonRoundness === "full") roundnessClass = "rounded-full";

  let shadowClass = "shadow-sm";
  if (buttonShadow === "none") shadowClass = "shadow-none";
  if (buttonShadow === "soft") shadowClass = "shadow-sm";
  if (buttonShadow === "strong") shadowClass = "shadow-lg";
  if (buttonShadow === "hard")
    shadowClass =
      "border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  let containerClass = `flex flex-col items-center w-full min-h-screen transition-all duration-300 relative`;
  let containerStyle: React.CSSProperties = {
    fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : "sans-serif",
    ...(!isColor ? presetWallpaper : {}),
  };

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
  let buttonClass = `w-full py-4 px-4 font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-95 text-center flex items-center justify-between ${roundnessClass} ${shadowClass}`;
  let customButtonStyle: React.CSSProperties = {};
  if (buttonColor) customButtonStyle.backgroundColor = colorWithOpacity(buttonColor, buttonOpacity ?? 100);
  if (buttonTextColor) customButtonStyle.color = colorWithOpacity(buttonTextColor, buttonTextOpacity ?? 100);

  const getCustomLinkStyle = (link: CustomLink): React.CSSProperties => {
    const style = link.customStyle;
    const shadowMap: Record<string, string> = {
      none: 'none',
      soft: '0 4px 12px rgba(15, 23, 42, 0.10)',
      medium: '0 8px 20px rgba(15, 23, 42, 0.18)',
      strong: '0 12px 30px rgba(15, 23, 42, 0.28)',
    };

    const backgroundColor = link.buttonColor || buttonColor;
    const textColor = link.buttonTextColor || buttonTextColor;
    const backgroundOpacity = style?.opacity ?? buttonOpacity ?? 100;
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
      ...(style?.borderWidth !== undefined ? { borderWidth: `${style.borderWidth}px` } : {}),
      ...(style?.borderRadius !== undefined ? { borderRadius: `${style.borderRadius}px` } : {}),
      ...(style?.shadow && style.shadow !== 'inherit' ? { boxShadow: shadowMap[style.shadow] } : {}),
    };
  };

  const getFixedRadiusBlockStyle = (link: CustomLink): React.CSSProperties => ({
    ...getCustomLinkStyle(link),
    borderRadius: '16px',
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

  if (buttonStyle === "glass") {
    buttonClass +=
      " bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30";
  } else if (buttonStyle === "outline") {
    buttonClass += " bg-transparent border-2 border-current hover:bg-black/5";
  } else {
    buttonClass += ` ${themeDefaultBtnClass}`;
  }

  let socialIconClass = "w-7 h-7 hover:scale-110 transition-transform";
  const socialControlStyle: React.CSSProperties = {
    ...(buttonColor ? { backgroundColor: colorWithOpacity(buttonColor, buttonOpacity ?? 100) } : {}),
    ...(buttonTextColor ? { color: colorWithOpacity(buttonTextColor, buttonTextOpacity ?? 100) } : {}),
  };

  const [emailCopied, setEmailCopied] = useState(false);
  const [shareModalItem, setShareModalItem] = useState<{ title: string; url?: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareUrl = `${window.location.origin}/${profile.username || "preview"}`;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (profile.email) {
      navigator.clipboard.writeText(profile.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const handleOpenShareModal = (e: React.MouseEvent, linkItem: { title: string; url?: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setShareModalItem(linkItem);
    setLinkCopied(false);
  };

  const handleOpenMap = (event: React.MouseEvent<HTMLElement>, block: CustomLink) => {
    recordLinkClick(block.id);
    setActiveMapContainer(event.currentTarget.closest<HTMLElement>('[data-map-popup-container]'));
    setActiveMapBlock(block);
  };

  return (
    <>
      <div
        ref={previewContainerRef}
        className={clsx(
          containerClass,
          isPublic
            ? "rounded-none sm:rounded-[2.5rem] sm:my-10 shadow-xl overflow-hidden max-w-[480px] mx-auto"
            : ""
        )}
        style={containerStyle}
      >
        {sticker && (
          <div
            role={props.stickerEditable ? "button" : undefined}
            tabIndex={props.stickerEditable ? 0 : undefined}
            aria-label={props.stickerEditable ? "스티커 위치 이동" : undefined}
            title={props.stickerEditable ? "드래그해서 스티커를 이동하세요" : undefined}
            onPointerDown={handleStickerPointerDown}
            onPointerMove={handleStickerPointerMove}
            onPointerUp={finishStickerDrag}
            onPointerCancel={finishStickerDrag}
            className={clsx(
              "absolute z-40 select-none drop-shadow-lg",
              props.stickerEditable ? "cursor-grab rounded-2xl ring-2 ring-white/80 active:cursor-grabbing active:scale-105" : "pointer-events-none"
            )}
            style={{ left: `${stickerX}%`, top: `${stickerY}%`, transform: 'translate(-50%, -50%)', touchAction: 'none' }}
          >
            {/^(?:https?:\/\/|\/)/.test(sticker) ? <img src={sticker} alt="" draggable={false} className="h-20 w-20 object-contain sm:h-24 sm:w-24" /> : <span className="block text-4xl sm:text-5xl">{sticker}</span>}
          </div>
        )}
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
            onClick={(event) => handleOpenShareModal(event, {
              title: profile.name || profile.username || '프로필 공유',
              url: shareUrl,
            })}
            className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition shadow-2xs",
              profile.profileLayout === "banner"
                ? "bg-white/40 backdrop-blur-md hover:bg-white/60 text-gray-900"
                : "bg-black/5 hover:bg-black/10"
            )}
          >
            <MoreHorizontal
              className={clsx(
                "w-5 h-5",
                profile.profileLayout === "banner" ? "text-gray-900" : textClass
              )}
            />
          </button>
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
                  ) : (
                    <User className="w-24 h-24 text-gray-400" />
                  )}
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
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-amber-100 flex items-center justify-center text-gray-700">
                    <User className="w-12 h-12" />
                  </div>
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
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-gray-700 opacity-80" />
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
                "inline-flex items-center gap-1.5 text-xs font-semibold mb-5 px-3.5 py-1.5 rounded-full transition cursor-pointer shadow-2xs group hover:scale-105",
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
            <div className="flex gap-3 mb-8 flex-wrap justify-center items-center">
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
                      "w-9 h-9 rounded-full flex items-center justify-center transition shadow-2xs hover:scale-110",
                      templateValue.startsWith("neo-")
                        ? "bg-black text-white border-2 border-black"
                        : "bg-black/5 hover:bg-black/10 text-gray-900",
                      textClass
                    )}
                    style={socialControlStyle}
                    title={link.platform}
                  >
                    <Icon className="w-5 h-5 object-contain" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Custom Links & Collections */}
          <div className="w-full space-y-4 mb-12">
            {customLinks.filter((block) => block.isVisible !== false).map((block) => {
              if (block.type === "collection") {
                const collectionTitle = block.publicTitle ?? block.title;
                const collectionLinks = (block.links || []).filter((link) =>
                  link.isVisible !== false &&
                  (link.type !== 'map' || Boolean(link.mapConfig?.query.trim()))
                );
                if (collectionLinks.length === 0) return null;
                if (block.layout === "carousel") {
                  const carouselNavigation = collectionCarouselNavigation[block.id];
                  const canGoBack = carouselNavigation?.canGoBack ?? false;
                  const canGoForward = carouselNavigation?.canGoForward ?? (collectionLinks.length > 2);
                  return (
                    <div key={block.id} className="w-full pt-2">
                      {collectionTitle && !block.hideTitle && <h3 className={clsx("mb-3 pl-1 text-sm font-bold", textClass)}>{collectionTitle}</h3>}
                      <div className="group/carousel relative">
                        <div
                          ref={(element) => { collectionCarouselRefs.current[block.id] = element; }}
                          onScroll={() => updateCollectionCarouselNavigation(block.id)}
                          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                          {collectionLinks.map((link) => {
                            const isImage = link.thumbnailType === "image" || (!link.thumbnailType && link.icon);
                            const isNone = link.thumbnailType === "none";
                            const IconComp = getPreviewLinkIcon(link);
                            const destination = getLinkDestination(link);
                            return (
                              <a
                                key={link.id}
                                href={destination.href}
                                target={destination.isInternal ? "_self" : "_blank"}
                                rel="noopener noreferrer"
                                onClick={() => recordLinkClick(link.id)}
                                className="flex aspect-square w-[43%] min-w-[43%] snap-start flex-col items-center justify-center rounded-3xl border border-white/30 bg-white/20 p-3 backdrop-blur-md transition hover:-translate-y-1 hover:shadow-lg"
                                style={{
                                  ...(isColor && templateValue !== "#0f172a" ? { backgroundColor: "rgba(0,0,0,0.05)", borderColor: "rgba(0,0,0,0.1)" } : {}),
                                  ...getCustomLinkStyle(link),
                                }}
                              >
                                {!isNone && <div className="mb-3 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full" style={getThemedLinkIconContainerStyle(link)}>{isImage && link.icon ? <img src={link.icon} alt={link.title} className="h-full w-full object-cover" /> : <IconComp className="h-6 w-6" />}</div>}
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
                if (block.layout === "grid") {
                  const linkCount = collectionLinks.length;
                  const isEven = linkCount > 0 && linkCount % 2 === 0;
                  const gridColsClass = isEven ? "grid-cols-2" : "grid-cols-3";

                  return (
                    <div key={block.id} className="w-full pt-2">
                      {collectionTitle && !block.hideTitle && (
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

                          return (
                            <a
                              key={link.id}
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
                                ...getCustomLinkStyle(link),
                              }}
                            >
                              {!isNone && (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 overflow-hidden shrink-0" style={getThemedLinkIconContainerStyle(link)}>
                                  {isImage && link.icon ? (
                                    <img
                                      src={link.icon}
                                      alt={link.title}
                                      className="w-full h-full object-cover"
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
                    <div key={block.id} className="w-full pt-2">
                      {collectionTitle && !block.hideTitle && (
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

                          return (
                            <a
                              key={link.id}
                              href={destination.href}
                              target={destination.isInternal ? "_self" : "_blank"}
                              rel="noopener noreferrer"
                              onClick={() => recordLinkClick(link.id)}
                              className={buttonClass}
                              style={getCustomLinkStyle(link)}
                            >
                              {!isNone && (
                                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={getThemedLinkIconContainerStyle(link)}>
                                  {isImage && link.icon ? (
                                    <img
                                      src={link.icon}
                                      alt={link.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <IconComp className="w-5 h-5" />
                                  )}
                                </div>
                              )}
                              <span className="flex-1 text-center font-semibold text-[15px]">
                                {link.title || "링크 제목"}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleOpenShareModal(e, link)}
                                className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/10 rounded-full transition cursor-pointer z-10"
                                title="링크 공유"
                              >
                                <MoreHorizontal className="w-5 h-5 opacity-60 hover:opacity-100" />
                              </button>
                            </a>
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
              const isIcon =
                block.thumbnailType === "icon" ||
                (!block.thumbnailType && block.iconName);
              const isNone = block.thumbnailType === "none";
              const IconComp = getPreviewLinkIcon(block);

              if (block.type === 'donation') {
                return (
                  <div key={block.id} className="w-full">
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
                          {isImage && block.icon ? <img src={block.icon} alt={block.title} className="w-full h-full object-cover" /> : <IconComp className="w-5 h-5" />}
                        </div>
                      )}
                      <span className="flex-1 text-center font-bold text-[15px]">{block.donationConfig?.mainText || block.donationConfig?.buttonText || block.title || "도네이션"}</span>
                      <span role="button" tabIndex={0} onClick={(e) => handleOpenShareModal(e, block)} className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/10 rounded-full transition cursor-pointer z-10" title="링크 공유">
                        <MoreHorizontal className="w-5 h-5 opacity-60 hover:opacity-100" />
                      </span>
                    </button>
                    <DonationFeed ownerUid={ownerUid} blockId={block.id} style={getCustomLinkStyle(block)} />
                  </div>
                );
              }

              if (block.type === 'file') {
                const downloadUrl = block.fileConfig?.fileUrl || block.url || '#';
                return (
                  <a
                    key={block.id}
                    href={downloadUrl}
                    download={block.fileConfig?.fileName || 'download'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordLinkClick(block.id)}
                    className={buttonClass}
                    style={getCustomLinkStyle(block)}
                  >
                    {!isNone && (
                      <div
                        className={clsx(
                          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                          templateValue.startsWith("neo-")
                            ? "bg-cyan-500 text-white border-2 border-black font-bold"
                            : "bg-cyan-50 text-cyan-600"
                        )}
                        style={getThemedLinkIconContainerStyle(block)}
                      >
                        {isImage && block.icon ? (
                          <img src={block.icon} alt={block.title} className="w-full h-full object-cover" />
                        ) : (
                          <IconComp className="w-5 h-5" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 text-center truncate">
                      <span className="font-bold text-[15px] block truncate">
                        📁 {block.fileConfig?.title || block.title || "파일 다운로드"}
                      </span>
                      {block.fileConfig?.fileName && (
                        <span className="text-[11px] opacity-70 block truncate">
                          {block.fileConfig.fileName} ({block.fileConfig.fileSize || '파일'})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleOpenShareModal(e, block)}
                      className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/10 rounded-full transition cursor-pointer z-10"
                      title="링크 공유"
                    >
                      <MoreHorizontal className="w-5 h-5 opacity-60 hover:opacity-100" />
                    </button>
                  </a>
                );
              }

              if (block.type === 'sns') {
                const items = block.snsLinks || [];
                return (
                  <div key={block.id} className="w-full flex items-center justify-center gap-3.5 py-3 flex-wrap">
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
                          style={{ ...getCustomLinkStyle(block), ...getThemedLinkIconContainerStyle(block) }}
                          className="w-11 h-11 rounded-full bg-white/90 hover:bg-white text-gray-900 flex items-center justify-center shadow-md hover:scale-110 transition cursor-pointer border border-gray-100"
                          title={item.platform}
                        >
                          <span style={getCustomLinkIconStyle(block)}><Icon className="w-5 h-5" /></span>
                        </a>
                      );
                    })}
                  </div>
                );
              }

              if (block.type === 'reservation') {
                const config = block.reservationConfig || {
                  headerText: "",
                  schedules: [
                    {
                      id: "sched-1",
                      startDate: "07.26 (PM 12)",
                      endDate: "07.26 (PM 01)",
                      title: "공부하기",
                      status: "OPEN"
                    }
                  ],
                  autoNotification: false
                };
                const today = new Date();
                const upcomingSchedules = config.schedules.filter((schedule) => !isSchedulePast(schedule, today));
                const initialCalendarView = getInitialCalendarView(upcomingSchedules);
                const calendarView = calendarViews[block.id] || initialCalendarView;
                const calendarYear = calendarView.year;
                const calendarMonth = calendarView.month;
                const visibleSchedules = upcomingSchedules.filter((schedule) => isScheduleInCalendarMonth(schedule, calendarYear, calendarMonth));
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
                    className={clsx(
                      "relative w-full overflow-visible p-5 space-y-4 transition-all",
                      roundnessClass,
                      shadowClass,
                      buttonStyle === 'glass' && "bg-white/20 backdrop-blur-md border border-white/30",
                      buttonStyle === 'outline' && "bg-transparent border-2 border-current",
                      buttonStyle === 'solid' && themeDefaultBtnClass,
                      activeCalendarDay?.blockId === block.id ? "z-[200]" : "z-0"
                    )}
                    style={getFixedRadiusBlockStyle(block)}
                  >
                    {/* Calendar Header with Navigation */}
                    <div className="flex items-center justify-center gap-4 px-2">
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(-1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold opacity-90 transition hover:scale-105 hover:opacity-100 cursor-pointer"
                        style={reservationControlStyle}
                        aria-label={`${calendarYear}년 ${calendarMonth}월 이전 달`}
                      >
                        &lt;
                      </button>
                      <span className="font-extrabold text-base tracking-tight">{calendarYear}.{String(calendarMonth).padStart(2, '0')}</span>
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold opacity-90 transition hover:scale-105 hover:opacity-100 cursor-pointer"
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
                              "group relative w-8 h-8 mx-auto rounded-full flex items-center justify-center transition-all text-xs",
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
                      <button type="button" disabled={visibleSchedules.length === 0} onClick={() => setExpandedReservationIds((current) => ({ ...current, [block.id]: !isScheduleListExpanded }))} className="w-full flex items-center justify-between px-1 pb-2 text-xs font-black enabled:cursor-pointer group">
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
                    style={getCustomLinkStyle(block)}
                    themeActionColor={block.buttonTextColor || buttonTextColor || pageTextColor || '#111827'}
                    themeActionTextColor={block.buttonColor || buttonColor || '#FFFFFF'}
                  />
                );
              }

              if (block.type === 'anonymous_message') {
                const MessageIcon = getLinkIcon(block.iconName || 'message-circle');
                return (
                  <a key={block.id} href={`/${profile.username || 'preview'}/message`} onClick={() => recordLinkClick(block.id)} className={buttonClass} style={getCustomLinkStyle(block)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full" style={getThemedLinkIconContainerStyle(block)}><MessageIcon className="h-5 w-5" /></span>
                    <span className="flex-1 text-center text-[15px] font-bold">{block.title || '익명 메시지 보내기'}</span>
                    <MoreHorizontal className="h-5 w-5 shrink-0 opacity-60" />
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
                    <a key={block.id} href={productUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => recordLinkClick(block.id)} className={buttonClass} style={getCustomLinkStyle(block)}>
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/5">{affiliateImageUrl ? <img src={affiliateImageUrl} alt={block.title} className="h-full w-full object-cover" /> : <ShoppingBag className="h-5 w-5 opacity-50" />}</span>
                      <span className="min-w-0 flex-1 text-center"><span className="block truncate text-[15px] font-bold">{block.title || (store.language === 'ko' ? '추천 상품' : 'Recommended product')}</span>{formattedPrice && <span className="mt-0.5 block text-xs font-semibold opacity-65">{formattedPrice}</span>}</span>
                      <ExternalLink className="h-4 w-4 shrink-0 opacity-45" />
                    </a>
                  );
                }
                return (
                  <a key={block.id} href={productUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => recordLinkClick(block.id)} className={clsx(buttonClass, "group !block overflow-hidden !p-0 text-left")} style={getFixedRadiusBlockStyle(block)}>
                    <div className="aspect-[16/10] w-full overflow-hidden bg-black/5">{affiliateImageUrl ? <img src={affiliateImageUrl} alt={block.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><ShoppingBag className="h-10 w-10 opacity-30" /></div>}</div>
                    <div className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="truncate text-[15px] font-extrabold">{block.title || (store.language === 'ko' ? '추천 상품' : 'Recommended product')}</p>{formattedPrice && <p className="mt-1 text-sm font-bold opacity-70">{formattedPrice}</p>}</div><ExternalLink className="h-5 w-5 shrink-0 opacity-50 transition group-hover:opacity-100" /></div>
                  </a>
                );
              }

              if (block.type === 'map') {
                const mapQuery = block.mapConfig?.query.trim() || '';
                if (!mapQuery) return null;
                if (block.mapConfig?.displayMode === 'classic') {
                  return (
                    <button key={block.id} type="button" onClick={(event) => handleOpenMap(event, block)} className={buttonClass} style={getFixedRadiusBlockStyle(block)}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5"><MapPin className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1 text-center"><span className="block truncate text-[15px] font-bold">{block.title || (store.language === 'ko' ? '오시는 길' : 'Location')}</span><span className="mt-0.5 block truncate text-xs font-medium opacity-65">{mapQuery}</span></span>
                      <MapPin className="h-4 w-4 shrink-0 opacity-45" />
                    </button>
                  );
                }
                return (
                  <button key={block.id} type="button" onClick={(event) => handleOpenMap(event, block)} className={clsx(buttonClass, "group !block overflow-hidden !p-0 text-left")} style={getFixedRadiusBlockStyle(block)}>
                    <MapIllustration className="h-36 w-full transition duration-300 group-hover:scale-[1.02]" />
                    <span className="flex items-center gap-3 p-4"><MapPin className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-bold">{block.title || (store.language === 'ko' ? '지도에서 보기' : 'View map')}</span><span className="mt-0.5 block truncate text-xs font-medium opacity-65">{mapQuery}</span></span><MapPin className="h-4 w-4 shrink-0 opacity-50" /></span>
                  </button>
                );
              }

              if (block.type === 'sales') {
                return (
                  <button
                    key={block.id}
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
                          <img src={block.icon} alt={block.title} className="w-full h-full object-cover" />
                        ) : (
                          <IconComp className="w-5 h-5" />
                        )}
                      </div>
                    )}
                    <span className="flex-1 text-center font-bold text-[15px]">
                      {(block.salesConfig?.mainText || block.title || "실물 상품 판매").replace(/^[🛍️\s]+/u, "")}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenShareModal(e, block)}
                      className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/10 rounded-full transition cursor-pointer z-10"
                      title="링크 공유"
                    >
                      <MoreHorizontal className="w-5 h-5 opacity-60 hover:opacity-100" />
                    </button>
                  </button>
                );
              }

              const destination = getLinkDestination(block);

              return (
                <a
                  key={block.id}
                  href={destination.href}
                  target={destination.isInternal ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  onClick={() => recordLinkClick(block.id)}
                  className={buttonClass}
                  style={getCustomLinkStyle(block)}
                >
                  {!isNone && (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                      style={getThemedLinkIconContainerStyle(block)}
                    >
                      {isImage && block.icon ? (
                        <img
                          src={block.icon}
                          alt={block.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <IconComp className="w-5 h-5" />
                      )}
                    </div>
                  )}
                  <span className="flex-1 text-center font-bold text-[15px]">
                    {block.title || "링크 제목"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleOpenShareModal(e, block)}
                    className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/10 rounded-full transition cursor-pointer z-10"
                    title="링크 공유"
                  >
                    <MoreHorizontal className="w-5 h-5 opacity-60 hover:opacity-100" />
                  </button>
                </a>
              );
            })}
            {customLinks.filter((block) => block.isVisible !== false).length === 0 && (
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

          {/* Bottom Logo Pill (Hidden if hideWatermark is true) */}
          {!profile.hideWatermark && (
            <div className="mt-auto pt-8 flex flex-col items-center">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/10 hover:bg-black/20 text-xs font-bold transition backdrop-blur-md cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{store.language === "ko" ? "나만의 링크집 만들기" : "Create my LinkZip"}</span>
              </a>
              <div className="mt-4 flex gap-3 text-[11px] font-medium opacity-60 text-center flex-wrap justify-center max-w-[80%]">
                <span className="cursor-pointer hover:underline">
                  Cookie Preferences
                </span>{" "}
                •<span className="cursor-pointer hover:underline">신고</span> •
                <span className="cursor-pointer hover:underline">개인정보 처리방침</span>
              </div>
            </div>
          )}
        </div>

      </div>

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

      {/* Share Specific Link Modal Popup */}
      {shareModalItem && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShareModalItem(null)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-gray-900 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 truncate pr-2">
                <Share2 className="w-5 h-5 text-purple-600 shrink-0" />
                <h3 className="text-sm font-bold text-gray-900 truncate">{shareModalItem.title || '링크 공유'}</h3>
              </div>
              <button 
                onClick={() => setShareModalItem(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl text-xs font-mono text-gray-600 truncate border border-gray-100">
              {shareModalItem.url || 'URL 없음'}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  if (shareModalItem.url) {
                    const fullUrl = shareModalItem.url.match(/^https?:\/\//) ? shareModalItem.url : `https://${shareModalItem.url}`;
                    navigator.clipboard.writeText(fullUrl);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }
                }}
                className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-500/20"
              >
                {linkCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                {linkCopied ? '링크 주소 복사됨!' : '링크 주소 복사하기'}
              </button>

              {navigator.share && (
                <button
                  onClick={() => {
                    if (shareModalItem.url) {
                      const fullUrl = shareModalItem.url.match(/^https?:\/\//) ? shareModalItem.url : `https://${shareModalItem.url}`;
                      navigator.share({
                        title: shareModalItem.title,
                        url: fullUrl
                      }).catch(() => {});
                    }
                  }}
                  className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  공유하기 (Share)
                </button>
              )}

              <button
                onClick={() => {
                  if (shareModalItem.url) {
                    const fullUrl = shareModalItem.url.match(/^https?:\/\//) ? shareModalItem.url : `https://${shareModalItem.url}`;
                    window.open(fullUrl, '_blank');
                  }
                }}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-gray-600" />
                새 탭에서 바로 이동
              </button>
            </div>
          </div>
        </div>
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
        />
      )}
    </>
  );
};

export default LinkTreePreview;
