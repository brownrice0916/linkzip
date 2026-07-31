import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, FileText, Trash2, X } from 'lucide-react';
import type { NoticeConfig } from '../../store/useStore';

const MAX_NOTICES = 3;

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotices?: NoticeConfig[];
  initialNotice?: NoticeConfig;
  initialEditingId?: string | null;
  initialEditingIndex?: number;
  createOnOpen?: boolean;
  onSave: (notices: NoticeConfig[]) => void;
}

const createNotice = (): NoticeConfig => ({
  id: `notice-${Date.now()}`,
  title: '',
  content: '',
  date: new Date().toLocaleDateString('ko-KR'),
  isPinned: false,
});

const ensureNoticeId = (notice: NoticeConfig, index: number): NoticeConfig => ({
  ...notice,
  id: notice.id || `notice-legacy-${index}`,
});

export const NoticeModal: React.FC<NoticeModalProps> = ({
  isOpen,
  onClose,
  initialNotices,
  initialNotice,
  initialEditingId,
  initialEditingIndex,
  createOnOpen = false,
  onSave,
}) => {
  const preparedState = useMemo(() => {
    const source = initialNotices?.length
      ? initialNotices
      : initialNotice
        ? [initialNotice]
        : [];
    const prepared = source.slice(0, MAX_NOTICES).map(ensureNoticeId);

    const indexedTarget = typeof initialEditingIndex === 'number'
      ? prepared[initialEditingIndex]
      : undefined;
    const idTarget = prepared.find((notice) => notice.id === initialEditingId);
    const target = createOnOpen ? createNotice() : (indexedTarget || idTarget || prepared[0] || createNotice());
    const targetIndex = createOnOpen
      ? -1
      : prepared.findIndex((notice) => notice.id === target.id);

    return { notices: prepared, draft: target, targetIndex };
  }, [initialNotices, initialNotice, initialEditingId, initialEditingIndex, createOnOpen]);

  const [draft, setDraft] = useState<NoticeConfig>(preparedState.draft);

  const updateEditingNotice = (updates: Partial<NoticeConfig>) => {
    setDraft((current) => ({ ...current, ...updates }));
  };

  const handleRemove = () => {
    if (preparedState.targetIndex < 0) return;
    const next = preparedState.notices.filter((_, index) => index !== preparedState.targetIndex);
    onSave(next);
    onClose();
  };

  const handleSave = () => {
    const normalized = {
      ...draft,
      title: draft.title.replace(/^[\s]*(?:📢|📣|📯)[\s]*/u, '').trim(),
      content: draft.content.trim(),
      date: draft.date || new Date().toLocaleDateString('ko-KR'),
    };

    if (!normalized.title || !normalized.content) {
      alert('공지 제목과 내용을 입력해주세요.');
      return;
    }

    if (createOnOpen && preparedState.notices.length >= MAX_NOTICES) {
      alert('공지는 최대 3개까지 등록할 수 있어요.');
      return;
    }

    const next = [...preparedState.notices];
    if (preparedState.targetIndex >= 0) next[preparedState.targetIndex] = normalized;
    else next.push(normalized);
    onSave(next);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="notice-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 font-sans sm:items-center sm:p-4">
      <div className="notice-modal-panel flex max-h-[86dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] border border-gray-200 bg-[#FCFBF7] shadow-2xl sm:max-h-[92dvh] sm:rounded-[28px]">
        <div className="notice-modal-header flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-7 sm:py-4">
          <div>
            <h2 className="text-[17px] font-black text-gray-950 sm:text-lg">{createOnOpen ? '공지 추가' : '공지 수정'}</h2>
            <p className="mt-1 text-xs font-semibold text-gray-500">공지는 최대 3개까지 등록할 수 있어요.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="cursor-pointer rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="notice-modal-body min-h-0 flex-1 overflow-y-auto p-3 sm:p-7">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:rounded-3xl sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3 sm:mb-5">
                <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                  <FileText className="h-4 w-4" /> 공지 내용
                </div>
                {!createOnOpen && preparedState.targetIndex >= 0 && (
                  <button type="button" onClick={handleRemove} className="flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-gray-500 transition hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" /> 삭제
                  </button>
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <label className="block space-y-2">
                  <span className="text-xs font-black text-gray-700">제목</span>
                  <input
                    type="text"
                    value={draft.title}
                    maxLength={50}
                    onChange={(event) => updateEditingNotice({ title: event.target.value })}
                    placeholder="예: 8월 운영 일정 안내"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-3 text-base font-bold text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-black sm:rounded-2xl sm:px-4 sm:py-3.5"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-black text-gray-700">내용</span>
                  <textarea
                    value={draft.content}
                    maxLength={1000}
                    onChange={(event) => updateEditingNotice({ content: event.target.value })}
                    placeholder="방문자에게 알릴 내용을 입력하세요."
                    rows={5}
                    className="min-h-[132px] w-full resize-none rounded-xl border border-gray-300 px-3.5 py-3 text-base font-medium leading-relaxed text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-black sm:min-h-[180px] sm:rounded-2xl sm:px-4 sm:py-3.5"
                  />
                  <span className="block text-right text-[11px] font-semibold text-gray-400">{draft.content.length}/1000</span>
                </label>
              </div>
          </div>
        </div>

        <div className="notice-modal-footer grid grid-cols-[auto_1fr] gap-2.5 border-t border-gray-200 bg-white p-3 sm:gap-3 sm:px-7 sm:py-4">
          <button type="button" onClick={onClose} className="flex cursor-pointer items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-black text-gray-700 hover:bg-gray-50 sm:rounded-2xl sm:px-5 sm:py-3.5">
            <ChevronLeft className="mr-1 h-4 w-4" /> 취소
          </button>
          <button type="button" onClick={handleSave} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 sm:rounded-2xl sm:py-3.5">
            <Check className="h-4 w-4" /> 공지 저장
          </button>
        </div>
      </div>
    </div>
  );
};
