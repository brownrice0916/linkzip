import React, { useState } from 'react';
import { X, CreditCard, Check, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { DonationConfig } from '../store/useStore';

interface DonationVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationConfig?: DonationConfig;
  creatorName: string;
}

export const DonationVisitorModal: React.FC<DonationVisitorModalProps> = ({
  isOpen,
  onClose,
  donationConfig,
  creatorName
}) => {
  const minAmount = donationConfig?.minAmount || 1000;
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState<number>(minAmount);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'app_card' | 'direct_card' | 'naver' | 'kakao' | 'toss'>('toss');
  const [isConsentChecked, setIsConsentChecked] = useState(true);

  const [paying, setPaying] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  const mainText = donationConfig?.mainText || '후원하기 (Donation)';
  const detailText = donationConfig?.detailText || "If you'd like to make an additional donation, please adjust the amount!";

  const handleDirectInicisPayment = () => {
    if (amount < minAmount) {
      alert(`최소 후원 금액은 ${minAmount.toLocaleString()}원입니다.`);
      return;
    }

    setPaying(true);

    const win = window as any;
    const IMP = win.IMP;

    if (IMP) {
      IMP.init("imp19424728"); // KG Inicis Standard Merchant ID

      IMP.request_pay({
        pg: 'html5_inicis',
        pay_method: 'card',
        merchant_uid: `don_${Date.now()}`,
        name: `${creatorName} 님 후원금`,
        amount: amount,
        buyer_email: 'donor@linkzip.kr',
        buyer_name: '후원자'
      }, (rsp: any) => {
        setPaying(false);
        if (rsp && rsp.success) {
          setPaidSuccess(true);
          setTimeout(() => {
            setPaidSuccess(false);
            onClose();
          }, 3000);
        } else {
          const failReason = rsp?.error_msg || '결제 창이 닫혔거나 결제가 취소되었습니다.';
          alert(`❌ 이니시스 결제 미완료: ${failReason}`);
        }
      });
    } else {
      setPaying(false);
      alert('⚠️ KG 이니시스 결제 모듈(SDK)을 로드하지 못했습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
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

        {paidSuccess ? (
          <div className="py-12 text-center space-y-4 animate-in zoom-in-50">
            <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-gray-900">후원이 성공적으로 완료되었습니다! 💖</h3>
              <p className="text-xs text-gray-500">{creatorName} 님에게 따뜻한 마음이 전달되었습니다.</p>
            </div>
          </div>
        ) : (
          /* Donation Amount & Optional Message */
          <div className="space-y-6 text-center pt-2">
            <div className="space-y-2">
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
            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Leave a message (optional)"
                rows={2}
                className="w-full p-3.5 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black resize-none"
              />
            </div>

            {/* Direct KG Inicis Payment Trigger Button */}
            <button
              onClick={handleDirectInicisPayment}
              disabled={paying}
              className="w-full py-4 bg-[#333333] hover:bg-black text-white rounded-2xl font-bold text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {paying ? "KG 이니시스 결제창 호출 중..." : `Donate (${amount.toLocaleString()}원 이니시스 결제)`}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
