import React, { useState } from 'react';
import { useStore, type CustomLink, type SocialLink } from '../../store/useStore';
import { 
  Plus, 
  Trash2, 
  LayoutList, 
  LayoutGrid, 
  Folder, 
  GripVertical, 
  CornerDownRight, 
  Image as ImageIcon,
  ChevronDown,
  Phone,
  Smartphone,
  Gift
} from 'lucide-react';
import { getLinkIcon } from '../../lib/icons';
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
  FaTiktok 
} from 'react-icons/fa';
import { ThumbnailModal } from './ThumbnailModal';
import { SocialModal } from './SocialModal';
import { AddBlockModal } from './AddBlockModal';
import { ProfitAccountModal } from './ProfitAccountModal';
import { NoticeModal } from './NoticeModal';
import { ProductRegistrationModal } from './ProductRegistrationModal';
import clsx from 'clsx';
import type { DonationConfig, NoticeConfig, SalesConfig, ProductItem } from '../../store/useStore';

const getSocialIconComp = (platform: string) => {
  switch (platform) {
    case 'instagram': return FaInstagram;
    case 'twitter': return FaTwitter;
    case 'youtube': return FaYoutube;
    case 'github': return FaGithub;
    case 'linkedin': return FaLinkedin;
    case 'mail': return FaEnvelope;
    case 'globe': return FaGlobe;
    case 'figma': return FaFigma;
    case 'tiktok': return FaTiktok;
    case 'facebook': return FaFacebook;
    default: return FaGlobe;
  }
};

