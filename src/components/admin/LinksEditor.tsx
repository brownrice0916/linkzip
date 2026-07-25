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
  ChevronDown
} from 'lucide-react';
import { getLinkIcon } from '../../lib/icons';
import { ThumbnailModal } from './ThumbnailModal';
import { SocialModal } from './SocialModal';
import { AddBlockModal } from './AddBlockModal';
import clsx from 'clsx';

const LinksEditor = () => {
  const { 
    profile,
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
    if (blockType === 'link') {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: 'New Link',
        url: 'https://',
        isVisible: true,
        iconName: 'link'
      });
    } else if (blockType === 'group_link') {
      handleAddCollection();
    } else if (blockType === 'sns') {
      handleAddSocial();
    } else if (blockType === 'video') {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: 'Video Stream',
        url: 'https://youtube.com',
        isVisible: true,
        iconName: 'youtube'
      });
    } else if (blockType === 'text') {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: 'Text / Announcement',
        url: '',
        isVisible: true,
        iconName: 'file-text'
      });
    } else if (blockType === 'gallery') {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: 'Image Gallery',
        url: '',
        isVisible: true,
        iconName: 'image'
      });
    } else if (blockType === 'space') {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: '--- Spacing / Divider ---',
        url: '',
        isVisible: true,
        iconName: 'minus'
      });
    } else if (blockType === 'customer_inquiry' || blockType === 'contact') {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: 'Contact / Inquiry',
        url: 'https://open.kakao.com',
        isVisible: true,
        iconName: 'message-circle'
      });
    } else {
      addCustomLink({
        id: `link-${Date.now()}`,
        title: `${blockType.replace('_', ' ')} block`,
        url: 'https://',
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

          {/* Actions: Visibility Toggle & Delete */}
          <div className="flex items-center gap-2 shrink-0">
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

  return (
    <div className="space-y-6 animate-fade-in pb-20 font-sans">
      
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Content &amp; Links</h2>
          <p className="text-sm text-gray-500">Add, organize, and group your link blocks.</p>
        </div>

        {/* Add Social Icon Link Header Button */}
        <button
          onClick={handleAddSocial}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-xs font-bold transition cursor-pointer shadow-2xs"
        >
          <Plus className="w-4 h-4 text-purple-600" />
          <span>Social Icons</span>
        </button>
      </div>

      {/* Main Add Block Button (Matching Littly) */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsAddBlockModalOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-full font-extrabold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add a block
        </button>
      </div>

      {/* Custom Links & Collections List */}
      <div className="space-y-4">
        {customLinks.map((block) => {
          if (block.type === 'collection') {
            return renderCollection(block);
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

      {/* Add Block Modal (Matching Littly) */}
      <AddBlockModal
        isOpen={isAddBlockModalOpen}
        onClose={() => setIsAddBlockModalOpen(false)}
        onSelectBlock={handleSelectBlockType}
      />

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

    </div>
  );
};

export default LinksEditor;
