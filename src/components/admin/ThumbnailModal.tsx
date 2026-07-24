import React, { useState } from 'react';
import { X, ChevronLeft, Search, Image as ImageIcon, Trash2, Edit2, UploadCloud } from 'lucide-react';
import { availableIcons, getLinkIcon, iconRegistry } from '../../lib/icons';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import clsx from 'clsx';

interface ThumbnailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentType?: 'image' | 'icon' | 'none';
  currentImageUrl?: string;
  currentIconName?: string;
  onSave: (updates: { thumbnailType: 'image' | 'icon' | 'none'; icon?: string; iconName?: string }) => void;
}

export const ThumbnailModal: React.FC<ThumbnailModalProps> = ({
  isOpen,
  onClose,
  currentType = 'none',
  currentImageUrl = '',
  currentIconName = 'link',
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'icon' | 'none'>(currentType);
  const [viewMode, setViewMode] = useState<'main' | 'iconGrid'>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const storageRef = ref(storage, `thumbnails/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      onSave({
        thumbnailType: 'image',
        icon: url,
        iconName: '',
      });
      setActiveTab('image');
    } catch (err) {
      console.error("Failed to upload image:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectIcon = (iconId: string) => {
    onSave({
      thumbnailType: 'icon',
      iconName: iconId,
    });
    setActiveTab('icon');
    setViewMode('main');
    onClose();
  };

  const filteredIcons = availableIcons.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const SelectedIcon = getLinkIcon(currentIconName);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 shrink-0 relative">
          {viewMode === 'iconGrid' ? (
            <button
              onClick={() => setViewMode('main')}
              className="absolute left-0 top-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : null}

          <div className="mx-auto text-center">
            <h3 className="text-base font-bold text-gray-900">
              {viewMode === 'iconGrid' ? 'Add Thumbnail' : 'Thumbnail'}
            </h3>
            {viewMode === 'iconGrid' && (
              <p className="text-xs text-purple-600 font-medium">Icons by Tabler Icons</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="absolute right-0 top-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode: Main Thumbnail Configuration */}
        {viewMode === 'main' && (
          <div className="space-y-6">
            {/* Segmented Control Tab Bar: Image | Icon | None */}
            <div className="bg-[#F7F7F5] p-1.5 rounded-2xl flex gap-1 border border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('image');
                }}
                className={clsx(
                  "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer",
                  activeTab === 'image' ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                )}
              >
                Image
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('icon');
                  if (currentType !== 'icon' || !currentIconName) {
                    setViewMode('iconGrid');
                  }
                }}
                className={clsx(
                  "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer",
                  activeTab === 'icon' ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                )}
              >
                Icon
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('none');
                  onSave({ thumbnailType: 'none' });
                  onClose();
                }}
                className={clsx(
                  "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer",
                  activeTab === 'none' ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                )}
              >
                None
              </button>
            </div>

            {/* TAB CONTENT: Image */}
            {activeTab === 'image' && (
              <div className="pt-2">
                {currentImageUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden border border-gray-200 shadow-sm shrink-0">
                      <img src={currentImageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 cursor-pointer transition shadow-xs">
                        <Edit2 className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          onSave({ thumbnailType: 'none', icon: '' });
                          setActiveTab('none');
                        }}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 flex items-center justify-center transition shadow-xs cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-300 hover:border-gray-400 bg-[#F7F7F5] flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                    <UploadCloud className="w-8 h-8 text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">
                      {uploading ? 'Uploading image...' : 'Upload an image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            )}

            {/* TAB CONTENT: Icon */}
            {activeTab === 'icon' && (
              <div className="pt-2">
                {currentType === 'icon' && currentIconName ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#F7F7F5] border border-gray-200 flex items-center justify-center shadow-xs shrink-0">
                      <SelectedIcon className="w-8 h-8 text-gray-900" />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setViewMode('iconGrid')}
                        className="px-4 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-900 transition cursor-pointer flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" /> Change Icon
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSave({ thumbnailType: 'none', iconName: '' });
                          setActiveTab('none');
                        }}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 flex items-center justify-center transition shadow-xs cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setViewMode('iconGrid')}
                    className="w-full h-32 rounded-2xl border-2 border-black bg-white hover:bg-gray-50 flex flex-col items-center justify-center gap-3 transition cursor-pointer shadow-xs"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200">
                      <ImageIcon className="w-6 h-6 text-gray-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Select an icon</span>
                  </button>
                )}
              </div>
            )}

          </div>
        )}

        {/* View Mode: Icon Grid Selector (Matching Image 3) */}
        {viewMode === 'iconGrid' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search icons"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#F7F7F5] border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Icon Grid (Matching Image 3) */}
            <div className="overflow-y-auto flex-1 pr-1 bg-[#F7F7F5] p-3 rounded-2xl border border-gray-200 space-y-4">
              {searchQuery ? (
                /* Search Results */
                <div className="grid grid-cols-4 gap-3">
                  {filteredIcons.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = currentIconName === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectIcon(item.id)}
                        className={clsx(
                          "aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all cursor-pointer",
                          isSelected
                            ? "bg-black text-white shadow-md ring-2 ring-black"
                            : "bg-white text-gray-700 hover:bg-gray-100 hover:text-black border border-gray-100 shadow-xs"
                        )}
                      >
                        <IconComp className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold truncate max-w-full text-center opacity-90">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Categorized View */
                <>
                  {/* Category 1: SNS & Platforms */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-2 px-1 flex items-center gap-1">
                      <span>🇰🇷</span> 주요 SNS & 플랫폼
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {filteredIcons.filter(i => i.category === 'sns').map((item) => {
                        const IconComp = item.icon;
                        const isSelected = currentIconName === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectIcon(item.id)}
                            className={clsx(
                              "aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all cursor-pointer",
                              isSelected
                                ? "bg-black text-white shadow-md ring-2 ring-black"
                                : "bg-white text-gray-700 hover:bg-gray-100 hover:text-black border border-gray-100 shadow-xs"
                            )}
                          >
                            <IconComp className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold truncate max-w-full text-center opacity-90">
                              {item.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category 2: General Icons */}
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 mb-2 px-1 pt-2 flex items-center gap-1">
                      <span>🌐</span> 일반 아이콘
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {filteredIcons.filter(i => i.category !== 'sns').map((item) => {
                        const IconComp = item.icon;
                        const isSelected = currentIconName === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectIcon(item.id)}
                            className={clsx(
                              "aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all cursor-pointer",
                              isSelected
                                ? "bg-black text-white shadow-md ring-2 ring-black"
                                : "bg-white text-gray-700 hover:bg-gray-100 hover:text-black border border-gray-100 shadow-xs"
                            )}
                          >
                            <IconComp className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold truncate max-w-full text-center opacity-90">
                              {item.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {filteredIcons.length === 0 && (
                <div className="text-center py-8 text-xs font-semibold text-gray-400">
                  No icons found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
