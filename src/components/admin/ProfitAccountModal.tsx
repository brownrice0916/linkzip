import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import clsx from 'clsx';
import { useStore, type DonationConfig } from '../../store/useStore';
import { verifyBankAccount } from '../../services/accountVerificationService';

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
  'SC제일은행'
];

// Checksum validation for Korean Business Registration Number (BRN)
const isValidBRN = (brn: string): boolean => {
  if (brn.length !== 10) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(brn[i], 10) * weights[i];
  }
  sum += Math.floor((parseInt(brn[8], 10) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(brn[9], 10);
};

const validateIdentityNumber = (idNum: string, type: 'personal' | 'corporate'): { valid: boolean; error?: string } => {
  const cleanId = idNum.replace(/[^0-9]/g, '');

  if (!cleanId) {
    return { valid: false, error: '생년월일 6자리 또는 사업자등록번호를 입력해 주세요.' };
  }

  if (type === 'personal') {
    if (cleanId.length === 6) {
      const month = parseInt(cleanId.substring(2, 4), 10);
      const day = parseInt(cleanId.substring(4, 6), 10);
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return { valid: false, error: '생년월일(YYMMDD 6자리) 날짜 형식이 올바르지 않습니다.' };
      }
    } else if (cleanId.length === 10) {
      if (!isValidBRN(cleanId)) {
        return { valid: false, error: '유효하지 않은 사업자등록번호(10자리) 번호 오류입니다.' };
      }
    } else {
      return { valid: false, error: '생년월일(6자리) 또는 사업자번호(10자리)를 입력해 주세요.' };
    }
  } else {
    if (cleanId.length === 10) {
      if (!isValidBRN(cleanId)) {
        return { valid: false, error: '유효하지 않은 법인/사업자등록번호(10자리)입니다.' };
      }
    } else return { valid: false, error: '법인 사업자등록번호(10자리)를 입력해 주세요.' };
  }

  return { valid: true };
};

// Bank specific account number format and length validation
const validateBankAccountForBank = (bank: string, accNum: string): { valid: boolean; error?: string } => {
  const cleanAcc = accNum.replace(/[^0-9]/g, '');

  if (!cleanAcc) {
    return { valid: false, error: '계좌번호를 입력해 주세요.' };
  }

  if (bank === 'KB국민은행') {
    if (cleanAcc.length !== 14 && cleanAcc.length !== 12) {
      return { valid: false, error: `선택하신 은행(${bank}) 계좌번호는 14자리(또는 12자리)여야 합니다. (입력하신 계좌: ${cleanAcc.length}자리)` };
    }
  } else if (bank === 'NH농협은행') {
    if (cleanAcc.length !== 13 && cleanAcc.length !== 14 && cleanAcc.length !== 11) {
      return { valid: false, error: `선택하신 은행(${bank}) 계좌번호는 13자리(또는 11, 14자리)여야 합니다. (입력하신 계좌: ${cleanAcc.length}자리)` };
    }
    const nhPrefixes = ['301', '302', '312', '351', '352', '356', '790'];
    const hasNhPrefix = nhPrefixes.some(p => cleanAcc.startsWith(p));
    if (!hasNhPrefix) {
      return { valid: false, error: '선택하신 은행(NH농협은행) 식별번호(301, 302, 351, 352, 356 등)로 시작하는 농협 계좌가 아닙니다.' };
    }
  } else if (bank === '카카오뱅크') {
    if (cleanAcc.length !== 13 || !cleanAcc.startsWith('3333')) {
      return { valid: false, error: '카카오뱅크 계좌번호는 13자리 숫자(3333으로 시작)여야 합니다.' };
    }
  } else if (bank === '신한은행') {
    if (cleanAcc.length !== 12 && cleanAcc.length !== 14) {
      return { valid: false, error: `신한은행 계좌번호는 12자리 또는 14자리여야 합니다. (입력하신 계좌: ${cleanAcc.length}자리)` };
    }
  } else if (bank === '토스뱅크') {
    if (cleanAcc.length !== 12 && cleanAcc.length !== 13) {
      return { valid: false, error: `토스뱅크 계좌번호는 12~13자리여야 합니다. (입력하신 계좌: ${cleanAcc.length}자리)` };
    }
  } else if (bank === '우리은행') {
    if (cleanAcc.length !== 13) {
      return { valid: false, error: `우리은행 계좌번호는 13자리여야 합니다. (입력하신 계좌: ${cleanAcc.length}자리)` };
    }
  } else if (bank === '하나은행') {
    if (cleanAcc.length !== 14) {
      return { valid: false, error: `하나은행 계좌번호는 14자리여야 합니다. (입력하신 계좌: ${cleanAcc.length}자리)` };
    }
  }

  return { valid: true };
};

