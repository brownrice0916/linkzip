import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useStore,
  type CustomLink,
  type SocialLink,
} from "../../store/useStore";
import {
  Plus,
  Link2,
  Trash2,
  Folder,
  GripVertical,
  CornerDownRight,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Phone,
  Smartphone,
  Gift,
  Heart,
  Lock,
  HelpCircle,
  BookOpen,
  MessageSquareText,
  CalendarCheck,
  BadgeDollarSign,
  MapPinned,
  Upload,
  Palette,
  Megaphone,
  ClipboardList,
  ShoppingBag,
  FileDown,
  Newspaper,
  Pencil,
  EllipsisVertical,
  Bell,
  Copy,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { getLinkIcon } from "../../lib/icons";
import { ThumbnailModal } from "./ThumbnailModal";
import { ProfileImageCropModal } from "./ProfileImageCropModal";
import { SocialModal } from "./SocialModal";
import { AddBlockModal } from "./AddBlockModal";
import { ProfitAccountModal } from "./ProfitAccountModal";
import { NoticeModal } from "./NoticeModal";
import { ProductRegistrationModal } from "./ProductRegistrationModal";
import { AddReservationScheduleModal } from "./AddReservationScheduleModal";
import { SNSPlatformPickerModal } from "./SNSPlatformPickerModal";
import clsx from "clsx";
import type {
  DonationConfig,
  NoticeConfig,
  SalesConfig,
  ProductItem,
  ReservationConfig,
  ReservationScheduleItem,
} from "../../store/useStore";
import { BlockList } from "./BlockList";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { deletePublicFile, uploadPublicFile, uploadPublicImage } from "../../services/storageService";
import { BETA_LIFETIME_PREMIUM_GRANT, entitlementsForMember, workspaceUsage } from "../../domain/membershipPlans";
import { requestUpgradePrompt } from "../UpgradePromptHost";
import { useNavigate } from "react-router-dom";
import { STOREFRONT_AVAILABLE } from "../../config/featureFlags";

const getSocialIconComp = (platform: string) => {
  return getLinkIcon(platform);
};

const normalizeLinkUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const getThumbnailPreviewStyle = (link: CustomLink): React.CSSProperties => {
  const zoom = Math.max(100, link.imageZoom ?? 100) / 100;
  const visibleFraction = 1 / zoom;
  const centerX = Math.max(0, Math.min(1, (link.imagePositionX ?? 50) / 100));
  const centerY = Math.max(0, Math.min(1, (link.imagePositionY ?? 50) / 100));
  const cropX = Math.max(0, Math.min(1 - visibleFraction, centerX - visibleFraction / 2));
  const cropY = Math.max(0, Math.min(1 - visibleFraction, centerY - visibleFraction / 2));

  return {
    objectPosition: "center",
    transformOrigin: "top left",
    transform: `scale(${zoom}) translate(${-cropX * 100}%, ${-cropY * 100}%)`,
  };
};

const getBlockKind = (link: CustomLink) => {
  if (link.blockKind) return link.blockKind;
  if (link.type === "sales") {
    return link.salesConfig?.salesType === "product" ? "product_sales" : "digital_file_sales";
  }
  if (link.type) return link.type;
  if (link.url?.includes("/guestbook") || link.title?.includes("방명록")) return "guestbook";
  if (link.title?.includes("비즈니스") || link.title?.includes("오픈채팅")) return "contact";
  return "link";
};

const blockHeaderMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; badge: string }> = {
  link: { label: "단일 링크", icon: Link2, badge: "bg-emerald-500" },
  image: { label: "이미지 링크", icon: ImageIcon, badge: "bg-cyan-500" },
  collection: { label: "링크 그룹", icon: Folder, badge: "bg-gray-900" },
  sns: { label: "소셜 미디어", icon: getLinkIcon("instagram"), badge: "bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600" },
  map: { label: "거주지", icon: MapPinned, badge: "bg-sky-600" },
  contact: { label: "비즈니스 연락처", icon: Phone, badge: "bg-stone-600" },
  notice: { label: "공지사항", icon: Megaphone, badge: "bg-amber-500" },
  file: { label: "파일 공유", icon: FileDown, badge: "bg-cyan-600" },
  reservation: { label: "캘린더", icon: CalendarCheck, badge: "bg-emerald-600" },
  guestbook: { label: "방명록", icon: BookOpen, badge: "bg-rose-500" },
  anonymous_message: { label: "익명 메시지 보내기", icon: MessageSquareText, badge: "bg-[#ff5f35]" },
  customer_info: { label: "고객 정보 수집", icon: ClipboardList, badge: "bg-blue-500" },
  digital_file_sales: { label: "디지털 파일 판매", icon: FileDown, badge: "bg-blue-600" },
  product_sales: { label: "실물 상품 판매", icon: ShoppingBag, badge: "bg-indigo-500" },
  store: { label: "스토어", icon: ShoppingBag, badge: "bg-[#111827] text-white" },
  affiliate_product: { label: "어필리에이트 상품", icon: BadgeDollarSign, badge: "bg-[#ffcf4a] text-[#171714]" },
  donation: { label: "후원", icon: Heart, badge: "bg-red-500" },
};

const disconnectAccountFromLinks = (links: CustomLink[]): CustomLink[] => links.map((link) => {
  const donationConfig = link.donationConfig ? {...link.donationConfig} : undefined;
  if (donationConfig) {
    donationConfig.accountConnected = false;
    delete donationConfig.bankName;
    delete donationConfig.accountNumber;
    delete donationConfig.accountOwnerName;
    delete donationConfig.idNumber;
  }
  const salesConfig = link.salesConfig ? {...link.salesConfig} : undefined;
  if (salesConfig) {
    delete salesConfig.bankName;
    delete salesConfig.accountNumber;
    delete salesConfig.accountOwner;
  }
  return {
    ...link,
    ...(donationConfig ? {donationConfig} : {}),
    ...(salesConfig ? {salesConfig} : {}),
    ...(link.links ? {links: disconnectAccountFromLinks(link.links)} : {}),
  };
});

const containsNoticeBlock = (links: CustomLink[]): boolean => links.some((link) => (
  link.type === "notice"
  || link.url?.includes("/notice")
  || containsNoticeBlock(link.links || [])
));

