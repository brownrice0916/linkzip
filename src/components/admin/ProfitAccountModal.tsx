import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useStore, type DonationConfig } from '../../store/useStore';

interface ProfitAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<DonationConfig>;
  onDisconnect?: () => void;
  onSave: (accountData: {
    accountType: 'personal' | 'corporate';
    bankName: string;
    accountOwnerName: string;
    accountNumber: string;
    accountConnected: boolean;
  }) => void;
}

const banks = [
  'KB국민은행',
  '신한은행',
  'NH농협은행',
  '카카오뱅크',
  '토스뱅크',
  '우리은행',
  '하나은행',
  'IBK기업은행',
  '새마을금고',
  '우체국',
  'SC제일은행',
];

export const ProfitAccountModal: React.FC<ProfitAccountModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onDisconnect,
  onSave,
}) => {
  const language = useStore((state) => state.language);
  const tr = (ko: string, en: string) => language === 'ko' ? ko : en;
  const [bankName, setBankName] = useState(initialData?.bankName || '');
  const [accountOwnerName, setAccountOwnerName] = useState(initialData?.accountOwnerName || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');

  if (!isOpen) return null;

  const handleSave = () => {
    const cleanBankName = bankName.trim();
    const cleanHolderName = accountOwnerName.trim();
    const cleanAccount = accountNumber.replace(/\D/g, '');

    if (!cleanHolderName) {
      alert(tr('예금주명을 입력해 주세요.', 'Enter the account holder name.'));
      return;
    }
    if (!cleanBankName) {
      alert(tr('은행명을 입력해 주세요.', 'Enter the bank name.'));
      return;
    }
    if (!cleanAccount) {
      alert(tr('계좌번호를 숫자로 입력해 주세요.', 'Enter a numeric account number.'));
      return;
    }

    if (!window.confirm(tr(
      '계좌 정보가 정확한지 다시 한번 확인해 주세요.\n\n이 정보로 등록할까요?',
      'Please check your account details once more.\n\nRegister this account?',
    ))) return;

    onSave({
      accountType: initialData?.accountType || 'personal',
      bankName: cleanBankName,
      accountOwnerName: cleanHolderName,
      accountNumber: cleanAccount,
      accountConnected: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 font-sans backdrop-blur-xs">
      <div className="relative my-auto w-full max-w-lg space-y-6 overflow-hidden rounded-3xl border border-gray-300 bg-[#EBF0F5] p-6 shadow-2xl animate-in fade-in zoom-in-95 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-900">{tr('정산 계좌 관리', 'Payout account')}</h2>
            <p className="mt-1 text-xs font-semibold text-gray-500">{tr('정산받을 계좌 정보를 직접 입력해 주세요.', 'Enter your payout account details.')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-1.5 text-gray-400 transition hover:bg-gray-200 hover:text-black"
            aria-label={tr('정산 계좌 창 닫기', 'Close payout account dialog')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-white/70 px-4 py-3 text-xs font-bold text-gray-600 ring-1 ring-gray-200">
          {tr('테스트 기간에는 별도의 계좌 인증 없이 저장할 수 있어요.', 'Account verification is temporarily disabled during testing.')}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600">{tr('예금주명', 'Account holder')}*</label>
            <input
              type="text"
              value={accountOwnerName}
              onChange={(event) => setAccountOwnerName(event.target.value)}
              placeholder={tr('예금주명을 입력하세요', 'Enter account holder name')}
              className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-xs font-semibold text-gray-900 placeholder-gray-400 focus:border-black focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600">{tr('은행명', 'Bank name')}*</label>
            <div className="relative">
              <select
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-gray-300 bg-white p-3.5 pr-11 text-xs font-semibold text-gray-900 focus:border-black focus:ring-2 focus:ring-black"
              >
                <option value="" disabled>{tr('은행을 선택하세요', 'Select a bank')}</option>
                {banks.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-600">{tr('계좌번호', 'Account number')}*</label>
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ''))}
              placeholder={tr('숫자만 입력하세요', 'Enter numbers only')}
              className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-xs font-semibold text-gray-900 placeholder-gray-400 focus:border-black focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleSave}
            className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-black py-4 text-sm font-black tracking-wide text-white shadow-md transition hover:bg-gray-800"
          >
            {tr('계좌 정보 저장', 'Save account')}
          </button>
          {initialData?.accountConnected && onDisconnect && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(tr('등록된 계좌를 삭제할까요? 후원·판매 블록의 계좌 정보도 함께 삭제됩니다.', 'Remove this account? Account details will also be removed from donation and sales blocks.'))) return;
                onDisconnect();
                onClose();
              }}
              className="w-full cursor-pointer rounded-xl py-3 text-xs font-extrabold text-red-600 transition hover:bg-red-50 hover:text-red-700"
            >
              {tr('등록 계좌 삭제', 'Remove account')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
