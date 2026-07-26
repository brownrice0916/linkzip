import React, { useState } from 'react';
import { CheckCircle2, MessageCircle, Send, X } from 'lucide-react';
import type { CustomLink } from '../store/useStore';
import { sendAnonymousMessage } from '../services/anonymousMessageService';

interface AnonymousMessageVisitorModalProps {
  block: CustomLink;
  ownerUid?: string;
  targetUsername: string;
  onClose: () => void;
}

export const AnonymousMessageVisitorModal: React.FC<AnonymousMessageVisitorModalProps> = ({
  block,
  ownerUid,
  targetUsername,
  onClose,
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = content.trim();
    if (!message || submitting) return;
    if (!ownerUid) {
      setError('공개 프로필에서 메시지를 보낼 수 있습니다.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await sendAnonymousMessage(ownerUid, block.id, targetUsername, message);
      setSubmitted(true);
    } catch (submitError) {
      console.error('Unable to send anonymous message:', submitError);
      setError('메시지를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="anonymous-message-title" className="w-full max-w-sm rounded-3xl bg-white p-6 text-gray-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><MessageCircle className="h-5 w-5" /></span>
            <div><h2 id="anonymous-message-title" className="text-base font-black">{block.title || '익명 메시지 보내기'}</h2><p className="mt-0.5 text-[11px] font-semibold text-gray-400">이름이나 계정 정보는 전달되지 않습니다.</p></div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-black" aria-label="닫기"><X className="h-4 w-4" /></button>
        </div>

        {submitted ? (
          <div className="space-y-3 py-7 text-center"><CheckCircle2 className="mx-auto h-11 w-11 text-emerald-500" /><h3 className="text-base font-black">익명 메시지를 보냈어요</h3><p className="text-xs font-semibold text-gray-400">소중한 메시지가 안전하게 전달되었습니다.</p><button type="button" onClick={onClose} className="mt-3 w-full cursor-pointer rounded-2xl bg-gray-950 py-3 text-xs font-black text-white transition hover:bg-black">확인</button></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea value={content} onChange={(event) => setContent(event.target.value.slice(0, 1000))} rows={6} placeholder="익명으로 전할 메시지를 적어주세요." className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold leading-relaxed outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" autoFocus />
            <div className="flex items-center justify-between px-1 text-[10px] font-bold text-gray-400"><span>개인정보를 입력하지 마세요.</span><span>{content.length}/1000</span></div>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600">{error}</p>}
            <button type="submit" disabled={!content.trim() || submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:bg-gray-200 enabled:cursor-pointer enabled:bg-violet-600 enabled:hover:bg-violet-700"><Send className="h-4 w-4" />{submitting ? '보내는 중...' : '익명으로 보내기'}</button>
          </form>
        )}
      </div>
    </div>
  );
};
