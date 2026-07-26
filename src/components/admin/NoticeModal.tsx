import React, { useState } from 'react';
import { X, Megaphone, Check } from 'lucide-react';
import type { NoticeConfig } from '../../store/useStore';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotice?: NoticeConfig;
  onSave: (noticeData: NoticeConfig) => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({
  isOpen,
  onClose,
  initialNotice,
  onSave
}) => {
  const [title, setTitle] = useState(initialNotice?.title || '공지사항');
  const [content, setContent] = useState(
    initialNotice?.content || '팬미팅 일정 및 최신 공지사항 내용입니다.'
  );

  const handleSave = () => {
    if (!title.trim()) {
      alert('공지사항 제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      alert('공지사항 본문 내용을 입력해주세요.');
      return;
    }

    onSave({
      title,
      content,
      date: new Date().toLocaleDateString('ko-KR'),
      isPinned: true
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 my-auto p-6 sm:p-8 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">공지사항 작성 / 수정</h2>
              <p className="text-xs text-gray-500">방문자들이 읽을 공지사항 내용을 작성해보세요.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          
          {/* Title */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">공지사항 제목*</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 📢 8월 팬미팅 일정 및 굿즈 공지"
              className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
            />
          </div>

          {/* Content */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">공지사항 상세 내용*</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지할 상세 내용을 자유롭게 작성하세요..."
              rows={6}
              className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-black resize-none placeholder-gray-400 leading-relaxed"
            />
          </div>

        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>공지사항 저장하기</span>
        </button>

      </div>
    </div>
  );
};
