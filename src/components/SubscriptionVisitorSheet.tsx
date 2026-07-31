import React, { useState } from 'react';
import { Bell, CheckCircle2, X } from 'lucide-react';
import type { CustomLink, CustomerInfoConfig, UserProfile } from '../store/useStore';
import { submitCustomerData } from '../services/customerDataService';

interface SubscriptionVisitorSheetProps {
  block: CustomLink;
  config: CustomerInfoConfig;
  profile: UserProfile;
  ownerUid?: string;
  contained?: boolean;
  onClose: () => void;
}

export const SubscriptionVisitorSheet: React.FC<SubscriptionVisitorSheetProps> = ({
  block,
  config,
  profile,
  ownerUid,
  contained = false,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const creatorName = profile.name || profile.username || '크리에이터';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !consented || submitting) return;

    try {
      setSubmitting(true);
      if (ownerUid) {
        await submitCustomerData(ownerUid, {
          blockId: block.id,
          email: email.trim(),
          createdAt: new Date().toISOString(),
        });
      }
      setSubmitted(true);
    } catch (error) {
      console.error('Unable to subscribe:', error);
      alert('구독 신청을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`${contained ? 'absolute' : 'fixed'} inset-0 z-[300] flex items-center justify-center overflow-hidden overscroll-none bg-black/55 p-4 backdrop-blur-[2px]`}
      onClick={onClose}
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-title"
        className="relative max-h-[90%] w-full max-w-[390px] overflow-y-auto rounded-[2rem] bg-white px-6 pb-7 pt-8 text-gray-950 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-gray-600 transition hover:scale-105 hover:bg-gray-100 hover:text-black"
          aria-label="구독 창 닫기"
        >
          <X className="h-6 w-6" />
        </button>

        {submitted ? (
          <div className="flex min-h-72 flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-600" />
            <h2 id="subscription-title" className="text-xl font-black">구독이 완료되었습니다</h2>
            <p className="mt-2 text-sm font-medium text-gray-500">{creatorName}님의 새로운 소식을 이메일로 보내드릴게요.</p>
            <button type="button" onClick={onClose} className="mt-7 w-full cursor-pointer rounded-2xl bg-gray-950 py-4 text-base font-extrabold text-white transition hover:bg-black">확인</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pt-6 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] bg-gray-100 shadow-sm">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={`${creatorName} 프로필`} className="h-full w-full object-cover" />
              ) : (
                <Bell className="h-10 w-10 text-gray-500" />
              )}
            </div>
            <h2 id="subscription-title" className="mt-5 text-2xl font-black tracking-tight">{creatorName} 구독하기</h2>
            <p className="mt-2 text-sm font-semibold text-gray-600">{config.detailText || '중요한 소식을 빠르게 만나보세요!'}</p>

            <label className="mt-8 block text-left">
              <span className="sr-only">이메일</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="이메일을 입력해주세요"
                className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-[16px] font-semibold text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10"
                required
              />
            </label>

            <button
              type="submit"
              disabled={!email.trim() || !consented || submitting}
              className="mt-4 w-full cursor-pointer rounded-2xl py-4 text-base font-black text-white transition enabled:hover:brightness-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              style={email.trim() && consented ? { backgroundColor: config.submitButtonColor || '#111827', color: config.submitButtonTextColor || '#FFFFFF' } : undefined}
            >
              {submitting ? '구독 중...' : '구독'}
            </button>

            <label className="mt-5 flex cursor-pointer items-start gap-3 text-left text-xs font-semibold leading-relaxed text-gray-600">
              <input
                type="checkbox"
                checked={consented}
                onChange={(event) => setConsented(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 accent-gray-950"
              />
              <span><strong className="text-gray-950">[필수]</strong> 개인정보 수집·이용 및 광고성 정보 수신에 동의합니다.</span>
            </label>
          </form>
        )}
      </section>
    </div>
  );
};