const LinksEditor = () => {
  const { 
    profile,
    setDesignSettings,
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
    moveItemRelative
  } = useStore();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [isOverRootArea, setIsOverRootArea] = useState(false);
  const [activeThumbnailLink, setActiveThumbnailLink] = useState<CustomLink | null>(null);

  // Add Block Modal State
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);

  // Group Collapse State (Default is collapsed = true)
  const [collapsedCollectionIds, setCollapsedCollectionIds] = useState<Record<string, boolean>>({});

  const isCollectionCollapsed = (id: string) => {
    return collapsedCollectionIds[id] ?? true; // Default is collapsed (true)
  };

  const toggleCollectionCollapse = (id: string) => {
    setCollapsedCollectionIds((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? true),
    }));
  };

  // Social Link Modal State
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [editingSocialLink, setEditingSocialLink] = useState<SocialLink | null>(null);

  const handleAddSocial = () => {
    setEditingSocialLink(null);
    setIsSocialModalOpen(true);
  };

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
      title: 'New Link',
      url: 'https://',
      isVisible: true
    });
  };

  const handleAddCollection = () => {
    const newCollectionId = `col-${Date.now()}`;
    addCustomLink({
      id: newCollectionId,
      type: 'collection',
      title: '새 링크 그룹',
      layout: 'list',
      links: []
    });
    // Open new collection by default
    setCollapsedCollectionIds((prev) => ({ ...prev, [newCollectionId]: false }));
  };

  const handleAddNestedLink = (collectionId: string) => {
    addCustomLink({
      id: `link-${Date.now()}`,
      title: 'New Link',
      url: 'https://',
      isVisible: true
    }, collectionId);
  };

  const handleSelectBlockType = (blockType: string) => {
    const userHandle = profile.username || 'preview';

    if (blockType === 'link') {
      addCustomLink({
        id: `link-${Date.now()}`,
        type: 'link',
        title: '내 공식 사이트 바로가기',
        url: 'https://naver.com',
        isVisible: true,
        iconName: 'link'
      });
    } else if (blockType === 'group_link') {
      handleAddCollection();
    } else if (blockType === 'sns') {
      addCustomLink({
        id: `link-${Date.now()}`,
        type: 'sns',
        title: 'SNS',
        isVisible: true,
        snsLinks: [
          { id: `sns-${Date.now()}-1`, platform: 'phone', value: '010-1234-5678', countryCode: 'KR' },
          { id: `sns-${Date.now()}-2`, platform: 'instagram', value: userHandle }
        ]
      });
    } else if (blockType === 'donation') {
      addCustomLink({
        id: `link-${Date.now()}`,
        type: 'donation',
        title: '💖 후원하기 (Donation)',
        url: `/${userHandle}/donation`,
        isVisible: true,
        iconName: 'heart',
        donationConfig: {
          mainText: '후원해주셔서 감사합니다!',
          detailText: '응원 메시지와 함께 후원금을 보낼 수 있습니다.',
          minAmount: 3000,
          buttonText: '후원하기',
          bankName: profile.verifiedAccount?.bankName || '',
          accountNumber: profile.verifiedAccount?.accountNumber || '',
          accountOwnerName: profile.verifiedAccount?.accountOwnerName || '',
          idNumber: profile.verifiedAccount?.idNumber || '',
          accountConnected: !!profile.verifiedAccount?.accountConnected
        }
      });
    } else if (blockType === 'file') {
      addCustomLink({
        id: `link-${Date.now()}`,
        type: 'file',
        title: '자료집 및 대표 파일 다운로드',
        url: 'https://images.unsplash.com/photo-1542435503-956c469947f6',
        isVisible: true,
        iconName: 'download',
        fileConfig: {
          title: '자료집 및 대표 파일 다운로드',
          description: '누구나 자유롭게 다운로드하실 수 있습니다.',
          fileUrl: 'https://images.unsplash.com/photo-1542435503-956c469947f6',
          fileName: 'linkzip_presentation.pdf',
          fileSize: '2.4MB'
        }
      });
    } else if (blockType === 'notice') {
      addCustomLink({
        id: `link-${Date.now()}`,
        type: 'notice',
        title: '📢 8월 주요 공지사항',
        url: `/${userHandle}/notice`,
        isVisible: true,
        iconName: 'megaphone',
        noticeConfig: {
          title: '📢 8월 주요 공지사항 및 안내',
          content: '팬미팅 일정 및 신규 굿즈 출시 안내입니다. 많은 관심 부탁드립니다!',
          date: new Date().toLocaleDateString('ko-KR')
        }
      });
    } else if (blockType === 'guestbook') {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: '✏️ 팬 방명록 (응원 메시지 남기기)',
        url: `/${userHandle}/guestbook`,
        isVisible: true,
        iconName: 'pen-tool'
      });
    } else if (blockType === 'customer_info') {
      addCustomLink({
        id: `link-${Date.now()}`,
        type: 'customer_info',
        title: 'Customer info (뉴스레터 구독 신청)',
        url: `/${userHandle}/customer_info`,
        isVisible: true,
        iconName: 'credit-card',
        customerInfoConfig: {
          mainText: 'subscribe to our letter',
          detailText: 'sent every monday',
          receiveEmail: true,
          receivePhone: false,
          receiveName: false
        }
      });
    } else if (blockType === 'sales') {
      addCustomLink({
        id: `link-${Date.now()}`,
        type: 'sales',
        title: '🛍️ 디지털 상품 판매',
        url: `/${userHandle}/sales`,
        isVisible: true,
        iconName: 'shopping-bag',
        salesConfig: {
          salesType: undefined,
          mainText: '디지털 상품 및 파일 판매',
          description: '전자책 및 디지털 파일을 손쉽게 다운로드받으세요.',
          descriptionViewType: 'simple',
          products: [],
          creatorMessage: '구매해주셔서 감사합니다.'
        }
      });
    } else if (blockType === 'booking') {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: '📅 1:1 컨설팅 & 일정 예약하기',
        url: 'https://booking.naver.com',
        isVisible: true,
        iconName: 'calendar-check'
      });
    } else if (blockType === 'customer_inquiry' || blockType === 'contact') {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: '📞 비즈니스 섭외 & 1:1 오픈채팅 문의',
        url: 'https://open.kakao.com/o/linkzip',
        isVisible: true,
        iconName: 'message-circle'
      });
    } else {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: `${blockType.replace('_', ' ')} block`,
        url: `https://${userHandle}.linkzip.me`,
        isVisible: true,
        iconName: 'sparkles'
      });
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
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

    const activeId = e.dataTransfer.getData('text/plain');
    if (!activeId || activeId === targetId) return;

    moveItemRelative(activeId, targetId);
    setDraggedId(null);
  };

  const handleDropOnCollection = (e: React.DragEvent, collectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    const activeId = e.dataTransfer.getData('text/plain');
    if (!activeId) return;

    moveItemToCollection(activeId, collectionId);
    setDraggedId(null);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverRootArea(false);

    const activeId = e.dataTransfer.getData('text/plain');
    if (!activeId) return;

    moveItemToRoot(activeId);
    setDraggedId(null);
  };

  // Render standard link item card
  const renderLinkItem = (link: CustomLink, isNested = false, parentCollectionId?: string) => {
    const isBeingDragged = draggedId === link.id;
    const isDragOver = dragOverTargetId === link.id;

    const isImage = link.thumbnailType === 'image' || (!link.thumbnailType && link.icon);
    const isIcon = link.thumbnailType === 'icon' || (!link.thumbnailType && link.iconName);
    const SelectedIconComp = getLinkIcon(link.iconName);

    return (
      <div 
        key={link.id}
        draggable
        onDragStart={(e) => handleDragStart(e, link.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white p-4 rounded-2xl border transition-all space-y-3 relative group",
          isNested ? "border-gray-200 bg-gray-50/50 shadow-2xs" : "border-gray-200 shadow-2xs",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver && "border-2 border-indigo-500 bg-indigo-50/50"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Drag Handle Icon */}
          <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition shrink-0">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Thumbnail / Icon Picker Button */}
          <button
            type="button"
            onClick={() => setActiveThumbnailLink(link)}
            className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 hover:border-black transition cursor-pointer relative group/thumb"
            title="Edit thumbnail / icon"
          >
            {isImage ? (
              <img src={link.icon} alt={link.title} className="w-full h-full object-cover" />
            ) : isIcon && SelectedIconComp ? (
              <SelectedIconComp className="w-5 h-5 text-gray-700" />
            ) : (
              <ImageIcon className="w-4 h-4 text-gray-400 group-hover/thumb:text-black transition" />
            )}
          </button>

          {/* Title & URL Inputs */}
          <div className="flex-1 space-y-1.5 min-w-0">
            <input
              type="text"
              value={link.title}
              onChange={(e) => updateCustomLink(link.id, { title: e.target.value })}
              className="w-full font-bold text-xs text-gray-900 border-none p-0 focus:ring-0 bg-transparent placeholder-gray-400 truncate"
              placeholder="Title"
            />
            <input
              type="text"
              value={link.url || ''}
              onChange={(e) => updateCustomLink(link.id, { url: e.target.value })}
              className="w-full text-[11px] text-gray-500 font-medium border-none p-0 focus:ring-0 bg-transparent placeholder-gray-300 truncate"
              placeholder="URL (e.g. https://...)"
            />
          </div>

          {/* Actions: Color Picker, Visibility Toggle & Delete */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Custom Button Color Picker */}
            <div className="flex items-center gap-1" title="특정 버튼 색상 지정 (기본은 전체 통일)">
              <input
                type="color"
                value={link.buttonColor || '#ffffff'}
                onChange={(e) => updateCustomLink(link.id, { buttonColor: e.target.value, buttonTextColor: '#000000' })}
                className="w-5 h-5 rounded-md border border-gray-300 cursor-pointer p-0 bg-transparent"
              />
              {link.buttonColor && (
                <button
                  type="button"
                  onClick={() => updateCustomLink(link.id, { buttonColor: undefined, buttonTextColor: undefined })}
                  className="text-[10px] text-gray-400 hover:text-red-500 font-bold px-1"
                  title="기본 통일 색상으로 복원"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => updateCustomLink(link.id, { isVisible: !link.isVisible })}
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
    const isCollapsed = isCollectionCollapsed(collection.id);

    return (
      <div 
        key={collection.id}
        draggable
        onDragStart={(e) => handleDragStart(e, collection.id)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, collection.id)}
        onDrop={(e) => handleDropOnCollection(e, collection.id)}
        className={clsx(
          "bg-white p-5 rounded-3xl border-2 transition-all space-y-4 shadow-sm relative",
          isBeingDragged && "opacity-40 border-dashed border-gray-400",
          isDragOver ? "border-indigo-500 bg-indigo-50/50" : "border-indigo-100"
        )}
      >
        {/* Collection Header Controls */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 transition shrink-0">
              <GripVertical className="w-4 h-4" />
            </div>

            <button
              onClick={() => toggleCollectionCollapse(collection.id)}
              className="p-1.5 text-gray-500 hover:text-black rounded-lg hover:bg-gray-100 transition cursor-pointer"
              title={isCollapsed ? '컬렉션 펼치기' : '컬렉션 접기'}
            >
              <ChevronDown className={clsx("w-4 h-4 transition-transform duration-200", isCollapsed ? "-rotate-90" : "rotate-0")} />
            </button>

            <Folder className="w-4 h-4 text-indigo-600 shrink-0" />

            <input
              type="text"
              value={collection.title}
              onChange={(e) => updateCustomLink(collection.id, { title: e.target.value })}
              className="font-black text-sm text-gray-900 border-none p-0 focus:ring-0 bg-transparent placeholder-gray-400 flex-1 truncate"
              placeholder="Collection Title"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Layout Toggle (List vs Grid) */}
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => updateCustomLink(collection.id, { layout: 'list' })}
                className={clsx(
                  "p-1 rounded-md transition cursor-pointer",
                  collection.layout !== 'grid' ? "bg-white text-black shadow-xs font-bold" : "text-gray-400"
                )}
                title="List view"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateCustomLink(collection.id, { layout: 'grid' })}
                className={clsx(
                  "p-1 rounded-md transition cursor-pointer",
                  collection.layout === 'grid' ? "bg-white text-black shadow-xs font-bold" : "text-gray-400"
                )}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

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
          <div className="pl-4 border-l-2 border-indigo-100 space-y-3 pt-1 animate-in fade-in duration-200">
            {collection.links && collection.links.length > 0 ? (
              collection.links.map((nestedLink) => renderLinkItem(nestedLink, true, collection.id))
            ) : (
              <div className="text-center py-4 text-xs font-semibold text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                컬렉션이 비어있습니다. 아래 [ + ] 버튼을 눌러 링크를 추가해보세요.
              </div>
            )}

            {/* Add Nested Link Button */}
            <div className="pt-1 flex justify-end">
              <button
                onClick={() => handleAddNestedLink(collection.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add link inside</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const [activeProfitAccountLink, setActiveProfitAccountLink] = useState<CustomLink | null>(null);

  const renderDonationCard = (link: CustomLink) => {
    const config = link.donationConfig || {
      mainText: 'Please Donation!',
      detailText: 'leave additional comments',
      minAmount: 3000,
      buttonText: 'donation',
      accountConnected: false
    };

    const updateConfig = (updates: Partial<DonationConfig>) => {
      const newConfig = { ...config, ...updates };
      updateCustomLink(link.id, {
        title: newConfig.mainText || link.title,
        donationConfig: newConfig
      });
    };

    return (
      <div 
        key={link.id}
        className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5 font-sans relative"
      >
        {/* Header Row: Toggle, Title, Info, Controls */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            {/* ON/OFF Switch */}
            <button
              onClick={() => updateCustomLink(link.id, { isVisible: !link.isVisible })}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative cursor-pointer flex items-center px-1 font-black text-[9px]",
                link.isVisible !== false ? "bg-[#00E676] text-white" : "bg-gray-200 text-gray-500"
              )}
            >
              <span className={clsx("transition-transform duration-200 font-extrabold", link.isVisible !== false ? "translate-x-0 ml-0.5" : "translate-x-5")}>
                {link.isVisible !== false ? "ON" : "OFF"}
              </span>
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-xs",
                  link.isVisible !== false ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>

            {/* Donation Title with (i) Badge */}
            <div className="flex items-center gap-1.5 font-black text-base text-gray-900">
              <span>Donation</span>
              <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px] font-serif cursor-pointer" title="Donation Block Info">i</span>
            </div>
          </div>

          {/* Right Controls: Color Picker & Delete */}
          <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
            <div className="flex items-center gap-1" title="특정 카드 색상 지정 (기본은 전체 통일)">
              <input
                type="color"
                value={link.buttonColor || '#ffffff'}
                onChange={(e) => updateCustomLink(link.id, { buttonColor: e.target.value, buttonTextColor: '#000000' })}
                className="w-5 h-5 rounded-md border border-gray-300 cursor-pointer p-0 bg-transparent"
              />
              {link.buttonColor && (
                <button
                  type="button"
                  onClick={() => updateCustomLink(link.id, { buttonColor: undefined, buttonTextColor: undefined })}
                  className="text-[10px] text-gray-400 hover:text-red-500 font-bold px-1"
                  title="기본 통일 색상으로 복원"
                >
                  ✕
                </button>
              )}
            </div>

            <button 
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inputs */}

        {/* 1. Main Text + Image Button */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-600">main text<span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.mainText}
              onChange={(e) => updateConfig({ mainText: e.target.value })}
              placeholder="Please Donation!"
              className="flex-1 p-3.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
            />
            <button
              onClick={() => setActiveThumbnailLink(link)}
              className="w-16 bg-[#8C9AA8] hover:bg-gray-600 text-white rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer shrink-0"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-[9px] font-bold">image</span>
            </button>
          </div>
        </div>

        {/* 2. Detail Text */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-600">detail text</label>
          <input
            type="text"
            value={config.detailText || ''}
            onChange={(e) => updateConfig({ detailText: e.target.value })}
            placeholder="leave additional comments"
            className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
          />
        </div>

        {/* 3. Minimum Amount & Text on the Button Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">Minimum amount<span className="text-red-500">*</span></label>
            <div className="relative flex items-center">
              <input
                type="number"
                value={config.minAmount}
                onChange={(e) => updateConfig({ minAmount: Number(e.target.value) })}
                step={1000}
                className="w-full p-3.5 pr-14 border border-gray-300 rounded-xl text-xs font-extrabold text-gray-900 focus:ring-2 focus:ring-black"
              />
              <span className="absolute right-3 text-xs font-black text-gray-900 pointer-events-none">KRW</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">Text on the button</label>
            <input
              type="text"
              value={config.buttonText}
              onChange={(e) => updateConfig({ buttonText: e.target.value })}
              placeholder="donation"
              className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
            />
          </div>
        </div>

        {/* 4. Account Connection Row */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-600">Account connection<span className="text-red-500">*</span></label>
            <span className={clsx("text-xs font-bold flex items-center gap-1", config.accountConnected ? "text-emerald-600" : "text-[#2563EB]")}>
              {config.accountConnected ? "✓ Account connected" : "❗Account connection is required"}
            </span>
          </div>

          {/* Register Profit Account Button */}
          <button
            type="button"
            onClick={() => setActiveProfitAccountLink(link)}
            className="w-full py-4 bg-[#E54D26] hover:bg-[#D43D17] text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md tracking-wide"
          >
            + Register a profit account
          </button>
        </div>

      </div>
    );
  };

  const renderFileSharingCard = (link: CustomLink) => {
    const config = link.fileConfig || {
      title: '자유로운 주제 문구 입력',
      description: '추가 설명을 남길 수 있습니다',
      fileUrl: '',
      fileName: '',
      fileSize: ''
    };

    const updateConfig = (updates: Partial<import('../../store/useStore').FileConfig>) => {
      const newConfig = { ...config, ...updates };
      updateCustomLink(link.id, {
        title: newConfig.title || link.title,
        fileConfig: newConfig
      });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fakeUrl = URL.createObjectURL(file);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      updateConfig({
        fileUrl: fakeUrl,
        fileName: file.name,
        fileSize: `${sizeMb}MB`
      });
    };

    return (
      <div 
        key={link.id}
        className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5 font-sans relative"
      >
        {/* Header Row: Toggle, Title, Controls */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            {/* ON/OFF Switch */}
            <button
              onClick={() => updateCustomLink(link.id, { isVisible: !link.isVisible })}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative cursor-pointer flex items-center px-1 font-black text-[9px]",
                link.isVisible !== false ? "bg-[#00E676] text-white" : "bg-gray-200 text-gray-500"
              )}
            >
              <span className={clsx("transition-transform duration-200 font-extrabold", link.isVisible !== false ? "translate-x-0 ml-0.5" : "translate-x-5")}>
                {link.isVisible !== false ? "ON" : "OFF"}
              </span>
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-xs",
                  link.isVisible !== false ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>

            {/* Title */}
            <div className="font-black text-base text-gray-900">
              <span>파일 공유</span>
            </div>
          </div>

          {/* Right Controls: Color Picker & Delete */}
          <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
            <div className="flex items-center gap-1" title="특정 카드 색상 지정 (기본은 전체 통일)">
              <input
                type="color"
                value={link.buttonColor || '#ffffff'}
                onChange={(e) => updateCustomLink(link.id, { buttonColor: e.target.value, buttonTextColor: '#000000' })}
                className="w-5 h-5 rounded-md border border-gray-300 cursor-pointer p-0 bg-transparent"
              />
              {link.buttonColor && (
                <button
                  type="button"
                  onClick={() => updateCustomLink(link.id, { buttonColor: undefined, buttonTextColor: undefined })}
                  className="text-[10px] text-gray-400 hover:text-red-500 font-bold px-1"
                  title="기본 통일 색상으로 복원"
                >
                  ✕
                </button>
              )}
            </div>

            <button 
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inputs */}

        {/* 1. 대표문구* + Image Button */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-600">대표문구<span className="text-red-500">*</span></label>
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
              <span className="text-[9px] font-bold">image</span>
            </button>
          </div>
        </div>

        {/* 2. 상세설명 */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-600">상세설명</label>
          <input
            type="text"
            value={config.description || ''}
            onChange={(e) => updateConfig({ description: e.target.value })}
            placeholder="추가 설명을 남길 수 있습니다"
            className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
          />
        </div>

        {/* 3. Upload Files* Button & Uploaded File Badge */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-bold text-gray-600">Upload Files<span className="text-red-500">*</span></label>

          {config.fileName && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs font-bold text-gray-800">
              <span className="truncate">📄 {config.fileName} ({config.fileSize || 'FILE'})</span>
              <button
                type="button"
                onClick={() => updateConfig({ fileUrl: '', fileName: '', fileSize: '' })}
                className="text-gray-400 hover:text-red-500 transition ml-2"
              >
                ✕
              </button>
            </div>
          )}

          <label className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2">
            <span>+ Add File</span>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

      </div>
    );
  };

  const [activeSNSIconPick, setActiveSNSIconPick] = useState<{ blockId: string; itemId: string } | null>(null);

  const renderSNSCard = (link: CustomLink) => {
    const items = link.snsLinks || [
      { id: 'sns-1', platform: 'phone', value: '', countryCode: 'KR' }
    ];

    const updateItems = (newItems: import('../../store/useStore').SNSItem[]) => {
      updateCustomLink(link.id, { snsLinks: newItems });
    };

    const handleAddItem = (platform: string = 'link') => {
      const newItem: import('../../store/useStore').SNSItem = {
        id: `sns-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        platform,
        value: '',
        countryCode: platform === 'phone' ? 'KR' : undefined
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
        className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5 font-sans relative"
      >
        {/* Header Row: ON/OFF toggle, SNS title, Controls */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            {/* ON/OFF Switch */}
            <button
              onClick={() => updateCustomLink(link.id, { isVisible: !link.isVisible })}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative cursor-pointer flex items-center px-1 font-black text-[9px]",
                link.isVisible !== false ? "bg-[#00E676] text-white" : "bg-gray-200 text-gray-500"
              )}
            >
              <span className={clsx("transition-transform duration-200 font-extrabold", link.isVisible !== false ? "translate-x-0 ml-0.5" : "translate-x-5")}>
                {link.isVisible !== false ? "ON" : "OFF"}
              </span>
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-xs",
                  link.isVisible !== false ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>

            {/* Title */}
            <div className="font-black text-base text-gray-900">
              <span>SNS</span>
            </div>
          </div>

          {/* Controls: trashcan */}
          <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
            <button 
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SNS Input Rows List */}
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = getSocialIconComp(item.platform);
            const isPhone = item.platform === 'phone';

            return (
              <div key={item.id} className="flex items-center gap-2">
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 text-gray-400 shrink-0 cursor-grab" />

                {/* Clickable Platform Icon Badge (Opens Icon Selector Modal!) */}
                <button
                  type="button"
                  onClick={() => setActiveSNSIconPick({ blockId: link.id, itemId: item.id })}
                  className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 transition cursor-pointer hover:border-black group relative shadow-2xs"
                  title="아이콘 변경하기 (Click to change icon)"
                >
                  {isPhone ? (
                    <Phone className="w-4.5 h-4.5 text-gray-800 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Icon className="w-5 h-5 text-gray-800 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="absolute -bottom-1 -right-1 bg-black text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">✎</span>
                </button>

                {/* Country Code Flag Dropdown (for phone) */}
                {isPhone && (
                  <div className="relative shrink-0">
                    <select
                      value={item.countryCode || 'KR'}
                      onChange={(e) => {
                        updateItems(items.map(i => i.id === item.id ? { ...i, countryCode: e.target.value } : i));
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
                  onChange={(e) => handleUpdateItemValue(item.id, e.target.value)}
                  placeholder={
                    isPhone 
                      ? "+82 Phone number (without -)" 
                      : `URL or ${item.platform.charAt(0).toUpperCase() + item.platform.slice(1)} ID`
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
            onClick={() => handleAddItem('link')}
            className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <span>+ Add SNS</span>
          </button>
        </div>

      </div>
    );
  };

  const [activeNoticeModalLink, setActiveNoticeModalLink] = useState<CustomLink | null>(null);

  const renderNoticeCard = (link: CustomLink) => {
    const notice = link.noticeConfig || {
      title: '📢 8월 주요 공지사항',
      content: '팬미팅 일정 및 신규 굿즈 출시 안내입니다.',
      date: new Date().toLocaleDateString('ko-KR')
    };

    return (
      <div 
        key={link.id}
        className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5 font-sans relative"
      >
        {/* Header Row: Toggle, Title, Controls */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            {/* ON/OFF Switch */}
            <button
              onClick={() => updateCustomLink(link.id, { isVisible: !link.isVisible })}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative cursor-pointer flex items-center px-1 font-black text-[9px]",
                link.isVisible !== false ? "bg-[#00E676] text-white" : "bg-gray-200 text-gray-500"
              )}
            >
              <span className={clsx("transition-transform duration-200 font-extrabold", link.isVisible !== false ? "translate-x-0 ml-0.5" : "translate-x-5")}>
                {link.isVisible !== false ? "ON" : "OFF"}
              </span>
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-xs",
                  link.isVisible !== false ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>

            {/* Title */}
            <div className="font-black text-base text-gray-900">
              <span>notice (공지사항)</span>
            </div>
          </div>

          {/* Right Controls: Color Picker & Delete */}
          <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
            <div className="flex items-center gap-1" title="특정 카드 색상 지정 (기본은 전체 통일)">
              <input
                type="color"
                value={link.buttonColor || '#ffffff'}
                onChange={(e) => updateCustomLink(link.id, { buttonColor: e.target.value, buttonTextColor: '#000000' })}
                className="w-5 h-5 rounded-md border border-gray-300 cursor-pointer p-0 bg-transparent"
              />
              {link.buttonColor && (
                <button
                  type="button"
                  onClick={() => updateCustomLink(link.id, { buttonColor: undefined, buttonTextColor: undefined })}
                  className="text-[10px] text-gray-400 hover:text-red-500 font-bold px-1"
                  title="기본 통일 색상으로 복원"
                >
                  ✕
                </button>
              )}
            </div>

            <button 
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inputs / Content Snippet */}
        <div className="space-y-3">
          <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-800">{notice.title}</span>
              <span className="text-[10px] font-semibold text-amber-600">{notice.date}</span>
            </div>
            <p className="text-xs text-gray-600 font-medium line-clamp-2">{notice.content}</p>
          </div>

          {/* Edit Notice Button */}
          <button
            type="button"
            onClick={() => setActiveNoticeModalLink(link)}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <span>📢 공지사항 입력 / 수정하기</span>
          </button>
        </div>

      </div>
    );
  };

  const renderCustomerInfoCard = (link: CustomLink) => {
    const config = link.customerInfoConfig || {
      mainText: 'subscribe to our letter',
      detailText: 'sent every monday',
      receiveEmail: true,
      receivePhone: false,
      receiveName: false
    };

    const updateConfig = (updates: Partial<import('../../store/useStore').CustomerInfoConfig>) => {
      const newConfig = { ...config, ...updates };
      updateCustomLink(link.id, {
        title: newConfig.mainText || link.title,
        customerInfoConfig: newConfig
      });
    };

    return (
      <div 
        key={link.id}
        className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5 font-sans relative"
      >
        {/* Header Row: Toggle, Title with (i), Controls */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            {/* ON/OFF Switch */}
            <button
              onClick={() => updateCustomLink(link.id, { isVisible: !link.isVisible })}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative cursor-pointer flex items-center px-1 font-black text-[9px]",
                link.isVisible !== false ? "bg-[#00E676] text-white" : "bg-gray-200 text-gray-500"
              )}
            >
              <span className={clsx("transition-transform duration-200 font-extrabold", link.isVisible !== false ? "translate-x-0 ml-0.5" : "translate-x-5")}>
                {link.isVisible !== false ? "ON" : "OFF"}
              </span>
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-xs",
                  link.isVisible !== false ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>

            {/* Customer Info Title with (i) Badge */}
            <div className="flex items-center gap-1.5 font-black text-base text-gray-900">
              <span>Customer info</span>
              <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px] font-serif cursor-pointer" title="Customer info block info">i</span>
            </div>
          </div>

          {/* Right Controls: Color Picker & Delete */}
          <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
            <div className="flex items-center gap-1" title="특정 카드 색상 지정 (기본은 전체 통일)">
              <input
                type="color"
                value={link.buttonColor || '#ffffff'}
                onChange={(e) => updateCustomLink(link.id, { buttonColor: e.target.value, buttonTextColor: '#000000' })}
                className="w-5 h-5 rounded-md border border-gray-300 cursor-pointer p-0 bg-transparent"
              />
              {link.buttonColor && (
                <button
                  type="button"
                  onClick={() => updateCustomLink(link.id, { buttonColor: undefined, buttonTextColor: undefined })}
                  className="text-[10px] text-gray-400 hover:text-red-500 font-bold px-1"
                  title="기본 통일 색상으로 복원"
                >
                  ✕
                </button>
              )}
            </div>

            <button 
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inputs */}

        {/* 1. Main Text* */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-600">main text<span className="text-red-500">*</span></label>
          <input
            type="text"
            value={config.mainText}
            onChange={(e) => updateConfig({ mainText: e.target.value })}
            placeholder="subscribe to our letter"
            className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
          />
        </div>

        {/* 2. Detail Text */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-600">detail text</label>
            <span className="text-[11px] font-bold text-gray-400 cursor-pointer hover:text-black">🙂 Find emojis &gt;</span>
          </div>
          <input
            type="text"
            value={config.detailText || ''}
            onChange={(e) => updateConfig({ detailText: e.target.value })}
            placeholder="sent every monday"
            className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
          />
        </div>

        {/* 3. Customer Info To Receive Checkboxes (Matching Screenshot 1) */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-bold text-gray-600">Customer info to receive</label>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
              <input
                type="checkbox"
                checked={config.receiveEmail !== false}
                onChange={(e) => updateConfig({ receiveEmail: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
              />
              <span>Email</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
              <input
                type="checkbox"
                checked={!!config.receivePhone}
                onChange={(e) => updateConfig({ receivePhone: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
              />
              <span>Phone number</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
              <input
                type="checkbox"
                checked={!!config.receiveName}
                onChange={(e) => updateConfig({ receiveName: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
              />
              <span>Name</span>
            </label>
          </div>
        </div>

        {/* 4. Submit Button Text & Custom Color Picker */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <label className="block text-xs font-bold text-gray-600">submit button text</label>
            <input
              type="text"
              value={config.submitButtonText || 'Submit'}
              onChange={(e) => updateConfig({ submitButtonText: e.target.value })}
              placeholder="Submit"
              className="w-full p-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1 shrink-0">
            <label className="block text-xs font-bold text-gray-600">submit button color</label>
            <div className="flex items-center gap-2 p-1.5 border border-gray-300 rounded-xl bg-white">
              <input
                type="color"
                value={config.submitButtonColor || '#000000'}
                onChange={(e) => updateConfig({ submitButtonColor: e.target.value })}
                className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer p-0 bg-transparent"
              />
              <span className="text-xs font-bold text-gray-700 uppercase pr-1">{config.submitButtonColor || '#000000'}</span>
            </div>
          </div>
        </div>

      </div>
    );
  };

  const [activeProductRegisterLink, setActiveProductRegisterLink] = useState<CustomLink | null>(null);

  const renderSalesCard = (link: CustomLink) => {
    const config = link.salesConfig || {
      mainText: '',
      description: '',
      descriptionViewType: 'simple',
      products: [],
      creatorMessage: ''
    };

    const updateConfig = (updates: Partial<import('../../store/useStore').SalesConfig>) => {
      const newConfig = { ...config, ...updates };
      updateCustomLink(link.id, {
        title: newConfig.mainText || link.title,
        salesConfig: newConfig
      });
    };

    // Step 1: Choose Sales Type (Screenshot 1)
    if (!config.salesType) {
      return (
        <div 
          key={link.id}
          className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5 font-sans relative"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateCustomLink(link.id, { isVisible: !link.isVisible })}
                className={clsx(
                  "w-12 h-6 rounded-full transition-colors relative cursor-pointer flex items-center px-1 font-black text-[9px]",
                  link.isVisible !== false ? "bg-[#00E676] text-white" : "bg-gray-200 text-gray-500"
                )}
              >
                <span className={clsx("transition-transform duration-200 font-extrabold", link.isVisible !== false ? "translate-x-0 ml-0.5" : "translate-x-5")}>
                  {link.isVisible !== false ? "ON" : "OFF"}
                </span>
                <div
                  className={clsx(
                    "w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-xs",
                    link.isVisible !== false ? "translate-x-6" : "translate-x-0"
                  )}
                />
              </button>

              <div className="flex items-center gap-1.5 font-black text-base text-gray-900">
                <span>sale in KRW</span>
                <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">i</span>
              </div>
            </div>

            <button 
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-600">sales type<span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <button
                type="button"
                onClick={() => updateConfig({ salesType: 'digital_file', mainText: '디지털 파일 상품 판매' })}
                className="p-6 border-2 border-gray-200 hover:border-black rounded-2xl flex flex-col items-center justify-center gap-3 transition cursor-pointer group bg-white shadow-2xs"
              >
                <Smartphone className="w-10 h-10 text-gray-400 group-hover:text-black group-hover:scale-110 transition-all" />
                <span className="text-xs font-bold text-gray-800 group-hover:text-black">Digital file</span>
              </button>

              <button
                type="button"
                onClick={() => updateConfig({ salesType: 'product', mainText: '실물 상품 판매' })}
                className="p-6 border-2 border-gray-200 hover:border-black rounded-2xl flex flex-col items-center justify-center gap-3 transition cursor-pointer group bg-white shadow-2xs"
              >
                <Gift className="w-10 h-10 text-gray-400 group-hover:text-black group-hover:scale-110 transition-all" />
                <span className="text-xs font-bold text-gray-800 group-hover:text-black">Product</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Step 2: Full Sales Form (Screenshot 2)
    return (
      <div 
        key={link.id}
        className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5 font-sans relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateCustomLink(link.id, { isVisible: !link.isVisible })}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative cursor-pointer flex items-center px-1 font-black text-[9px]",
                link.isVisible !== false ? "bg-[#00E676] text-white" : "bg-gray-200 text-gray-500"
              )}
            >
              <span className={clsx("transition-transform duration-200 font-extrabold", link.isVisible !== false ? "translate-x-0 ml-0.5" : "translate-x-5")}>
                {link.isVisible !== false ? "ON" : "OFF"}
              </span>
              <div
                className={clsx(
                  "w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-xs",
                  link.isVisible !== false ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>

            <div className="flex items-center gap-1.5 font-black text-base text-gray-900">
              <span>{config.salesType === 'digital_file' ? 'Digital files sale in KRW' : 'Product sale in KRW'}</span>
              <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">i</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-gray-600">
            <div className="flex items-center gap-1" title="특정 카드 색상 지정">
              <input
                type="color"
                value={link.buttonColor || '#ffffff'}
                onChange={(e) => updateCustomLink(link.id, { buttonColor: e.target.value, buttonTextColor: '#000000' })}
                className="w-5 h-5 rounded-md border border-gray-300 cursor-pointer p-0 bg-transparent"
              />
            </div>

            <button 
              onClick={() => removeCustomLink(link.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition rounded-md"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. Main Text* */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-600">main text<span className="text-red-500">*</span></label>
          <input
            type="text"
            value={config.mainText}
            onChange={(e) => updateConfig({ mainText: e.target.value })}
            placeholder="Enter a sales block title"
            className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
          />
        </div>

        {/* 2. Image Upload */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <label className="block text-xs font-bold text-gray-600">image</label>
            <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">i</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 hover:border-black flex flex-col items-center justify-center cursor-pointer transition bg-gray-50 overflow-hidden shrink-0">
              {config.image ? (
                <img src={config.image} alt="Product" className="w-full h-full object-cover" />
              ) : (
                <Plus className="w-6 h-6 text-gray-400" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) updateConfig({ image: URL.createObjectURL(file) });
                }}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-gray-400 font-medium">대표 상품 이미지를 등록해보세요.</p>
          </div>
        </div>

        {/* 3. Description* */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <label className="block text-xs font-bold text-gray-600">Description<span className="text-red-500">*</span></label>
              <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">i</span>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-bold text-gray-600">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name={`desc-view-${link.id}`}
                  checked={config.descriptionViewType !== 'detail'}
                  onChange={() => updateConfig({ descriptionViewType: 'simple' })}
                  className="cursor-pointer"
                />
                <span>Simple view</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name={`desc-view-${link.id}`}
                  checked={config.descriptionViewType === 'detail'}
                  onChange={() => updateConfig({ descriptionViewType: 'detail' })}
                  className="cursor-pointer"
                />
                <span>detail view</span>
              </label>
            </div>
          </div>

          <textarea
            value={config.description || ''}
            onChange={(e) => updateConfig({ description: e.target.value })}
            placeholder="Please enter detailed transaction terms, product description, exchange and refund policies, etc. You can enter up to 3,000 characters."
            rows={5}
            className="w-full p-3.5 border border-gray-300 rounded-2xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-300 leading-relaxed resize-none"
          />
        </div>

        {/* 4. Product List* */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <label className="block text-xs font-bold text-gray-600">Product list<span className="text-red-500">*</span></label>
            <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">i</span>
          </div>

          {/* Registered Products List */}
          {config.products && config.products.length > 0 && (
            <div className="space-y-2">
              {config.products.map((prod) => (
                <div key={prod.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-black text-white rounded-md text-[10px]">상품</span>
                    <span>{prod.name}</span>
                    <span className="text-gray-500">({prod.price.toLocaleString()} KRW)</span>
                  </div>
                  <button
                    onClick={() => {
                      const newProds = config.products.filter(p => p.id !== prod.id);
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
            <span>Register product</span>
          </button>
        </div>

        {/* 5. Creator Message */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-gray-600">Creator Message</label>
          <input
            type="text"
            value={config.creatorMessage || ''}
            onChange={(e) => updateConfig({ creatorMessage: e.target.value })}
            placeholder="This message will be delivered to the buyer upon booking completion."
            className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-300"
          />
        </div>

        {/* 6. Account Connect* */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-gray-600">Account connect<span className="text-red-500">*</span></label>
            <span className="text-[11px] font-bold text-blue-600">! Link profit account (required)</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveProfitAccountLink(link)}
            className="w-full py-4 bg-[#F24E1E] hover:bg-orange-600 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <span>+ Register a profit account</span>
          </button>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 font-sans">
      
      {/* Top User Profile Header with Social Icons (Matching User Screenshot) */}
      <div className="flex items-center gap-4 py-1">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
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

            {/* Plus Button to Add Social Link */}
            <button
              onClick={handleAddSocial}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition shadow-2xs hover:scale-105"
              title="Add social icon"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Pill Buttons Row (Only Add Button) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsAddBlockModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-black hover:bg-gray-800 text-white rounded-full font-bold text-sm transition cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      {/* Custom Links & Collections List */}
      <div className="space-y-4">
        {customLinks.map((block) => {
          if (block.type === 'collection') {
            return renderCollection(block);
          }
          if (block.type === 'donation') {
            return renderDonationCard(block);
          }
          if (block.type === 'file') {
            return renderFileSharingCard(block);
          }
          if (block.type === 'sns') {
            return renderSNSCard(block);
          }
          if (block.type === 'notice') {
            return renderNoticeCard(block);
          }
          if (block.type === 'customer_info') {
            return renderCustomerInfoCard(block);
          }
          if (block.type === 'sales') {
            return renderSalesCard(block);
          }
          return renderLinkItem(block);
        })}
      </div>

      {/* Root Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsOverRootArea(true);
        }}
        onDragLeave={() => setIsOverRootArea(false)}
        onDrop={handleDropOnRoot}
        className={clsx(
          "p-6 rounded-2xl border-2 border-dashed text-center transition-all mt-8",
          isOverRootArea ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-400 bg-transparent"
        )}
      >
        <p className="text-xs font-semibold">Drop here to move out of collection to main list</p>
      </div>

      {/* Product Registration Modal */}
      {activeProductRegisterLink && (
        <ProductRegistrationModal
          isOpen={!!activeProductRegisterLink}
          onClose={() => setActiveProductRegisterLink(null)}
          onRegister={(product) => {
            const currentSalesConfig = activeProductRegisterLink.salesConfig || {
              mainText: '디지털 상품 판매',
              description: '',
              products: []
            };
            const updatedProducts = [...(currentSalesConfig.products || []), product];
            updateCustomLink(activeProductRegisterLink.id, {
              salesConfig: {
                ...currentSalesConfig,
                products: updatedProducts
              }
            });
            setActiveProductRegisterLink(null);
          }}
        />
      )}

      {/* Add Block Modal (Matching Littly) */}
      <AddBlockModal
        isOpen={isAddBlockModalOpen}
        onClose={() => setIsAddBlockModalOpen(false)}
        onSelectBlock={handleSelectBlockType}
      />

      {/* Profit Account Management Modal */}
      {activeProfitAccountLink && (
        <ProfitAccountModal
          isOpen={!!activeProfitAccountLink}
          onClose={() => setActiveProfitAccountLink(null)}
          initialData={activeProfitAccountLink.donationConfig || profile.verifiedAccount}
          onSave={(accountData) => {
            // 1. Save globally to User Profile so it can be recalled anytime!
            setDesignSettings({ profile: { ...profile, verifiedAccount: accountData } });

            // 2. Update current active link config (Donation / Sales)
            if (activeProfitAccountLink.type === 'sales' || activeProfitAccountLink.salesConfig) {
              const currentSalesConfig = activeProfitAccountLink.salesConfig || {
                mainText: '디지털 상품 판매',
                description: '',
                products: []
              };
              updateCustomLink(activeProfitAccountLink.id, {
                salesConfig: {
                  ...currentSalesConfig,
                  bankName: accountData.bankName,
                  accountNumber: accountData.accountNumber,
                  accountOwner: accountData.accountOwnerName
                }
              });
            } else {
              const currentConfig = activeProfitAccountLink.donationConfig || {
                mainText: 'Please Donation!',
                detailText: 'leave additional comments',
                minAmount: 3000,
                buttonText: 'donation'
              };
              updateCustomLink(activeProfitAccountLink.id, {
                donationConfig: {
                  ...currentConfig,
                  ...accountData
                }
              });
            }

            alert('✅ 정산 계좌가 프로필에 성공적으로 저장되었습니다! 앞으로 모든 기능에서 자동으로 불러옵니다.');
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
              url: `/${profile.username || 'preview'}/notice`,
              noticeConfig: noticeData
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
          currentType={activeThumbnailLink.thumbnailType || (activeThumbnailLink.icon ? 'image' : 'none')}
          currentImageUrl={activeThumbnailLink.icon || ''}
          currentIconName={activeThumbnailLink.iconName || 'link'}
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
              .find(l => l.id === activeSNSIconPick.blockId)
              ?.snsLinks?.find(i => i.id === activeSNSIconPick.itemId)
              ?.platform || 'link'
          }
          onSave={(updates) => {
            const targetBlock = customLinks.find(l => l.id === activeSNSIconPick.blockId);
            if (targetBlock && targetBlock.snsLinks) {
              const newPlatform = updates.iconName || 'link';
              const updatedSnsLinks = targetBlock.snsLinks.map(i => 
                i.id === activeSNSIconPick.itemId ? { ...i, platform: newPlatform } : i
              );
              updateCustomLink(targetBlock.id, { snsLinks: updatedSnsLinks });
            }
            setActiveSNSIconPick(null);
          }}
        />
      )}

    </div>
  );
};

export default LinksEditor;