export const ProfitAccountModal: React.FC<ProfitAccountModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onDisconnect,
  onSave
}) => {
  const language = useStore((state) => state.language);
  const tr = (ko: string, en: string) => language === 'ko' ? ko : en;
  const [accountType, setAccountType] = useState<'personal' | 'corporate'>(
    initialData?.accountType || 'personal'
  );
  // 식별자는 토스 인증 요청에만 사용하고 저장하지 않습니다.
  const [idNumber, setIdNumber] = useState('');
  const [bankName, setBankName] = useState(initialData?.bankName || banks[0]);
  const [accountOwnerName, setAccountOwnerName] = useState(initialData?.accountOwnerName || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');
  
  const [isCertified, setIsCertified] = useState(!!initialData?.accountConnected);
  const [certifying, setCertifying] = useState(false);

  const handleCertify = async () => {
    // 1. ID Number Strict Check sum
    const idValidation = validateIdentityNumber(idNumber, accountType);
    if (!idValidation.valid) {
      setIsCertified(false);
      alert(`❌ ID Number 검증 실패\n${idValidation.error}`);
      return;
    }

    // 2. Account Number & Bank Name Pattern Matching Check
    const cleanAccount = accountNumber.replace(/[^0-9]/g, '');
    const isRepeatedDigits = /^(\d)\1+$/.test(cleanAccount);
    const isSequentialDigits = cleanAccount === '12345678' || cleanAccount === '123456789' || cleanAccount === '1234567890';

    if (!cleanAccount || cleanAccount.length < 10 || isRepeatedDigits || isSequentialDigits) {
      setIsCertified(false);
      alert('❌ 계좌번호 인증 실패\n유효하지 않은 계좌번호입니다. (10~16자리 실제 계좌번호를 입력해 주세요.)');
      return;
    }

    const bankValidation = validateBankAccountForBank(bankName, cleanAccount);
    if (!bankValidation.valid) {
      setIsCertified(false);
      alert(`❌ 은행 계좌 번호 불일치\n${bankValidation.error}`);
      return;
    }

    setCertifying(true);

    try {
      const holderName = await verifyBankAccount({
        bankName,
        accountNumber: cleanAccount,
        identityNumber: idNumber,
      });
      setAccountOwnerName(holderName);
      setIsCertified(true);
      alert('✅ 계좌 실명 인증이 완료되었습니다!');
    } catch (error) {
      setIsCertified(false);
      alert(`❌ ${(error as Error).message}`);
    } finally {
      setCertifying(false);
    }
  };

  const handleSave = () => {
    if (!idNumber.trim()) {
      alert(accountType === 'personal' ? '생년월일 6자리 또는 사업자등록번호를 입력해주세요.' : '사업자등록번호를 입력해주세요.');
      return;
    }
    if (!accountNumber.trim()) {
      alert('계좌번호를 입력해주세요.');
      return;
    }

    onSave({
      accountType,
      bankName,
      accountOwnerName: accountOwnerName || '계좌 소유자',
      accountNumber,
      accountConnected: true
    });
    onClose();
  };

  const idValidation = idNumber.trim() ? validateIdentityNumber(idNumber, accountType) : { valid: true };
  const hasIdError = !idValidation.valid;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-[#EBF0F5] rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-300 my-auto p-6 sm:p-8 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{tr('정산 계좌 관리', 'Payout account')}</h2>
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
            <label className="block text-xs font-bold text-gray-600">{tr('계좌 유형', 'Account type')}*</label>
            <select
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value as 'personal' | 'corporate');
                setIdNumber('');
                setIsCertified(false);
                setAccountOwnerName('');
              }}
              className="w-full p-3.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black focus:border-black cursor-pointer"
            >
              <option value="personal">{tr('개인 / 개인사업자 계좌', 'Personal / business account')}</option>
              <option value="corporate">{tr('법인 계좌', 'Corporate account')}</option>
            </select>
          </div>

          {/* Birth date / Business Registration Number */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">
              {accountType === 'personal' ? tr('생년월일 6자리 / 사업자등록번호*', 'Birth date (YYMMDD) / business number*') : tr('사업자등록번호*', 'Business registration number*')}
            </label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => {
                setIdNumber(e.target.value);
                setIsCertified(false);
              }}
              placeholder={accountType === 'personal' ? tr('예: 910101 또는 사업자번호 10자리', 'YYMMDD or 10-digit business number') : tr('사업자등록번호 10자리를 입력하세요', 'Enter the 10-digit business number')}
              className={clsx(
                "w-full p-3.5 bg-white border rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 placeholder-gray-400 transition-all",
                hasIdError
                  ? "border-red-500 text-red-600 bg-red-50/50 focus:ring-red-500 focus:border-red-500"
                  : "border-gray-300 focus:ring-black focus:border-black"
              )}
            />
            {hasIdError && (
              <p className="text-[11px] font-bold text-red-500 mt-1 flex items-center gap-1 animate-in fade-in">
                <span>⚠️ {idValidation.error}</span>
              </p>
            )}
          </div>

          {/* Bank Name & Account Owner Name Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600">{tr('은행명', 'Bank name')}*</label>
              <div className="relative">
                <select
                  value={bankName}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    setIsCertified(false);
                    setAccountOwnerName('');
                  }}
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
              <label className="block text-xs font-bold text-gray-600">{tr('예금주명', 'Account holder')}*</label>
              <input
                type="text"
                value={accountOwnerName}
                placeholder="계좌를 인증해 주세요."
                readOnly
                className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Account Number & Certification */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">{tr('계좌번호', 'Account number')}*</label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  setIsCertified(false);
                  setAccountOwnerName('');
                }}
                placeholder={tr('숫자만 입력하세요', 'Enter numbers only')}
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
                {certifying ? tr('인증 중...', 'Verifying...') : isCertified ? tr('✓ 인증 완료', '✓ Verified') : tr('인증', 'Verify')}
              </button>
            </div>
          </div>

        </div>

        <div className="space-y-2">
          <button
            onClick={handleSave}
            disabled={!isCertified}
            className={clsx(
              "w-full py-4 rounded-xl font-black text-sm transition tracking-wide flex items-center justify-center gap-2",
              isCertified
                ? "bg-black hover:bg-gray-800 text-white cursor-pointer shadow-md"
                : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-60"
            )}
            title={!isCertified ? tr('계좌 인증을 완료해야 저장할 수 있습니다.', 'Verify the account before saving.') : tr('저장하기', 'Save')}
          >
            <span>{isCertified ? tr('저장', 'Save') : tr('인증 완료 후 저장 가능', 'Verify before saving')}</span>
          </button>
          {initialData?.accountConnected && onDisconnect && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(tr('연동된 계좌를 해제할까요? 후원·판매 블록의 계좌 정보도 함께 삭제됩니다.', 'Disconnect this account? Account details will also be removed from donation and sales blocks.'))) return;
                onDisconnect();
                onClose();
              }}
              className="w-full cursor-pointer rounded-xl py-3 text-xs font-extrabold text-red-600 transition hover:bg-red-50 hover:text-red-700"
            >
              {tr('계좌 연동 해제', 'Disconnect account')}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
