import React, { useState } from 'react';
import { X, Plus, FileText } from 'lucide-react';
import { useStore, type ProductItem } from '../../store/useStore';
import { uploadPrivateDigitalProductFile } from '../../services/storageService';

interface ProductRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (product: ProductItem) => void;
  initialProduct?: ProductItem;
  salesType?: 'digital_file' | 'product';
}

export const ProductRegistrationModal: React.FC<ProductRegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegister,
  initialProduct,
  salesType = 'digital_file',
}) => {
  const language = useStore((state) => state.language);
  const user = useStore((state) => state.user);
  const tr = (ko: string, en: string) => language === 'ko' ? ko : en;
  const [name, setName] = useState(initialProduct?.name || '전자책');
  const [price, setPrice] = useState<number>(initialProduct?.price || 50000);
  const [fileName, setFileName] = useState(initialProduct?.fileName || '');
  const [filePath, setFilePath] = useState(initialProduct?.filePath || '');
  const [isUploading, setIsUploading] = useState(false);

  // Optional checkbox states matching Screenshot 3
  const [showDiscount, setShowDiscount] = useState(!!initialProduct?.discountPrice);
  const [discountPrice, setDiscountPrice] = useState<number>(initialProduct?.discountPrice || 0);

  const [showStock, setShowStock] = useState(!!initialProduct?.stock);
  const [stock, setStock] = useState<number>(initialProduct?.stock || 100);

  const [showOrderNotes, setShowOrderNotes] = useState(!!initialProduct?.orderNote);
  const [orderNote, setOrderNote] = useState(initialProduct?.orderNote || '');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!user) {
      alert('파일을 업로드하려면 먼저 로그인해 주세요.');
      return;
    }
    try {
      setIsUploading(true);
      const uploadedPath = await uploadPrivateDigitalProductFile(user.uid, file);
      setFileName(file.name);
      setFilePath(uploadedPath);
    } catch (error) {
      alert(error instanceof Error ? error.message : '파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('상품명을 입력해주세요.');
      return;
    }
    if (!price || price <= 0) {
      alert('판매 가격을 입력해주세요.');
      return;
    }
    if (salesType === 'digital_file' && !filePath) {
      alert('구매자에게 전달할 파일을 업로드해주세요.');
      return;
    }

    onRegister({
      id: initialProduct?.id || `prod-${Date.now()}`,
      name,
      price,
      fileName,
      filePath,
      discountPrice: showDiscount ? discountPrice : undefined,
      stock: showStock ? stock : undefined,
      orderNote: showOrderNotes ? orderNote : undefined
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 my-auto p-6 sm:p-8 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{tr('상품 등록', 'Product registration')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs (Matching Screenshot 3) */}
        <div className="space-y-4">
          
          {/* Product Name* */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600">{tr('상품명', 'Product name')}<span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="전자책"
              className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
            />
          </div>

          {/* Sales Price* */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <label className="block text-xs font-bold text-gray-600">{tr('판매 가격', 'Sales price')}<span className="text-red-500">*</span></label>
              <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">i</span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="50000"
                className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-black pr-14 placeholder-gray-400"
              />
              <span className="absolute right-3.5 top-3 text-xs font-extrabold text-gray-800 pointer-events-none">KRW</span>
            </div>
          </div>

          {/* Upload Files* */}
          {salesType === 'digital_file' && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <label className="block text-xs font-bold text-gray-600">{tr('파일 업로드', 'Upload files')}<span className="text-red-500">*</span></label>
              <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">i</span>
            </div>

            <label className={`w-full py-3.5 bg-[#2B2D31] hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs ${isUploading ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
              <Plus className="w-4 h-4" />
              <span>{isUploading ? '업로드 중...' : tr('+ 파일 추가', '+ Add file')}</span>
              <input type="file" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
            </label>

            {fileName && (
              <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{fileName}</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">업로드 됨</span>
              </div>
            )}
          </div>
          )}

          {/* Options Checkboxes */}
          <div className="space-y-3 pt-2 text-xs font-semibold text-gray-700">
            {/* 1. Discount & Promotion */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDiscount}
                  onChange={(e) => setShowDiscount(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <span>{tr('할인 및 프로모션', 'Discount & promotion')}</span>
                <span className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-[10px]">i</span>
              </label>

              {showDiscount && (
                <div className="mt-2 pl-6">
                  <input
                    type="number"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(Number(e.target.value))}
                    placeholder="할인된 가격 (KRW)"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
              )}
            </div>

            {/* 2. Stock Quantity */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStock}
                  onChange={(e) => setShowStock(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <span>{tr('재고 수량', 'Stock quantity')}</span>
              </label>

              {showStock && (
                <div className="mt-2 pl-6">
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    placeholder="재고 수량 (개)"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
              )}
            </div>

            {/* 3. Order Notes */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOrderNotes}
                  onChange={(e) => setShowOrderNotes(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                />
                <span>{tr('주문 요청사항', 'Order notes')}</span>
              </label>

              {showOrderNotes && (
                <div className="mt-2 pl-6">
                  <input
                    type="text"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="구매자 요청사항 유의문구"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
                  />
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Buttons (Matching Screenshot 3) */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-2xl font-bold text-xs transition cursor-pointer"
          >
            {tr('취소', 'Cancel')}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="flex-1 py-3.5 bg-[#3B82F6] hover:bg-blue-600 disabled:cursor-wait disabled:opacity-60 text-white rounded-2xl font-bold text-xs transition cursor-pointer shadow-md"
          >
            {tr('등록', 'Register')}
          </button>
        </div>

      </div>
    </div>
  );
};
