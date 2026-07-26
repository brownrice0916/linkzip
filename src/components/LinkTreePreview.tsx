import React, { useState } from "react";
import {
  useStore,
  type UserProfile,
  type SocialLink,
  type CustomLink,
  type DesignSettings,
  type ReservationScheduleItem,
} from "../store/useStore";
import {
  FaInstagram,
  FaTwitter,
  FaYoutube,
  FaGithub,
  FaLinkedin,
  FaEnvelope,
  FaGlobe,
  FaFigma,
} from "react-icons/fa";
import { User, MoreHorizontal, Link2, X, Mail, Copy, Check, Share2, ExternalLink, CalendarDays, ChevronDown } from "lucide-react";
import { getLinkIcon } from "../lib/icons";
import { DonationVisitorModal } from "./DonationVisitorModal";
import { CustomerInfoVisitorCard } from "./CustomerInfoVisitorCard";
import { SalesVisitorModal } from "./SalesVisitorModal";
import clsx from "clsx";
import { recordPublicLinkClick } from "../services/analyticsService";

interface LinkTreePreviewProps {
  profile?: UserProfile;
  templateType?: "color" | "preset";
  templateValue?: string;
  socialLinks?: SocialLink[];
  customLinks?: CustomLink[];
  isPublic?: boolean;
  ownerUid?: string;
  design?: Partial<DesignSettings>;
}

const getSocialIcon = (platform: string) => {
  switch (platform) {
    case "instagram":
      return FaInstagram;
    case "twitter":
      return FaTwitter;
    case "youtube":
      return FaYoutube;
    case "github":
      return FaGithub;
    case "linkedin":
      return FaLinkedin;
    case "mail":
      return FaEnvelope;
    case "globe":
      return FaGlobe;
    case "figma":
      return FaFigma;
    default:
      return null;
  }
};

