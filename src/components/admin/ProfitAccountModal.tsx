import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import type { DonationConfig } from '../../store/useStore';

interface ProfitAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<DonationConfig>;
  onSave: (accountData: {
    accountType: 'personal' | 'corporate';
    idNumber: string;
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
  'SC제일은행'
];

export const ProfitAccountModal: React.FC<ProfitAccountModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSave
}) => {
  if (!isOpen) return null;

  const [accountType, setAccountType] = useState<'personal' | 'corporate'>(
    initialData?.accountType || 'personal'
  );
  const [idNumber, setIdNumber] = useState(initialData?.idNumber || '');
  const [bankName, setBankName] = useState(initialData?.bankName || banks[0]);
  const [accountOwnerName, setAccountOwnerName] = useState(initialData?.accountOwnerName || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');
  
  const [isCertified, setIsCertified] = useState(!!initialData?.accountConnected);
  const [certifying, setCertifying] = useState(false);

  const handleCertify = () => {
    if (!accountNumber.trim()) {
      alert('계좌번호를 입력해주세요.');
      return;
    }
    setCertifying(true);
    setTimeout(() => {
      setCertifying(false);
      setIsCertified(true);
      if (!accountOwnerName) {
        setAccountOwnerName('예금주 (인증완료)');
      }
    }, 800);
  };

  const handleSave = () => {
    if (!idNumber.trim()) {
      alert(accountType === 'personal' ? '주민등록번호/사업자번호를 입력해주세요.' : '법인등록번호를 입력해주세요.');
      return;
    }
    if (!accountNumber.trim()) {
      alert('계좌번호를 입력해주세요.');
      return;
    }

    onSave({
      accountType,
      idNumber,
      bankName,
      accountOwnerName: accountOwnerName || '계좌 소유자',
      accountNumber,
      accountConnected: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-[#EBF0F5] rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-300 my-auto p-6 sm:p-8 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Profit Account Manage</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          
          {/* Account Type Selector */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">Account type*</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as 'personal' | 'corporate')}
              className="w-full p-3.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black focus:border-black cursor-pointer"
            >
              <option value="personal">Personal / Business Account</option>
              <option value="corporate">corporate account</option>
            </select>
          </div>

          {/* ID Number / Business Registration Number */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">
              {accountType === 'personal' ? 'ID number*' : 'Company Registration Number*'}
            </label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder={accountType === 'personal' ? 'enter ID number (-Excluded)' : 'business registration number(-excluded)'}
              className="w-full p-3.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
            />
          </div>

          {/* Bank Name & Account Owner Name Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">name of bank*</label>
              <div className="relative">
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-3.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black cursor-pointer pr-8 appearance-none"
                >
                  {banks.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">Account owner name*</label>
              <input
                type="text"
                value={accountOwnerName}
                onChange={(e) => setAccountOwnerName(e.target.value)}
                placeholder="계좌를 인증해 주세요."
                className="w-full p-3.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
              />
            </div>
          </div>

          {/* Account Number & Certification */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">account number*</label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="enter only numbers(excluding -)"
                className="w-full p-3.5 pr-28 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
              />
              <button
                type="button"
                onClick={handleCertify}
                disabled={certifying || isCertified}
                className={clsx(
                  "absolute right-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border",
                  isCertified 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-white hover:bg-gray-100 text-gray-600 border-gray-300"
                )}
              >
                {certifying ? "인증 중..." : isCertified ? "✓ 인증완료" : "certification"}
              </button>
            </div>
          </div>

        </div>

        {/* Modal Save Button (Matching Screenshot) */}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-[#8C9AA8] hover:bg-[#788796] text-white rounded-xl font-bold text-sm transition cursor-pointer shadow-sm tracking-wide"
        >
          save
        </button>

      </div>
    </div>
  );
};
