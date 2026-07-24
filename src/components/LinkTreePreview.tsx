import React, { useState } from "react";
import {
  useStore,
  type UserProfile,
  type SocialLink,
  type CustomLink,
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
  FaFacebook,
  FaWhatsapp,
} from "react-icons/fa";
import { User, Share, MoreHorizontal, Link2, X } from "lucide-react";
import clsx from "clsx";

interface LinkTreePreviewProps {
  profile: UserProfile;
  templateType: "color" | "preset";
  templateValue: string;
  socialLinks: SocialLink[];
  customLinks: CustomLink[];
  isPublic?: boolean;
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

const LinkTreePreview: React.FC<LinkTreePreviewProps> = ({
  profile,
  templateType,
  templateValue,
  socialLinks,
  customLinks,
  isPublic = false,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const isColor = templateType === "color";
  const { 
    buttonStyle = 'solid', 
    buttonRoundness = 'full', 
    buttonShadow = 'soft',
    buttonColor, 
    buttonTextColor, 
    fontFamily = 'sans', 
    pageTextColor, 
    sticker 
  } = useStore();

  let fontClass = "font-sans";
  if (fontFamily === 'mono') fontClass = "font-mono";
  if (fontFamily === 'serif') fontClass = "font-serif";

  let roundnessClass = "rounded-full";
  if (buttonRoundness === 'none') roundnessClass = "rounded-none";
  if (buttonRoundness === 'sm') roundnessClass = "rounded-md";
  if (buttonRoundness === 'md') roundnessClass = "rounded-xl";
  if (buttonRoundness === 'full') roundnessClass = "rounded-full";

  let shadowClass = "shadow-sm";
  if (buttonShadow === 'none') shadowClass = "shadow-none";
  if (buttonShadow === 'soft') shadowClass = "shadow-sm";
  if (buttonShadow === 'strong') shadowClass = "shadow-lg";
  if (buttonShadow === 'hard') shadowClass = "border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  let containerClass =
    `flex flex-col items-center w-full min-h-screen transition-all duration-300 relative ${fontClass}`;
  let containerStyle: React.CSSProperties = {};

  let textClass = "text-gray-900";
  if (pageTextColor) {
    containerStyle.color = pageTextColor;
  }

  let themeDefaultBtnClass = "bg-black text-white hover:bg-gray-800 shadow-sm";

  // Preset & Color Theme Styles
  if (isColor) {
    containerStyle.backgroundColor = templateValue;
    const isDark = templateValue === "#0f172a";
    if (!pageTextColor) textClass = isDark ? "text-white" : "text-gray-900";
    themeDefaultBtnClass = isDark 
      ? "bg-white/10 text-white border border-white/20 hover:bg-white/20" 
      : "bg-white text-gray-900 border border-gray-200 hover:bg-gray-100 shadow-sm";
  } else {
    if (templateValue === "minimalist") {
      containerClass += " bg-[#FAF9F6]";
      themeDefaultBtnClass = "bg-white text-gray-900 border border-gray-300 hover:bg-gray-100 shadow-sm";
    } else if (templateValue === "neon-dark") {
      containerClass += " bg-gray-900";
      if (!pageTextColor) textClass = "text-white";
      themeDefaultBtnClass = "bg-gray-800 border-2 border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]";
    } else if (templateValue === "soft-gradient") {
      containerClass += " bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400";
      if (!pageTextColor) textClass = "text-white";
      themeDefaultBtnClass = "bg-white/25 backdrop-blur-md border border-white/30 text-white hover:bg-white/35 shadow-lg";
    } else if (templateValue === "air") {
      containerClass += " bg-gray-100";
      themeDefaultBtnClass = "bg-white text-gray-900 border border-gray-200 shadow-sm hover:bg-gray-50";
    } else if (templateValue === "blocks") {
      containerClass += " bg-purple-600";
      if (!pageTextColor) textClass = "text-white";
      themeDefaultBtnClass = "bg-pink-500 text-white font-bold hover:bg-pink-600 shadow-md";
    } else if (templateValue === "bloom") {
      containerClass += " bg-gradient-to-br from-pink-500 to-rose-600";
      if (!pageTextColor) textClass = "text-white";
      themeDefaultBtnClass = "bg-white/20 backdrop-blur-md text-white border border-white/40 hover:bg-white/30 shadow-md";
    } else if (templateValue === "grid") {
      containerClass += " bg-lime-200";
      if (!pageTextColor) textClass = "text-black";
      themeDefaultBtnClass = "bg-white text-black border-2 border-black font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";
    } else if (templateValue === "groove") {
      containerClass += " bg-gradient-to-r from-amber-500 via-red-500 to-purple-600";
      if (!pageTextColor) textClass = "text-white";
      themeDefaultBtnClass = "bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-black/60 shadow-md";
    } else if (templateValue === "lake") {
      containerClass += " bg-slate-800";
      if (!pageTextColor) textClass = "text-slate-100";
      themeDefaultBtnClass = "bg-slate-700/80 border border-slate-600 text-slate-100 hover:bg-slate-700 shadow-md";
    } else if (templateValue === "nourish") {
      containerClass += " bg-emerald-700";
      if (!pageTextColor) textClass = "text-emerald-50";
      themeDefaultBtnClass = "bg-amber-100 text-emerald-950 font-bold hover:bg-amber-200 shadow-md";
    }
  }
  let buttonClass =
    `w-full py-4 px-4 font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-95 text-center flex items-center justify-between ${roundnessClass} ${shadowClass}`;
  let customButtonStyle: React.CSSProperties = {};
  if (buttonColor) customButtonStyle.backgroundColor = buttonColor;
  if (buttonTextColor) customButtonStyle.color = buttonTextColor;

  if (buttonStyle === 'glass') {
    buttonClass += " bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30";
  } else if (buttonStyle === 'outline') {
    buttonClass += " bg-transparent border-2 border-current hover:bg-black/5";
  } else {
    // Solid: use theme default button class if no custom buttonColor
    if (!buttonColor) {
      buttonClass += ` ${themeDefaultBtnClass}`;
    }
  }

  let socialIconClass = "w-7 h-7 hover:scale-110 transition-transform";

  const shareUrl = `${window.location.origin}/${profile.username || "preview"}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("Link copied to clipboard!");
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
        {/* Top Header Icons */}
        <div className="w-full flex justify-between items-center p-6">
          <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center cursor-pointer hover:bg-black/10 transition">
            <Link2 className={clsx("w-5 h-5", textClass)} />
          </div>
          <div
            onClick={() => setIsShareModalOpen(true)}
            className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center cursor-pointer hover:bg-black/10 transition"
          >
            <Share className={clsx("w-5 h-5", textClass)} />
          </div>
        </div>
        {/* Banner Header Image (Only for banner layout) */}
        {profile.profileLayout === 'banner' && (
          <div className="w-full h-36 bg-gray-300 relative shrink-0 overflow-hidden">
            {profile.bannerUrl ? (
              <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            )}
          </div>
        )}

        <div className="w-full px-6 flex flex-col items-center pb-24 relative z-10">
          
          {/* Profile Avatar based on Layout */}
          <div className="relative">
            {sticker && (
              <div className="absolute -top-2 -right-2 text-3xl z-30 animate-bounce drop-shadow-md">
                {sticker}
              </div>
            )}

            {profile.profileLayout === 'hero' ? (
              <div className="w-full max-w-[300px] h-[200px] rounded-3xl overflow-hidden mb-5 shadow-xl border-2 border-white/20">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
            ) : profile.profileLayout === 'banner' ? (
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white shadow-lg -mt-12 bg-white shrink-0">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
            ) : profile.profileLayout === 'cutout' ? (
              <div className="w-28 h-32 rounded-b-full overflow-hidden mb-5 shadow-2xl border-4 border-white/40 transform rotate-1 bg-white">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <User className="w-14 h-14 text-white" />
                  </div>
                )}
              </div>
            ) : profile.profileLayout === 'shape' ? (
              <div className="w-28 h-28 rounded-[2rem] overflow-hidden mb-5 shadow-lg border-2 border-white/30 transform -rotate-3 bg-white">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <User className="w-14 h-14 text-white" />
                  </div>
                )}
              </div>
            ) : (
              /* Classic Default */
              <div className="w-28 h-28 rounded-full overflow-hidden mb-5 shadow-md">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <User className="w-14 h-14 text-white" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Title / Logo */}
          {profile.titleStyle === 'logo' && profile.logoUrl ? (
            <div className="mb-2 max-w-[220px] max-h-16 flex items-center justify-center">
              <img src={profile.logoUrl} alt="Logo" className="max-h-14 w-auto object-contain" />
            </div>
          ) : (
            <h1
              className={clsx(
                "text-[22px] font-bold tracking-tight mb-1 text-center",
                textClass
              )}
              style={profile.titleColor ? { color: profile.titleColor } : {}}
            >
              {profile.name || profile.username || "username"}
            </h1>
          )}

          <p
            className={clsx(
              "text-sm text-center font-medium mb-6 max-w-xs",
              textClass,
              "opacity-80"
            )}
          >
            {profile.bio || "bio goes here"}
          </p>

          {/* Social Icons */}
          {socialLinks.length > 0 && (
            <div className="flex gap-5 mb-8 flex-wrap justify-center">
              {socialLinks.map((link) => {
                const Icon = getSocialIcon(link.platform);
                if (!Icon) return null;
                return (
                  <a
                    key={link.platform}
                    href={getSocialUrl(link.platform, link.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={socialIconClass}
                    title={link.platform}
                  >
                    <Icon className="w-full h-full" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Custom Links & Collections */}
          <div className="w-full space-y-4 mb-12">
            {customLinks.map((block) => {
              if (block.type === 'collection') {
                if (block.layout === 'grid') {
                  const linkCount = block.links?.length || 0;
                  const isEven = linkCount > 0 && linkCount % 2 === 0;
                  const gridColsClass = isEven ? "grid-cols-2" : "grid-cols-3";

                  return (
                    <div key={block.id} className="w-full pt-2">
                      {block.title && <h3 className={clsx("font-bold text-sm mb-3 pl-1", textClass)}>{block.title}</h3>}
                      <div className={clsx("grid gap-3", gridColsClass)}>
                        {block.links?.map(link => (
                          <a
                            key={link.id}
                            href={link.url?.match(/^https?:\/\//) ? link.url : `https://${link.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square rounded-2xl flex flex-col items-center justify-center p-2 bg-white/20 backdrop-blur-md border border-white/20 hover:scale-105 transition-transform"
                            style={isColor && templateValue !== '#0f172a' ? { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)' } : {}}
                          >
                            <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center mb-2">
                              <Link2 className={clsx("w-5 h-5", textClass)} />
                            </div>
                            <span className={clsx("text-[10px] font-bold text-center line-clamp-2 leading-tight", textClass)}>
                              {link.title || "Link Title"}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                } else {
                  // List Layout
                  return (
                    <div key={block.id} className="w-full pt-2">
                      {block.title && <h3 className={clsx("font-bold text-sm mb-3 pl-1", textClass)}>{block.title}</h3>}
                      <div className="space-y-3">
                        {block.links?.map(link => (
                          <a
                            key={link.id}
                            href={link.url?.match(/^https?:\/\//) ? link.url : `https://${link.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonClass}
                          >
                            <div className="w-8 h-8 rounded bg-black/5 flex items-center justify-center shrink-0 overflow-hidden">
                              <Link2 className="w-4 h-4 opacity-50" />
                            </div>
                            <span className="flex-1 text-center font-semibold text-[15px]">
                              {link.title || "Link Title"}
                            </span>
                            <div className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/5 rounded-full transition">
                              <MoreHorizontal className="w-5 h-5 opacity-60" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                }
              }

              // Normal standalone link
              return (
                <a
                  key={block.id}
                  href={block.url?.match(/^https?:\/\//) ? block.url : `https://${block.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                  style={customButtonStyle}
                >
                  <div className="w-8 h-8 rounded bg-black/5 flex items-center justify-center shrink-0 overflow-hidden">
                    <Link2 className="w-4 h-4 opacity-50" />
                  </div>
                  <span className="flex-1 text-center font-semibold text-[15px]">
                    {block.title || "Link Title"}
                  </span>
                  <div className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-black/5 rounded-full transition">
                    <MoreHorizontal className="w-5 h-5 opacity-60" />
                  </div>
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

          {/* Bottom Logo Pill */}
          <div className="mt-auto pt-8 flex flex-col items-center">
            <div className="mt-8 flex gap-3 text-[11px] font-medium opacity-60 text-center flex-wrap justify-center max-w-[80%]">
              <span className="cursor-pointer hover:underline">
                Cookie Preferences
              </span>{" "}
              •<span className="cursor-pointer hover:underline">Report</span> •
              <span className="cursor-pointer hover:underline">Privacy</span> •
              <span className="cursor-pointer hover:underline">
                About this account
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal Overlay */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="bg-white w-full sm:w-[420px] rounded-t-3xl sm:rounded-3xl p-6 relative animate-slide-up sm:animate-fade-in shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="w-8" /> {/* Spacer for centering */}
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                Share LinkZip
              </h2>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Horizontal Scroll Share Options */}
            <div className="flex overflow-x-auto gap-4 pb-4 mb-4 hide-scrollbar snap-x">
              <button
                onClick={handleCopy}
                className="flex flex-col items-center gap-2 shrink-0 snap-start"
              >
                <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition shadow-sm border border-gray-200">
                  <Link2 className="w-6 h-6 text-gray-700" />
                </div>
                <span className="text-xs font-medium text-gray-700">
                  Copy LinkZip
                </span>
              </button>

              <a
                href={`https://twitter.com/intent/tweet?url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 shrink-0 snap-start"
              >
                <div className="w-[60px] h-[60px] rounded-full bg-black flex items-center justify-center hover:opacity-80 transition shadow-sm text-white">
                  <FaTwitter className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-gray-700">X</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 shrink-0 snap-start"
              >
                <div className="w-[60px] h-[60px] rounded-full bg-[#1877F2] flex items-center justify-center hover:opacity-80 transition shadow-sm text-white">
                  <FaFacebook className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-gray-700">
                  Facebook
                </span>
              </a>

              <a
                href={`https://api.whatsapp.com/send?text=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 shrink-0 snap-start"
              >
                <div className="w-[60px] h-[60px] rounded-full bg-[#25D366] flex items-center justify-center hover:opacity-80 transition shadow-sm text-white">
                  <FaWhatsapp className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-gray-700">
                  WhatsApp
                </span>
              </a>

              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 shrink-0 snap-start"
              >
                <div className="w-[60px] h-[60px] rounded-full bg-[#0A66C2] flex items-center justify-center hover:opacity-80 transition shadow-sm text-white">
                  <FaLinkedin className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-gray-700">
                  LinkedIn
                </span>
              </a>
            </div>

            {/* Modal Footer / Upsell */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-bold text-gray-900 mb-1 text-[15px]">
                Join {profile.username || "username"} on LinkZip
              </h3>
              <p className="text-[13px] text-gray-500 mb-5 leading-relaxed pr-4">
                Get your own free LinkZip. The only link in bio trusted by millions.
              </p>
              <div className="flex gap-3">
                <a
                  href="/"
                  className="flex-1 py-3.5 bg-black text-white text-center rounded-full font-bold text-[15px] hover:bg-gray-800 transition"
                >
                  Sign up free
                </a>
                <a
                  href="/"
                  className="flex-1 py-3.5 bg-white text-black border border-gray-300 text-center rounded-full font-bold text-[15px] hover:bg-gray-50 transition"
                >
                  Find out more
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LinkTreePreview;