const LinksEditor = () => {
  const navigate = useNavigate();
  const {
    profile,
    setProfile,
    buttonColor,
    buttonTextColor,
    buttonOpacity,
    buttonTextOpacity,
    socialLinks,
    addSocialLink,
    updateSocialLink,
    removeSocialLink,
    customLinks,
    addCustomLink,
    updateCustomLink,
    removeCustomLink,
    reorderLinks,
    language,
    user,
    membershipPlan,
    membershipGrant,
  } = useStore();
  const isKo = language === 'ko';
  const planEntitlements = entitlementsForMember(membershipPlan, membershipGrant);
  const currentUsage = workspaceUsage({ customLinks });

  const focusPreviewBlock = (blockId: string) => {
    window.dispatchEvent(new CustomEvent("linkzip:focus-preview-block", { detail: { blockId } }));
  };

  const renderBlockIdentity = (link: CustomLink, summary = link.title, typeBadge?: React.ReactNode) => {
    const kind = getBlockKind(link);
    const meta = blockHeaderMeta[kind] || blockHeaderMeta.link;
    const Icon = meta.icon;
    const normalizedSummary = summary?.trim();
    const showSummary = normalizedSummary && normalizedSummary !== meta.label;

    return (
      <div className="block-identity flex min-w-0 flex-1 items-center gap-3">
        <span className={clsx("block-identity-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs", meta.badge)} aria-label={`${meta.label} 아이콘`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="block-identity-copy flex min-w-0 items-baseline gap-3">
          <span className="block-identity-title shrink-0 text-sm font-black text-gray-950">{meta.label}</span>
          {showSummary && <span className="block-identity-summary truncate text-xs font-semibold text-gray-400">{normalizedSummary}</span>}
          {typeBadge}
        </div>
      </div>
    );
  };

  const [activeThumbnailLink, setActiveThumbnailLink] =
    useState<CustomLink | null>(null);
  const [openBlockMenuId, setOpenBlockMenuId] = useState<string | null>(null);
  const [pendingDeleteLink, setPendingDeleteLink] = useState<CustomLink | null>(null);
  const [blockMenuMode, setBlockMenuMode] = useState<"actions" | "design">("actions");
  const [blockMenuPosition, setBlockMenuPosition] = useState({ top: 0, left: 0 });
  const [uploadingAffiliateId, setUploadingAffiliateId] = useState<string | null>(null);
  const [uploadingSalesImageId, setUploadingSalesImageId] = useState<string | null>(null);
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);
  const [isQuickProfileOpen, setIsQuickProfileOpen] = useState(false);
  const [quickProfileName, setQuickProfileName] = useState("");
  const [isQuickAvatarUploading, setIsQuickAvatarUploading] = useState(false);
  const [isQuickAvatarRemoveArmed, setIsQuickAvatarRemoveArmed] = useState(false);
  const quickAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [quickAvatarCrop, setQuickAvatarCrop] = useState<{ src: string; fileName: string } | null>(null);
  const [isStoreGuideOpen, setIsStoreGuideOpen] = useState(false);

  const handleQuickAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user?.uid) {
      alert(isKo ? "로그인이 필요합니다." : "Please sign in.");
      return;
    }
    setQuickAvatarCrop({ src: URL.createObjectURL(file), fileName: file.name });
    event.target.value = "";
  };

  const closeQuickAvatarCrop = () => {
    setQuickAvatarCrop((current) => {
      if (current?.src.startsWith("blob:")) URL.revokeObjectURL(current.src);
      return null;
    });
  };

  const openQuickProfileNameEditor = () => {
    setQuickProfileName(profile.name || profile.username || "");
    setIsQuickProfileOpen(true);
  };

  const closeQuickProfileNameEditor = () => {
    setQuickProfileName("");
    setIsQuickProfileOpen(false);
  };

  const saveQuickProfileName = () => {
    const nextName = quickProfileName.trim();
    if (!nextName) return;
    const latestProfile = useStore.getState().profile;
    setProfile({ ...latestProfile, name: nextName });
    closeQuickProfileNameEditor();
  };

  const handleQuickAvatarUpload = async (file: File) => {
    if (!user?.uid) return;
    setIsQuickAvatarUploading(true);
    try {
      const avatarUrl = await uploadPublicImage(`profiles/${user.uid}/avatarUrl`, file);
      const latestProfile = useStore.getState().profile;
      setProfile({ ...latestProfile, avatarUrl });
      closeQuickAvatarCrop();
    } catch (error) {
      console.error("Quick avatar upload failed:", error);
      alert(isKo ? "이미지 업로드에 실패했습니다." : "Image upload failed.");
    } finally {
      setIsQuickAvatarUploading(false);
    }
  };

  // Same as the profile tab: dropping the URL is enough, because saving cleans
  // up profile images nothing references any more.
  const handleQuickAvatarRemove = () => {
    const latestProfile = useStore.getState().profile;
    setProfile({ ...latestProfile, avatarUrl: '' });
  };

  const handleStoreEntry = () => {
    if (!STOREFRONT_AVAILABLE) {
      alert(isKo ? "스토어 기능을 준비하고 있어요. 기존 설정과 상품 데이터는 그대로 보관됩니다." : "The store is coming soon. Existing settings and product data are preserved.");
      return;
    }
    if (profile.storefront) {
      navigate("/admin/store");
      return;
    }
    setIsStoreGuideOpen(true);
  };

  const findLinkContext = (
    links: CustomLink[],
    id: string,
    parentCollection?: CustomLink,
  ): { link: CustomLink; parentCollection?: CustomLink } | undefined => {
    for (const link of links) {
      if (link.id === id) return { link, parentCollection };
      const nested = link.links ? findLinkContext(link.links, id, link) : undefined;
      if (nested) return nested;
    }
    return undefined;
  };

  const handleCollectionCardClick = (event: React.MouseEvent, collectionId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [data-no-style-editor], [data-drag-handle], .cursor-grab')) return;
    event.stopPropagation();
    toggleBlockCollapse(collectionId, true);
  };

  const handleCollapsibleCardClick = (event: React.MouseEvent, linkId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [data-no-style-editor], [data-drag-handle], .cursor-grab')) return;
    event.stopPropagation();
    toggleBlockCollapse(linkId, true);
  };

  // Add / Edit Reservation Schedule Modal State
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
  const [isGroupTypeModalOpen, setIsGroupTypeModalOpen] = useState(false);
  const [addBlockTargetCollectionId, setAddBlockTargetCollectionId] = useState<string | null>(null);
  const [quickAddCollectionId, setQuickAddCollectionId] = useState<string | null>(null);
  const [quickAddLinkTitle, setQuickAddLinkTitle] = useState("");
  const [quickAddLinkUrl, setQuickAddLinkUrl] = useState("");
  const [quickAddLinkError, setQuickAddLinkError] = useState("");
  const [showBottomAddButton, setShowBottomAddButton] = useState(false);
  const blockListRef = useRef<HTMLDivElement>(null);
  const [activeReservationScheduleLink, setActiveReservationScheduleLink] = useState<{
    link: CustomLink;
    editingSchedule?: ReservationScheduleItem | null;
  } | null>(null);

  // Universal Block Collapse State (all editable blocks start collapsed)
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<
    Record<string, boolean>
  >({});

  const isBlockCollapsed = (id: string, defaultVal = true) => {
    return collapsedBlockIds[id] ?? defaultVal;
  };

  const toggleBlockCollapse = (id: string, defaultVal = true) => {
    setCollapsedBlockIds((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? defaultVal),
    }));
  };

  useEffect(() => {
    const blockList = blockListRef.current;
    if (!blockList) return;

    const updateBottomButtonVisibility = () => {
      const listHeight = blockList.getBoundingClientRect().height;
      setShowBottomAddButton(customLinks.length > 0 && listHeight > Math.max(420, window.innerHeight * 0.55));
    };

    updateBottomButtonVisibility();
    const resizeObserver = new ResizeObserver(updateBottomButtonVisibility);
    resizeObserver.observe(blockList);
    window.addEventListener("resize", updateBottomButtonVisibility);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBottomButtonVisibility);
    };
  }, [customLinks.length]);

  const openRootAddBlockModal = () => {
    setAddBlockTargetCollectionId(null);
    setIsAddBlockModalOpen(true);
  };

  const renderCollapseControl = (id: string, collapsed: boolean, defaultVal = true, label = "") => (
    <button
      type="button"
      onClick={() => toggleBlockCollapse(id, defaultVal)}
      className="p-1.5 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer shrink-0"
      title={collapsed ? `${label}펼치기` : `${label}접기`}
      aria-label={collapsed ? `${label}펼치기` : `${label}접기`}
    >
      <ChevronDown className={clsx("w-4 h-4 transition-transform duration-200", collapsed ? "-rotate-90 text-gray-400" : "rotate-0 text-black")} />
    </button>
  );

  const renderVisibilityControl = (link: CustomLink) => (
    <button
      type="button"
      role="switch"
      aria-checked={link.isVisible !== false}
      aria-label={link.isVisible !== false ? "공개 중 — 숨기기" : "숨김 중 — 공개하기"}
      title={link.isVisible !== false ? "링크 숨기기" : "링크 공개하기"}
      onClick={() => updateCustomLink(link.id, { isVisible: link.isVisible === false })}
      className={clsx(
        "relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
        link.isVisible !== false ? "bg-black" : "bg-gray-200",
      )}
    >
      <span
        className={clsx(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          link.isVisible !== false ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );

  const openBlockEditor = (id: string) => {
    const context = findLinkContext(customLinks, id);
    if (!context) return;
    if (context?.link.type === "image" || context?.link.type === "link" || !context?.link.type) {
      const updates: Partial<CustomLink> = {};
      if (!context.link.title?.trim()) {
        updates.title = context.link.type === "image" ? "이미지 링크" : "링크 제목";
      }
      if (Object.keys(updates).length > 0) updateCustomLink(id, updates);
    }
    setCollapsedBlockIds((prev) => ({ ...prev, [id]: false }));
  };

  const duplicateBlock = (source: CustomLink) => {
    if (source.type === 'file' && customLinks.filter((item) => item.type === 'file').length >= 2) {
      alert(isKo ? '베타 기간에는 파일 공유 블록을 2개까지만 사용할 수 있습니다.' : 'During beta, you can use up to 2 file-sharing blocks.');
      setOpenBlockMenuId(null);
      return;
    }
    const now = Date.now();
    let sequence = 0;
    const nextId = (prefix: string) => `${prefix}-${now}-${sequence++}`;
    const cloneLink = (item: CustomLink, rename = false): CustomLink => {
      const clone = JSON.parse(JSON.stringify(item)) as CustomLink;
      clone.id = nextId(item.type || 'link');
      if (rename) clone.title = `${item.title || (isKo ? '블록' : 'Block')} ${isKo ? '복사본' : 'copy'}`;
      if (clone.links) clone.links = clone.links.map((child) => cloneLink(child));
      if (clone.snsLinks) clone.snsLinks = clone.snsLinks.map((social) => ({ ...social, id: nextId('sns') }));
      if (clone.salesConfig?.products) {
        clone.salesConfig = {
          ...clone.salesConfig,
          products: clone.salesConfig.products.map((product) => ({ ...product, id: nextId('product') })),
        };
      }
      if (clone.reservationConfig?.schedules) {
        clone.reservationConfig = {
          ...clone.reservationConfig,
          schedules: clone.reservationConfig.schedules.map((schedule) => ({ ...schedule, id: nextId('schedule') })),
        };
      }
      if (clone.type === 'file' && clone.fileConfig) {
        clone.url = '';
        clone.fileConfig = {
          ...clone.fileConfig,
          fileUrl: '',
          filePath: '',
          fileName: '',
          fileSize: '',
        };
      }
      return clone;
    };

    const duplicate = cloneLink(source, true);
    const context = findLinkContext(customLinks, source.id);
    if (context?.parentCollection) {
      updateCustomLink(context.parentCollection.id, {
        links: [...(context.parentCollection.links || []), duplicate],
      });
    } else {
      addCustomLink(duplicate);
    }
    setCollapsedBlockIds((prev) => ({ ...prev, [duplicate.id]: false }));
    setOpenBlockMenuId(null);
    setBlockMenuMode('actions');
  };

  const requestBlockDelete = (link: CustomLink) => {
    setOpenBlockMenuId(null);
    setBlockMenuMode('actions');
    setPendingDeleteLink(link);
  };

  const confirmBlockDelete = async () => {
    if (!pendingDeleteLink) return;
    if (pendingDeleteLink.type === "file" && user?.uid) {
      await deletePublicFile(pendingDeleteLink.fileConfig?.filePath, user.uid);
    }
    removeCustomLink(pendingDeleteLink.id);
    setPendingDeleteLink(null);
  };

  const updateBlockVisual = (link: CustomLink, updates: Partial<CustomLink>) => {
    if (link.type !== "collection") {
      updateCustomLink(link.id, updates);
      return;
    }

    const updatedChildren = (link.links || []).map((child) => ({
      ...child,
      ...updates,
      ...(updates.customStyle
        ? { customStyle: { ...(child.customStyle || {}), ...updates.customStyle } }
        : {}),
    }));
    updateCustomLink(link.id, { ...updates, links: updatedChildren });
  };

  const renderBlockActionMenu = (link: CustomLink, editLabel = "편집") => (
    <div
      className="relative shrink-0"
      data-no-style-editor
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const menuWidth = 288;
          setBlockMenuPosition({
            top: rect.bottom + 6,
            left: Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth)),
          });
          setOpenBlockMenuId((current) => {
            const next = current === link.id ? null : link.id;
            if (next) setBlockMenuMode("actions");
            return next;
          });
        }}
        className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-black"
        aria-label={`${link.title || "블록"} 메뉴`}
        aria-expanded={openBlockMenuId === link.id}
      >
        <EllipsisVertical className="h-4 w-4" />
      </button>
      {openBlockMenuId === link.id && createPortal(
        <>
        <button
          type="button"
          aria-label="블록 메뉴 닫기"
          className="fixed inset-0 z-[9998] cursor-default"
          onClick={() => {
            setOpenBlockMenuId(null);
            setBlockMenuMode("actions");
          }}
        />
        <div
          className="fixed z-[9999] w-72 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl"
          style={blockMenuPosition}
        >
          {blockMenuMode === "actions" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  openBlockEditor(link.id);
                  setOpenBlockMenuId(null);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-gray-700 transition hover:bg-gray-100 hover:text-black"
              >
                <Pencil className="h-4 w-4" />
                {editLabel}
              </button>
              <button
                type="button"
                onClick={() => setBlockMenuMode("design")}
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-gray-700 transition hover:bg-gray-100 hover:text-black"
              >
                <Palette className="h-4 w-4" />
                디자인
              </button>
              <button
                type="button"
                onClick={() => {
                  updateCustomLink(link.id, { isVisible: link.isVisible === false });
                  setOpenBlockMenuId(null);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-gray-700 transition hover:bg-gray-100 hover:text-black"
              >
                {link.isVisible !== false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {link.isVisible !== false
                  ? (isKo ? "숨기기" : "Hide")
                  : (isKo ? "공개하기" : "Show")}
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={() => duplicateBlock(link)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-gray-700 transition hover:bg-gray-100 hover:text-black"
              >
                <Copy className="h-4 w-4" />
                {isKo ? '복제' : 'Duplicate'}
              </button>
              <button
                type="button"
                onClick={() => requestBlockDelete(link)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                {isKo ? '삭제' : 'Delete'}
              </button>
            </>
          ) : (
            <div className="space-y-3 p-1">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setBlockMenuMode("actions")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-black text-gray-900 transition hover:bg-gray-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  디자인
                </button>
                <button
                  type="button"
                  onClick={() => updateBlockVisual(link, {
                    buttonColor: undefined,
                    buttonTextColor: undefined,
                    customStyle: {
                      ...(link.customStyle || {}),
                      opacity: undefined,
                      textOpacity: undefined,
                    },
                  })}
                  className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-gray-500 transition hover:bg-gray-100 hover:text-black"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  초기화
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1.5 text-[11px] font-bold text-gray-600">배경색</p>
                  <ColorPickerPopover
                    label="배경색"
                    value={link.buttonColor || buttonColor || "#FFFFFF"}
                    opacity={link.customStyle?.opacity ?? buttonOpacity ?? 100}
                    onChange={(color) => updateBlockVisual(link, { buttonColor: color })}
                    onOpacityChange={(opacity) => updateBlockVisual(link, {
                      customStyle: { ...(link.customStyle || {}), opacity },
                    })}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-bold text-gray-600">글자색</p>
                  <ColorPickerPopover
                    label="글자색"
                    value={link.buttonTextColor || buttonTextColor || "#111827"}
                    opacity={link.customStyle?.textOpacity ?? buttonTextOpacity ?? 100}
                    onChange={(color) => updateBlockVisual(link, { buttonTextColor: color })}
                    onOpacityChange={(textOpacity) => updateBlockVisual(link, {
                      customStyle: { ...(link.customStyle || {}), textOpacity },
                    })}
                  />
                </div>
              </div>
              <p className="px-1 text-[10px] leading-relaxed text-gray-400">이 블록에만 적용됩니다.</p>
            </div>
          )}
        </div>
        </>,
        document.body,
      )}
    </div>
  );

  const collapseAllBlocks = () => {
    const newMap: Record<string, boolean> = {};
    customLinks.forEach((l) => {
      newMap[l.id] = true;
    });
    setCollapsedBlockIds(newMap);
  };

  const expandAllBlocks = () => {
    const newMap: Record<string, boolean> = {};
    customLinks.forEach((l) => {
      newMap[l.id] = false;
    });
    setCollapsedBlockIds(newMap);
  };

  // Social Link Modal State
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [editingSocialLink, setEditingSocialLink] = useState<SocialLink | null>(
    null
  );

  const handleEditSocial = (link: SocialLink) => {
    setEditingSocialLink(link);
    setIsSocialModalOpen(true);
  };

  const handleSaveSocial = (linkData: SocialLink) => {
    if (editingSocialLink) {
      updateSocialLink(editingSocialLink.id, linkData);
    } else {
      addSocialLink({ ...linkData, id: `social-${Date.now()}` });
    }
  };

  const handleDeleteSocial = (id: string) => {
    removeSocialLink(id);
  };

  const handleAddLink = () => {
    addCustomLink({
      id: `link-${Date.now()}`,
      blockKind: "link",
      title: "새 링크",
      url: "",
      isVisible: true,
      thumbnailType: "none",
      iconName: "",
    });
  };

  const handleAddLinkToCollection = (collectionId: string) => {
    setQuickAddCollectionId(collectionId);
    setQuickAddLinkTitle("");
    setQuickAddLinkUrl("");
    setQuickAddLinkError("");
  };

  const closeQuickAddLink = () => {
    setQuickAddCollectionId(null);
    setQuickAddLinkTitle("");
    setQuickAddLinkUrl("");
    setQuickAddLinkError("");
  };

  const submitQuickAddLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quickAddCollectionId) return;
    const title = quickAddLinkTitle.trim();
    const url = normalizeLinkUrl(quickAddLinkUrl);
    if (!title || !url) {
      setQuickAddLinkError(isKo ? "텍스트와 링크 주소를 모두 입력해 주세요." : "Enter both text and a link URL.");
      return;
    }
    const newLinkId = `link-${Date.now()}`;
    addCustomLink({
      id: newLinkId,
      type: "link",
      blockKind: "link",
      title,
      url,
      isVisible: true,
      thumbnailType: "none",
      iconName: "",
      linkLayout: "classic",
    }, quickAddCollectionId);
    setCollapsedBlockIds((prev) => ({
      ...prev,
      [quickAddCollectionId]: false,
    }));
    closeQuickAddLink();
  };

  const handleAddCollection = (style: "classic" | "image" = "classic") => {
    const newCollectionId = `col-${Date.now()}`;
    addCustomLink({
      id: newCollectionId,
      type: "collection",
      blockKind: "collection",
      title: "새 링크 그룹",
      layout: style === "image" ? "grid" : "list",
      collectionStyle: style,
      collectionColumns: style === "image" ? 2 : undefined,
      links: [],
    });
    setCollapsedBlockIds((prev) => ({ ...prev, [newCollectionId]: true }));
  };

  const handleSelectBlockType = (blockType: string) => {
    if (blockType === "store" && !STOREFRONT_AVAILABLE) {
      alert(isKo ? "스토어 기능을 준비하고 있어요." : "The store is coming soon.");
      return;
    }
    const userHandle = profile.username || "preview";
    const addBlockToTarget = (block: CustomLink) => addCustomLink(
      { ...block, blockKind: block.blockKind || blockType },
      addBlockTargetCollectionId || undefined,
    );

    if (blockType === "link") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "link",
        title: "새 링크",
        url: "",
        isVisible: true,
        thumbnailType: "none",
        iconName: "",
      });
    } else if (blockType === "store") {
      addBlockToTarget({
        id: `store-${Date.now()}`,
        type: "link",
        blockKind: "store",
        title: profile.storefront?.name || (isKo ? "내 스토어 보러 가기" : "Visit my store"),
        url: `/${userHandle}/shop`,
        isVisible: true,
        linkLayout: "classic",
        icon: profile.storefront?.thumbnailUrl || "",
        thumbnailType: profile.storefront?.thumbnailUrl ? "image" : "icon",
        iconName: "shopping-bag",
      });
      if (!profile.storefront) setIsStoreGuideOpen(true);
    } else if (blockType === "image") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "image",
        title: "이미지 링크",
        url: "",
        isVisible: true,
        icon: "",
        thumbnailType: "image",
      });
    } else if (blockType === "group_link" && !addBlockTargetCollectionId) {
      handleAddCollection();
    } else if (blockType === "sns") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "sns",
        title: "SNS",
        isVisible: true,
        snsLinks: [],
      });
    } else if (blockType === "donation") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "donation",
        title: "도네이션",
        url: `/${userHandle}/donation`,
        isVisible: true,
        iconName: "heart",
        donationConfig: {
          mainText: "도네이션",
          detailText: "응원 메시지와 함께 후원금을 보낼 수 있습니다.",
          minAmount: 3000,
          buttonText: "후원하기",
          bankName: profile.verifiedAccount?.bankName || "",
          accountNumber: profile.verifiedAccount?.accountNumber || "",
          accountOwnerName: profile.verifiedAccount?.accountOwnerName || "",
          accountConnected: !!profile.verifiedAccount?.accountConnected,
        },
      });
    } else if (blockType === "file") {
      const sharedFileCount = customLinks.filter((item) => item.type === "file").length;
      if (sharedFileCount >= 2) {
        alert(isKo ? "베타 기간에는 파일 공유 블록을 2개까지만 추가할 수 있습니다." : "During beta, you can add up to 2 file-sharing blocks.");
        return;
      }
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "file",
        title: "자료집 및 대표 파일 다운로드",
        url: "",
        isVisible: true,
        icon: "",
        thumbnailType: "icon",
        iconName: "paperclip",
        fileConfig: {
          title: "자료집 및 대표 파일 다운로드",
          description: "누구나 자유롭게 다운로드하실 수 있습니다.",
          fileUrl: "",
          fileName: "",
          fileSize: "",
        },
      });
    } else if (blockType === "notice") {
      if (containsNoticeBlock(customLinks)) {
        alert("공지사항 블록은 하나만 둘 수 있어요. 기존 공지사항 블록에서 공지를 3개까지 관리해 주세요.");
        return;
      }
      const firstNotice: NoticeConfig = {
        id: `notice-${Date.now()}`,
        title: "공지사항 제목을 입력하세요",
        content: "공지 내용을 입력하세요.",
        date: new Date().toLocaleDateString("ko-KR"),
      };
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "notice",
        title: "공지사항",
        url: `/${userHandle}/notice`,
        isVisible: true,
        thumbnailType: "none",
        iconName: "",
        noticeConfig: firstNotice,
        notices: [firstNotice],
      });
    } else if (blockType === "guestbook") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        title: "방명록",
        url: `/${userHandle}/guestbook`,
        isVisible: true,
        iconName: "book",
        thumbnailType: "icon",
      });
    } else if (blockType === "anonymous_message") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "anonymous_message",
        title: isKo ? "익명 메시지 보내기" : "Send an anonymous message",
        url: `/${userHandle}/message`,
        isVisible: true,
        iconName: "message-circle",
      });
    } else if (blockType === "customer_info") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "customer_info",
        title: "고객정보 수집",
        url: `/${userHandle}/customer_info`,
        isVisible: true,
        iconName: "clipboard-list",
        customerInfoConfig: {
          mainText: "뉴스레터",
          detailText: "새 소식을 정기적으로 보내드려요",
          displayMode: "header",
          submitButtonText: "제출하기",
          receiveEmail: true,
          receivePhone: false,
          receiveName: false,
        },
      });
    } else if (
      blockType === "sales" ||
      blockType === "digital_file_sales" ||
      blockType === "product_sales"
    ) {
      const salesType = blockType === "digital_file_sales"
        ? "digital_file"
        : blockType === "product_sales"
          ? "product"
          : undefined;
      const salesTitle = salesType === "digital_file" ? "디지털 파일 판매" : "실물 상품 판매";
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "sales",
        title: salesTitle,
        url: `/${userHandle}/sales`,
        isVisible: true,
        iconName: salesType === "digital_file" ? "file" : "shopping",
        salesConfig: {
          salesType,
          mainText: salesTitle,
          description: salesType === "product"
            ? "상품 정보와 배송 안내를 확인해주세요."
            : "구매 후 디지털 파일을 다운로드할 수 있습니다.",
          products: [],
          creatorMessage: "구매해주셔서 감사합니다.",
        },
      });
    } else if (blockType === "affiliate_product") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "affiliate_product",
        title: isKo ? "추천 상품" : "Recommended product",
        url: "",
        isVisible: true,
        iconName: "shopping-bag",
        affiliateProductConfig: {
          imageUrl: "",
          affiliateUrl: "",
          price: undefined,
          currency: "KRW",
          displayMode: "compact",
        },
      });
    } else if (blockType === "map") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "map",
        title: isKo ? "거주지" : "Location",
        isVisible: true,
        iconName: "map-pin",
        mapConfig: { query: "", displayMode: "featured" },
      });
    } else if (blockType === "reservation" || blockType === "booking") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "reservation",
        title: isKo ? "캘린더" : "Calendar",
        isVisible: true,
        iconName: "calendar-check",
        reservationConfig: {
          headerText: "",
          schedules: [],
          autoNotification: false
        }
      });
    } else if (blockType === "customer_inquiry" || blockType === "contact") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        title: "문의 링크",
        url: "",
        isVisible: true,
        iconName: "message-circle",
      });
    } else {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        title: `${blockType.replace("_", " ")} block`,
        url: "",
        isVisible: true,
        iconName: "sparkles",
      });
    }
  };

  // Render standard link item card
  const renderLinkItem = (
    link: CustomLink,
    isNested = false,
    parentCollectionId?: string
  ) => {
    const isCollapsed = isBlockCollapsed(link.id, true);
    const ThumbnailIcon = getLinkIcon(link.iconName || "link");
    const blockKind = getBlockKind(link);
    const supportsLinkDisplay = blockKind === "link" || blockKind === "store";
    const isFixedInternalLink = blockKind === "guestbook" || blockKind === "anonymous_message" || blockKind === "store";
    const fixedInternalUrl = blockKind === "guestbook"
      ? `/${profile.username || "preview"}/guestbook`
      : blockKind === "anonymous_message"
        ? `/${profile.username || "preview"}/message`
        : blockKind === "store"
          ? `/${profile.username || "preview"}/shop`
        : link.url || "";
    const isInsideCollection = isNested || customLinks.some((collection) =>
      collection.type === "collection" && collection.links?.some((nestedLink) => nestedLink.id === link.id),
    );

    return (
      <div
        key={link.id}
        data-testid={`link-card-${link.id}`}
        data-collapsed={isNested ? false : isCollapsed}
        onClick={isNested ? undefined : (event) => handleCollapsibleCardClick(event, link.id)}
        className={clsx(
          "rounded-3xl border bg-white transition-all relative group hover:border-gray-300 hover:shadow-md",
          isNested && "nested-link-card",
          isNested ? "cursor-default" : "cursor-pointer",
          isNested ? "p-4" : isCollapsed ? "p-4" : "space-y-4 p-5",
          isNested
            ? "border-gray-200 bg-gray-50/50 shadow-2xs"
            : "border-gray-200 shadow-2xs",
        )}
      >
        {!isNested && <div className="flex items-center gap-2.5">
          {/* Drag Handle & Up/Down Move Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <div
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition"
              title="드래그하여 순서 변경"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            {/* <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "up")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="위로 이동"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "down")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="아래로 이동"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div> */}
          </div>

          {renderBlockIdentity(link)}

          {/* Actions: Visibility, menu and collapse */}
          <div className="flex items-center gap-2 shrink-0">
            {renderVisibilityControl(link)}
            {renderBlockActionMenu(link)}
            {renderCollapseControl(link.id, isCollapsed, true, '링크 ')}
          </div>
        </div>}

        {(isNested || !isCollapsed) && (link.type === "image" || link.type === "link" || link.type === "anonymous_message" || !link.type) && (
          <div
            className={clsx("space-y-3", isNested && "nested-link-form", !isNested && "border-t border-gray-100 pt-4")}
            data-no-style-editor
            onClick={(event) => event.stopPropagation()}
          >
            <label className={clsx(isNested ? "nested-link-title-row flex items-center gap-3" : "block space-y-1.5")}>
              <span className={clsx("nested-link-field-label text-xs font-bold text-gray-600", isNested ? "w-20 shrink-0" : "block")}>텍스트</span>
              <input
                value={link.title || ""}
                onChange={(event) => updateCustomLink(link.id, { title: event.target.value })}
                placeholder={link.type === "image" ? "이미지 링크" : "링크 제목"}
                className={clsx("min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-semibold outline-none transition focus:border-black", !isNested && "block w-full")}
              />
              {isNested && <div className="flex shrink-0 items-center gap-1.5">{renderVisibilityControl(link)}{renderBlockActionMenu(link)}</div>}
            </label>
            <div className={clsx(isNested ? "nested-link-url-row flex items-center gap-3" : "space-y-1.5")}>
              <span className={clsx("nested-link-field-label text-xs font-bold text-gray-600", isNested ? "w-20 shrink-0" : "block")}>링크 주소</span>
              <div className="nested-link-url-controls flex min-w-0 flex-1 items-stretch gap-2">
                {isFixedInternalLink ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3.5 py-3" aria-label={isKo ? "수정할 수 없는 고정 링크" : "Read-only fixed link"}>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700">{fixedInternalUrl}</span>
                    <span className="shrink-0 rounded-full bg-gray-200 px-2 py-1 text-[9px] font-black text-gray-500">{isKo ? "고정 링크" : "FIXED"}</span>
                  </div>
                ) : (
                  <input
                    value={link.url || ""}
                    onChange={(event) => updateCustomLink(link.id, { url: event.target.value })}
                    onBlur={(event) => {
                      const normalizedUrl = normalizeLinkUrl(event.target.value);
                      if (normalizedUrl !== event.target.value) updateCustomLink(link.id, { url: normalizedUrl });
                    }}
                    placeholder={isKo ? "링크 주소를 입력하세요" : "Enter a link URL"}
                    inputMode="url"
                    className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-semibold outline-none transition focus:border-black"
                  />
                )}
                {supportsLinkDisplay && (
                  link.thumbnailType === "image" && link.icon ? (
                    <div className="relative flex shrink-0 items-stretch gap-1.5">
                      <button type="button" onClick={() => setActiveThumbnailLink(link)} className="h-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-gray-100 transition hover:border-black" style={{ aspectRatio: (link.imageAspectRatio || "4:3").replace(":", " / ") }} aria-label="링크 썸네일 편집">
                        <img
                          src={link.icon}
                          alt="링크 썸네일"
                          className="h-full w-full object-cover"
                          style={getThumbnailPreviewStyle(link)}
                        />
                      </button>
                      <button type="button" onClick={() => updateCustomLink(link.id, { thumbnailType: "none", icon: "", iconName: "", linkLayout: "classic" })} className="flex w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-red-500 text-white transition hover:bg-red-600" aria-label="링크 썸네일 삭제" title="썸네일 삭제"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ) : link.thumbnailType === "icon" && link.iconName ? (
                    <div className="relative flex shrink-0 items-stretch gap-1.5">
                      <button type="button" onClick={() => setActiveThumbnailLink(link)} className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-700 transition hover:border-black" aria-label="링크 썸네일 편집">
                        <ThumbnailIcon className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={() => updateCustomLink(link.id, { thumbnailType: "none", icon: "", iconName: "", linkLayout: "classic" })} className="flex w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-red-500 text-white transition hover:bg-red-600" aria-label="링크 썸네일 삭제" title="썸네일 삭제"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setActiveThumbnailLink(link)} className="flex w-20 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-100 px-2 text-[10px] font-black text-gray-600 transition hover:border-gray-400 hover:bg-gray-200" aria-label="링크 썸네일 추가">
                      <ImageIcon className="mb-0.5 h-4 w-4" />썸네일
                    </button>
                  )
                )}
              </div>
            </div>

            {supportsLinkDisplay && !isInsideCollection && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-black text-gray-800">링크 디스플레이</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateCustomLink(link.id, { linkLayout: "classic" })}
                      className={clsx(
                        "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border bg-white p-4 transition",
                        (link.linkLayout || "classic") === "classic" ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-400",
                      )}
                    >
                      <span className="flex h-11 w-full items-center gap-2 rounded-full bg-gray-100 px-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-500"><Link2 className="h-4 w-4" /></span>
                        <span className="h-2 flex-1 rounded-full bg-gray-300" />
                      </span>
                      <span className="text-xs font-black text-gray-900">기본형</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCustomLink(link.id, {
                        linkLayout: "image",
                        thumbnailType: "image",
                        icon: link.icon || (blockKind === "store" ? profile.storefront?.thumbnailUrl || "" : ""),
                      })}
                      className={clsx(
                        "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border bg-white p-4 transition",
                        link.linkLayout === "image" ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-400",
                      )}
                    >
                      <span className="flex h-12 w-20 flex-col overflow-hidden rounded-xl bg-gray-100">
                        <span className="h-8 bg-gradient-to-br from-cyan-200 to-blue-200" />
                        <span className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-gray-300" />
                      </span>
                      <span className="text-xs font-black text-gray-900">이미지형</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render Collection (Group) Block Card
  const renderCollection = (collection: CustomLink) => {
    const isCollapsed = isBlockCollapsed(collection.id, true);
    const hasCollectionItems = (collection.links || []).length > 0;
    const collectionStyle = collection.collectionStyle || (collection.layout && collection.layout !== "list" ? "image" : "classic");
    const collectionStyleLabel = collectionStyle === "image" ? "이미지형" : "기본형";

    return (
      <div
        key={collection.id}
        className={clsx("collection-card-shell relative", isCollapsed && hasCollectionItems && "mb-4")}
      >
        {isCollapsed && hasCollectionItems && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2.5 bottom-[-9px] top-2 z-0 rounded-3xl border border-gray-300 bg-white"
          />
        )}
        <div
        data-testid={`collection-card-${collection.id}`}
        data-collapsed={isCollapsed}
        onClick={(event) => handleCollectionCardClick(event, collection.id)}
        className={clsx(
          "group-card relative z-10 cursor-pointer rounded-3xl border bg-white transition-[border-color,background-color]",
          isCollapsed
            ? hasCollectionItems
              ? "p-4"
              : "p-4 shadow-xs"
            : "p-5 space-y-4 shadow-sm",
          "border-gray-200"
        )}
      >
        {/* Collection Header Controls */}
        <div className={clsx("flex items-center justify-between gap-3", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Drag Handle & Up/Down Move Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <div
                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition"
                title="드래그하여 순서 변경"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              {/* <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveItemDirection(collection.id, "up")}
                  className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                  title="위로 이동"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItemDirection(collection.id, "down")}
                  className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                  title="아래로 이동"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div> */}
            </div>

            {renderBlockIdentity(
              collection,
              collection.title,
              <span className={clsx(
                "shrink-0 rounded-full px-2 py-1 text-[10px] font-black",
                collectionStyle === "image" ? "bg-[#ffcf4a] text-[#171714]" : "bg-gray-100 text-gray-600",
              )}>{collectionStyleLabel}</span>,
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {renderVisibilityControl(collection)}
            {renderBlockActionMenu(collection)}
            {renderCollapseControl(collection.id, isCollapsed, true, "컬렉션 ")}
          </div>
        </div>

        {/* Collapsible Children Links */}
        {!isCollapsed && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-3" data-no-style-editor>
              <label htmlFor={`collection-name-${collection.id}`} className="mb-2 block text-xs font-black text-gray-800">그룹명</label>
              <input id={`collection-name-${collection.id}`} type="text" value={collection.title} onChange={(event) => updateCustomLink(collection.id, { title: event.target.value, publicTitle: undefined, hideTitle: false })} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white focus:ring-3 focus:ring-gray-100" />
            </div>
            {collectionStyle === "classic" && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3" data-no-style-editor>
                <p className="text-xs font-black text-gray-800">링크 표시 방식</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([
                    { value: "list", label: "한 줄형" },
                    { value: "grid", label: "그리드" },
                    { value: "carousel", label: "캐러셀" },
                  ] as const).map((option) => {
                    const isSelected = (collection.layout || "list") === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateCustomLink(collection.id, { layout: option.value })}
                        className={clsx(
                          "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border bg-white px-2 py-3 text-xs font-black transition",
                          isSelected
                            ? "border-black text-black shadow-sm ring-1 ring-black"
                            : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800",
                        )}
                        aria-label={`${option.label}${option.value === "list" ? "으로" : "로"} 표시`}
                        aria-pressed={isSelected}
                      >
                        {option.value === "list" && (
                          <span className="flex h-9 w-14 flex-col justify-center gap-1.5">
                            <span className="h-2 rounded-full bg-current opacity-60" />
                            <span className="h-2 rounded-full bg-current opacity-35" />
                          </span>
                        )}
                        {option.value === "grid" && (
                          <span className="grid h-9 w-12 grid-cols-2 gap-1.5">
                            {Array.from({ length: 4 }).map((_, index) => <span key={index} className="rounded bg-current opacity-50" />)}
                          </span>
                        )}
                        {option.value === "carousel" && (
                          <span className="flex h-9 w-14 items-center gap-1 overflow-hidden">
                            <span className="h-8 w-8 shrink-0 rounded bg-current opacity-55" />
                            <span className="h-8 w-8 shrink-0 rounded bg-current opacity-25" />
                          </span>
                        )}
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {collectionStyle === "image" && (
              <div className="rounded-2xl border border-[#171714]/15 bg-[#f4f1e8] p-3" data-no-style-editor>
                <p className="text-xs font-black text-gray-800">이미지 카드 열 구성</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {([2, 3] as const).map((columns) => {
                    const isSelected = (collection.collectionColumns || 2) === columns;
                    return (
                      <button key={columns} type="button" onClick={() => updateCustomLink(collection.id, { collectionColumns: columns, layout: "grid" })} className={clsx("flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border bg-white px-3 py-3 text-xs font-black transition", isSelected ? "border-black text-black shadow-sm ring-1 ring-black" : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800")} aria-label={`${columns}열로 표시`} aria-pressed={isSelected}>
                        <span className={clsx("grid h-10 w-14 gap-1", columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
                          {Array.from({ length: columns }).map((_, index) => <span key={index} className="rounded-md bg-[#ffcf4a]" />)}
                        </span>
                        <span>{columns}열</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleAddLinkToCollection(collection.id)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.99]"
              data-no-style-editor
            >
              <Plus className="h-4 w-4" />
              <span>{isKo ? "링크 추가" : "Add link"}</span>
            </button>
            {collection.links && collection.links.length > 0 ? (
              collection.links.map((nestedLink) => {
                if (nestedLink.type === "reservation") return renderReservationCard(nestedLink);
                if (nestedLink.type === "donation") return renderDonationCard(nestedLink);
                if (nestedLink.type === "file") return renderFileSharingCard(nestedLink);
                if (nestedLink.type === "sns") return renderSNSCard(nestedLink);
                if (nestedLink.type === "notice") return renderNoticeCard(nestedLink);
                if (nestedLink.type === "customer_info") return renderCustomerInfoCard(nestedLink);
                if (nestedLink.type === "sales") return renderSalesCard(nestedLink);
                if (nestedLink.type === "affiliate_product") return renderAffiliateProductCard(nestedLink);
                if (nestedLink.type === "map") return renderMapCard(nestedLink);
                return renderLinkItem(nestedLink, true, collection.id);
              })
            ) : (
              <div className="text-center py-4 text-xs font-semibold text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                컬렉션이 비어있습니다. 위의 링크 추가 버튼을 눌러 링크를 추가해보세요.
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    );
  };

  const [activeProfitAccountLink, setActiveProfitAccountLink] =
    useState<CustomLink | null>(null);

  const renderDonationCard = (link: CustomLink) => {
    const isCollapsed = isBlockCollapsed(link.id);

    const config = link.donationConfig || {
      mainText: "응원의 마음을 보내주세요",
      detailText: "추가 안내를 입력하세요",
      minAmount: 3000,
      buttonText: "후원하기",
      accountConnected: false,
    };

    const updateConfig = (updates: Partial<DonationConfig>) => {
      const newConfig = { ...config, ...updates };
      updateCustomLink(link.id, {
        title: newConfig.mainText || link.title,
        donationConfig: newConfig,
      });
    };

    return (
      <div
        key={link.id}
        data-testid={`link-card-${link.id}`}
        data-collapsed={isCollapsed}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('button, input, textarea, select, a, [data-no-style-editor]')) return;
          event.stopPropagation();
          toggleBlockCollapse(link.id);
        }}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          "border-gray-200"
        )}
      >
        {/* Header Row: Drag Handle, Up/Down Move, Fold/Expand, Toggle, Title, Info, Controls */}
        <div className={clsx("flex items-center justify-between gap-2", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Drag Handle Icon */}
            <div
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition shrink-0"
              title="드래그하여 순서 변경"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Up / Down Move Buttons */}
            {/* <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "up")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="위로 이동"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "down")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="아래로 이동"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div> */}

            {renderBlockIdentity(link, config.mainText || link.title)}
          </div>

          {/* Right Controls: ON/OFF Switch & Delete */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                updateCustomLink(link.id, { isVisible: !link.isVisible })
              }
              className={clsx(
                "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                link.isVisible !== false ? "bg-black" : "bg-gray-200"
              )}
            >
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                  link.isVisible !== false ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>

            {renderBlockActionMenu(link)}
            {renderCollapseControl(link.id, isCollapsed)}
          </div>
        </div>

        {/* Card Body (Hidden when collapsed) */}
        {!isCollapsed && (
          <div className="space-y-4 pt-1">
            {/* 1. Main Text* */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                제목<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.mainText}
                onChange={(e) => updateConfig({ mainText: e.target.value })}
                placeholder="응원의 마음을 보내주세요"
                className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
              />
            </div>

            {/* 2. Detail Text */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                detail text
              </label>
              <input
                type="text"
                value={config.detailText || ""}
                onChange={(e) => updateConfig({ detailText: e.target.value })}
                placeholder="추가 안내를 입력하세요"
                className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
              />
            </div>

            {/* 3. Minimum Amount & Text on the Button Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600">
                  Minimum amount<span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    value={config.minAmount}
                    onChange={(e) =>
                      updateConfig({ minAmount: Number(e.target.value) })
                    }
                    step={1000}
                    className="w-full p-3.5 pr-14 border border-gray-300 rounded-xl text-xs font-extrabold text-gray-900 focus:ring-2 focus:ring-black"
                  />
                  <span className="absolute right-3 text-xs font-black text-gray-900 pointer-events-none">
                    KRW
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600">
                  Text on the button
                </label>
                <input
                  type="text"
                  value={config.buttonText}
                  onChange={(e) => updateConfig({ buttonText: e.target.value })}
                  placeholder="후원하기"
                  className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
                />
              </div>
            </div>

            {/* 4. Account Connection Row */}
            {(() => {
              const isConnected =
                config.accountConnected ||
                !!profile.verifiedAccount?.accountConnected;
              const bank =
                config.bankName ||
                profile.verifiedAccount?.bankName ||
                "NH농협은행";
              const accNum =
                config.accountNumber ||
                profile.verifiedAccount?.accountNumber ||
                "";
              const owner =
                config.accountOwnerName ||
                profile.verifiedAccount?.accountOwnerName ||
                profile.name ||
                "";

              return (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-600">
                      Account connection<span className="text-red-500">*</span>
                    </label>
                    <span
                      className={clsx(
                        "text-xs font-bold flex items-center gap-1",
                        isConnected
                          ? "text-emerald-600 font-extrabold"
                          : "text-[#2563EB]"
                      )}
                    >
                      {isConnected
                        ? "✓ Account connected"
                        : "❗Account connection is required"}
                    </span>
                  </div>

                  {isConnected ? (
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 shadow-2xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <span className="truncate">
                          {bank} {accNum} ({owner}) 등록 완료
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveProfitAccountLink(link)}
                        className="text-gray-500 hover:text-black text-xs font-bold underline shrink-0 cursor-pointer pl-2"
                      >
                        계좌 변경
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveProfitAccountLink(link)}
                      className="w-full py-4 bg-[#E54D26] hover:bg-[#D43D17] text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md tracking-wide"
                    >
                      + Register a profit account
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderFileSharingCard = (link: CustomLink) => {
    const isCollapsed = isBlockCollapsed(link.id);

    const config = link.fileConfig || {
      title: "자유로운 주제 문구 입력",
      description: "추가 설명을 남길 수 있습니다",
      fileUrl: "",
      fileName: "",
      fileSize: "",
    };

    const updateConfig = (
      updates: Partial<import("../../store/useStore").FileConfig>
    ) => {
      const newConfig = { ...config, ...updates };
      updateCustomLink(link.id, {
        title: newConfig.title || link.title,
        url: newConfig.fileUrl || "",
        fileConfig: newConfig,
      });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user?.uid) return;
      if (file.size > planEntitlements.maxSharedFileBytes) {
        const maxMb = Math.round(planEntitlements.maxSharedFileBytes / 1024 / 1024);
        // Beta accounts are already on the top plan, so the upgrade prompt has
        // nothing to offer them — state the cap instead.
        if (membershipGrant === BETA_LIFETIME_PREMIUM_GRANT) {
          alert(isKo
            ? `베타 기간에는 파일당 최대 ${maxMb}MB까지 업로드할 수 있습니다.`
            : `During beta you can upload up to ${maxMb}MB per file.`);
          return;
        }
        requestUpgradePrompt({
          featureLabel: isKo ? '파일 업로드 용량' : 'File upload size',
          title: isKo ? '더 큰 파일을 공유해 보세요' : 'Share larger files',
          description: isKo
            ? `현재 플랜은 파일당 최대 ${maxMb}MB까지 업로드할 수 있습니다. 상위 플랜에서는 더 큰 파일과 더 많은 일일 다운로드를 제공합니다.`
            : `Your current limit is ${maxMb}MB per file. Higher plans include larger files and more daily downloads.`,
        });
        return;
      }
      const sizeLabel = file.size < 1024 * 1024
        ? `${Math.max(1, Math.ceil(file.size / 1024))}KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)}MB`;
      try {
        setUploadingFileId(link.id);
        const uploadedFile = await uploadPublicFile(
          user.uid,
          file,
          planEntitlements.maxSharedFileBytes,
          membershipGrant === BETA_LIFETIME_PREMIUM_GRANT,
        );
        const previousFilePath = config.filePath;
        updateConfig({
          fileUrl: uploadedFile.url,
          filePath: uploadedFile.path,
          fileName: file.name,
          fileSize: sizeLabel,
        });
        if (previousFilePath && previousFilePath !== uploadedFile.path) {
          await deletePublicFile(previousFilePath, user.uid);
        }
      } catch (error) {
        console.error("Failed to upload shared file", error);
        const message = error instanceof Error ? error.message : "";
        alert(isKo
          ? `파일 업로드에 실패했습니다.${message ? `\n${message}` : ""}`
          : `File upload failed.${message ? `\n${message}` : ""}`);
      } finally {
        setUploadingFileId(null);
        e.target.value = "";
      }
    };

    return (
      <div
        key={link.id}
        data-testid={`link-card-${link.id}`}
        data-collapsed={isCollapsed}
        onClick={(event) => handleCollapsibleCardClick(event, link.id)}
        className={clsx(
          "sns-block-card bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          "border-gray-200"
        )}
      >
        {/* Header Row */}
        <div className={clsx("flex items-center justify-between gap-2", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition shrink-0"
              title="드래그하여 순서 변경"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            {/* <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "up")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="위로 이동"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "down")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="아래로 이동"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div> */}
            {renderBlockIdentity(link, config.title || link.title)}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                updateCustomLink(link.id, { isVisible: !link.isVisible })
              }
              className={clsx(
                "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                link.isVisible !== false ? "bg-black" : "bg-gray-200"
              )}
            >
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                  link.isVisible !== false ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
            {renderBlockActionMenu(link)}
            {renderCollapseControl(link.id, isCollapsed)}
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-4 pt-1">
            {/* Inputs */}

            {/* 1. 대표문구* + Image Button */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                대표문구<span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => updateConfig({ title: e.target.value })}
                  placeholder="자유로운 주제 문구 입력"
                  className="flex-1 p-3.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveThumbnailLink(link);
                  }}
                  className="w-16 bg-[#8C9AA8] hover:bg-gray-600 text-white rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer shrink-0"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-[9px] font-bold">{isKo ? '썸네일' : 'Thumbnail'}</span>
                </button>
              </div>
            </div>

            {/* 2. 상세설명 */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                상세설명
              </label>
              <input
                type="text"
                value={config.description || ""}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="추가 설명을 남길 수 있습니다"
                className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
              />
            </div>

            {/* 3. Upload Files* Button & Uploaded File Badge */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-gray-600">
                {isKo ? "공유 파일" : "Shared file"}<span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] font-semibold text-amber-700">
                {isKo
                  ? `현재 플랜: 최대 ${Math.round(planEntitlements.maxSharedFileBytes / 1024 / 1024)}MB · 파일당 하루 ${planEntitlements.maxSharedFileDownloadsPerDay}회`
                  : `Plan limit: ${Math.round(planEntitlements.maxSharedFileBytes / 1024 / 1024)}MB · ${planEntitlements.maxSharedFileDownloadsPerDay} downloads/day`}
              </p>

              {config.fileName && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs font-bold text-gray-800">
                  <span className="truncate">
                    📄 {config.fileName} ({config.fileSize || "FILE"})
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (user?.uid) await deletePublicFile(config.filePath, user.uid);
                      updateConfig({ fileUrl: "", filePath: "", fileName: "", fileSize: "" });
                    }}
                    className="text-gray-400 hover:text-red-500 transition ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              <label
                data-no-style-editor
                onClick={(event) => event.stopPropagation()}
                className={clsx(
                  "w-full py-4 rounded-2xl font-black text-sm transition shadow-md flex items-center justify-center gap-2",
                  uploadingFileId === link.id
                    ? "cursor-wait bg-gray-400 text-white"
                    : "cursor-pointer bg-black text-white hover:bg-gray-800"
                )}
              >
                <Upload className="h-4 w-4" />
                <span>{uploadingFileId === link.id ? (isKo ? "업로드 중..." : "Uploading...") : (isKo ? config.fileName ? "파일 교체" : "파일 업로드" : config.fileName ? "Replace file" : "Upload file")}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFileId === link.id}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    );
  };

  const [activeSNSIconPick, setActiveSNSIconPick] = useState<{
    blockId: string;
    itemId: string;
  } | null>(null);
  const [activeSNSAddBlockId, setActiveSNSAddBlockId] = useState<string | null>(null);

  const handleAddSNSPlatform = (platform: string) => {
    if (!activeSNSAddBlockId) return;
    const context = findLinkContext(customLinks, activeSNSAddBlockId);
    if (!context) return;
    const newItem: import("../../store/useStore").SNSItem = {
      id: `sns-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform,
      value: "",
      countryCode: platform === "phone" ? "KR" : undefined,
    };
    updateCustomLink(context.link.id, {
      snsLinks: [...(context.link.snsLinks || []), newItem],
    });
    setActiveSNSAddBlockId(null);
  };

  const renderSNSCard = (link: CustomLink) => {
    const isCollapsed = isBlockCollapsed(link.id);

    const items = link.snsLinks || [];

    const updateItems = (
      newItems: import("../../store/useStore").SNSItem[]
    ) => {
      updateCustomLink(link.id, { snsLinks: newItems });
    };

    const handleRemoveItem = (itemId: string) => {
      updateItems(items.filter((i) => i.id !== itemId));
    };

    const handleUpdateItemValue = (itemId: string, val: string) => {
      updateItems(
        items.map((i) => (i.id === itemId ? { ...i, value: val } : i))
      );
    };

    return (
      <div
        key={link.id}
        data-testid={`link-card-${link.id}`}
        data-collapsed={isCollapsed}
        onClick={(event) => handleCollapsibleCardClick(event, link.id)}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          "border-gray-200"
        )}
      >
        {/* Header Row */}
        <div className={clsx("flex items-center justify-between gap-2", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition shrink-0"
              title="드래그하여 순서 변경"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            {/* <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "up")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="위로 이동"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "down")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="아래로 이동"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div> */}
            {renderBlockIdentity(link)}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                updateCustomLink(link.id, { isVisible: !link.isVisible })
              }
              className={clsx(
                "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                link.isVisible !== false ? "bg-black" : "bg-gray-200"
              )}
            >
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                  link.isVisible !== false ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
            {renderBlockActionMenu(link)}
            {renderCollapseControl(link.id, isCollapsed)}
          </div>
        </div>

        {!isCollapsed && (
          <div className="sns-block-body space-y-4 pt-1">
            {/* SNS Input Rows List */}
            <div className="sns-block-items space-y-3">
              {items.map((item) => {
                const Icon = getSocialIconComp(item.platform);
                const isPhone = item.platform === "phone";

                return (
                  <div key={item.id} className="sns-block-item flex items-center gap-2">
                    {/* Drag handle */}
                    <GripVertical className="w-4 h-4 text-gray-400 shrink-0 cursor-grab" />

                    {/* Clickable Platform Icon Badge (Opens Icon Selector Modal!) */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSNSIconPick({
                          blockId: link.id,
                          itemId: item.id,
                        })
                      }
                      className="sns-block-platform w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 transition cursor-pointer hover:border-black group relative shadow-2xs"
                      title="아이콘 변경하기 (Click to change icon)"
                    >
                      {isPhone ? (
                        <Phone className="w-4.5 h-4.5 text-gray-800 group-hover:scale-110 transition-transform" />
                      ) : (
                        <Icon className="w-5 h-5 text-gray-800 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="absolute -bottom-1 -right-1 bg-black text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                        ✎
                      </span>
                    </button>

                    {/* Country Code Flag Dropdown (for phone) */}
                    {isPhone && (
                      <div className="relative shrink-0">
                        <select
                          value={item.countryCode || "KR"}
                          onChange={(e) => {
                            updateItems(
                              items.map((i) =>
                                i.id === item.id
                                  ? { ...i, countryCode: e.target.value }
                                  : i
                              )
                            );
                          }}
                          className="p-3 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 cursor-pointer pr-6 appearance-none"
                        >
                          <option value="KR">🇰🇷</option>
                          <option value="US">🇺🇸</option>
                          <option value="JP">🇯🇵</option>
                          <option value="UK">🇬🇧</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-4 pointer-events-none" />
                      </div>
                    )}

                    {/* Text / URL Input */}
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) =>
                        handleUpdateItemValue(item.id, e.target.value)
                      }
                      placeholder={
                        isPhone
                          ? "+82 Phone number (without -)"
                          : `URL or ${
                              item.platform.charAt(0).toUpperCase() +
                              item.platform.slice(1)
                            } ID`
                      }
                      className="sns-block-input flex-1 p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
                    />

                    {/* Delete trashcan */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* + Add SNS Button */}
            <div className="sns-block-add pt-2">
              <button
                type="button"
                onClick={() => setActiveSNSAddBlockId(link.id)}
                className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>+ SNS 추가</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReservationCard = (link: CustomLink) => {
    const isCollapsed = isBlockCollapsed(link.id);

    const resConfig = link.reservationConfig || {
      headerText: "",
      schedules: [],
      autoNotification: false
    };

    const handleUpdateConfig = (updates: Partial<ReservationConfig>) => {
      updateCustomLink(link.id, {
        reservationConfig: { ...resConfig, ...updates }
      });
    };

    const handleRemoveSchedule = (schedId: string) => {
      handleUpdateConfig({
        schedules: resConfig.schedules.filter(s => s.id !== schedId)
      });
    };

    const handleUpdateSchedule = (schedId: string, updates: Partial<ReservationScheduleItem>) => {
      handleUpdateConfig({
        schedules: resConfig.schedules.map(s => s.id === schedId ? { ...s, ...updates } : s)
      });
    };

    return (
      <div
        key={link.id}
        data-testid={`link-card-${link.id}`}
        data-collapsed={isCollapsed}
        onClick={(event) => handleCollapsibleCardClick(event, link.id)}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          "border-gray-200"
        )}
      >
        {/* Card Header (Matching User Screenshot) */}
        <div className={clsx("flex items-center justify-between gap-2", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition shrink-0"
              title="드래그하여 순서 변경"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {renderBlockIdentity(link)}

          </div>

          <div className="flex items-center gap-2 shrink-0">
            {renderVisibilityControl(link)}
            {renderBlockActionMenu(link)}
            {renderCollapseControl(link.id, isCollapsed)}

          </div>
        </div>

        {/* Card Body (When Expanded) */}
        {!isCollapsed && (
          <div className="space-y-5 pt-1 animate-in fade-in duration-200">
            {/* 일정 목록 Header & + 일정 추가 Button */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700">
                일정 목록<span className="text-red-500">*</span>
              </label>

              {/* + 일정 추가 Button */}
              <button
                type="button"
                onClick={() => setActiveReservationScheduleLink({ link })}
                className="w-full py-3.5 bg-black hover:bg-gray-800 text-white font-extrabold text-xs rounded-2xl transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ 일정 추가</span>
              </button>

              {/* Schedule Items List */}
              <div className="space-y-2.5">
                {resConfig.schedules.map((sched) => (
                  <div
                    key={sched.id}
                    className="p-3.5 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Time Range (Clickable to open Edit Modal) & Title Input */}
                      <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveReservationScheduleLink({ link, editingSchedule: sched })}
                          className="text-xs font-bold text-gray-700 bg-gray-50 hover:bg-amber-50 hover:border-amber-300 border border-gray-200 rounded-xl p-2 text-left cursor-pointer transition flex items-center justify-between group"
                          title="클릭하여 날짜 및 시간 수정하기"
                        >
                          <span className="truncate">
                            {sched.endDate
                              ? `${sched.startDate}${sched.startHour ? ' (' + sched.startHour + '시)' : ''} ~ ${sched.endDate}${sched.endHour ? ' (' + sched.endHour + '시)' : ''}`
                              : `${sched.startDate}${sched.startHour ? ' (' + sched.startHour + '시 업로드)' : ''}`}
                          </span>
                          <span className="text-[10px] text-amber-700 font-extrabold opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                            ✏️ 수정
                          </span>
                        </button>
                        <input
                          type="text"
                          value={sched.title}
                          onChange={(e) => handleUpdateSchedule(sched.id, { title: e.target.value })}
                          placeholder="일정 설명"
                          className="text-xs font-extrabold text-gray-900 bg-gray-50 focus:bg-white border border-gray-200 focus:border-black rounded-xl p-2 focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSchedule(sched.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-gray-100 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    );
  };

  const [activeNoticeEditor, setActiveNoticeEditor] = useState<{
    link: CustomLink;
    noticeId?: string;
    noticeIndex?: number;
    create?: boolean;
  } | null>(null);

  const renderNoticeCard = (link: CustomLink) => {
    const isCollapsed = isBlockCollapsed(link.id);
    const notices = link.notices?.length
      ? link.notices.slice(0, 3)
      : link.noticeConfig
        ? [link.noticeConfig]
        : [];

    return (
      <div
        key={link.id}
        data-testid={`link-card-${link.id}`}
        data-collapsed={isCollapsed}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('button, input, textarea, select, a, [data-no-style-editor]')) return;
          toggleBlockCollapse(link.id);
        }}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          "border-gray-200"
        )}
      >
        {/* Header Row */}
        <div className={clsx("flex items-center justify-between gap-2", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition shrink-0"
              title="드래그하여 순서 변경"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            {/* <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "up")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="위로 이동"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "down")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="아래로 이동"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div> */}
            {renderBlockIdentity(
              link,
              notices.length > 0 ? `${notices.length}개의 공지` : "아직 작성된 공지가 없어요",
              notices.length > 0 ? (
                <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-black text-gray-600">
                  {notices.length}/3
                </span>
              ) : undefined,
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                updateCustomLink(link.id, { isVisible: !link.isVisible })
              }
              className={clsx(
                "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                link.isVisible !== false ? "bg-black" : "bg-gray-200"
              )}
            >
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                  link.isVisible !== false ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
            {renderBlockActionMenu(link)}
            {renderCollapseControl(link.id, isCollapsed)}
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-3 pt-1">
            {notices.length > 0 && (
              <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70">
                {notices.map((notice, index) => (
                  <button
                    key={notice.id || `${link.id}-${index}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveNoticeEditor({ link, noticeId: notice.id, noticeIndex: index });
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-black"
                    aria-label={`${notice.title || `공지 ${index + 1}`} 수정`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black text-gray-500 shadow-xs">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-800">
                      {notice.title || "제목을 입력하세요"}
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold text-gray-400">{notice.date}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveNoticeEditor({ link, create: true });
              }}
              disabled={notices.length >= 3}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              <Plus className="h-4 w-4" />
              <span>{notices.length >= 3 ? "공지 3개 등록 완료" : "공지 추가"}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCustomerInfoCard = (link: CustomLink) => {
    const isCollapsed = isBlockCollapsed(link.id);

    const storedConfig = link.customerInfoConfig;
    const config: import("../../store/useStore").CustomerInfoConfig = {
      ...(storedConfig || {
        receiveEmail: true,
        receivePhone: false,
        receiveName: false,
      }),
      mainText: !storedConfig?.mainText || ['subscribe to our letter', '소식을 받아보세요'].includes(storedConfig.mainText) ? '뉴스레터' : storedConfig.mainText,
      detailText: storedConfig?.detailText === 'sent every monday' ? '새 소식을 정기적으로 보내드려요' : (storedConfig?.detailText || ''),
      submitButtonText: !storedConfig?.submitButtonText || storedConfig.submitButtonText === 'Submit' ? '제출하기' : storedConfig.submitButtonText,
    };

    const updateConfig = (
      updates: Partial<import("../../store/useStore").CustomerInfoConfig>
    ) => {
      const newConfig = { ...config, ...updates };
      updateCustomLink(link.id, {
        title: newConfig.mainText || link.title,
        customerInfoConfig: newConfig,
      });
    };

    return (
      <div
        key={link.id}
        data-testid={`link-card-${link.id}`}
        data-collapsed={isCollapsed}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('button, input, textarea, select, a, [data-no-style-editor]')) return;
          event.stopPropagation();
          toggleBlockCollapse(link.id);
        }}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          "border-gray-200"
        )}
      >
        {/* Header Row */}
        <div className={clsx("flex items-center justify-between gap-2", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition shrink-0"
              title="드래그하여 순서 변경"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            {/* <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "up")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="위로 이동"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "down")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="아래로 이동"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div> */}
            {renderBlockIdentity(link, config.mainText || link.title)}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                updateCustomLink(link.id, { isVisible: !link.isVisible })
              }
              className={clsx(
                "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                link.isVisible !== false ? "bg-black" : "bg-gray-200"
              )}
            >
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                  link.isVisible !== false ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
            {renderBlockActionMenu(link)}
            {renderCollapseControl(link.id, isCollapsed)}
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-4 pt-1">
            {/* Inputs */}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-600">표시 위치</label>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1.5" data-no-style-editor>
                <button
                  type="button"
                  onClick={() => updateConfig({ displayMode: "header" })}
                  className={clsx(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition",
                    (config.displayMode || "header") === "header" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
                  )}
                >
                  <Bell className="h-4 w-4" />
                  상단 알림 아이콘
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig({ displayMode: "block" })}
                  className={clsx(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition",
                    config.displayMode === "block" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black"
                  )}
                >
                  <Newspaper className="h-4 w-4" />
                  일반 블록
                </button>
              </div>
            </div>

            {/* 1. Main Text* */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                대표 문구<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.mainText}
                onChange={(e) => updateConfig({ mainText: e.target.value })}
                placeholder="뉴스레터"
                className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
              />
            </div>

            {/* 2. Detail Text */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-600">
                  상세 설명
                </label>
              </div>
              <input
                type="text"
                value={config.detailText || ""}
                onChange={(e) => updateConfig({ detailText: e.target.value })}
                placeholder="새 소식을 정기적으로 보내드려요"
                className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
              />
            </div>

            {/* 3. Customer Info To Receive Checkboxes (Matching Screenshot 1) */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-gray-600">
                수집할 고객 정보
              </label>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={config.receiveEmail !== false}
                    onChange={(e) =>
                      updateConfig({ receiveEmail: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span>{isKo ? '이메일' : 'Email'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={!!config.receivePhone}
                    onChange={(e) =>
                      updateConfig({ receivePhone: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span>{isKo ? '전화번호' : 'Phone number'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={!!config.receiveName}
                    onChange={(e) =>
                      updateConfig({ receiveName: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span>{isKo ? '이름' : 'Name'}</span>
                </label>
              </div>
            </div>

            {/* 4. Submit Button Text */}
            <div className="pt-2 border-t border-gray-100">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600">
                  제출 버튼 문구
                </label>
                <input
                  type="text"
                  value={config.submitButtonText || "제출하기"}
                  onChange={(e) =>
                    updateConfig({ submitButtonText: e.target.value })
                  }
                  placeholder="제출하기"
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const [activeProductRegisterLink, setActiveProductRegisterLink] =
    useState<CustomLink | null>(null);
  const [activeProductToEdit, setActiveProductToEdit] =
    useState<ProductItem | null>(null);

  const renderSalesCard = (link: CustomLink) => {
    const isCollapsed = isBlockCollapsed(link.id);

    const config = link.salesConfig || {
      mainText: "",
      description: "",
      products: [],
      creatorMessage: "",
    };
    const salesBlockLabel = config.salesType === "digital_file" ? "디지털 파일 판매" : "실물 상품 판매";

    const updateConfig = (
      updates: Partial<import("../../store/useStore").SalesConfig>
    ) => {
      const newConfig = { ...config, ...updates };
      updateCustomLink(link.id, {
        title: newConfig.mainText || link.title,
        salesConfig: newConfig,
      });
    };

    const handleSalesImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!user) {
        alert("이미지를 업로드하려면 먼저 로그인해 주세요.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드할 수 있습니다.");
        return;
      }

      try {
        setUploadingSalesImageId(link.id);
        const imageUrl = await uploadPublicImage(
          `profiles/${user.uid}/sales-products/${link.id}`,
          file,
        );
        updateConfig({ image: imageUrl });
      } catch (error) {
        console.error("Failed to upload sales product image", error);
        alert("대표 상품 이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setUploadingSalesImageId(null);
      }
    };

    // Step 1: Choose Sales Type (Screenshot 1)
    if (!config.salesType) {
      return (
        <div
          key={link.id}
          data-testid={`link-card-${link.id}`}
          data-collapsed={isCollapsed}
          onClick={(event) => handleCollapsibleCardClick(event, link.id)}
          className={clsx(
            "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
            isCollapsed ? "p-4" : "p-5 space-y-4",
            "border-gray-200"
          )}
        >
          {/* Header Row */}
          <div className={clsx("flex items-center justify-between gap-2", !isCollapsed && "border-b border-gray-100 pb-3")}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition shrink-0"
                title="드래그하여 순서 변경"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              {/* <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => moveItemDirection(link.id, "up")}
                  className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                  title="위로 이동"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItemDirection(link.id, "down")}
                  className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                  title="아래로 이동"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div> */}
              {renderBlockIdentity(link, salesBlockLabel)}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  updateCustomLink(link.id, { isVisible: !link.isVisible })
                }
                className={clsx(
                  "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                  link.isVisible !== false ? "bg-black" : "bg-gray-200"
                )}
              >
                <div
                  className={clsx(
                    "w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                    link.isVisible !== false ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
              {renderBlockActionMenu(link)}
              {renderCollapseControl(link.id, isCollapsed)}
            </div>
          </div>

          {!isCollapsed && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-gray-600">
                판매 유형<span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      salesType: "digital_file",
                      mainText: "디지털 파일 판매",
                    })
                  }
                  className="p-6 border-2 border-gray-200 hover:border-black rounded-2xl flex flex-col items-center justify-center gap-3 transition cursor-pointer group bg-white shadow-2xs"
                >
                  <Smartphone className="w-10 h-10 text-gray-400 group-hover:text-black group-hover:scale-110 transition-all" />
                  <span className="text-xs font-bold text-gray-800 group-hover:text-black">
                    디지털 파일
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      salesType: "product",
                      mainText: "실물 상품 판매",
                    })
                  }
                  className="p-6 border-2 border-gray-200 hover:border-black rounded-2xl flex flex-col items-center justify-center gap-3 transition cursor-pointer group bg-white shadow-2xs"
                >
                  <Gift className="w-10 h-10 text-gray-400 group-hover:text-black group-hover:scale-110 transition-all" />
                  <span className="text-xs font-bold text-gray-800 group-hover:text-black">
                    실물 상품
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Step 2: Full Sales Form (Screenshot 2)
    return (
      <div
        key={link.id}
        data-testid={`link-card-${link.id}`}
        data-collapsed={isCollapsed}
        onClick={(event) => handleCollapsibleCardClick(event, link.id)}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          "border-gray-200"
        )}
      >
        {/* Header */}
        <div className={clsx("flex items-center justify-between gap-2", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition shrink-0"
              title="드래그하여 순서 변경"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            {/* <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "up")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="위로 이동"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveItemDirection(link.id, "down")}
                className="p-0.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition cursor-pointer"
                title="아래로 이동"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div> */}
            {renderBlockIdentity(link, salesBlockLabel)}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                updateCustomLink(link.id, { isVisible: !link.isVisible })
              }
              className={clsx(
                "w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                link.isVisible !== false ? "bg-black" : "bg-gray-200"
              )}
            >
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-xs",
                  link.isVisible !== false ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>

            {renderBlockActionMenu(link)}
            {renderCollapseControl(link.id, isCollapsed)}
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-5 pt-1">
            {/* 1. Main Text* */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                제목<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.mainText}
                onChange={(e) => updateConfig({ mainText: e.target.value })}
                placeholder="판매 블록 제목을 입력하세요"
                className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
              />
            </div>

            {/* 2. Product image and thumbnail layout */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <label className="mb-3 block text-xs font-bold text-gray-700">
                  대표 상품 이미지
                </label>
                <div className="flex items-center gap-3">
                <label className={clsx(
                  "relative flex h-20 w-20 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-white transition",
                  uploadingSalesImageId === link.id
                    ? "cursor-wait border-gray-300 opacity-70"
                    : "cursor-pointer border-gray-300 hover:border-black",
                )} data-no-style-editor onClick={(event) => event.stopPropagation()}>
                  {config.image ? (
                    <img
                      src={config.image}
                      alt="대표 상품"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="mt-1 text-[10px] font-bold text-gray-400">
                        {uploadingSalesImageId === link.id ? "업로드 중" : "이미지 선택"}
                      </span>
                    </>
                  )}
                  {config.image && uploadingSalesImageId === link.id && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-black text-white">
                      업로드 중
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSalesImageUpload}
                    disabled={uploadingSalesImageId === link.id}
                    className="hidden"
                  />
                </label>
                {!config.image && (
                  <p className="text-[11px] text-gray-400 font-medium">
                    상품을 대표하는<br />이미지를 등록하세요.
                  </p>
                )}
                {config.image && (
                  <p className="text-[11px] font-semibold text-gray-500">
                    이미지를 누르면<br />교체할 수 있어요.
                  </p>
                )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 lg:border-l-2">
                <p className="mb-3 text-xs font-bold text-gray-700">상품 썸네일</p>
                <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateCustomLink(link.id, { linkLayout: "classic" })}
                  className={clsx(
                    "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border bg-white p-2.5 transition",
                    (link.linkLayout || "classic") === "classic"
                      ? "border-black ring-1 ring-black"
                      : "border-gray-200 hover:border-gray-400",
                  )}
                >
                  <span className="flex h-10 w-full items-center gap-2 rounded-full bg-gray-100 px-3">
                    <span className="h-7 w-7 rounded-xl bg-gray-300" />
                    <span className="h-2 flex-1 rounded-full bg-gray-300" />
                  </span>
                  <span className="text-xs font-black text-gray-900">기본형</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateCustomLink(link.id, { linkLayout: "image" })}
                  className={clsx(
                    "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border bg-white p-2.5 transition",
                    link.linkLayout === "image"
                      ? "border-black ring-1 ring-black"
                      : "border-gray-200 hover:border-gray-400",
                  )}
                >
                  <span className="flex h-12 w-20 flex-col overflow-hidden rounded-xl bg-gray-100">
                    <span className="h-8 bg-gradient-to-br from-cyan-200 to-blue-200" />
                    <span className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-gray-300" />
                  </span>
                  <span className="text-xs font-black text-gray-900">이미지형</span>
                </button>
                </div>
              </div>
            </div>

            {/* 3. Description* */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                상품 설명<span className="text-red-500">*</span>
              </label>

              <textarea
                value={config.description || ""}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="거래 조건, 상품 설명, 교환 및 환불 정책 등을 입력하세요. 최대 3,000자까지 입력할 수 있습니다."
                rows={3}
                className="w-full p-3.5 border border-gray-300 rounded-2xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-300 leading-relaxed resize-none"
              />
            </div>

            {/* 4. Product List* */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-600">
                상품 목록<span className="text-red-500">*</span>
              </label>

              {/* Registered Products List */}
              {config.products && config.products.length > 0 && (
                <div className="space-y-2">
                  {config.products.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-black text-white rounded-md text-[10px]">
                          상품
                        </span>
                        <span>{prod.name}</span>
                        <span className="text-gray-500">
                          ({prod.price.toLocaleString()}원)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveProductToEdit(prod);
                            setActiveProductRegisterLink(link);
                          }}
                          className="p-1.5 text-gray-400 hover:text-black hover:bg-white rounded-lg transition cursor-pointer"
                          aria-label={`${prod.name} 수정`}
                          title="상품 수정"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newProds = config.products.filter(
                              (p) => p.id !== prod.id
                            );
                            updateConfig({ products: newProds });
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition cursor-pointer"
                          aria-label={`${prod.name} 삭제`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveProductToEdit(null);
                  setActiveProductRegisterLink(link);
                }}
                className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>{config.products?.length ? '상품 추가' : '상품 등록'}</span>
              </button>
            </div>

            {/* 5. Creator Message */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                구매 완료 메시지
              </label>
              <input
                type="text"
                value={config.creatorMessage || ""}
                onChange={(e) =>
                  updateConfig({ creatorMessage: e.target.value })
                }
                placeholder="결제가 완료되면 구매자에게 전달할 메시지를 입력하세요."
                className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-300"
              />
            </div>

            {/* 6. Account Connect* */}
            {(() => {
              const isConnected =
                !!profile.verifiedAccount?.accountConnected;
              const bank =
                config.bankName ||
                profile.verifiedAccount?.bankName ||
                "NH농협은행";
              const accNum =
                config.accountNumber ||
                profile.verifiedAccount?.accountNumber ||
                "";
              const owner =
                config.accountOwner ||
                profile.verifiedAccount?.accountOwnerName ||
                profile.name ||
                "";

              return (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-600">
                      정산 계좌<span className="text-red-500">*</span>
                    </label>
                    <span
                      className={clsx(
                        "text-xs font-bold flex items-center gap-1",
                        isConnected
                          ? "text-emerald-600 font-extrabold"
                          : "text-blue-600"
                      )}
                    >
                      {isConnected
                        ? "✓ 계좌 등록 완료"
                        : "! 정산 계좌 등록 필요"}
                    </span>
                  </div>

                  {isConnected ? (
                    /* Connected State: Hide big register button, show connected badge with edit option */
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 shadow-2xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <span className="truncate">
                          {bank} {accNum} ({owner}) 등록 완료
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveProfitAccountLink(link)}
                        className="text-gray-500 hover:text-black text-xs font-bold underline shrink-0 cursor-pointer pl-2"
                      >
                        계좌 변경
                      </button>
                    </div>
                  ) : (
                    /* Not Connected State: Show big register button */
                    <button
                      type="button"
                      onClick={() => setActiveProfitAccountLink(link)}
                      className="w-full py-4 bg-[#F24E1E] hover:bg-orange-600 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      <span>+ 정산 계좌 등록</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const renderAffiliateProductCard = (link: CustomLink) => {
    const config = link.affiliateProductConfig || { affiliateUrl: link.url || "", imageUrl: link.icon || "", currency: "KRW" as const, displayMode: "compact" as const };
    const isCollapsed = isBlockCollapsed(link.id);
    const updateConfig = (updates: Partial<NonNullable<CustomLink["affiliateProductConfig"]>>) => {
      const nextConfig = { ...config, ...updates };
      updateCustomLink(link.id, {
        affiliateProductConfig: nextConfig,
        ...(updates.affiliateUrl !== undefined ? { url: updates.affiliateUrl } : {}),
        ...(updates.imageUrl !== undefined ? { icon: updates.imageUrl, thumbnailType: updates.imageUrl ? "image" : "none" } : {}),
      });
    };
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!user?.uid) return alert(isKo ? "로그인이 필요합니다." : "Please sign in first.");
      try {
        setUploadingAffiliateId(link.id);
        const imageUrl = await uploadPublicImage(`affiliate-products/${user.uid}`, file);
        updateConfig({ imageUrl });
      } catch (error) {
        console.error("Failed to upload affiliate product image", error);
        alert(isKo ? "이미지 업로드에 실패했습니다." : "Image upload failed.");
      } finally {
        setUploadingAffiliateId(null);
      }
    };

    return (
      <div key={link.id} data-testid={`affiliate-card-${link.id}`} data-collapsed={isCollapsed} onClick={(event) => { const target = event.target as HTMLElement; if (target.closest('button, input, textarea, select, a, [data-no-style-editor]')) return; toggleBlockCollapse(link.id); }} className={clsx("rounded-3xl border border-gray-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md", isCollapsed ? "p-4" : "space-y-4 p-5")}>
        <div className={clsx("flex items-center justify-between gap-3", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex min-w-0 flex-1 items-center gap-2"><GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" />{renderBlockIdentity(link)}</div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => updateCustomLink(link.id, { isVisible: !link.isVisible })} className={clsx("relative h-5 w-10 cursor-pointer rounded-full transition-colors", link.isVisible !== false ? "bg-black" : "bg-gray-200")} aria-label={isKo ? "공개 여부" : "Visibility"}><span className={clsx("absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform", link.isVisible !== false && "translate-x-5")} /></button>
            {renderBlockActionMenu(link)}
            {renderCollapseControl(link.id, isCollapsed)}
          </div>
        </div>
        {!isCollapsed && (
          <div className="space-y-4">
            <div data-no-style-editor>
              <p className="mb-2 text-xs font-black text-gray-700">{isKo ? "링크 디스플레이" : "Link display"}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateConfig({ displayMode: "compact" })} className={clsx("flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border bg-white p-3 transition", (config.displayMode || "compact") === "compact" ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-400")} aria-pressed={(config.displayMode || "compact") === "compact"}><span className="flex h-10 w-full items-center gap-2 rounded-full bg-gray-100 px-2"><span className="h-7 w-7 rounded-full bg-gray-300" /><span className="h-2 flex-1 rounded-full bg-gray-300" /></span><span className="text-xs font-black">{isKo ? "가로형" : "Compact"}</span></button>
                <button type="button" onClick={() => updateConfig({ displayMode: "featured" })} className={clsx("flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border bg-white p-3 transition", config.displayMode === "featured" ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-400")} aria-pressed={config.displayMode === "featured"}><span className="flex h-12 w-20 flex-col overflow-hidden rounded-xl bg-gray-100"><span className="h-8 bg-gray-300" /><span className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-gray-300" /></span><span className="text-xs font-black">{isKo ? "대표 이미지형" : "Featured"}</span></button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
            <div className="space-y-2">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50">
                {config.imageUrl ? <img src={config.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-gray-300" />}
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-black"><Upload className="h-3.5 w-3.5" />{uploadingAffiliateId === link.id ? (isKo ? "업로드 중..." : "Uploading...") : (isKo ? "이미지 업로드" : "Upload image")}<input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingAffiliateId === link.id} className="hidden" /></label>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-black text-gray-700">{isKo ? "상품명" : "Product title"}<input value={link.title} onChange={(event) => updateCustomLink(link.id, { title: event.target.value })} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-[#ff5f35]" placeholder={isKo ? "상품명을 입력하세요" : "Enter a product title"} /></label>
              <label className="block text-xs font-black text-gray-700">{isKo ? "제휴 링크" : "Affiliate link"}<input value={config.affiliateUrl} onChange={(event) => updateConfig({ affiliateUrl: event.target.value })} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff5f35]" placeholder="https://" /></label>
              <label className="block text-xs font-black text-gray-700">{isKo ? "이미지 주소" : "Image URL"}<input value={config.imageUrl || ""} onChange={(event) => updateConfig({ imageUrl: event.target.value })} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff5f35]" placeholder="https://..." /></label>
              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
                <label className="block text-xs font-black text-gray-700">{isKo ? "가격" : "Price"}<input type="number" min="0" value={config.price ?? ""} onChange={(event) => updateConfig({ price: event.target.value === "" ? undefined : Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ff5f35]" placeholder={isKo ? "선택 입력" : "Optional"} /></label>
                <label className="block text-xs font-black text-gray-700">{isKo ? "통화" : "Currency"}<select value={config.currency || "KRW"} onChange={(event) => updateConfig({ currency: event.target.value as NonNullable<typeof config.currency> })} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#ff5f35]"><option value="KRW">KRW</option><option value="USD">USD</option><option value="JPY">JPY</option><option value="EUR">EUR</option></select></label>
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMapCard = (link: CustomLink) => {
    const config = link.mapConfig || { query: "", displayMode: "featured" as const };
    const isCollapsed = isBlockCollapsed(link.id);
    const mapQuery = config.query.trim();
    const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
    const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
    return (
      <div key={link.id} data-testid={`map-card-${link.id}`} data-collapsed={isCollapsed} onClick={(event) => handleCollapsibleCardClick(event, link.id)} className={clsx("rounded-3xl border border-gray-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md", isCollapsed ? "p-4" : "space-y-4 p-5")}>
        <div className={clsx("flex items-center justify-between gap-3", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex min-w-0 flex-1 items-center gap-2"><GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" />{renderBlockIdentity(link, link.mapConfig?.query || link.title)}</div>
          <div className="flex shrink-0 items-center gap-2">{renderVisibilityControl(link)}{renderBlockActionMenu(link)}{renderCollapseControl(link.id, isCollapsed)}</div>
        </div>
        {!isCollapsed && <div className="space-y-3">
          <div data-no-style-editor>
            <p className="mb-2 text-xs font-black text-gray-700">{isKo ? "지도 디스플레이" : "Map display"}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => updateCustomLink(link.id, { mapConfig: { ...config, displayMode: "classic" } })} className={clsx("flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border bg-white p-3 transition", config.displayMode === "classic" ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-400")} aria-pressed={config.displayMode === "classic"}><span className="flex h-10 w-full items-center gap-2 rounded-full bg-gray-100 px-2"><MapPinned className="h-5 w-5 text-gray-400" /><span className="h-2 flex-1 rounded-full bg-gray-300" /></span><span className="text-xs font-black">{isKo ? "클래식" : "Classic"}</span></button>
              <button type="button" onClick={() => updateCustomLink(link.id, { mapConfig: { ...config, displayMode: "featured" } })} className={clsx("flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border bg-white p-3 transition", (config.displayMode || "featured") === "featured" ? "border-black ring-1 ring-black" : "border-gray-200 hover:border-gray-400")} aria-pressed={(config.displayMode || "featured") === "featured"}><span className="flex h-12 w-20 flex-col overflow-hidden rounded-xl bg-gray-100"><span className="h-8 bg-gradient-to-br from-emerald-200 to-sky-200" /><span className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-gray-300" /></span><span className="text-xs font-black">{isKo ? "대표 지도형" : "Featured"}</span></button>
            </div>
          </div>
          <label className="block text-xs font-black text-gray-700">{isKo ? "지도 제목" : "Map title"}<input value={link.title} onChange={(event) => updateCustomLink(link.id, { title: event.target.value })} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-sky-400" /></label>
          <label className="block text-xs font-black text-gray-700">{isKo ? "장소명 또는 주소 검색" : "Search place or address"}<div className="mt-1.5 flex gap-2"><input value={config.query} onChange={(event) => updateCustomLink(link.id, { mapConfig: { query: event.target.value } })} className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" placeholder={isKo ? "예: 성수동 서울숲" : "e.g. Seoul Forest"} /><a href={mapQuery ? mapSearchUrl : undefined} target="_blank" rel="noreferrer" className={clsx("flex shrink-0 items-center rounded-xl px-4 text-xs font-black", mapQuery ? "bg-sky-600 text-white hover:bg-sky-700" : "pointer-events-none bg-gray-100 text-gray-400")}>{isKo ? "검색 확인" : "Check"}</a></div></label>
          {mapQuery && (config.displayMode || "featured") === "featured" && <iframe title={`${link.title} 지도 미리보기`} src={mapEmbedUrl} className="h-48 w-full rounded-2xl border border-gray-200" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
        </div>}
      </div>
    );
  };

  return (
    <div className="admin-link-editor space-y-6 animate-fade-in pb-20 font-sans">
      {/* Top User Profile Header with Social Icons (Matching User Screenshot) */}
      <div className="admin-link-profile space-y-4 py-1">
        <div className="grid grid-cols-[minmax(0,1fr)_52px] gap-2 sm:grid-cols-2 sm:gap-3">
        <div className="flex min-w-0 items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-3 shadow-xs">
          {/* The remove control has to live outside the change button -- a button
              cannot be nested inside another button. */}
          <div className="relative flex shrink-0">
            <button
              type="button"
              onClick={() => quickAvatarInputRef.current?.click()}
              disabled={isQuickAvatarUploading}
              className="group relative flex shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              aria-label={isKo ? "프로필 이미지 변경" : "Change profile image"}
            >
              <span className="admin-link-profile-avatar relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-xs">
                {profile.avatarUrl && <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />}
                <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"><Pencil className="h-5 w-5" /></span>
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-black text-white"><Pencil className="h-2.5 w-2.5" /></span>
            </button>
            {profile.avatarUrl && !isQuickAvatarRemoveArmed && (
              <button
                type="button"
                onClick={() => setIsQuickAvatarRemoveArmed(true)}
                disabled={isQuickAvatarUploading}
                className="absolute -right-0.5 -top-0.5 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-gray-500 text-white shadow-xs transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-60"
                aria-label={isKo ? "프로필 이미지 삭제" : "Remove profile image"}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}

            {/* Confirmed in the page, not via window.confirm: in-app webviews
                suppress that dialog and the click would silently do nothing. */}
            {isQuickAvatarRemoveArmed && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-30 flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-red-50 px-2.5 py-1.5 shadow-md">
                <span className="text-[11px] font-bold text-red-700">{isKo ? "정말 삭제할까요?" : "Remove this image?"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickAvatarRemoveArmed(false);
                    handleQuickAvatarRemove();
                  }}
                  className="cursor-pointer rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-black text-white transition hover:bg-red-700"
                >
                  {isKo ? "삭제" : "Remove"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuickAvatarRemoveArmed(false)}
                  className="cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold text-gray-500 transition hover:text-gray-800"
                >
                  {isKo ? "취소" : "Cancel"}
                </button>
              </div>
            )}
          </div>
          <input ref={quickAvatarInputRef} type="file" accept="image/*" onChange={handleQuickAvatarSelect} className="sr-only" />

          {isQuickProfileOpen ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                saveQuickProfileName();
              }}
            >
              <input
                type="text"
                value={quickProfileName}
                onChange={(event) => setQuickProfileName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeQuickProfileNameEditor();
                }}
                maxLength={50}
                autoFocus
                aria-label={isKo ? "닉네임" : "Nickname"}
                className="min-w-0 flex-1 rounded-xl border border-black bg-white px-3 py-2 text-sm font-black text-gray-900 outline-none ring-2 ring-gray-200"
              />
              <button
                type="submit"
                disabled={!quickProfileName.trim()}
                className="h-9 shrink-0 cursor-pointer rounded-xl bg-black px-3 text-xs font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {isKo ? "저장" : "Save"}
              </button>
              <button
                type="button"
                onClick={closeQuickProfileNameEditor}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-black"
                aria-label={isKo ? "취소" : "Cancel"}
              >
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={openQuickProfileNameEditor}
              className="group min-w-0 flex-1 cursor-pointer rounded-2xl px-1 py-2 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              aria-label={isKo ? "닉네임 수정" : "Edit nickname"}
            >
              <span className="flex min-w-0 items-center gap-2 text-lg font-black leading-none tracking-tight text-gray-900">
                <span className="truncate">{profile.name || profile.username || "brownrice0916"}</span>
                <Pencil className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:text-gray-700" />
              </span>
            </button>
          )}

          <div className="flex shrink-0 items-center gap-2.5 flex-wrap">
            {socialLinks.map((s) => {
              const Icon = getSocialIconComp(s.platform);
              return <button key={s.id} type="button" onClick={() => handleEditSocial(s)} className="cursor-pointer text-gray-800 transition hover:scale-110 hover:text-black" title={`Edit ${s.platform}`}><Icon className="h-5 w-5" /></button>;
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleStoreEntry}
          className="relative flex h-[52px] w-[52px] cursor-pointer items-center justify-center self-center rounded-2xl border border-gray-200 bg-white text-gray-950 shadow-xs transition hover:-translate-y-0.5 hover:border-black hover:shadow-md sm:hidden"
          aria-label={profile.storefront ? (isKo ? "내 스토어 관리" : "Manage my store") : (isKo ? "스토어 추가" : "Add store")}
          title={profile.storefront ? (isKo ? "내 스토어" : "My store") : (isKo ? "스토어 추가" : "Add store")}
        >
          <ShoppingBag className="h-5 w-5" />
          {!profile.storefront && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-black text-white"><Plus className="h-3 w-3 stroke-[3]" /></span>}
          {profile.storefront?.enabled && <span className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full border border-white bg-emerald-500" />}
        </button>

        <div className="group hidden min-w-0 items-center gap-2 rounded-3xl border border-gray-200 bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:border-black hover:shadow-md sm:flex">
          <button
            type="button"
            onClick={handleStoreEntry}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
            aria-label={profile.storefront ? (isKo ? "내 스토어 관리" : "Manage my store") : (isKo ? "스토어 만들기" : "Create store")}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#111827] bg-[#111827] text-white shadow-sm">
              <ShoppingBag className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-gray-950">
                {STOREFRONT_AVAILABLE ? (profile.storefront ? (profile.storefront.name || (isKo ? "내 스토어" : "My store")) : (isKo ? "스토어 추가" : "Add store")) : (isKo ? "스토어 준비 중" : "Store coming soon")}
              </span>
              <span className="mt-1 block text-[11px] font-semibold text-gray-400">
                {STOREFRONT_AVAILABLE ? (profile.storefront ? (isKo ? "상품과 스토어 꾸미기" : "Products and store design") : (isKo ? "독립 스토어를 만들어 보세요" : "Create a standalone store")) : (isKo ? "기존 데이터는 안전하게 보관돼요" : "Your existing data is preserved")}
              </span>
            </span>
            {!profile.storefront && <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-black" />}
          </button>
          {profile.storefront && STOREFRONT_AVAILABLE && (
            <button
              type="button"
              role="switch"
              aria-checked={profile.storefront.enabled}
              aria-label={isKo ? "스토어 공개 여부" : "Store visibility"}
              onClick={() => {
                setProfile({ ...profile, storefront: { ...profile.storefront!, enabled: !profile.storefront!.enabled } });
              }}
              className={clsx("relative h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-black transition", profile.storefront.enabled ? "bg-black" : "bg-gray-200")}
            >
              <span className={clsx("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", profile.storefront.enabled && "translate-x-5")} />
            </button>
          )}
        </div>
        </div>

      </div>

      {/* Action Pill Buttons Row (Add + Expand All / Collapse All) */}
      <div className="admin-link-actions flex items-center gap-2.5">
        <button
          onClick={() => setIsGroupTypeModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full font-bold text-sm transition cursor-pointer"
        >
          <Folder className="w-4 h-4" />
          <span>{isKo ? '그룹 추가' : 'Add group'}</span>
        </button>
        <button
          onClick={openRootAddBlockModal}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-black hover:bg-gray-800 text-white rounded-full font-bold text-sm transition cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{isKo ? '블록 추가' : 'Add block'}</span>
        </button>
      </div>

      {/* Custom Links & Collections List */}
      <div ref={blockListRef} className="admin-link-blocks space-y-4">
        <BlockList
          links={customLinks}
          onReorder={reorderLinks}
          renderLink={renderLinkItem}
          renderCollection={renderCollection}
          renderDonation={renderDonationCard}
          renderFile={renderFileSharingCard}
          renderSocial={renderSNSCard}
          renderReservation={renderReservationCard}
          renderNotice={renderNoticeCard}
          renderCustomerInfo={renderCustomerInfoCard}
          renderSales={renderSalesCard}
          renderAffiliateProduct={renderAffiliateProductCard}
          renderMap={renderMapCard}
          onBlockSelect={focusPreviewBlock}
        />
      </div>

      {showBottomAddButton && (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsGroupTypeModalOpen(true)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-gray-100 px-5 py-4 text-sm font-black text-gray-900 transition hover:bg-gray-200"
          >
            <Folder className="h-4 w-4" />
            <span>{isKo ? "그룹 추가" : "Add group"}</span>
          </button>
          <button
            type="button"
            onClick={openRootAddBlockModal}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-black px-6 py-4 text-sm font-black text-white shadow-md transition hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            <span>{isKo ? "블록 추가" : "Add block"}</span>
          </button>
        </div>
      )}

      {/* Product Registration Modal */}
      {activeProductRegisterLink && (
        <ProductRegistrationModal
          isOpen={!!activeProductRegisterLink}
          salesType={activeProductRegisterLink.salesConfig?.salesType}
          initialProduct={activeProductToEdit || undefined}
          onClose={() => {
            setActiveProductRegisterLink(null);
            setActiveProductToEdit(null);
          }}
          onRegister={(product) => {
            const currentSalesConfig =
              activeProductRegisterLink.salesConfig || {
                mainText: "디지털 파일 판매",
                description: "",
                products: [],
              };
            const currentProducts = currentSalesConfig.products || [];
            const productExists = currentProducts.some(
              (item) => item.id === product.id
            );
            if (!productExists && planEntitlements.maxProductsPerProfile !== null && workspaceUsage({ customLinks: useStore.getState().customLinks }).products >= planEntitlements.maxProductsPerProfile) {
              alert(`현재 플랜에서는 상품을 최대 ${planEntitlements.maxProductsPerProfile}개까지 등록할 수 있습니다.`);
              return;
            }
            const updatedProducts = productExists
              ? currentProducts.map((item) =>
                  item.id === product.id ? product : item
                )
              : [...currentProducts, product];
            updateCustomLink(activeProductRegisterLink.id, {
              salesConfig: {
                ...currentSalesConfig,
                products: updatedProducts,
              },
            });
            setActiveProductRegisterLink(null);
            setActiveProductToEdit(null);
          }}
        />
      )}

      {isGroupTypeModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-xl font-black tracking-tight text-gray-950">그룹 유형 선택</h2><p className="mt-1 text-xs font-semibold text-gray-500">링크를 보여줄 기본 방식을 선택해 주세요.</p></div>
              <button type="button" onClick={() => setIsGroupTypeModalOpen(false)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-black" aria-label="그룹 유형 선택 닫기"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { handleAddCollection("classic"); setIsGroupTypeModalOpen(false); }} className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-gray-200 bg-white p-5 transition hover:border-black hover:shadow-md">
                <span className="flex h-14 w-full items-center gap-2 rounded-full bg-gray-100 px-4"><span className="h-9 w-9 rounded-full bg-white shadow-sm" /><span className="h-2 flex-1 rounded-full bg-gray-300" /></span>
                <span><strong className="block text-sm font-black text-gray-950">기본형</strong><span className="mt-1 block text-[10px] font-semibold text-gray-500">링크를 목록으로 표시</span></span>
              </button>
              <button type="button" onClick={() => { handleAddCollection("image"); setIsGroupTypeModalOpen(false); }} className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-gray-200 bg-white p-5 transition hover:border-black hover:shadow-md">
                <span className="grid h-20 w-full grid-cols-2 gap-2"><span className="rounded-xl bg-[#d9ff67]" /><span className="rounded-xl bg-[#ffcf4a]" /></span>
                <span><strong className="block text-sm font-black text-gray-950">이미지형</strong><span className="mt-1 block text-[10px] font-semibold text-gray-500">이미지 카드로 표시</span></span>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {quickAddCollectionId && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeQuickAddLink(); }}>
          <form onSubmit={submitQuickAddLink} className="w-full max-w-md rounded-[24px] border border-gray-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black tracking-tight text-gray-950">{isKo ? "링크 추가" : "Add link"}</h2>
              <button type="button" onClick={closeQuickAddLink} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-black" aria-label={isKo ? "링크 추가 닫기" : "Close add link"}><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-black text-gray-700">
                {isKo ? "텍스트" : "Text"}<span className="ml-0.5 text-red-500">*</span>
                <input autoFocus type="text" value={quickAddLinkTitle} onChange={(event) => { setQuickAddLinkTitle(event.target.value); setQuickAddLinkError(""); }} placeholder={isKo ? "버튼에 표시할 텍스트" : "Text on the button"} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-base font-bold text-gray-950 outline-none transition placeholder:text-gray-300 focus:border-black focus:ring-3 focus:ring-gray-100" />
              </label>
              <label className="block text-xs font-black text-gray-700">
                {isKo ? "링크 주소" : "Link URL"}<span className="ml-0.5 text-red-500">*</span>
                <input type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" value={quickAddLinkUrl} onChange={(event) => { setQuickAddLinkUrl(event.target.value); setQuickAddLinkError(""); }} placeholder={isKo ? "예: naver.com" : "e.g. example.com"} className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-base font-semibold text-gray-950 outline-none transition placeholder:text-gray-300 focus:border-black focus:ring-3 focus:ring-gray-100" />
              </label>
              {quickAddLinkError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{quickAddLinkError}</p>}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={closeQuickAddLink} className="cursor-pointer rounded-2xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-black text-gray-800 transition hover:bg-gray-50">{isKo ? "취소" : "Cancel"}</button>
              <button type="submit" className="cursor-pointer rounded-2xl bg-black px-4 py-3.5 text-sm font-black text-white transition hover:bg-gray-800">{isKo ? "추가" : "Add"}</button>
            </div>
          </form>
        </div>,
        document.body,
      )}

      {/* Add Block Modal (Matching Littly) */}
      <AddBlockModal
        isOpen={isAddBlockModalOpen}
        onClose={() => {
          setIsAddBlockModalOpen(false);
          setAddBlockTargetCollectionId(null);
        }}
        onSelectBlock={handleSelectBlockType}
      />

      {/* Profit Account Management Modal */}
      {activeProfitAccountLink && (
        <ProfitAccountModal
          isOpen={!!activeProfitAccountLink}
          onClose={() => setActiveProfitAccountLink(null)}
          initialData={
            activeProfitAccountLink.donationConfig || profile.verifiedAccount
          }
          onDisconnect={() => {
            const nextProfile = {...profile};
            delete nextProfile.verifiedAccount;
            setProfile(nextProfile);
            reorderLinks(disconnectAccountFromLinks(customLinks));
            setActiveProfitAccountLink(null);
          }}
          onSave={(accountData) => {
            // 1. Save globally to User Profile so it can be recalled anytime!
            setProfile({ ...profile, verifiedAccount: accountData });

            // 2. Update current active link config (Donation / Sales)
            if (
              activeProfitAccountLink.type === "sales" ||
              activeProfitAccountLink.salesConfig
            ) {
              const currentSalesConfig =
                activeProfitAccountLink.salesConfig || {
                  mainText: "디지털 파일 판매",
                  description: "",
                  products: [],
                };
              updateCustomLink(activeProfitAccountLink.id, {
                salesConfig: {
                  ...currentSalesConfig,
                  bankName: accountData.bankName,
                  accountNumber: accountData.accountNumber,
                  accountOwner: accountData.accountOwnerName,
                },
              });
            } else {
              const currentConfig = activeProfitAccountLink.donationConfig || {
                mainText: "도네이션",
                detailText: "응원글과 함께 후원금을 보낼 수 있습니다.",
                minAmount: 3000,
                buttonText: "후원하기",
              };
              const safeCurrentConfig = {...currentConfig};
              delete safeCurrentConfig.idNumber;
              updateCustomLink(activeProfitAccountLink.id, {
                donationConfig: {
                  ...safeCurrentConfig,
                  ...accountData,
                },
              });
            }

            alert(
              "✅ 정산 계좌가 프로필에 성공적으로 저장되었습니다! 앞으로 모든 기능에서 자동으로 불러옵니다."
            );
            setActiveProfitAccountLink(null);
          }}
        />
      )}

      {/* Notice Editor Modal */}
      {activeNoticeEditor && (
        <NoticeModal
          key={`${activeNoticeEditor.link.id}-${activeNoticeEditor.noticeId || activeNoticeEditor.noticeIndex || 'new'}-${activeNoticeEditor.create ? 'create' : 'edit'}`}
          isOpen={!!activeNoticeEditor}
          onClose={() => setActiveNoticeEditor(null)}
          initialNotices={activeNoticeEditor.link.notices}
          initialNotice={activeNoticeEditor.link.noticeConfig}
          initialEditingId={activeNoticeEditor.noticeId}
          initialEditingIndex={activeNoticeEditor.noticeIndex}
          createOnOpen={activeNoticeEditor.create}
          onSave={(noticeData) => {
            updateCustomLink(activeNoticeEditor.link.id, {
              title: "공지사항",
              url: `/${profile.username || "preview"}/notice`,
              thumbnailType: "none",
              iconName: "",
              noticeConfig: noticeData[0],
              notices: noticeData,
            });
            setActiveNoticeEditor(null);
          }}
        />
      )}

      {/* Thumbnail Editor Modal */}
      {activeThumbnailLink && (
        <ThumbnailModal
          isOpen={!!activeThumbnailLink}
          onClose={() => setActiveThumbnailLink(null)}
          currentType={
            activeThumbnailLink.type === "file" &&
            !activeThumbnailLink.icon &&
            !activeThumbnailLink.iconName
              ? "icon"
              : activeThumbnailLink.thumbnailType ||
                (activeThumbnailLink.icon ? "image" : "none")
          }
          currentImageUrl={activeThumbnailLink.icon || ""}
          currentIconName={
            activeThumbnailLink.iconName ||
            (activeThumbnailLink.type === "file" ? "paperclip" : "link")
          }
          currentAspectRatio={activeThumbnailLink.imageAspectRatio || "4:3"}
          currentPositionX={activeThumbnailLink.imagePositionX ?? 50}
          currentPositionY={activeThumbnailLink.imagePositionY ?? 50}
          currentZoom={activeThumbnailLink.imageZoom ?? 100}
          imageOnly={activeThumbnailLink.type === "image"}
          onSave={(updates) => {
            updateCustomLink(activeThumbnailLink.id, {
              ...updates,
              ...(updates.thumbnailType === "icon" ? { linkLayout: "classic" as const } : {}),
            });
            setActiveThumbnailLink(null);
          }}
        />
      )}

      {quickAvatarCrop && (
        <ProfileImageCropModal
          isOpen
          imageSrc={quickAvatarCrop.src}
          fileName={quickAvatarCrop.fileName}
          onClose={closeQuickAvatarCrop}
          onApply={handleQuickAvatarUpload}
        />
      )}

      {/* Social Icon Add / Edit Modal */}
      <SocialModal
        isOpen={isSocialModalOpen}
        onClose={() => setIsSocialModalOpen(false)}
        editingLink={editingSocialLink}
        onSave={handleSaveSocial}
        onDelete={handleDeleteSocial}
      />

      {activeSNSAddBlockId && (
        <SNSPlatformPickerModal
          isOpen
          onClose={() => setActiveSNSAddBlockId(null)}
          onSelect={handleAddSNSPlatform}
        />
      )}

      {/* SNS Row Icon Picker Modal */}
      {activeSNSIconPick && (
        <ThumbnailModal
          isOpen={!!activeSNSIconPick}
          onClose={() => setActiveSNSIconPick(null)}
          currentType="icon"
          currentIconName={
            findLinkContext(customLinks, activeSNSIconPick.blockId)
              ?.link
              ?.snsLinks?.find((i) => i.id === activeSNSIconPick.itemId)
              ?.platform || "link"
          }
          onSave={(updates) => {
            const targetBlock = findLinkContext(customLinks, activeSNSIconPick.blockId)?.link;
            if (targetBlock && targetBlock.snsLinks) {
              const newPlatform = updates.iconName || "link";
              const updatedSnsLinks = targetBlock.snsLinks.map((i) =>
                i.id === activeSNSIconPick.itemId
                  ? { ...i, platform: newPlatform }
                  : i
              );
              updateCustomLink(targetBlock.id, { snsLinks: updatedSnsLinks });
            }
            setActiveSNSIconPick(null);
          }}
        />
      )}

      {/* Add / Edit Reservation Schedule Modal */}
      {activeReservationScheduleLink && (
        <AddReservationScheduleModal
          isOpen={!!activeReservationScheduleLink}
          initialData={activeReservationScheduleLink.editingSchedule}
          onClose={() => setActiveReservationScheduleLink(null)}
          onSave={(scheduleData) => {
            const targetLink = activeReservationScheduleLink.link;
            const currentConfig = targetLink.reservationConfig || {
              headerText: "",
              schedules: [],
              autoNotification: false
            };

            const editingId = activeReservationScheduleLink.editingSchedule?.id;

            let updatedSchedules: ReservationScheduleItem[];
            if (editingId) {
              // Update existing schedule
              updatedSchedules = currentConfig.schedules.map((s) =>
                s.id === editingId
                  ? {
                      ...s,
                      title: scheduleData.title,
                      startDate: scheduleData.startDate,
                      startHour: scheduleData.startHour,
                      endDate: scheduleData.endDate,
                      endHour: scheduleData.endHour,
                      linkUrl: scheduleData.linkUrl
                    }
                  : s
              );
            } else {
              // Add new schedule
              const newSchedule: ReservationScheduleItem = {
                id: `sched-${Date.now()}`,
                startDate: scheduleData.startDate,
                endDate: scheduleData.endDate,
                startHour: scheduleData.startHour,
                endHour: scheduleData.endHour,
                title: scheduleData.title,
                linkUrl: scheduleData.linkUrl,
                status: 'OPEN'
              };
              updatedSchedules = [...currentConfig.schedules, newSchedule];
            }

            updateCustomLink(targetLink.id, {
              reservationConfig: {
                ...currentConfig,
                schedules: updatedSchedules
              }
            });
            setActiveReservationScheduleLink(null);
          }}
        />
      )}

      {isStoreGuideOpen && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsStoreGuideOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-guide-title"
            className="w-full rounded-t-[30px] border-2 border-black bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:max-w-md sm:rounded-[30px] sm:p-7 sm:shadow-[7px_7px_0_#cfd3d8]"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#111827] bg-[#111827] text-white shadow-sm">
                <ShoppingBag className="h-6 w-6" />
              </span>
              <button type="button" onClick={() => setIsStoreGuideOpen(false)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/5 text-gray-500 transition hover:bg-black hover:text-white" aria-label={isKo ? "안내 닫기" : "Close guide"}><X className="h-5 w-5" /></button>
            </div>
            <h2 id="store-guide-title" className="mt-5 text-2xl font-black tracking-[-0.04em] text-gray-950">
              {isKo ? "내 스토어를 만들어 볼까요?" : "Create your store"}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
              {isKo ? "링크집과는 별도로 상품을 모아 보여주는 판매 페이지예요. 준비가 끝난 뒤 공개할 수 있습니다." : "Build a separate storefront for your products and publish it when you are ready."}
            </p>
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center gap-3 rounded-2xl bg-gray-100 p-3.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white"><Plus className="h-4 w-4" /></span><span><strong className="block text-sm font-black">{isKo ? "상품과 판매 정보 등록" : "Add products"}</strong><span className="text-xs font-semibold text-gray-500">{isKo ? "사진, 가격, 배송·교환 안내를 입력해요." : "Add images, prices, and shipping details."}</span></span></div>
              <div className="flex items-center gap-3 rounded-2xl bg-gray-100 p-3.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white"><Link2 className="h-4 w-4" /></span><span><strong className="block text-sm font-black">{isKo ? "프로필과 간편하게 연결" : "Connect your profile"}</strong><span className="text-xs font-semibold text-gray-500">{isKo ? "상단 스토어 버튼이나 원하는 위치의 블록으로 연결해요." : "Link it from the profile header or a block."}</span></span></div>
              <div className="flex items-center gap-3 rounded-2xl bg-gray-100 p-3.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white"><Eye className="h-4 w-4" /></span><span><strong className="block text-sm font-black">{isKo ? "준비될 때 공개" : "Publish when ready"}</strong><span className="text-xs font-semibold text-gray-500">{isKo ? "공개 스위치는 언제든 켜고 끌 수 있어요." : "Turn visibility on or off at any time."}</span></span></div>
            </div>
            <div className="mt-6 grid grid-cols-[0.8fr_1.2fr] gap-2.5">
              <button type="button" onClick={() => setIsStoreGuideOpen(false)} className="h-13 cursor-pointer rounded-2xl border-2 border-black bg-white text-sm font-black transition hover:bg-gray-100">{isKo ? "나중에" : "Later"}</button>
              <button type="button" onClick={() => { setIsStoreGuideOpen(false); navigate("/admin/store"); }} className="h-13 cursor-pointer rounded-2xl border-2 border-black bg-black text-sm font-black text-white shadow-[3px_3px_0_#cfd3d8] transition hover:-translate-y-0.5">{isKo ? "스토어 만들기" : "Create store"}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {pendingDeleteLink && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 px-5 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingDeleteLink(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-block-title"
            aria-describedby="delete-block-description"
            className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 id="delete-block-title" className="mt-5 text-xl font-black tracking-tight text-gray-950">
              {isKo ? '이 블록을 삭제할까요?' : 'Delete this block?'}
            </h2>
            <p id="delete-block-description" className="mt-2 text-sm font-medium leading-6 text-gray-500">
              {isKo
                ? `“${pendingDeleteLink.title || '제목 없는 블록'}” 블록과 입력한 내용이 함께 삭제됩니다.`
                : `“${pendingDeleteLink.title || 'Untitled block'}” and its contents will be deleted.`}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteLink(null)}
                className="h-12 cursor-pointer rounded-2xl border border-gray-200 bg-white text-sm font-black text-gray-700 transition hover:bg-gray-50"
              >
                {isKo ? '취소' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmBlockDelete}
                className="h-12 cursor-pointer rounded-2xl bg-red-600 text-sm font-black text-white transition hover:bg-red-700"
              >
                {isKo ? '삭제' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default LinksEditor;
