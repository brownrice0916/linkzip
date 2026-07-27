import { LockKeyhole } from 'lucide-react';

interface PrivateBetaBadgeProps {
  language?: 'ko' | 'en';
  dark?: boolean;
  compact?: boolean;
}

const PrivateBetaBadge = ({
  language = 'ko',
  dark = false,
  compact = false,
}: PrivateBetaBadgeProps) => (
  <span
    className={[
      'inline-flex shrink-0 items-center rounded-full border font-black tracking-tight',
      compact ? 'gap-1 px-2 py-1 text-[10px]' : 'gap-1.5 px-2.5 py-1.5 text-xs',
      dark
        ? 'border-violet-300/25 bg-violet-400/15 text-violet-200'
        : 'border-violet-200 bg-violet-50 text-violet-700',
    ].join(' ')}
    aria-label={language === 'ko' ? '현재 비공개 베타 운영 중' : 'Currently in private beta'}
  >
    <LockKeyhole className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
    {language === 'ko' ? '비공개 베타' : 'Private Beta'}
  </span>
);

export default PrivateBetaBadge;