const getSocialUrl = (platform: string, id: string) => {
  const cleanId = id.trim();
  switch (platform) {
    case "instagram":
      return `https://instagram.com/${cleanId}`;
    case "twitter":
      return `https://twitter.com/${cleanId}`;
    case "youtube":
      return `https://youtube.com/${
        cleanId.startsWith("@") ? cleanId : `@${cleanId}`
      }`;
    case "github":
      return `https://github.com/${cleanId}`;
    case "linkedin":
      return `https://linkedin.com/in/${cleanId}`;
    case "mail":
      return `mailto:${cleanId}`;
    case "globe":
      return cleanId.match(/^https?:\/\//) ? cleanId : `https://${cleanId}`;
    case "figma":
      return `https://figma.com/@${cleanId}`;
    default:
      return "#";
  }
};

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
  const recordLinkClick = (linkId: string) => {
    if (isPublic && props.ownerUid) {
      void recordPublicLinkClick(props.ownerUid, linkId).catch((error) => {
        console.warn('Unable to record link click:', error);
      });
    } else {
      store.recordLinkClick(linkId);
    }
  };
  const isPublic = props.isPublic || false;

  const getLinkDestination = (link: Pick<CustomLink, 'type' | 'iconName' | 'title' | 'url'>) => {
    const rawUrl = link.url?.trim() || '';
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

  const [activeDonationBlock, setActiveDonationBlock] = useState<CustomLink | null>(null);
  const [activeSalesBlock, setActiveSalesBlock] = useState<CustomLink | null>(null);
  const [expandedReservationIds, setExpandedReservationIds] = useState<Record<string, boolean>>({});
  const [activeCalendarDay, setActiveCalendarDay] = useState<{ blockId: string; day: number } | null>(null);
  const [calendarViews, setCalendarViews] = useState<Record<string, { year: number; month: number }>>({});
  const isColor = templateType === "color";
  const buttonStyle = props.design?.buttonStyle ?? store.buttonStyle;
  const buttonRoundness = props.design?.buttonRoundness ?? store.buttonRoundness;
  const buttonShadow = props.design?.buttonShadow ?? store.buttonShadow;
  const buttonColor = props.design?.buttonColor ?? store.buttonColor;
  const buttonTextColor = props.design?.buttonTextColor ?? store.buttonTextColor;
  const buttonOpacity = props.design?.buttonOpacity ?? store.buttonOpacity;
  const buttonTextOpacity = props.design?.buttonTextOpacity ?? store.buttonTextOpacity;
  const fontFamily = props.design?.fontFamily ?? store.fontFamily;
  const titleFontFamily = props.design?.titleFontFamily ?? store.titleFontFamily;
  const pageTextColor = props.design?.pageTextColor ?? store.pageTextColor;
  const pageTextOpacity = props.design?.pageTextOpacity ?? store.pageTextOpacity;
  const backgroundOpacity = props.design?.backgroundOpacity ?? store.backgroundOpacity;
  const sticker = props.design?.sticker ?? store.sticker;

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
  };

  let textClass = "text-gray-900";
  if (pageTextColor) {
    containerStyle.color = colorWithOpacity(pageTextColor, pageTextOpacity ?? 100);
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
      if (!pageTextColor) textClass = "text-white";
      themeDefaultBtnClass =
        "bg-white/25 backdrop-blur-md border border-white/30 text-white hover:bg-white/35 shadow-lg";
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
        "bg-white/20 backdrop-blur-md text-white border border-white/40 hover:bg-white/30 shadow-md";
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
        " bg-gradient-to-tr from-yellow-300 via-amber-400 to-lime-300";
      if (!pageTextColor) textClass = "text-black";
      themeDefaultBtnClass =
        "bg-lime-300 text-black border-3 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-all";
    } else if (templateValue === "neo-cyber") {
      containerClass +=
        " bg-gradient-to-tr from-cyan-300 via-blue-500 to-pink-500";
      if (!pageTextColor) textClass = "text-black";
      themeDefaultBtnClass =
        "bg-yellow-300 text-black border-3 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] transition-all";
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
      ...(style?.fontSize ? { fontSize: `${style.fontSize}px` } : {}),
      ...(style?.fontWeight ? { fontWeight: style.fontWeight } : {}),
      ...(style?.borderColor ? { borderColor: style.borderColor } : {}),
      ...(style?.borderWidth !== undefined ? { borderWidth: `${style.borderWidth}px` } : {}),
      ...(style?.borderRadius !== undefined ? { borderRadius: `${style.borderRadius}px` } : {}),
      ...(style?.shadow && style.shadow !== 'inherit' ? { boxShadow: shadowMap[style.shadow] } : {}),
    };
  };

  const getCustomLinkIconStyle = (link: CustomLink): React.CSSProperties => {
    const iconColor = link.customStyle?.iconColor;
    if (!iconColor) return {};
    return { color: colorWithOpacity(iconColor, link.customStyle?.iconOpacity ?? 100) };
  };

  const getCustomLinkIconContainerStyle = (link: CustomLink): React.CSSProperties => ({
    ...getCustomLinkIconStyle(link),
    ...(link.customStyle?.iconBackgroundColor
      ? { backgroundColor: colorWithOpacity(link.customStyle.iconBackgroundColor, link.customStyle.iconBackgroundOpacity ?? 100) }
      : {}),
  });

  if (buttonStyle === "glass") {
    buttonClass +=
      " bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30";
  } else if (buttonStyle === "outline") {
    buttonClass += " bg-transparent border-2 border-current hover:bg-black/5";
  } else {
    // Solid: use theme default button class if no custom buttonColor
    if (!buttonColor) {
      buttonClass += ` ${themeDefaultBtnClass}`;
    }
  }

  let socialIconClass = "w-7 h-7 hover:scale-110 transition-transform";

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

  return (
    <>
      <div
        className={clsx(
          containerClass,
          isPublic
            ? "rounded-none sm:rounded-[2.5rem] sm:my-10 shadow-xl overflow-hidden max-w-[480px] mx-auto"
            : ""
        )}
        style={containerStyle}
      >
        {/* Banner Header Image (Only for banner layout - flush to top edge) */}
        {profile.profileLayout === "banner" && (
          <div className="w-full h-48 sm:h-52 bg-gray-200 relative shrink-0 overflow-hidden">
            {profile.bannerUrl ? (
              <img
                src={profile.bannerUrl}
                alt="Banner"
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
            title="Share profile"
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
            {sticker && (
              <div className="absolute -top-2 -right-2 text-3xl z-30 animate-bounce drop-shadow-md">
                {sticker}
              </div>
            )}

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
                alt="Logo"
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
              {profile.name || profile.username || "username"}
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
              {profile.bio || "bio goes here"}
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
              title="Click to copy email address"
            >
              <Mail className="w-3.5 h-3.5 opacity-80" />
              <span>{profile.email}</span>
              {emailCopied ? (
                <span className="text-[10px] font-bold text-green-500 flex items-center gap-0.5 ml-0.5 animate-in zoom-in-50">
                  <Check className="w-3.5 h-3.5 text-green-500" /> Copied!
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
                    style={pageTextColor ? { color: colorWithOpacity(pageTextColor, pageTextOpacity ?? 100) } : {}}
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
            {customLinks.map((block) => {
              if (block.type === "collection") {
                const collectionTitle = block.publicTitle ?? block.title;
                if (block.layout === "grid") {
                  const linkCount = block.links?.length || 0;
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
                        {block.links?.map((link) => {
                          const isImage =
                            link.thumbnailType === "image" ||
                            (!link.thumbnailType && link.icon);
                          const isIcon =
                            link.thumbnailType === "icon" ||
                            (!link.thumbnailType && link.iconName);
                          const isNone = link.thumbnailType === "none";
                          const IconComp = getLinkIcon(link.iconName);
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
                                <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center mb-2 overflow-hidden shrink-0" style={getCustomLinkIconContainerStyle(link)}>
                                  {isImage && link.icon ? (
                                    <img
                                      src={link.icon}
                                      alt={link.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <IconComp
                                      className={clsx("w-5 h-5", !link.customStyle?.iconColor && textClass)}
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
                                {link.title || "Link Title"}
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
                        {block.links?.map((link) => {
                          const isImage =
                            link.thumbnailType === "image" ||
                            (!link.thumbnailType && link.icon);
                          const isIcon =
                            link.thumbnailType === "icon" ||
                            (!link.thumbnailType && link.iconName);
                          const isNone = link.thumbnailType === "none";
                          const IconComp = getLinkIcon(link.iconName);
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
                                <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center shrink-0 overflow-hidden" style={getCustomLinkIconContainerStyle(link)}>
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
                                {link.title || "Link Title"}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleOpenShareModal(e, link)}
                                className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/10 rounded-full transition cursor-pointer z-10"
                                title="Share link"
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
              const IconComp = getLinkIcon(block.iconName);

              if (block.type === 'donation') {
                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => {
                      recordLinkClick(block.id);
                      setActiveDonationBlock(block);
                    }}
                    className={buttonClass}
                    style={getCustomLinkStyle(block)}
                  >
                    {!isNone && (
                      <div
                        className={clsx(
                          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                          templateValue.startsWith("neo-")
                            ? "bg-[#E54D26] text-white border-2 border-black font-bold"
                            : "bg-[#E54D26]/10 text-[#E54D26]"
                        )}
                        style={getCustomLinkIconContainerStyle(block)}
                      >
                        {isImage && block.icon ? (
                          <img src={block.icon} alt={block.title} className="w-full h-full object-cover" />
                        ) : (
                          <IconComp className="w-5 h-5" />
                        )}
                      </div>
                    )}
                    <span className="flex-1 text-center font-bold text-[15px]">
                      {block.donationConfig?.buttonText || block.donationConfig?.mainText || block.title || "donation"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenShareModal(e, block)}
                      className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/10 rounded-full transition cursor-pointer z-10"
                      title="Share link"
                    >
                      <MoreHorizontal className="w-5 h-5 opacity-60 hover:opacity-100" />
                    </button>
                  </button>
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
                        style={getCustomLinkIconContainerStyle(block)}
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
                          {block.fileConfig.fileName} ({block.fileConfig.fileSize || 'FILE'})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleOpenShareModal(e, block)}
                      className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/10 rounded-full transition cursor-pointer z-10"
                      title="Share link"
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
                      const Icon = getSocialIcon(item.platform) || FaGlobe;
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
                          style={{ ...getCustomLinkStyle(block), ...getCustomLinkIconContainerStyle(block) }}
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
                      "relative w-full overflow-visible bg-[#D1E7DD]/90 backdrop-blur-xs border border-[#B1D8C7] rounded-3xl p-5 space-y-4 font-sans text-gray-900 shadow-md",
                      activeCalendarDay?.blockId === block.id ? "z-[200]" : "z-0"
                    )}
                    style={getCustomLinkStyle(block)}
                  >
                    {/* Calendar Header with Navigation */}
                    <div className="flex items-center justify-center gap-4 px-2">
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(-1)}
                        className="p-1 text-gray-700 hover:text-black hover:bg-black/10 rounded-full font-bold cursor-pointer text-xs"
                        aria-label={`${calendarYear}년 ${calendarMonth}월 이전 달`}
                      >
                        &lt;
                      </button>
                      <span className="font-extrabold text-base tracking-tight text-gray-900">{calendarYear}.{String(calendarMonth).padStart(2, '0')}</span>
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(1)}
                        className="p-1 text-gray-700 hover:text-black hover:bg-black/10 rounded-full font-bold cursor-pointer text-xs"
                        aria-label={`${calendarYear}년 ${calendarMonth}월 다음 달`}
                      >
                        &gt;
                      </button>
                    </div>

                    {/* Weekdays Row */}
                    <div className="grid grid-cols-7 text-center text-xs font-extrabold text-gray-700">
                      <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
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
                                ? "bg-black text-white shadow-md scale-105"
                                : hasSchedule
                                  ? "text-gray-900 bg-white/55 hover:bg-black hover:text-white hover:scale-110 hover:shadow-md cursor-pointer"
                                  : "text-gray-700 cursor-default"
                            )}
                            aria-label={hasSchedule ? `${calendarMonth}월 ${d}일 일정 ${daySchedules.length}개` : `${calendarMonth}월 ${d}일`}
                          >
                            {d}
                            {hasSchedule && <span className={clsx("absolute bottom-0.5 w-1.5 h-1.5 rounded-full transition-colors", isSelected ? "bg-emerald-300" : "bg-emerald-600 group-hover:bg-emerald-300")} />}
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

                    {/* Header Text if specified */}
                    {config.headerText && (
                      <div className="p-2 bg-white/60 rounded-xl text-center text-xs font-semibold text-gray-700 border border-black/5">
                        {config.headerText}
                      </div>
                    )}

                    {/* Scheduled Events: stacked when collapsed */}
                    <div className="pt-1">
                      <button type="button" disabled={visibleSchedules.length === 0} onClick={() => setExpandedReservationIds((current) => ({ ...current, [block.id]: !isScheduleListExpanded }))} className="w-full flex items-center justify-between px-1 pb-2 text-xs font-black text-gray-800 enabled:cursor-pointer group">
                        <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> 예정 일정 {visibleSchedules.length}개</span>
                        {visibleSchedules.length > 0 && <span className="flex items-center gap-1 text-[10px] text-gray-600 group-hover:text-black">{isScheduleListExpanded ? '접기' : '펼치기'}<ChevronDown className={clsx("w-3.5 h-3.5 transition-transform", isScheduleListExpanded && "rotate-180")} /></span>}
                      </button>
                      {visibleSchedules.length === 0 ? <div className="py-3 text-center text-xs text-gray-600">예정된 일정이 없습니다.</div> : isScheduleListExpanded ? (
                        <div className="space-y-2">{visibleSchedules.map((sched) => (
                          <div key={sched.id} className="p-3 bg-[#B1D8C7]/80 rounded-2xl flex items-center gap-3 border border-[#9FCDBA] shadow-2xs animate-in fade-in slide-in-from-top-1">
                            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2"><div className="truncate text-xs font-extrabold text-gray-900">{sched.title}</div><div className="shrink-0 text-[10px] font-bold text-gray-600">{formatCompactScheduleDate(sched)}</div></div>
                          </div>
                        ))}</div>
                      ) : (
                        <button type="button" onClick={() => setExpandedReservationIds((current) => ({ ...current, [block.id]: true }))} className="relative block w-full h-[78px] cursor-pointer group" aria-label={`예정 일정 ${visibleSchedules.length}개 펼치기`}>
                          {visibleSchedules.slice(0, 3).reverse().map((sched, reverseIndex, visible) => {
                            const depth = visible.length - reverseIndex - 1;
                            return <span key={sched.id} className="absolute inset-x-0 top-0 p-3 bg-[#B1D8C7] rounded-2xl flex items-center gap-3 border border-[#9FCDBA] shadow-sm text-left transition-transform group-hover:-translate-y-1" style={{ transform: `translateY(${depth * 7}px) scale(${1 - depth * 0.025})`, zIndex: 10 - depth }}><span className="flex min-w-0 flex-1 items-baseline justify-between gap-2"><span className="truncate text-xs font-extrabold text-gray-900">{sched.title}</span><span className="shrink-0 text-[10px] font-bold text-gray-600">{formatCompactScheduleDate(sched)}</span></span><ChevronDown className="w-4 h-4 text-gray-600 shrink-0" /></span>;
                          })}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              if (block.type === 'customer_info') {
                const config = block.customerInfoConfig || {
                  mainText: 'subscribe to our letter',
                  detailText: 'sent every monday',
                  receiveEmail: true,
                  receivePhone: false,
                  receiveName: false
                };

                return (
                  <div key={block.id} style={getCustomLinkStyle(block)}>
                    <CustomerInfoVisitorCard
                      block={block}
                      config={config}
                      ownerUid={props.ownerUid}
                    />
                  </div>
                );
              }

              if (block.type === 'anonymous_message') {
                const MessageIcon = getLinkIcon(block.iconName || 'message-circle');
                return (
                  <a key={block.id} href={`/${profile.username || 'preview'}/message`} onClick={() => recordLinkClick(block.id)} className={buttonClass} style={getCustomLinkStyle(block)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/5" style={getCustomLinkIconContainerStyle(block)}><MessageIcon className="h-5 w-5" /></span>
                    <span className="flex-1 text-center text-[15px] font-bold">{block.title || '익명 메시지 보내기'}</span>
                    <MoreHorizontal className="h-5 w-5 shrink-0 opacity-60" />
                  </a>
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
                      <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center shrink-0 overflow-hidden" style={getCustomLinkIconContainerStyle(block)}>
                        {isImage && block.icon ? (
                          <img src={block.icon} alt={block.title} className="w-full h-full object-cover" />
                        ) : (
                          <IconComp className="w-5 h-5" />
                        )}
                      </div>
                    )}
                    <span className="flex-1 text-center font-bold text-[15px]">
                      🛍️ {block.salesConfig?.mainText || block.title || "디지털 상품 구매"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenShareModal(e, block)}
                      className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/10 rounded-full transition cursor-pointer z-10"
                      title="Share link"
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
                      className={clsx(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                        templateValue.startsWith("neo-")
                          ? "bg-amber-300 border-2 border-black text-black shadow-xs font-bold"
                          : "bg-black/5"
                      )}
                      style={getCustomLinkIconContainerStyle(block)}
                    >
                      {isImage && block.icon ? (
                        <img
                          src={block.icon}
                          alt={block.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <IconComp
                          className={clsx(
                            "w-5 h-5",
                            templateValue.startsWith("neo-") && !block.customStyle?.iconColor
                              ? "text-black"
                              : undefined
                          )}
                        />
                      )}
                    </div>
                  )}
                  <span className="flex-1 text-center font-bold text-[15px]">
                    {block.title || "Link Title"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleOpenShareModal(e, block)}
                    className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/10 rounded-full transition cursor-pointer z-10"
                    title="Share link"
                  >
                    <MoreHorizontal className="w-5 h-5 opacity-60 hover:opacity-100" />
                  </button>
                </a>
              );
            })}
            {customLinks.length === 0 && (
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
                <span>LinkZip</span>
              </a>
              <div className="mt-4 flex gap-3 text-[11px] font-medium opacity-60 text-center flex-wrap justify-center max-w-[80%]">
                <span className="cursor-pointer hover:underline">
                  Cookie Preferences
                </span>{" "}
                •<span className="cursor-pointer hover:underline">Report</span> •
                <span className="cursor-pointer hover:underline">Privacy</span>
              </div>
            </div>
          )}
        </div>
      </div>

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
        />
      )}

      {/* Visitor Sales Product Modal */}
      {activeSalesBlock && (
        <SalesVisitorModal
          isOpen={!!activeSalesBlock}
          onClose={() => setActiveSalesBlock(null)}
          block={activeSalesBlock}
          profile={profile}
        />
      )}
    </>
  );
};

export default LinkTreePreview;
