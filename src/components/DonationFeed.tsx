import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import {
  subscribeToPublicDonations,
  type DonationRecord,
} from '../services/commerceService';

interface DonationFeedProps {
  ownerUid?: string;
  blockId: string;
  style?: React.CSSProperties;
}

export const DonationFeed: React.FC<DonationFeedProps> = ({ ownerUid, blockId, style }) => {
  const [donations, setDonations] = useState<DonationRecord[]>([]);

  useEffect(() => {
    if (!ownerUid) {
      setDonations([]);
      return;
    }
    return subscribeToPublicDonations(ownerUid, blockId, setDonations, (error) => {
      console.warn('Unable to load donation feed:', error);
    });
  }, [blockId, ownerUid]);

  if (donations.length === 0) return null;

  return (
    <div className="mt-3 w-full space-y-1 rounded-3xl p-3 shadow-sm" style={style}>
      {donations.slice(0, 10).map((donation) => (
        <article key={donation.id} className="flex items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-black/5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/10 font-black">
            {donation.nickname.slice(0, 1) || <Heart className="h-4 w-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3">
              <strong className="truncate text-xs font-black">{donation.nickname}</strong>
              <strong className="shrink-0 text-xs font-black">{donation.amount.toLocaleString()}원</strong>
            </span>
            {donation.message && <span className="mt-1 block whitespace-pre-wrap break-words text-[11px] font-medium opacity-70">{donation.message}</span>}
          </span>
        </article>
      ))}
    </div>
  );
};
