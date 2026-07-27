import React, { useState } from "react";
import {
  useStore,
  type CustomLink,
  type SocialLink,
} from "../../store/useStore";
import {
  Plus,
  Trash2,
  LayoutList,
  LayoutGrid,
  GalleryHorizontal,
  Folder,
  GripVertical,
  CornerDownRight,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Phone,
  Smartphone,
  Gift,
  Lock,
  HelpCircle,
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
  HandHeart,
} from "lucide-react";
import { getLinkIcon } from "../../lib/icons";
import { ThumbnailModal } from "./ThumbnailModal";
import { SocialModal } from "./SocialModal";
import { AddBlockModal } from "./AddBlockModal";
import { ProfitAccountModal } from "./ProfitAccountModal";
import { NoticeModal } from "./NoticeModal";
import { ProductRegistrationModal } from "./ProductRegistrationModal";
import { AddReservationScheduleModal } from "./AddReservationScheduleModal";
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
import { LinkStyleEditorModal } from "./LinkStyleEditorModal";
import { uploadPublicFile, uploadPublicImage } from "../../services/storageService";

const getSocialIconComp = (platform: string) => {
  return getLinkIcon(platform);
};

const LinksEditor = () => {
  const {
    profile,
    setProfile,
    templateType,
    templateValue,
    buttonColor,
    buttonTextColor,
    buttonOpacity,
    buttonTextOpacity,
    buttonRoundness,
    buttonShadow,
    socialLinks,
    addSocialLink,
    updateSocialLink,
    removeSocialLink,
    customLinks,
    addCustomLink,
    updateCustomLink,
    removeCustomLink,
    moveItemToCollection,
    moveItemToRoot,
    moveItemRelative,
    moveItemDirection,
    language,
    user,
  } = useStore();
  const isKo = language === 'ko';

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [isOverRootArea, setIsOverRootArea] = useState(false);
  const [activeThumbnailLink, setActiveThumbnailLink] =
    useState<CustomLink | null>(null);
  const [activeStyleLinkId, setActiveStyleLinkId] = useState<string | null>(null);
  const [uploadingAffiliateId, setUploadingAffiliateId] = useState<string | null>(null);
  const [uploadingSalesImageId, setUploadingSalesImageId] = useState<string | null>(null);
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);

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

  const activeStyleContext = activeStyleLinkId
    ? findLinkContext(customLinks, activeStyleLinkId)
    : undefined;
  const activeStyleLink = activeStyleContext?.link;

  const handleCardStyleClick = (event: React.MouseEvent, linkId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [data-no-style-editor]')) return;
    event.stopPropagation();
    setActiveStyleLinkId(linkId);
  };

  const handleCollectionCardClick = (event: React.MouseEvent, collectionId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [data-no-style-editor]')) return;
    event.stopPropagation();
    toggleBlockCollapse(collectionId, true);
  };

  const handleCollapsibleCardClick = (event: React.MouseEvent, linkId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [data-no-style-editor]')) return;
    event.stopPropagation();
    toggleBlockCollapse(linkId, true);
  };

  // Add / Edit Reservation Schedule Modal State
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
  const [addBlockTargetCollectionId, setAddBlockTargetCollectionId] = useState<string | null>(null);
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
      title: "새 링크",
      url: "https://",
      isVisible: true,
    });
  };

  const handleAddCollection = () => {
    const newCollectionId = `col-${Date.now()}`;
    addCustomLink({
      id: newCollectionId,
      type: "collection",
      title: "새 링크 그룹",
      layout: "list",
      links: [],
    });
    setCollapsedBlockIds((prev) => ({ ...prev, [newCollectionId]: true }));
  };

  const handleSelectBlockType = (blockType: string) => {
    const userHandle = profile.username || "preview";
    const addBlockToTarget = (block: CustomLink) => addCustomLink(block, addBlockTargetCollectionId || undefined);

    if (blockType === "link") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "link",
        title: "내 공식 사이트 바로가기",
        url: "https://naver.com",
        isVisible: true,
        iconName: "link",
      });
    } else if (blockType === "group_link" && !addBlockTargetCollectionId) {
      handleAddCollection();
    } else if (blockType === "sns") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "sns",
        title: "SNS",
        isVisible: true,
        snsLinks: [
          {
            id: `sns-${Date.now()}-1`,
            platform: "phone",
            value: "010-1234-5678",
            countryCode: "KR",
          },
          {
            id: `sns-${Date.now()}-2`,
            platform: "instagram",
            value: userHandle,
          },
        ],
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
          idNumber: profile.verifiedAccount?.idNumber || "",
          accountConnected: !!profile.verifiedAccount?.accountConnected,
        },
      });
    } else if (blockType === "file") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "file",
        title: "자료집 및 대표 파일 다운로드",
        url: "https://images.unsplash.com/photo-1542435503-956c469947f6",
        isVisible: true,
        iconName: "download",
        fileConfig: {
          title: "자료집 및 대표 파일 다운로드",
          description: "누구나 자유롭게 다운로드하실 수 있습니다.",
          fileUrl: "https://images.unsplash.com/photo-1542435503-956c469947f6",
          fileName: "linkzip_presentation.pdf",
          fileSize: "2.4MB",
        },
      });
    } else if (blockType === "notice") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "notice",
        title: "공지사항",
        url: `/${userHandle}/notice`,
        isVisible: true,
        iconName: "megaphone",
        noticeConfig: {
          title: "공지사항 제목을 입력하세요",
          content: "공지 내용을 입력하세요.",
          date: new Date().toLocaleDateString("ko-KR"),
        },
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
        url: `https://linkzip.kr/${userHandle}/customer_info`,
        isVisible: true,
        iconName: "clipboard-list",
        customerInfoConfig: {
          mainText: "뉴스레터",
          detailText: "새 소식을 정기적으로 보내드려요",
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
          descriptionViewType: "simple",
          products: [],
          creatorMessage: "구매해주셔서 감사합니다.",
        },
      });
    } else if (blockType === "affiliate_product") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        type: "affiliate_product",
        title: isKo ? "추천 상품" : "Recommended product",
        url: "https://",
        isVisible: true,
        iconName: "shopping-bag",
        affiliateProductConfig: {
          imageUrl: "",
          affiliateUrl: "https://",
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
          schedules: [
            {
              id: `sched-${Date.now()}`,
              startDate: "07.26 (PM 12)",
              endDate: "07.26 (PM 01)",
              title: "공부하기",
              status: "OPEN"
            }
          ],
          autoNotification: false
        }
      });
    } else if (blockType === "customer_inquiry" || blockType === "contact") {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        title: "📞 비즈니스 섭외 & 1:1 오픈채팅 문의",
        url: "https://open.kakao.com/o/linkzip",
        isVisible: true,
        iconName: "message-circle",
      });
    } else {
      addBlockToTarget({
        id: `link-${Date.now()}`,
        title: `${blockType.replace("_", " ")} block`,
        url: `https://${userHandle}.linkzip.me`,
        isVisible: true,
        iconName: "sparkles",
      });
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverTargetId(null);
    setIsOverRootArea(false);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId !== targetId) {
      setDragOverTargetId(targetId);
    }
  };

  const handleDropOnItem = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    const activeId = e.dataTransfer.getData("text/plain");
    if (!activeId || activeId === targetId) return;

    // Calculate whether dropped on top half ('before') or bottom half ('after')
    const rect = e.currentTarget.getBoundingClientRect();
    const dropY = e.clientY - rect.top;
    const isBottomHalf = dropY > rect.height / 2;
    const position = isBottomHalf ? 'after' : 'before';

    moveItemRelative(activeId, targetId, position);
    setDraggedId(null);
  };

  const handleDropOnCollection = (e: React.DragEvent, collectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    const activeId = e.dataTransfer.getData("text/plain");
    if (!activeId) return;

    moveItemToCollection(activeId, collectionId);
    setDraggedId(null);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverRootArea(false);

    const activeId = e.dataTransfer.getData("text/plain");
    if (!activeId) return;

    moveItemToRoot(activeId);
    setDraggedId(null);
  };

  // Render standard link item card
  const renderLinkItem = (
    link: CustomLink,
    isNested = false,
    parentCollectionId?: string
  ) => {
    const isBeingDragged = draggedId === link.id;
    const isDragOver = dragOverTargetId === link.id;

    const isGuestbookLink = link.url?.includes('/guestbook') || link.title?.includes('방명록');
    const isImage = !isGuestbookLink &&
      (link.thumbnailType === "image" || (!link.thumbnailType && link.icon));
    const isIcon = isGuestbookLink ||
      link.thumbnailType === "icon" || (!link.thumbnailType && link.iconName);
    const SelectedIconComp = getLinkIcon(isGuestbookLink ? 'book' : link.iconName);

    return (
      <div
        key={link.id}
        data-testid={`link-card-${link.id}`}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('button, input, textarea, select, a, [data-no-style-editor]')) return;
          event.stopPropagation();
          setActiveStyleLinkId(link.id);
        }}
        draggable
        onDragStart={(e) => handleDragStart(e, link.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white p-4 rounded-2xl border transition-all space-y-3 relative group",
          isNested
            ? "border-gray-200 bg-gray-50/50 shadow-2xs"
            : "border-gray-200 shadow-2xs",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver && "border-2 border-indigo-500 bg-indigo-50/50"
        )}
      >
        <div className="flex items-center gap-2.5">
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

          {/* Thumbnail / Icon Picker Button */}
          <button
            type="button"
            onClick={() => { if (!isGuestbookLink) setActiveThumbnailLink(link); }}
            disabled={isGuestbookLink}
            className={clsx("w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 transition relative group/thumb", isGuestbookLink ? "cursor-default" : "hover:border-black cursor-pointer")}
            title={isGuestbookLink ? "방명록 고정 아이콘" : "썸네일 또는 아이콘 편집"}
          >
            {isImage ? (
              <img
                src={link.icon}
                alt={link.title}
                className="w-full h-full object-cover"
              />
            ) : isIcon && SelectedIconComp ? (
              <span style={{ color: link.customStyle?.iconColor || '#374151', opacity: (link.customStyle?.iconOpacity ?? 100) / 100 }}><SelectedIconComp className="w-5 h-5" /></span>
            ) : (
              <ImageIcon className="w-4 h-4 text-gray-400 group-hover/thumb:text-black transition" />
            )}
          </button>

          {/* Title & URL summary — edit them in the detail screen opened by this card. */}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-black text-gray-900">{link.title || '링크 제목'}</p>
            <p className="truncate text-[11px] font-medium text-gray-500">{link.url || '링크 주소를 입력하세요'}</p>
          </div>

          {/* Actions: Visibility Toggle & Delete */}
          <div className="flex items-center gap-2 shrink-0">
            <button
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

            <button
              onClick={() => removeCustomLink(link.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Collection (Group) Block Card
  const renderCollection = (collection: CustomLink) => {
    const isBeingDragged = draggedId === collection.id;
    const isDragOver = dragOverTargetId === collection.id;
    const isCollapsed = isBlockCollapsed(collection.id, true);
    const hasCollectionItems = (collection.links || []).length > 0;

    return (
      <div
        key={collection.id}
        className={clsx("relative", isCollapsed && hasCollectionItems && "mb-4")}
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
        draggable
        onDragStart={(e) => handleDragStart(e, collection.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, collection.id)}
        onDrop={(e) => handleDropOnCollection(e, collection.id)}
        className={clsx(
          "group-card relative z-10 cursor-pointer rounded-3xl border bg-white transition-[border-color,background-color]",
          isCollapsed
            ? hasCollectionItems
              ? "p-4"
              : "p-4 shadow-xs"
            : "p-5 space-y-4 shadow-sm",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver ? "border-black bg-gray-50" : "border-gray-200"
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

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50" aria-label="컬렉션 아이콘">
              <Folder className="h-5 w-5 fill-gray-300 text-gray-400" strokeWidth={1.8} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-gray-900">
                {collection.title || (isKo ? "그룹명" : "Group name")}
              </p>
              {isCollapsed && (
                <p className="mt-0.5 truncate text-[11px] font-medium text-gray-500">
                  {(collection.layout === "grid" ? "그리드" : collection.layout === "carousel" ? "캐러셀" : "리스트")} · {(collection.links || []).length}개 블록
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {renderVisibilityControl(collection)}
            <button
              type="button"
              onClick={() => setActiveStyleLinkId(collection.id)}
              className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-black"
              aria-label="그룹 디자인 수정"
              title="그룹 디자인 수정"
            >
              <Palette className="h-4 w-4" />
            </button>
            {renderCollapseControl(collection.id, isCollapsed, true, "컬렉션 ")}
            <button
              onClick={() => removeCustomLink(collection.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Children Links */}
        {!isCollapsed && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-3" data-no-style-editor>
              <label htmlFor={`collection-name-${collection.id}`} className="mb-2 block text-xs font-black text-gray-800">그룹명</label>
              <input id={`collection-name-${collection.id}`} type="text" value={collection.title} onChange={(event) => updateCustomLink(collection.id, { title: event.target.value })} placeholder="관리할 그룹명을 입력하세요" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-3 focus:ring-gray-100" />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-3" data-no-style-editor>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor={`collection-public-title-${collection.id}`} className="text-xs font-black text-gray-800">공개 타이틀</label>
                <button type="button" role="switch" aria-checked={!collection.hideTitle} onClick={() => updateCustomLink(collection.id, { hideTitle: !collection.hideTitle })} className={clsx("relative h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors", collection.hideTitle ? "bg-gray-200" : "bg-black")} aria-label="공개 화면에 컬렉션 제목 표시" title={collection.hideTitle ? "공개 타이틀 표시하기" : "공개 타이틀 숨기기"}>
                  <span className={clsx("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", collection.hideTitle ? "translate-x-0" : "translate-x-4")} />
                </button>
              </div>
              <input id={`collection-public-title-${collection.id}`} type="text" value={collection.publicTitle ?? collection.title} onChange={(event) => updateCustomLink(collection.id, { publicTitle: event.target.value })} placeholder="공개 화면에 표시할 타이틀" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:ring-3 focus:ring-indigo-100" />
              <p className="mt-1.5 text-[10px] font-medium text-gray-500">방문자에게 보이는 제목입니다. 위 그룹명과 다르게 설정할 수 있습니다.</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3" data-no-style-editor>
              <div><p className="text-xs font-black text-gray-800">컬렉션 표시 방식</p><p className="mt-0.5 text-[10px] font-medium text-gray-500">내부 링크가 공개 화면에 보이는 방식을 선택합니다.</p></div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {([
                  { value: 'list', label: '리스트', icon: LayoutList },
                  { value: 'grid', label: '그리드', icon: LayoutGrid },
                  { value: 'carousel', label: '캐러셀', icon: GalleryHorizontal },
                ] as const).map(({ value, label, icon: LayoutIcon }) => {
                  const isSelected = value === 'list' ? !collection.layout || collection.layout === 'list' : collection.layout === value;
                  return <button key={value} type="button" onClick={() => updateCustomLink(collection.id, { layout: value })} className={clsx("flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border bg-white px-2 py-3 text-xs font-black transition", isSelected ? "border-black text-black shadow-sm ring-1 ring-black" : "border-gray-200 text-gray-500 hover:-translate-y-0.5 hover:border-gray-400 hover:text-gray-800 hover:shadow-sm")} aria-label={`${label}로 표시`} aria-pressed={isSelected}><LayoutIcon className="h-6 w-6" /><span>{label}</span></button>;
                })}
              </div>
            </div>
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
                컬렉션이 비어있습니다. 아래 [ + ] 버튼을 눌러 링크를
                추가해보세요.
              </div>
            )}

            {/* Add Nested Link Button */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => {
                  setAddBlockTargetCollectionId(collection.id);
                  setIsAddBlockModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isKo ? '내부 블록 추가' : 'Add block inside'}</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  };

  const [activeProfitAccountLink, setActiveProfitAccountLink] =
    useState<CustomLink | null>(null);

  const renderDonationCard = (link: CustomLink) => {
    const isBeingDragged = draggedId === link.id;
    const isDragOver = dragOverTargetId === link.id;
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
        draggable
        onDragStart={(e) => handleDragStart(e, link.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver
            ? "border-2 border-indigo-500 bg-indigo-50/50"
            : "border-gray-200"
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

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 shadow-xs">
              <HandHeart className="h-6 w-6" />
            </div>
            <div className="truncate text-sm font-black text-gray-900">도네이션</div>
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

            <button type="button" onClick={() => setActiveStyleLinkId(link.id)} className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label="도네이션 디자인 수정" title="도네이션 디자인 수정"><Palette className="h-4 w-4" /></button>
            {renderCollapseControl(link.id, isCollapsed)}
            <button
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md cursor-pointer"
              title="블록 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Body (Hidden when collapsed) */}
        {!isCollapsed && (
          <div className="space-y-4 pt-1">
            {/* 1. Main Text* */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                main text<span className="text-red-500">*</span>
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
                !!profile.verifiedAccount?.accountConnected ||
                (!!config.accountNumber && !!config.bankName);
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
                          {bank} {accNum} ({owner}) 연동 완료
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
    const isBeingDragged = draggedId === link.id;
    const isDragOver = dragOverTargetId === link.id;
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
        fileConfig: newConfig,
      });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user?.uid) return;
      if (file.size > 25 * 1024 * 1024) {
        alert(isKo ? "파일 크기는 25MB 이하여야 합니다." : "The file must be 25MB or smaller.");
        return;
      }
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      try {
        setUploadingFileId(link.id);
        const fileUrl = await uploadPublicFile(user.uid, file);
        updateConfig({ fileUrl, fileName: file.name, fileSize: `${sizeMb}MB` });
      } catch (error) {
        console.error("Failed to upload shared file", error);
        alert(isKo ? "파일 업로드에 실패했습니다." : "File upload failed.");
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
        onClick={(event) => handleCardStyleClick(event, link.id)}
        draggable
        onDragStart={(e) => handleDragStart(e, link.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver
            ? "border-2 border-indigo-500 bg-indigo-50/50"
            : "border-gray-200"
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
            <button
              type="button"
              onClick={() => toggleBlockCollapse(link.id)}
              className="p-1 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer shrink-0"
              title={isCollapsed ? "펼치기" : "접기"}
            >
              <ChevronDown
                className={clsx(
                  "w-4 h-4 transition-transform duration-200",
                  isCollapsed
                    ? "-rotate-90 text-gray-400"
                    : "rotate-0 text-black"
                )}
              />
            </button>
            <span className="text-base shrink-0">📁</span>
            <span className="font-extrabold text-base text-gray-900 truncate">
              {config.title || link.title || "파일 공유"}
            </span>
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
            {renderCollapseControl(link.id, isCollapsed)}
            <button
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
                  onClick={() => setActiveThumbnailLink(link)}
                  className="w-16 bg-[#8C9AA8] hover:bg-gray-600 text-white rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer shrink-0"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-[9px] font-bold">{isKo ? '이미지' : 'image'}</span>
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

              {config.fileName && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs font-bold text-gray-800">
                  <span className="truncate">
                    📄 {config.fileName} ({config.fileSize || "FILE"})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig({ fileUrl: "", fileName: "", fileSize: "" })
                    }
                    className="text-gray-400 hover:text-red-500 transition ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              <label className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2">
                <span>{uploadingFileId === link.id ? (isKo ? "업로드 중..." : "Uploading...") : (isKo ? "+ 파일 선택" : "+ Choose file")}</span>
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

  const renderSNSCard = (link: CustomLink) => {
    const isBeingDragged = draggedId === link.id;
    const isDragOver = dragOverTargetId === link.id;
    const isCollapsed = isBlockCollapsed(link.id);

    const items = link.snsLinks || [
      { id: "sns-1", platform: "phone", value: "", countryCode: "KR" },
    ];

    const updateItems = (
      newItems: import("../../store/useStore").SNSItem[]
    ) => {
      updateCustomLink(link.id, { snsLinks: newItems });
    };

    const handleAddItem = (platform: string = "link") => {
      const newItem: import("../../store/useStore").SNSItem = {
        id: `sns-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        platform,
        value: "",
        countryCode: platform === "phone" ? "KR" : undefined,
      };
      updateItems([...items, newItem]);
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
        onClick={(event) => handleCardStyleClick(event, link.id)}
        draggable
        onDragStart={(e) => handleDragStart(e, link.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver
            ? "border-2 border-indigo-500 bg-indigo-50/50"
            : "border-gray-200"
        )}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 gap-2">
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
            <button
              type="button"
              onClick={() => toggleBlockCollapse(link.id)}
              className="p-1 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer shrink-0"
              title={isCollapsed ? "펼치기" : "접기"}
            >
              <ChevronDown
                className={clsx(
                  "w-4 h-4 transition-transform duration-200",
                  isCollapsed
                    ? "-rotate-90 text-gray-400"
                    : "rotate-0 text-black"
                )}
              />
            </button>
            <span className="text-base shrink-0">🌐</span>
            <span className="font-extrabold text-base text-gray-900 truncate">
              {link.title || "SNS 아이콘 연동"}
            </span>
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
            {renderCollapseControl(link.id, isCollapsed)}
            <button
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-4 pt-1">
            {/* SNS Input Rows List */}
            <div className="space-y-3">
              {items.map((item) => {
                const Icon = getSocialIconComp(item.platform);
                const isPhone = item.platform === "phone";

                return (
                  <div key={item.id} className="flex items-center gap-2">
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
                      className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 transition cursor-pointer hover:border-black group relative shadow-2xs"
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
                      className="flex-1 p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
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
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleAddItem("link")}
                className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>+ Add SNS</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReservationCard = (link: CustomLink) => {
    const isBeingDragged = draggedId === link.id;
    const isDragOver = dragOverTargetId === link.id;
    const isCollapsed = isBlockCollapsed(link.id);

    const resConfig = link.reservationConfig || {
      headerText: "",
      schedules: [
        {
          id: `sched-${Date.now()}`,
          startDate: "07.26 (PM 12)",
          endDate: "07.26 (PM 01)",
          title: "공부하기",
          status: "OPEN"
        }
      ],
      autoNotification: false
    };

    const handleUpdateConfig = (updates: Partial<ReservationConfig>) => {
      updateCustomLink(link.id, {
        reservationConfig: { ...resConfig, ...updates }
      });
    };

    const handleAddSchedule = () => {
      const newSchedule: ReservationScheduleItem = {
        id: `sched-${Date.now()}`,
        startDate: "07.26 (PM 12)",
        endDate: "07.26 (PM 01)",
        title: "새 일정",
        status: "OPEN"
      };
      handleUpdateConfig({
        schedules: [...resConfig.schedules, newSchedule]
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
        draggable
        onDragStart={(e) => handleDragStart(e, link.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver ? "border-2 border-indigo-500 bg-indigo-50/50" : "border-gray-200"
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

            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700" aria-label="캘린더 아이콘">
              <CalendarCheck className="h-5 w-5" />
            </span>

            {/* Title Input */}
            <input
              type="text"
              value={(["Appointments", "예약 일정", "Calendar"].includes(link.title || "") || !link.title) ? (isKo ? "캘린더" : "Calendar") : link.title}
              onChange={(e) => updateCustomLink(link.id, { title: e.target.value })}
              className="min-w-0 flex-1 truncate border-none bg-transparent p-0 text-sm font-black text-gray-900 focus:outline-hidden focus:ring-0"
            />

          </div>

          <div className="flex items-center gap-2 shrink-0">
            {renderVisibilityControl(link)}
            <button
              type="button"
              onClick={() => setActiveStyleLinkId(link.id)}
              className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-black"
              aria-label="캘린더 디자인 수정"
              title="캘린더 디자인 수정"
            >
              <Palette className="h-4 w-4" />
            </button>
            {renderCollapseControl(link.id, isCollapsed)}
            <button
              onClick={() => removeCustomLink(link.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>

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

  const [activeNoticeModalLink, setActiveNoticeModalLink] =
    useState<CustomLink | null>(null);

  const renderNoticeCard = (link: CustomLink) => {
    const isBeingDragged = draggedId === link.id;
    const isDragOver = dragOverTargetId === link.id;
    const isCollapsed = isBlockCollapsed(link.id);

    const notice = link.noticeConfig || {
      title: "공지사항",
      content: "공지 내용을 입력하세요.",
      date: new Date().toLocaleDateString("ko-KR"),
    };

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
        draggable
        onDragStart={(e) => handleDragStart(e, link.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver
            ? "border-2 border-indigo-500 bg-indigo-50/50"
            : "border-gray-200"
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50" aria-label="공지사항 아이콘">
              <Megaphone className="h-4 w-4 text-amber-700" />
            </span>
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
            <span className="truncate text-sm font-black text-gray-900">
              {notice.title || link.title || "공지사항"}
            </span>
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
            <button type="button" onClick={() => setActiveStyleLinkId(link.id)} className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label="공지사항 디자인 수정" title="공지사항 디자인 수정"><Palette className="h-4 w-4" /></button>
            {renderCollapseControl(link.id, isCollapsed)}
            <button
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-3 pt-1">
            <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-800">
                  {notice.title}
                </span>
                <span className="text-[10px] font-semibold text-amber-600">
                  {notice.date}
                </span>
              </div>
              <p className="text-xs text-gray-600 font-medium line-clamp-2">
                {notice.content}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveNoticeModalLink(link)}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <span>📢 공지사항 입력 / 수정하기</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCustomerInfoCard = (link: CustomLink) => {
    const isBeingDragged = draggedId === link.id;
    const isDragOver = dragOverTargetId === link.id;
    const isCollapsed = isBlockCollapsed(link.id);

    const storedConfig = link.customerInfoConfig;
    const config = {
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
        draggable
        onDragStart={(e) => handleDragStart(e, link.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver
            ? "border-2 border-indigo-500 bg-indigo-50/50"
            : "border-gray-200"
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700" aria-label="뉴스레터 아이콘"><Newspaper className="h-4 w-4" /></span>
            <div className="flex items-center gap-1.5 truncate text-sm font-black text-gray-900">
              <span>뉴스레터</span>
            </div>
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
            <button type="button" onClick={() => setActiveStyleLinkId(link.id)} className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label="고객정보 수집 디자인 수정" title="고객정보 수집 디자인 수정"><Palette className="h-4 w-4" /></button>
            {renderCollapseControl(link.id, isCollapsed)}
            <button
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-4 pt-1">
            {/* Inputs */}

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

  const renderSalesCard = (link: CustomLink) => {
    const isBeingDragged = draggedId === link.id;
    const isDragOver = dragOverTargetId === link.id;
    const isCollapsed = isBlockCollapsed(link.id);

    const config = link.salesConfig || {
      mainText: "",
      description: "",
      descriptionViewType: "simple",
      products: [],
      creatorMessage: "",
    };
    const SalesBlockIcon = config.salesType === "digital_file" ? FileDown : ShoppingBag;
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
          draggable
          onDragStart={(e) => handleDragStart(e, link.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, link.id)}
          onDrop={(e) => handleDropOnItem(e, link.id)}
          className={clsx(
            "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
            isCollapsed ? "p-4" : "p-5 space-y-4",
            isBeingDragged && "opacity-40 border-dashed border-gray-400",
            isDragOver
              ? "border-2 border-indigo-500 bg-indigo-50/50"
              : "border-gray-200"
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
              <button
                type="button"
                onClick={() => toggleBlockCollapse(link.id)}
                className="p-1 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer shrink-0"
                title={isCollapsed ? "펼치기" : "접기"}
              >
                <ChevronDown
                  className={clsx(
                    "w-4 h-4 transition-transform duration-200",
                    isCollapsed
                      ? "-rotate-90 text-gray-400"
                      : "rotate-0 text-black"
                  )}
                />
              </button>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700">
                <SalesBlockIcon className="h-5 w-5" />
              </span>
              <span className="truncate text-sm font-black text-gray-900">
                {salesBlockLabel}
              </span>
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
              <button type="button" onClick={() => setActiveStyleLinkId(link.id)} className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label={`${salesBlockLabel} 디자인 수정`} title={`${salesBlockLabel} 디자인 수정`}><Palette className="h-4 w-4" /></button>
              {renderCollapseControl(link.id, isCollapsed)}
              <button
                onClick={() => removeCustomLink(link.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition rounded-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
        draggable
        onDragStart={(e) => handleDragStart(e, link.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white rounded-3xl border transition-all font-sans relative shadow-2xs",
          isCollapsed ? "p-4" : "p-5 space-y-4",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver
            ? "border-2 border-indigo-500 bg-indigo-50/50"
            : "border-gray-200"
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700">
              <SalesBlockIcon className="h-5 w-5" />
            </span>
            <span className="truncate text-sm font-black text-gray-900">{salesBlockLabel}</span>
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

            <button type="button" onClick={() => setActiveStyleLinkId(link.id)} className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label={`${salesBlockLabel} 디자인 수정`} title={`${salesBlockLabel} 디자인 수정`}><Palette className="h-4 w-4" /></button>
            {renderCollapseControl(link.id, isCollapsed)}
            <button
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md cursor-pointer"
              title="블록 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div className="space-y-5 pt-1">
            {/* 1. Main Text* */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                main text<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.mainText}
                onChange={(e) => updateConfig({ mainText: e.target.value })}
                placeholder="판매 블록 제목을 입력하세요"
                className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
              />
            </div>

            {/* 2. Image Upload */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="block text-xs font-bold text-gray-600">
                  image
                </label>
                <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">
                  i
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className={clsx(
                  "relative flex h-24 w-24 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-gray-50 transition",
                  uploadingSalesImageId === link.id
                    ? "cursor-wait border-gray-300 opacity-70"
                    : "cursor-pointer border-gray-300 hover:border-black",
                )}>
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
                <p className="text-[11px] text-gray-400 font-medium">
                  대표 상품 이미지를 등록해보세요.
                </p>
              </div>
            </div>

            {/* 3. Description* */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <label className="block text-xs font-bold text-gray-600">
                    Description<span className="text-red-500">*</span>
                  </label>
                  <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">
                    i
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold text-gray-600">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`desc-view-${link.id}`}
                      checked={config.descriptionViewType !== "detail"}
                      onChange={() =>
                        updateConfig({ descriptionViewType: "simple" })
                      }
                      className="cursor-pointer"
                    />
                    <span>{isKo ? '간단히 보기' : 'Simple view'}</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`desc-view-${link.id}`}
                      checked={config.descriptionViewType === "detail"}
                      onChange={() =>
                        updateConfig({ descriptionViewType: "detail" })
                      }
                      className="cursor-pointer"
                    />
                    <span>{isKo ? '자세히 보기' : 'Detail view'}</span>
                  </label>
                </div>
              </div>

              <textarea
                value={config.description || ""}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="거래 조건, 상품 설명, 교환 및 환불 정책 등을 입력하세요. 최대 3,000자까지 입력할 수 있습니다."
                rows={5}
                className="w-full p-3.5 border border-gray-300 rounded-2xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-300 leading-relaxed resize-none"
              />
            </div>

            {/* 4. Product List* */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <label className="block text-xs font-bold text-gray-600">
                  Product list<span className="text-red-500">*</span>
                </label>
                <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">
                  i
                </span>
              </div>

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
                          ({prod.price.toLocaleString()} KRW)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const newProds = config.products.filter(
                            (p) => p.id !== prod.id
                          );
                          updateConfig({ products: newProds });
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveProductRegisterLink(link)}
                className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <span>{isKo ? '상품 등록' : 'Register product'}</span>
              </button>
            </div>

            {/* 5. Creator Message */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">
                Creator Message
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
                !!profile.verifiedAccount?.accountConnected ||
                (!!config.accountNumber && !!config.bankName);
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
                      Account connect<span className="text-red-500">*</span>
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
                        ? "✓ Account connected"
                        : "! Link profit account (required)"}
                    </span>
                  </div>

                  {isConnected ? (
                    /* Connected State: Hide big register button, show connected badge with edit option */
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 shadow-2xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <span className="truncate">
                          {bank} {accNum} ({owner}) 연동 완료
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
                      <span>+ Register a profit account</span>
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
    const config = link.affiliateProductConfig || { affiliateUrl: link.url || "https://", imageUrl: link.icon || "", currency: "KRW" as const, displayMode: "compact" as const };
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
      <div key={link.id} data-testid={`affiliate-card-${link.id}`} data-collapsed={isCollapsed} onClick={(event) => { const target = event.target as HTMLElement; if (target.closest('button, input, textarea, select, a, [data-no-style-editor]')) return; toggleBlockCollapse(link.id); }} draggable onDragStart={(event) => handleDragStart(event, link.id)} onDragEnd={handleDragEnd} onDragOver={(event) => handleDragOver(event, link.id)} onDrop={(event) => handleDropOnItem(event, link.id)} className={clsx("rounded-3xl border border-gray-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md", isCollapsed ? "p-4" : "space-y-4 p-5")}>
        <div className={clsx("flex items-center justify-between gap-3", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex min-w-0 items-center gap-2"><GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" /><BadgeDollarSign className="h-5 w-5 shrink-0 text-fuchsia-600" /><span className="truncate text-sm font-black">{link.title || (isKo ? "추천 상품" : "Recommended product")}</span></div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => updateCustomLink(link.id, { isVisible: !link.isVisible })} className={clsx("relative h-5 w-10 cursor-pointer rounded-full transition-colors", link.isVisible !== false ? "bg-black" : "bg-gray-200")} aria-label={isKo ? "공개 여부" : "Visibility"}><span className={clsx("absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform", link.isVisible !== false && "translate-x-5")} /></button>
            <button type="button" onClick={() => setActiveStyleLinkId(link.id)} className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label="추천 상품 디자인 수정" title="추천 상품 디자인 수정"><Palette className="h-4 w-4" /></button>
            {renderCollapseControl(link.id, isCollapsed)}
            <button type="button" onClick={() => removeCustomLink(link.id)} className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500" aria-label={isKo ? "상품 삭제" : "Delete product"}><Trash2 className="h-4 w-4" /></button>
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
              <label className="block text-xs font-black text-gray-700">{isKo ? "상품명" : "Product title"}<input value={link.title} onChange={(event) => updateCustomLink(link.id, { title: event.target.value })} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-fuchsia-400" placeholder={isKo ? "상품명을 입력하세요" : "Enter a product title"} /></label>
              <label className="block text-xs font-black text-gray-700">{isKo ? "제휴 링크" : "Affiliate link"}<input value={config.affiliateUrl} onChange={(event) => updateConfig({ affiliateUrl: event.target.value })} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-fuchsia-400" placeholder="https://" /></label>
              <label className="block text-xs font-black text-gray-700">{isKo ? "이미지 주소" : "Image URL"}<input value={config.imageUrl || ""} onChange={(event) => updateConfig({ imageUrl: event.target.value })} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-fuchsia-400" placeholder="https://..." /></label>
              <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
                <label className="block text-xs font-black text-gray-700">{isKo ? "가격" : "Price"}<input type="number" min="0" value={config.price ?? ""} onChange={(event) => updateConfig({ price: event.target.value === "" ? undefined : Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-fuchsia-400" placeholder={isKo ? "선택 입력" : "Optional"} /></label>
                <label className="block text-xs font-black text-gray-700">{isKo ? "통화" : "Currency"}<select value={config.currency || "KRW"} onChange={(event) => updateConfig({ currency: event.target.value as NonNullable<typeof config.currency> })} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-fuchsia-400"><option value="KRW">KRW</option><option value="USD">USD</option><option value="JPY">JPY</option><option value="EUR">EUR</option></select></label>
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
      <div key={link.id} data-testid={`map-card-${link.id}`} data-collapsed={isCollapsed} onClick={(event) => handleCollapsibleCardClick(event, link.id)} draggable onDragStart={(event) => handleDragStart(event, link.id)} onDragEnd={handleDragEnd} onDragOver={(event) => handleDragOver(event, link.id)} onDrop={(event) => handleDropOnItem(event, link.id)} className={clsx("rounded-3xl border border-gray-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md", isCollapsed ? "p-4" : "space-y-4 p-5")}>
        <div className={clsx("flex items-center justify-between gap-3", !isCollapsed && "border-b border-gray-100 pb-3")}>
          <div className="flex min-w-0 items-center gap-2"><GripVertical className="h-4 w-4 shrink-0 cursor-grab text-gray-300" /><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700" aria-label="기본 위치 아이콘"><MapPinned className="h-5 w-5" /></span><span className="truncate text-sm font-black">{link.title || (isKo ? "오시는 길" : "Location")}</span></div>
          <div className="flex shrink-0 items-center gap-2">{renderVisibilityControl(link)}<button type="button" onClick={() => setActiveStyleLinkId(link.id)} className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-black" aria-label={isKo ? "거주지 디자인 수정" : "Edit location design"} title={isKo ? "거주지 디자인 수정" : "Edit location design"}><Palette className="h-4 w-4" /></button>{renderCollapseControl(link.id, isCollapsed)}<button type="button" onClick={() => removeCustomLink(link.id)} className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500" aria-label={isKo ? "지도 삭제" : "Delete map"}><Trash2 className="h-4 w-4" /></button></div>
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

  if (activeStyleLink) {
    return (
      <LinkStyleEditorModal
        link={activeStyleLink}
        parentCollection={activeStyleContext?.parentCollection}
        themeDefaults={{
          templateType,
          templateValue,
          buttonColor,
          buttonTextColor,
          buttonOpacity,
          buttonTextOpacity,
          buttonRoundness,
          buttonShadow,
        }}
        onClose={() => setActiveStyleLinkId(null)}
        onUpdate={(updates) => updateCustomLink(activeStyleLink.id, updates)}
        designOnly={activeStyleLink.type === "collection" || activeStyleLink.type === "reservation" || activeStyleLink.type === "map" || activeStyleLink.type === "donation" || activeStyleLink.type === "sales" || activeStyleLink.type === "affiliate_product" || activeStyleLink.type === "notice" || activeStyleLink.type === "customer_info"}
        onUpdateChildren={activeStyleLink.type === "collection" ? (updates) => {
          const updatedChildren = (activeStyleLink.links || []).map((child) => ({
            ...child,
            ...updates,
            ...(updates.customStyle !== undefined ? { customStyle: updates.customStyle } : {}),
          }));
          updateCustomLink(activeStyleLink.id, { ...updates, links: updatedChildren });
        } : undefined}
      />
    );
  }

  return (
    <div className="admin-link-editor space-y-6 animate-fade-in pb-20 font-sans">
      {/* Top User Profile Header with Social Icons (Matching User Screenshot) */}
      <div className="flex items-center gap-4 py-1">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <span className="text-2xl">👤</span>
          )}
        </div>

        {/* Username & Social Icons Row */}
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
            {profile.username || profile.name || "brownrice0916"}
          </h3>

          {/* Social Icons Inline List */}
          <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
            {socialLinks.map((s) => {
              const Icon = getSocialIconComp(s.platform);
              return (
                <button
                  key={s.id}
                  onClick={() => handleEditSocial(s)}
                  className="text-gray-800 hover:text-black transition cursor-pointer hover:scale-110"
                  title={`Edit ${s.platform}`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}

          </div>
        </div>
      </div>

      {/* Action Pill Buttons Row (Add + Expand All / Collapse All) */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={handleAddCollection}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full font-bold text-sm transition cursor-pointer"
        >
          <Folder className="w-4 h-4" />
          <span>{isKo ? '그룹 추가' : 'Add group'}</span>
        </button>
        <button
          onClick={() => {
            setAddBlockTargetCollectionId(null);
            setIsAddBlockModalOpen(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-black hover:bg-gray-800 text-white rounded-full font-bold text-sm transition cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{isKo ? '블록 추가' : 'Add block'}</span>
        </button>
      </div>

      {/* Custom Links & Collections List */}
      <div className="space-y-4">
        <BlockList
          links={customLinks}
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
        />
      </div>

      {/* Only reveal the root drop target while an item is actively being dragged. */}
      {draggedId && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsOverRootArea(true);
          }}
          onDragLeave={() => setIsOverRootArea(false)}
          onDrop={handleDropOnRoot}
          className={clsx(
            "p-5 rounded-2xl border-2 border-dashed text-center transition-all mt-6",
            isOverRootArea
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-gray-300 text-gray-400 bg-white/70"
          )}
        >
          <p className="text-xs font-semibold">{isKo ? '기본 목록으로 이동' : 'Move to main list'}</p>
        </div>
      )}

      {/* Product Registration Modal */}
      {activeProductRegisterLink && (
        <ProductRegistrationModal
          isOpen={!!activeProductRegisterLink}
          onClose={() => setActiveProductRegisterLink(null)}
          onRegister={(product) => {
            const currentSalesConfig =
              activeProductRegisterLink.salesConfig || {
                mainText: "디지털 파일 판매",
                description: "",
                products: [],
              };
            const updatedProducts = [
              ...(currentSalesConfig.products || []),
              product,
            ];
            updateCustomLink(activeProductRegisterLink.id, {
              salesConfig: {
                ...currentSalesConfig,
                products: updatedProducts,
              },
            });
            setActiveProductRegisterLink(null);
          }}
        />
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
              updateCustomLink(activeProfitAccountLink.id, {
                donationConfig: {
                  ...currentConfig,
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
      {activeNoticeModalLink && (
        <NoticeModal
          isOpen={!!activeNoticeModalLink}
          onClose={() => setActiveNoticeModalLink(null)}
          initialNotice={activeNoticeModalLink.noticeConfig}
          onSave={(noticeData) => {
            updateCustomLink(activeNoticeModalLink.id, {
              title: `📢 ${noticeData.title}`,
              url: `/${profile.username || "preview"}/notice`,
              noticeConfig: noticeData,
            });
            setActiveNoticeModalLink(null);
          }}
        />
      )}

      {/* Thumbnail Editor Modal */}
      {activeThumbnailLink && (
        <ThumbnailModal
          isOpen={!!activeThumbnailLink}
          onClose={() => setActiveThumbnailLink(null)}
          currentType={
            activeThumbnailLink.thumbnailType ||
            (activeThumbnailLink.icon ? "image" : "none")
          }
          currentImageUrl={activeThumbnailLink.icon || ""}
          currentIconName={activeThumbnailLink.iconName || "link"}
          onSave={(updates) => {
            updateCustomLink(activeThumbnailLink.id, updates);
            setActiveThumbnailLink(null);
          }}
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

      {/* SNS Row Icon Picker Modal */}
      {activeSNSIconPick && (
        <ThumbnailModal
          isOpen={!!activeSNSIconPick}
          onClose={() => setActiveSNSIconPick(null)}
          currentType="icon"
          currentIconName={
            customLinks
              .find((l) => l.id === activeSNSIconPick.blockId)
              ?.snsLinks?.find((i) => i.id === activeSNSIconPick.itemId)
              ?.platform || "link"
          }
          onSave={(updates) => {
            const targetBlock = customLinks.find(
              (l) => l.id === activeSNSIconPick.blockId
            );
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

    </div>
  );
};

export default LinksEditor;
