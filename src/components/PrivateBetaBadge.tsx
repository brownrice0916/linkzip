import { useState } from 'react';
import { LockKeyhole, X } from 'lucide-react';

interface PrivateBetaBadgeProps {
  language?: 'ko' | 'en';
  dark?: boolean;
  compact?: boolean;
}

const PrivateBetaBadge = ({
  language = 'ko',
  dark = false,
  compact = false,
}: PrivateBetaBadgeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isKo = language === 'ko';

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        className={[
          'inline-flex cursor-pointer items-center rounded-full border font-black tracking-tight transition hover:-translate-y-0.5',
          compact ? 'gap-1 px-2 py-1 text-[10px]' : 'gap-1.5 px-2.5 py-1.5 text-xs',
          dark
            ? 'border-[#ffcf4a]/40 bg-[#ffcf4a]/15 text-[#ffcf4a]'
            : 'border-[#171714] bg-[#ffcf4a] text-[#171714]',
        ].join(' ')}
        aria-label={isKo ? '비공개 베타 안내 보기' : 'View private beta information'}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
      >
        <LockKeyhole className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
        {isKo ? '비공개 베타' : 'Private Beta'}
      </button>

      {isOpen && (
        <span
          role="dialog"
          aria-label={isKo ? '비공개 베타 안내' : 'Private beta information'}
          className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border-2 border-[#171714] bg-[#fffdf8] p-4 text-left text-[#171714] shadow-[5px_5px_0_#171714]"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-2.5 top-2.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[#6d6558] transition hover:bg-[#f1ede4] hover:text-[#171714]"
            aria-label={isKo ? '안내 닫기' : 'Close information'}
          >
            <X className="h-4 w-4" />
          </button>
          <strong className="block pr-8 text-sm font-black">
            {isKo ? '아직 정식 출시 전이에요' : 'Not publicly released yet'}
          </strong>
          <span className="mt-2 block text-xs font-semibold leading-5 text-[#6d6558]">
            {isKo
              ? 'LinkZip은 현재 비공개 베타로 운영 중이며, 초대코드를 받은 분만 가입하고 이용할 수 있어요.'
              : 'LinkZip is currently in private beta. Only invited users with an invite code can sign up and use the service.'}
          </span>
        </span>
      )}
    </span>
  );
};

export default PrivateBetaBadge;
