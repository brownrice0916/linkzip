import React, { useState, useEffect } from 'react';
import { X, Trash2, Search, Link2 } from 'lucide-react';
import { availableIcons, getLinkIcon } from '../../lib/icons';
import type { SocialLink } from '../../store/useStore';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';

interface SocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLink: SocialLink | null;
  onSave: (link: SocialLink) => void;
  onDelete?: (id: string) => void;
}

export const SocialModal: React.FC<SocialModalProps> = ({
  isOpen,
  onClose,
  editingLink,
  onSave,
  onDelete,
}) => {
  const language = useStore((state) => state.language);
  const tr = (ko: string, en: string) => language === 'ko' ? ko : en;
  const [selectedPlatform, setSelectedPlatform] = useState<string>('instagram');
  const [url, setUrl] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (editingLink) {
      setSelectedPlatform(editingLink.platform || 'instagram');
      setUrl(editingLink.url || '');
    } else {
      setSelectedPlatform('instagram');
      setUrl('');
    }
  }, [editingLink, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    onSave({
      id: editingLink ? editingLink.id : Date.now().toString(),
      platform: selectedPlatform,
      url: url.trim(),
    });
    onClose();
  };

  const handleDelete = () => {
    if (editingLink && onDelete) {
      onDelete(editingLink.id);
      onClose();
    }
  };

  const snsPlatforms = availableIcons.filter(i => i.category === 'sns');

  const filteredPlatforms = snsPlatforms.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || item.tags?.some(t => t.toLowerCase().includes(q));
  });

  const SelectedIconComp = getLinkIcon(selectedPlatform);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col p-6 shadow-2xl relative animate-in fade-in zoom-in-95 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 shrink-0 relative">
          <div className="mx-auto text-center">
            <h3 className="text-base font-bold text-gray-900">
              {editingLink ? tr('소셜 아이콘 수정', 'Edit social icon') : tr('소셜 아이콘 추가', 'Add social icon')}
            </h3>
            <p className="text-xs text-gray-400 font-medium">{tr('프로필 제목 아래에 소셜 아이콘을 표시합니다.', 'Display social icons below your profile title.')}</p>
          </div>

          <button
            onClick={onClose}
            className="absolute right-0 top-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 space-y-5">
          
          {/* 1. Platform Selector Grid */}
          <div className="space-y-2 flex-1 flex flex-col min-h-0">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{tr('플랫폼 선택', 'Select platform')}</label>
            
            {/* Search Bar */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr('SNS 검색 (인스타그램, 네이버 블로그, 유튜브...)', 'Search social platforms...')}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-gray-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Grid Scroll */}
            <div className="overflow-y-auto flex-1 pr-1 bg-[#F7F7F5] p-3 rounded-2xl border border-gray-200 max-h-[220px]">
              <div className="grid grid-cols-4 gap-2.5">
                {filteredPlatforms.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = selectedPlatform === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPlatform(item.id)}
                      className={clsx(
                        "aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all cursor-pointer",
                        isSelected
                          ? "bg-black text-white shadow-md ring-2 ring-black"
                          : "bg-white text-gray-700 hover:bg-gray-100 hover:text-black border border-gray-100 shadow-2xs"
                      )}
                    >
                      <div className="w-6 h-6 flex items-center justify-center shrink-0 mb-1">
                        <IconComp className="w-5 h-5 object-contain" />
                      </div>
                      <span className="text-[10px] font-bold truncate max-w-full text-center opacity-90">
                        {item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. URL Input */}
          <div className="space-y-2 shrink-0">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
              <span>{tr('URL / 링크', 'URL / Link')}</span>
              <span className="text-[10px] font-normal text-gray-400">{tr('예: https://...', 'e.g. https://...')}</span>
            </label>
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gray-100 absolute left-2 top-1.5 flex items-center justify-center">
                <SelectedIconComp className="w-4 h-4 text-gray-800" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={tr(`${selectedPlatform} 주소를 입력하세요`, `Enter your ${selectedPlatform} URL`)}
                className="w-full pl-12 pr-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white transition"
                required
              />
            </div>
          </div>

          {/* 3. Footer Action Buttons */}
          <div className="flex items-center justify-between pt-2 shrink-0">
            {editingLink ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 text-sm font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> {tr('삭제', 'Delete')}
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-bold text-gray-800 transition cursor-pointer"
              >
                {tr('취소', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-bold shadow-md shadow-purple-500/20 transition cursor-pointer"
              >
                {editingLink ? tr('수정', 'Update') : tr('아이콘 추가', 'Add icon')}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
