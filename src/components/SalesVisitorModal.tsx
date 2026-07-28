import React, { useEffect, useRef, useState } from 'react';
import {
  Download, MapPin,
  Search, ShoppingBag, X,
} from 'lucide-react';
import type { CustomLink, UserProfile } from '../store/useStore';
import {
  createSalesOrder,
  lookupSalesOrders,
  type PaymentOrderResult,
  type PublicOrderLookupResult,
} from '../services/commerceService';
import { openKakaoPostcode } from '../lib/kakaoPostcode';
import { requestTossPayment } from '../services/tossPaymentService';
import BankTransferInstructions from './BankTransferInstructions';

interface SalesVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: CustomLink;
  profile: UserProfile;
  ownerUid?: string;
}

const paymentLabel: Record<PublicOrderLookupResult['status'], string> = {
  pending: '결제 대기', paid: '결제 완료', cancelled: '주문 취소',
};
const fulfillmentLabel: Record<PublicOrderLookupResult['fulfillmentStatus'], string> = {
  payment_pending: '결제 대기', preparing: '상품 준비 중', shipping: '배송 중', delivered: '배송 완료',
};

export const SalesVisitorModal: React.FC<SalesVisitorModalProps> = ({ isOpen, onClose, block, profile, ownerUid }) => {
  const config = block.salesConfig || { mainText: block.title || '실물 상품 판매', description: '상품 설명을 확인해주세요.', products: [] };
  const isPhysical = config.salesType === 'product';
  const [tab, setTab] = useState<'order' | 'lookup'>('order');
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [baseAddress, setBaseAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [lookupValue, setLookupValue] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<PublicOrderLookupResult[] | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<'toss' | 'bank_transfer'>('toss');
  const [bankOrder, setBankOrder] = useState<PaymentOrderResult | null>(null);
  const detailAddressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTab('order');
    setLookupResults(null);
    setBankOrder(null);
  }, [isOpen, block.id]);

  const activeProduct = config.products?.[selectedProductIndex] || {
    id: 'prod-1', name: config.mainText || '상품', price: 50000, fileName: 'digital_content.pdf',
  };
  const amount = activeProduct.discountPrice ?? activeProduct.price;
  const handleAddressSearch = async () => {
    try {
      await openKakaoPostcode((result) => {
        setPostalCode(result.zonecode);
        setBaseAddress(result.userSelectedType === 'R' ? result.roadAddress : result.jibunAddress || result.address);
        window.setTimeout(() => detailAddressRef.current?.focus(), 0);
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : '주소 검색을 열지 못했습니다.');
    }
  };

  const handlePurchaseRequest = async () => {
    if (!buyerName.trim() || !buyerContact.trim()) return alert('구매자 이름과 휴대폰 번호를 입력해주세요.');
    if (!/^\d{9,15}$/.test(buyerContact.replace(/\D/g, ''))) return alert('휴대폰 번호를 정확히 입력해주세요.');
    if (!isPhysical && !buyerEmail.trim()) return alert('파일을 받을 이메일을 입력해주세요.');
    if (isPhysical && (!baseAddress.trim() || !detailAddress.trim())) return alert('주소 검색 후 상세주소를 입력해주세요.');
    if (!ownerUid) return alert('판매자 정보를 확인할 수 없습니다.');
    try {
      setSubmitting(true);
      const result = await createSalesOrder(ownerUid, {
        blockId: block.id,
        targetUsername: profile.username,
        productId: activeProduct.id,
        productName: activeProduct.name,
        amount,
        salesType: config.salesType || 'product',
        buyerName: buyerName.trim(),
        buyerContact: buyerContact.trim(),
        buyerEmail: buyerEmail.trim(),
        shippingAddress: isPhysical ? `[${postalCode}] ${baseAddress.trim()} ${detailAddress.trim()}` : '',
        postalCode: isPhysical ? postalCode : '',
        paymentProvider,
        depositorName: buyerName.trim(),
      });
      if (result.paymentProvider === 'bank_transfer' && result.bankTransfer) {
        setBankOrder(result);
        return;
      }
      await requestTossPayment({
        orderId: result.orderNumber,
        orderName: result.orderName,
        amount: result.amount,
        customerName: buyerName.trim(),
        customerEmail: buyerEmail.trim() || undefined,
        customerMobilePhone: buyerContact,
        targetUsername: profile.username,
      });
    } catch (error) {
      console.error('Failed to create sales order:', error);
      alert(error instanceof Error ? error.message : '결제창을 열지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async () => {
    if (!ownerUid || !lookupValue.trim()) return alert('휴대폰 번호 또는 주문번호를 입력해주세요.');
    try {
      setLookupLoading(true);
      setLookupResults(await lookupSalesOrders(ownerUid, lookupValue));
    } catch (error) {
      console.error('Order lookup failed:', error);
      alert(error instanceof Error ? error.message : '주문 정보를 조회하지 못했습니다.');
    } finally {
      setLookupLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 font-sans backdrop-blur-xs">
      <div className="relative my-auto w-full max-w-lg space-y-5 overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white shadow-md">
              {isPhysical ? <ShoppingBag className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            </div>
            <div><h2 className="text-lg font-black text-gray-900">{config.mainText || (isPhysical ? '실물 상품 판매' : '디지털 파일 판매')}</h2><p className="text-xs font-semibold text-gray-500">{profile.name || profile.username} 님의 상품 스토어</p></div>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-black" aria-label="닫기"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
          <button onClick={() => setTab('order')} className={`cursor-pointer rounded-xl py-2.5 text-xs font-black transition ${tab === 'order' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>주문하기</button>
          <button onClick={() => setTab('lookup')} className={`cursor-pointer rounded-xl py-2.5 text-xs font-black transition ${tab === 'lookup' ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}>주문조회</button>
        </div>

        {tab === 'lookup' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs font-semibold leading-relaxed text-gray-600">주문할 때 입력한 휴대폰 번호 또는 발급받은 주문번호로 주문·배송 상태를 확인할 수 있습니다.</div>
            <div className="flex gap-2"><input value={lookupValue} onChange={(e) => setLookupValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void handleLookup()} placeholder="휴대폰 번호 또는 LZ 주문번호" className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-black" /><button onClick={() => void handleLookup()} disabled={lookupLoading} className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-black px-4 text-xs font-black text-white disabled:opacity-50"><Search className="h-4 w-4" />{lookupLoading ? '조회 중' : '조회'}</button></div>
            {lookupResults && lookupResults.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 py-8 text-center text-xs font-bold text-gray-500">일치하는 주문이 없습니다.</div>}
            <div className="space-y-2">
              {lookupResults?.map((order) => <div key={order.orderNumber} className="rounded-2xl border border-gray-200 p-4 text-xs">
                <div className="flex items-start justify-between gap-3"><div><p className="font-black text-gray-900">{order.productName}</p><p className="mt-1 font-mono text-[11px] text-gray-500">{order.orderNumber}</p></div><span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 font-black">{order.amount.toLocaleString()}원</span></div>
                <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-lg bg-blue-50 px-2 py-1 font-bold text-blue-700">{paymentLabel[order.status]}</span><span className="rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{fulfillmentLabel[order.fulfillmentStatus]}</span></div>
                {order.trackingNumber && <p className="mt-3 rounded-xl bg-gray-50 p-2.5 font-semibold">{order.carrier || '택배'} · {order.trackingNumber}</p>}
                {order.downloadUrl && <a href={order.downloadUrl} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-3 py-2.5 font-black text-white"><Download className="h-4 w-4" />{order.downloadFileName || '파일 다운로드'}</a>}
                {order.downloadError && <p className="mt-3 rounded-xl bg-red-50 p-2.5 font-bold text-red-600">{order.downloadError}</p>}
              </div>)}
            </div>
          </div>
        ) : (
          bankOrder?.bankTransfer ? (
            <BankTransferInstructions orderNumber={bankOrder.orderNumber} amount={bankOrder.amount} instructions={bankOrder.bankTransfer} onDone={() => setTab('lookup')} />
          ) : <div className="space-y-5">
            {config.image && <img src={config.image} alt="상품" className="h-48 w-full rounded-2xl border border-gray-200 object-cover" />}
            {config.description && <div className="whitespace-pre-wrap rounded-2xl border border-gray-100 bg-gray-50 p-4 text-xs font-medium leading-relaxed text-gray-700">{config.description}</div>}
            {!!config.products?.length && <div className="space-y-2"><label className="text-xs font-bold text-gray-600">상품 선택</label><div className="max-h-48 space-y-2 overflow-y-auto">{config.products.map((prod, idx) => <button key={prod.id} onClick={() => setSelectedProductIndex(idx)} className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 p-3.5 text-left transition ${selectedProductIndex === idx ? 'border-black bg-gray-900 text-white' : 'border-gray-200 bg-white hover:border-gray-400'}`}><div><p className="text-xs font-bold">{prod.name}</p>{prod.fileName && <p className="mt-0.5 text-[10px] opacity-70">{prod.fileName}</p>}</div><span className="text-xs font-black">{(prod.discountPrice ?? prod.price).toLocaleString()}원</span></button>)}</div></div>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="구매자 이름" className="rounded-xl border border-gray-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-black" /><input type="tel" inputMode="tel" value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} placeholder="휴대폰 번호" className="rounded-xl border border-gray-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-black" /><input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder={isPhysical ? '이메일 (선택)' : '파일을 받을 이메일'} className="rounded-xl border border-gray-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-black sm:col-span-2" />
              {isPhysical && <><div className="flex gap-2 sm:col-span-2"><div className="relative min-w-0 flex-1"><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input readOnly value={baseAddress ? `[${postalCode}] ${baseAddress}` : ''} placeholder="배송지 주소를 검색해주세요" className="w-full cursor-pointer rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-xs font-semibold outline-none" onClick={() => void handleAddressSearch()} /></div><button onClick={() => void handleAddressSearch()} className="cursor-pointer rounded-xl border border-black px-4 text-xs font-black transition hover:bg-black hover:text-white">주소 검색</button></div><input ref={detailAddressRef} value={detailAddress} onChange={(e) => setDetailAddress(e.target.value)} placeholder="상세주소" className="rounded-xl border border-gray-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-black sm:col-span-2" /></>}
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
              <button type="button" onClick={() => setPaymentProvider('toss')} className={`cursor-pointer rounded-xl py-2.5 text-xs font-black transition ${paymentProvider === 'toss' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>토스페이먼츠</button>
              <button type="button" onClick={() => setPaymentProvider('bank_transfer')} className={`cursor-pointer rounded-xl py-2.5 text-xs font-black transition ${paymentProvider === 'bank_transfer' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>계좌이체</button>
            </div>
            <button onClick={() => void handlePurchaseRequest()} disabled={submitting} className="w-full cursor-pointer rounded-2xl bg-black py-4 text-sm font-black text-white shadow-md transition hover:bg-gray-800 disabled:opacity-50">{submitting ? '결제창 여는 중...' : `${amount.toLocaleString()}원 결제하기`}</button>
          </div>
        )}
      </div>
    </div>
  );
};
