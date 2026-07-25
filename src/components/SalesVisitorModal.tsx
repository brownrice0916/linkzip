import React, { useState } from 'react';
import { X, ShoppingBag, Download, CheckCircle2, Copy, Check, CreditCard, ShieldCheck } from 'lucide-react';
import type { CustomLink, UserProfile } from '../store/useStore';

interface SalesVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: CustomLink;
  profile: UserProfile;
}

export const SalesVisitorModal: React.FC<SalesVisitorModalProps> = ({
  isOpen,
  onClose,
  block,
  profile
}) => {
  if (!isOpen) return null;

  const config = block.salesConfig || {
    mainText: block.title || '디지털 상품 판매',
    description: '상품 설명을 확인해주세요.',
    products: []
  };

  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [purchased, setPurchased] = useState(false);

  const activeProduct = config.products?.[selectedProductIndex] || {
    id: 'prod-1',
    name: config.mainText || '디지털 상품',
    price: 50000,
    fileName: 'digital_content.pdf'
  };

  // Find linked profit account
  const accountInfo = block.donationConfig || config.bankName ? {
    bankName: config.bankName || 'NH농협은행',
    accountNumber: config.accountNumber || '3020683730641',
    accountOwner: config.accountOwner || profile.name || '황현미'
  } : {
    bankName: 'NH농협은행',
    accountNumber: '3020683730641',
    accountOwner: profile.name || '황현미'
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(`${accountInfo.bankName} ${accountInfo.accountNumber}`);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 my-auto p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">{config.mainText || '디지털 상품 판매'}</h2>
              <p className="text-xs text-gray-500 font-semibold">{profile.name || profile.username} 님의 상품 스토어</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {purchased ? (
          /* Purchased / Payment Instructions Screen */
          <div className="py-6 space-y-5 text-center animate-in zoom-in-95">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            
            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-900">입금 및 구매 안내</h3>
              <p className="text-xs text-gray-500 font-medium">아래 계좌로 입금해주시면 전달 메시지와 함께 상품이 제공됩니다.</p>
            </div>

            {/* Account Box */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                <span>입금 계좌 정보</span>
                <span className="text-indigo-600 font-extrabold">{activeProduct.price.toLocaleString()} KRW</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-sm font-black text-gray-900">{accountInfo.bankName} {accountInfo.accountNumber}</p>
                  <p className="text-xs font-semibold text-gray-500">예금주: {accountInfo.accountOwner}</p>
                </div>

                <button
                  onClick={handleCopyAccount}
                  className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAccount ? '복사됨' : '계좌 복사'}</span>
                </button>
              </div>
            </div>

            {/* Creator Message */}
            {config.creatorMessage && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left text-xs font-medium text-amber-900 leading-relaxed">
                <span className="font-bold block mb-1">📢 판매자 안내 메시지:</span>
                {config.creatorMessage}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs cursor-pointer shadow-md"
            >
              확인 완료
            </button>
          </div>
        ) : (
          /* Product Details & Selection Screen */
          <div className="space-y-5">
            
            {/* Product Image */}
            {config.image && (
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-gray-200 shadow-2xs">
                <img src={config.image} alt="Product" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Description */}
            {config.description && (
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium text-gray-700 whitespace-pre-wrap leading-relaxed">
                {config.description}
              </div>
            )}

            {/* Products List Picker */}
            {config.products && config.products.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-600">상품 선택</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {config.products.map((prod, idx) => (
                    <div
                      key={prod.id}
                      onClick={() => setSelectedProductIndex(idx)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                        selectedProductIndex === idx
                          ? 'border-black bg-gray-900 text-white shadow-md'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold">{prod.name}</p>
                        {prod.fileName && <p className="text-[10px] opacity-70">📁 {prod.fileName}</p>}
                      </div>
                      <span className="text-xs font-black">{prod.price.toLocaleString()} KRW</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              type="button"
              onClick={() => setPurchased(true)}
              className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black text-sm transition cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <span>{activeProduct.price.toLocaleString()} KRW 구매하기 / 입금 안내</span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
};
