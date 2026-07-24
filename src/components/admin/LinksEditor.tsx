import React, { useState } from 'react';
import { useStore, type CustomLink, type SocialLink } from '../../store/useStore';
import { Plus, Trash2, LayoutList, LayoutGrid, Folder, GripVertical, CornerDownRight, Image as ImageIcon } from 'lucide-react';
import { getLinkIcon } from '../../lib/icons';
import { ThumbnailModal } from './ThumbnailModal';
import { SocialModal } from './SocialModal';
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

  const handleSaveSocial = (link: SocialLink) => {
    if (editingSocialLink) {
      updateSocialLink(link.id, link);
    } else {
      addSocialLink(link);
    }
  };

  const handleDeleteSocial = (id: string) => {
    removeSocialLink(id);
  };

  const handleAddCollection = () => {
    addCustomLink({
      id: Date.now().toString(),
      type: 'collection',
      title: 'New Collection',
      layout: 'list',
      links: []
    });
  };

  const handleAddRootLink = () => {
    addCustomLink({
      id: Date.now().toString(),
      type: 'link',
      title: '',
      url: ''
    });
  };

  const handleAddNestedLink = (collectionId: string) => {
    addCustomLink({
      id: Date.now().toString(),
      type: 'link',
      title: '',
      url: ''
    }, collectionId);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
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
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDragLeave={() => setDragOverTargetId(null)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-3 transition-all duration-150 relative",
          isBeingDragged ? "opacity-40 scale-95 border-dashed border-gray-400" : "border-gray-200",
          isDragOver ? "border-indigo-500 border-2 bg-indigo-50/20" : "",
          isNested ? "ml-4" : ""
        )}
      >
        {/* Drag Handle */}
        <div className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-600 transition-colors shrink-0">
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Thumbnail / Icon Button */}
        <button
          type="button"
          onClick={() => setActiveThumbnailLink(link)}
          className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden hover:bg-gray-200 transition group cursor-pointer"
          title="Change thumbnail / icon"
        >
          {isImage && link.icon ? (
            <img src={link.icon} alt="Thumbnail" className="w-full h-full object-cover" />
          ) : isIcon ? (
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <SelectedIconComp className="w-full h-full object-contain text-gray-800" />
            </div>
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          )}
        </button>

        {/* Form Inputs */}
        <div className="flex-1 space-y-2 min-w-0">
          <input
            type="text"
            value={link.title}
            onChange={(e) => updateCustomLink(link.id, { title: e.target.value })}
            className="font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-400 w-full text-sm"
            placeholder="Title"
          />
          <input
            type="text"
            value={link.url || ''}
            onChange={(e) => updateCustomLink(link.id, { url: e.target.value })}
            className="text-xs text-gray-500 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-400 w-full"
            placeholder="URL"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isNested && (
            <button 
              onClick={() => moveItemToRoot(link.id)} 
              title="Move out of collection"
              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <CornerDownRight className="w-4 h-4 transform rotate-180" />
            </button>
          )}
          <button 
            onClick={() => removeCustomLink(link.id)} 
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderCollection = (collection: CustomLink) => {
    const isBeingDragged = draggedId === collection.id;
    const isDragOver = dragOverTargetId === collection.id;

    return (
      <div 
        key={collection.id}
        draggable
        onDragStart={(e) => handleDragStart(e, collection.id)}
        onDragOver={(e) => handleDragOver(e, collection.id)}
        onDragLeave={() => setDragOverTargetId(null)}
        onDrop={(e) => handleDropOnCollection(e, collection.id)}
        className={clsx(
          "bg-white border rounded-2xl p-5 shadow-sm space-y-5 transition-all duration-150 relative",
          isBeingDragged ? "opacity-40 scale-95 border-dashed border-gray-400" : "border-gray-200",
          isDragOver ? "border-indigo-500 border-2 bg-indigo-50/20" : ""
        )}
      >
        {/* Collection Header */}
        <div className="flex items-center gap-3">
          <div className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-600 transition-colors shrink-0">
            <GripVertical className="w-5 h-5" />
          </div>
          
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Folder className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={collection.title}
              onChange={(e) => updateCustomLink(collection.id, { title: e.target.value })}
              className="font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-400 w-full text-base"
              placeholder="Collection Title"
            />
          </div>

          <button 
            onClick={() => removeCustomLink(collection.id)} 
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Collection Layout Selector */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => updateCustomLink(collection.id, { layout: 'list' })}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all cursor-pointer",
              collection.layout === 'list' ? 'border-black bg-white shadow-2xs font-bold text-black' : 'border-transparent text-gray-500 hover:text-black'
            )}
          >
            <LayoutList className="w-4 h-4" />
            <span className="text-xs">List</span>
          </button>
          
          <button
            onClick={() => updateCustomLink(collection.id, { layout: 'grid' })}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all cursor-pointer",
              collection.layout === 'grid' ? 'border-black bg-white shadow-2xs font-bold text-black' : 'border-transparent text-gray-500 hover:text-black'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-xs">Grid</span>
          </button>
        </div>

        {/* Drop Target Box for Collection */}
        <div 
          onDragOver={(e) => handleDragOver(e, collection.id)}
          onDrop={(e) => handleDropOnCollection(e, collection.id)}
          className={clsx(
            "space-y-3 p-4 rounded-xl border-2 border-dashed transition-colors min-h-[90px] flex flex-col justify-center",
            isDragOver ? "border-indigo-500 bg-indigo-50/50" : "border-gray-200 bg-gray-50/50"
          )}
        >
          {(!collection.links || collection.links.length === 0) && (
            <p className="text-xs text-gray-400 text-center py-2 font-medium">
              Drag links into this collection box or click below
            </p>
          )}
          {collection.links?.map(link => renderLinkItem(link, true, collection.id))}
          
          <button 
            onClick={() => handleAddNestedLink(collection.id)}
            className="w-full py-2.5 bg-gray-200 text-black font-semibold rounded-full hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 text-xs mt-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add link to collection
          </button>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 font-sans">
      
      {/* Top Profile Summary Bar (Avatar + Username + Social Links Row + Add Button - Matching User Screenshot) */}
      <div className="flex items-center gap-4 bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs mb-6">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shrink-0 flex items-center justify-center shadow-xs">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.name || profile.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-black text-gray-400 uppercase">
              {(profile.username || 'LZ')[0]}
            </span>
          )}
        </div>

        {/* User & Social Row */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm truncate mb-1.5">
            {profile.username || profile.name || 'brownrice0916'}
          </h3>

          {/* Social Icons Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {socialLinks.map((social) => {
              const IconComp = getLinkIcon(social.platform);
              return (
                <button
                  key={social.id}
                  onClick={() => handleEditSocial(social)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-900 flex items-center justify-center transition shadow-2xs cursor-pointer hover:scale-105"
                  title={`Edit ${social.platform}`}
                >
                  <IconComp className="w-4 h-4 object-contain" />
                </button>
              );
            })}

            {/* Add Social Icon '+' Button */}
            <button
              onClick={handleAddSocial}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition shadow-2xs cursor-pointer hover:scale-105"
              title="Add Social Icon"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Add Buttons */}
      <div className="flex gap-3">
        <button 
          onClick={handleAddCollection}
          className="flex-1 py-3.5 bg-white border border-gray-200 shadow-2xs text-black font-semibold rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          <Folder className="w-4 h-4 text-indigo-600" /> Add collection
        </button>
        <button 
          onClick={handleAddRootLink}
          className="flex-1 py-3.5 bg-black text-white font-semibold rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm shadow-2xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add link
        </button>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {customLinks.map(block => {
          if (block.type === 'collection') {
            return renderCollection(block);
          }
          return renderLinkItem(block);
        })}
      </div>

      {/* Root Drop Zone (to easily drop out of collection) */}
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
