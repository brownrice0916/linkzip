import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ReservationScheduleItem } from '../../store/useStore';

interface AddReservationScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: Omit<ReservationScheduleItem, 'id'>) => void;
  initialData?: ReservationScheduleItem | null;
}

export const AddReservationScheduleModal: React.FC<AddReservationScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [startDate, setStartDate] = useState(initialData?.startDate || '2026-07-26');
  const [startHour, setStartHour] = useState(initialData?.startHour || '12');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [endHour, setEndHour] = useState(initialData?.endHour || '');
  const [linkUrl, setLinkUrl] = useState(initialData?.linkUrl || '');

  // Format date helper: 2026.07.26 Sunday format display
  const formatDateDisplay = (dateStr: string) => {
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      return `${year}.${month}.${day} ${dayOfWeek}`;
    } catch {
      return dateStr;
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('일정명을 입력해주세요.');
      return;
    }

    onSave({
      title: title.trim(),
      startDate: startDate,
      startHour: startHour,
      endDate: endDate,
      endHour: endHour,
      linkUrl: linkUrl.trim(),
      status: 'OPEN'
    });
    onClose();
  };

  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 my-auto p-6 sm:p-8 space-y-6">
        
        {/* Header (Matching User Screenshot) */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">일정 추가</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="space-y-5">
          {/* 일정명 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              일정명<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정에 대한 설명을 적어주세요"
              className="w-full p-3.5 border border-gray-300 rounded-2xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black focus:outline-hidden placeholder-gray-400 bg-white"
            />
          </div>

          {/* 시작 날짜 & 시작 시간 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              시작 날짜<span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3.5 border border-gray-300 rounded-2xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black focus:outline-hidden bg-white cursor-pointer"
                />
              </div>
              <select
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="p-3.5 border border-gray-300 rounded-2xl text-xs font-extrabold text-gray-900 focus:ring-2 focus:ring-black bg-white cursor-pointer"
              >
                {hoursList.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            <div className="text-[10px] text-gray-400 font-medium pl-1">
              선택된 날짜: {formatDateDisplay(startDate)}
            </div>
          </div>

          {/* 종료 날짜 & 종료 시간 (선택 사항) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700">
                종료 날짜 <span className="text-gray-400 font-normal">(선택)</span>
              </label>
              {endDate && (
                <button
                  type="button"
                  onClick={() => {
                    setEndDate('');
                    setEndHour('');
                  }}
                  className="text-[10px] font-bold text-gray-400 hover:text-red-500 underline cursor-pointer"
                >
                  종료 날짜 삭제
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3.5 border border-gray-300 rounded-2xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black focus:outline-hidden bg-white cursor-pointer"
                />
              </div>
              <select
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
                className="p-3.5 border border-gray-300 rounded-2xl text-xs font-extrabold text-gray-900 focus:ring-2 focus:ring-black bg-white cursor-pointer"
              >
                <option value="">시 선택</option>
                {hoursList.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
            {endDate && (
              <div className="text-[10px] text-gray-400 font-medium pl-1">
                선택된 날짜: {formatDateDisplay(endDate)}
              </div>
            )}
          </div>

          {/* 연결 링크 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              연결 링크
            </label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
              className="w-full p-3.5 border border-gray-300 rounded-2xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-black focus:outline-hidden placeholder-gray-400 bg-white"
            />
          </div>
        </div>

        {/* Submit Button (Matching User Screenshot Gray/Black Button) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-4 bg-[#8E95A2] hover:bg-[#727986] text-white font-extrabold text-sm rounded-2xl transition cursor-pointer shadow-md hover:scale-[1.01] active:scale-95"
          >
            저장하기
          </button>
        </div>

      </div>
    </div>
  );
};
