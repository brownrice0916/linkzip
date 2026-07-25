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
import { User, Share, MoreHorizontal, Link2, X, Mail, Copy, Check, Share2, ExternalLink } from "lucide-react";
import { getLinkIcon } from "../lib/icons";
import clsx from "clsx";

interface LinkTreePreviewProps {
  profile?: UserProfile;
  templateType?: "color" | "preset";
  templateValue?: string;
  socialLinks?: SocialLink[];
  customLinks?: CustomLink[];
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

const LinkTreePreview: React.FC<LinkTreePreviewProps> = (props) => {
  const store = useStore();
  const profile = props.profile || store.profile;
  const templateType = props.templateType || store.templateType;
  const templateValue = props.templateValue || store.templateValue;
  const socialLinks = props.socialLinks || store.socialLinks;
  const customLinks = props.customLinks || store.customLinks;
  const isPublic = props.isPublic || false;

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const isColor = templateType === "color";
  const {
    buttonStyle = "solid",
    buttonRoundness = "full",
    buttonShadow = "soft",
    buttonColor,
    buttonTextColor,
    fontFamily = "sans",
    titleFontFamily,
    pageTextColor,
    sticker,
  } = useStore();

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
  if (buttonColor) customButtonStyle.backgroundColor = buttonColor;
  if (buttonTextColor) customButtonStyle.color = buttonTextColor;

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

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("Link copied to clipboard!");
  };

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
          <div
            onClick={() => setIsShareModalOpen(true)}
            className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition shadow-2xs",
              profile.profileLayout === "banner"
                ? "bg-white/40 backdrop-blur-md hover:bg-white/60 text-gray-900"
                : "bg-black/5 hover:bg-black/10"
            )}
          >
            <Share
              className={clsx(
                "w-5 h-5",
                profile.profileLayout === "banner" ? "text-gray-900" : textClass
              )}
            />
          </div>
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
                    className={clsx(
                      "w-9 h-9 rounded-full flex items-center justify-center transition shadow-2xs hover:scale-110",
                      templateValue.startsWith("neo-")
                        ? "bg-black text-white border-2 border-black"
                        : "bg-black/5 hover:bg-black/10 text-gray-900",
                      textClass
                    )}
                    style={pageTextColor ? { color: pageTextColor } : {}}
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
                if (block.layout === "grid") {
                  const linkCount = block.links?.length || 0;
                  const isEven = linkCount > 0 && linkCount % 2 === 0;
                  const gridColsClass = isEven ? "grid-cols-2" : "grid-cols-3";

                  return (
                    <div key={block.id} className="w-full pt-2">
                      {block.title && (
                        <h3
                          className={clsx(
                            "font-bold text-sm mb-3 pl-1",
                            textClass
                          )}
                        >
                          {block.title}
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

                          return (
                            <a
                              key={link.id}
                              href={
                                link.url?.match(/^https?:\/\//)
                                  ? link.url
                                  : `https://${link.url}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="aspect-square rounded-2xl flex flex-col items-center justify-center p-2 bg-white/20 backdrop-blur-md border border-white/20 hover:scale-105 transition-transform"
                              style={
                                isColor && templateValue !== "#0f172a"
                                  ? {
                                      backgroundColor: "rgba(0,0,0,0.05)",
                                      borderColor: "rgba(0,0,0,0.1)",
                                    }
                                  : {}
                              }
                            >
                              {!isNone && (
                                <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center mb-2 overflow-hidden shrink-0">
                                  {isImage && link.icon ? (
                                    <img
                                      src={link.icon}
                                      alt={link.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <IconComp
                                      className={clsx("w-5 h-5", textClass)}
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
                      {block.title && (
                        <h3
                          className={clsx(
                            "font-bold text-sm mb-3 pl-1",
                            textClass
                          )}
                        >
                          {block.title}
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

                          return (
                            <a
                              key={link.id}
                              href={
                                link.url?.match(/^https?:\/\//)
                                  ? link.url
                                  : `https://${link.url}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonClass}
                            >
                              {!isNone && (
                                <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center shrink-0 overflow-hidden">
                                  {isImage && link.icon ? (
                                    <img
                                      src={link.icon}
                                      alt={link.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <IconComp className="w-5 h-5 opacity-85" />
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

              return (
                <a
                  key={block.id}
                  href={
                    block.url?.match(/^https?:\/\//)
                      ? block.url
                      : `https://${block.url}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                  style={customButtonStyle}
                >
                  {!isNone && (
                    <div
                      className={clsx(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                        templateValue.startsWith("neo-")
                          ? "bg-amber-300 border-2 border-black text-black shadow-xs font-bold"
                          : "bg-black/5"
                      )}
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
                            templateValue.startsWith("neo-")
                              ? "text-black opacity-90"
                              : "opacity-85"
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
            {/* <div className="border-t border-gray-100 pt-6">
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
            </div> */}
          </div>
        </div>
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
    </>
  );
};

export default LinkTreePreview;
