import React, { useState } from 'react';
import { HandHeart, LoaderCircle, X } from 'lucide-react';
import clsx from 'clsx';
import type { DonationConfig } from '../store/useStore';
import { createDonationPaymentOrder } from '../services/commerceService';
import { requestTossPayment } from '../services/tossPaymentService';

interface DonationVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationConfig?: DonationConfig;
  creatorName: string;
  ownerUid?: string;
  blockId: string;
  targetUsername: string;
}

export const DonationVisitorModal: React.FC<DonationVisitorModalProps> = ({
  isOpen,
  onClose,
  donationConfig,
  ownerUid,
  blockId,
  targetUsername,
}) => {
  const minAmount = donationConfig?.minAmount || 1000;
  const [amount, setAmount] = useState<number>(minAmount);
  const [message, setMessage] = useState('');
  const [nickname, setNickname] = useState('');
  const [paying, setPaying] = useState(false);

  const mainText = donationConfig?.mainText || '도네이션';
  const detailText = donationConfig?.detailText || '후원 금액과 응원글을 입력해주세요.';

  const handleTossPayment = async () => {
    if (amount < minAmount) {
      alert(`최소 후원 금액은 ${minAmount.toLocaleString()}원입니다.`);
      return;
    }
    if (!ownerUid) {
      alert('후원받을 프로필 정보를 확인하지 못했습니다.');
      return;
    }

    setPaying(true);
    try {
      const donorName = nickname.trim() || '익명 후원자';
      const order = await createDonationPaymentOrder(ownerUid, {
        blockId,
        targetUsername,
        nickname: donorName,
        message: message.trim(),
        amount,
      });
      await requestTossPayment({
        orderId: order.orderNumber,
        orderName: order.orderName,
        amount: order.amount,
        customerName: donorName,
        targetUsername,
        paymentKind: 'donation',
      });
    } catch (error) {
      console.error('Failed to start Toss donation payment:', error);
      alert(error instanceof Error ? error.message : '토스페이먼츠 결제를 시작하지 못했습니다.');
    } finally {
      setPaying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto select-none">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 my-auto p-6 sm:p-8 space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-1 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6 text-center pt-2">
            <div className="space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-800">
                <HandHeart className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{mainText}</h2>
              <p className="text-xs font-semibold text-gray-400 max-w-xs mx-auto leading-relaxed">
                {detailText}
              </p>
            </div>

            {/* Editable Amount Input / Pill */}
            <div className="py-2">
              <div className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-full shadow-xs bg-white text-center focus-within:ring-2 focus-within:ring-black">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={minAmount}
                  step={1000}
                  className="w-28 text-center text-lg font-bold text-gray-900 border-none p-0 focus:ring-0"
                />
                <span className="text-sm font-bold text-gray-700">KRW</span>
              </div>
            </div>

            {/* Quick Amount Preset Chips */}
            <div className="flex justify-center gap-2">
              {[1000, 3000, 5000, 10000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className={clsx(
                    "px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer border",
                    amount === amt ? "bg-black text-white border-black" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  +{amt.toLocaleString()}원
                </button>
              ))}
            </div>

            {/* Leave a message (optional) */}
            <div className="space-y-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="후원자 닉네임 (미입력 시 익명 후원자)"
                maxLength={50}
                className="w-full rounded-2xl border border-gray-200 p-3.5 text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="응원글을 남겨주세요 (선택)"
                maxLength={300}
                rows={2}
                className="w-full p-3.5 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black resize-none"
              />
            </div>

            {/* Toss Payments Trigger Button */}
            <button
              onClick={handleTossPayment}
              disabled={paying}
              className="w-full py-4 bg-[#333333] hover:bg-black disabled:cursor-wait disabled:opacity-60 text-white rounded-2xl font-bold text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {paying && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {paying ? '토스페이먼츠 연결 중...' : `${amount.toLocaleString()}원 후원하기`}
            </button>
          </div>

      </div>
    </div>
  );
};
