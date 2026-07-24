import React, { useState } from 'react';
import { useStore, type CustomLink } from '../../store/useStore';
import { Plus, Trash2, LayoutList, LayoutGrid, Folder, GripVertical, CornerDownRight } from 'lucide-react';
import clsx from 'clsx';

const LinksEditor = () => {
  const { 
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
    if (draggedId && draggedId !== targetId) {
      moveItemRelative(draggedId, targetId);
    }
    setDraggedId(null);
    setDragOverTargetId(null);
  };

  const handleDropOnCollection = (e: React.DragEvent, collectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== collectionId) {
      moveItemToCollection(draggedId, collectionId);
    }
    setDraggedId(null);
    setDragOverTargetId(null);
  };

  const handleDropOnRoot = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId) {
      moveItemToRoot(draggedId);
    }
    setDraggedId(null);
    setDragOverTargetId(null);
    setIsOverRootArea(false);
  };

  const renderLinkItem = (link: CustomLink, isNested: boolean = false, collectionId?: string) => {
    const isBeingDragged = draggedId === link.id;
    const isDragOver = dragOverTargetId === link.id;

    return (
      <div 
        key={link.id}
        draggable
        onDragStart={(e) => handleDragStart(e, link.id)}
        onDragOver={(e) => handleDragOver(e, link.id)}
        onDragLeave={() => setDragOverTargetId(null)}
        onDrop={(e) => handleDropOnItem(e, link.id)}
        className={clsx(
          "bg-white border p-4 rounded-xl flex items-center gap-3 transition-all duration-150 shadow-sm relative group",
          isNested ? "bg-gray-50/80 border-gray-200" : "border-gray-200",
          isBeingDragged ? "opacity-40 scale-95 border-dashed border-gray-400" : "",
          isDragOver ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30" : ""
        )}
      >
        {/* Drag Handle */}
        <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-700 rounded transition-colors shrink-0">
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Form Inputs */}
        <div className="flex-1 space-y-2">
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
        <div className="flex items-center gap-1">
          {isNested && (
            <button 
              onClick={() => moveItemToRoot(link.id)} 
              title="Move out of collection"
              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100 transition-colors"
            >
              <CornerDownRight className="w-4 h-4 transform rotate-180" />
            </button>
          )}
          <button 
            onClick={() => removeCustomLink(link.id)} 
            className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 transition-colors"
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
          isDragOver ? "border-indigo-600 ring-4 ring-indigo-500/20 bg-indigo-50/10" : ""
        )}
      >
        {/* Collection Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-700 shrink-0">
              <GripVertical className="w-5 h-5" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
              <Folder className="w-4 h-4 text-indigo-600" />
            </div>
            <input
              type="text"
              value={collection.title}
              onChange={(e) => updateCustomLink(collection.id, { title: e.target.value })}
              className="font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0 placeholder-gray-400 w-full"
              placeholder="Collection title"
            />
          </div>
          <button onClick={() => removeCustomLink(collection.id)} className="p-2 text-gray-400 hover:text-red-500">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Layout Picker */}
        <div className="flex gap-2">
          <button
            onClick={() => updateCustomLink(collection.id, { layout: 'list' })}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all",
              collection.layout === 'list' ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:bg-gray-50'
            )}
          >
            <LayoutList className={clsx("w-5 h-5", collection.layout === 'list' ? 'text-black' : 'text-gray-400')} />
            <span className={clsx("text-xs font-semibold", collection.layout === 'list' ? 'text-black' : 'text-gray-500')}>List</span>
          </button>
          
          <button
            onClick={() => updateCustomLink(collection.id, { layout: 'grid' })}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-all",
              collection.layout === 'grid' ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200 hover:bg-gray-50'
            )}
          >
            <LayoutGrid className={clsx("w-5 h-5", collection.layout === 'grid' ? 'text-black' : 'text-gray-400')} />
            <span className={clsx("text-xs font-semibold", collection.layout === 'grid' ? 'text-black' : 'text-gray-500')}>Grid</span>
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
            className="w-full py-2.5 bg-gray-200 text-black font-semibold rounded-full hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 text-xs mt-2"
          >
            <Plus className="w-4 h-4" /> Add link to collection
          </button>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Top Add Buttons */}
      <div className="flex gap-3">
        <button 
          onClick={handleAddCollection}
          className="flex-1 py-3.5 bg-white border border-gray-200 shadow-sm text-black font-semibold rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Folder className="w-4 h-4 text-indigo-600" /> Add collection
        </button>
        <button 
          onClick={handleAddRootLink}
          className="flex-1 py-3.5 bg-black text-white font-semibold rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
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

    </div>
  );
};

export default LinksEditor;
