import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Download, MapPin, Minus, Package, Plus, Search, ShoppingBag, X } from 'lucide-react';
import type { CustomLink, UserProfile } from '../store/useStore';
import {
  createSalesOrder,
  lookupSalesOrders,
  type PaymentOrderResult,
  type PublicOrderLookupResult,
} from '../services/commerceService';
import { requestTossPayment } from '../services/tossPaymentService';
import { openKakaoPostcode } from '../lib/kakaoPostcode';
import BankTransferInstructions from './BankTransferInstructions';

interface SalesVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: CustomLink;
  profile: UserProfile;
  ownerUid?: string;
  initialProductId?: string;
  beforeCreateOrder?: () => Promise<boolean>;
}

const paymentLabel: Record<PublicOrderLookupResult['status'], string> = { pending: '결제 대기', paid: '결제 완료', cancelled: '주문 취소' };
const fulfillmentLabel: Record<PublicOrderLookupResult['fulfillmentStatus'], string> = { payment_pending: '결제 대기', preparing: '상품 준비 중', shipping: '배송 중', delivered: '배송 완료' };

export const SalesVisitorModal: React.FC<SalesVisitorModalProps> = ({ isOpen, onClose, block, profile, ownerUid, initialProductId, beforeCreateOrder }) => {
  const config = block.salesConfig || { mainText: block.title || '실물 상품 판매', description: '상품 설명을 확인해주세요.', products: [] };
  const isPhysical = config.salesType !== 'digital_file';
  const [view, setView] = useState<'detail' | 'checkout' | 'lookup'>('detail');
  const [detailTab, setDetailTab] = useState<'info' | 'reviews' | 'seller'>('info');
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [paymentProvider, setPaymentProvider] = useState<'toss' | 'bank_transfer'>('bank_transfer');
  const [submitting, setSubmitting] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [baseAddress, setBaseAddress] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [orderRequest, setOrderRequest] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [lookupOrderNumber, setLookupOrderNumber] = useState('');
  const [lookupContact, setLookupContact] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<PublicOrderLookupResult[] | null>(null);
  const [bankOrder, setBankOrder] = useState<PaymentOrderResult | null>(null);
  const detailAddressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const requestedIndex = config.products?.findIndex((product) => product.id === initialProductId) ?? -1;
    setSelectedProductIndex(requestedIndex >= 0 ? requestedIndex : 0);
    setView('detail');
    setDetailTab('info');
    setQuantity(1);
    setLookupResults(null);
    setBankOrder(null);
  }, [isOpen, block.id, config.products, initialProductId]);

  const activeProduct = config.products?.[selectedProductIndex] || { id: 'prod-1', name: config.mainText || '상품', price: 50000, fileName: 'digital_content.pdf' };
  const unitPrice = activeProduct.discountPrice ?? activeProduct.price;
  const shippingFee = isPhysical ? Math.max(0, activeProduct.shippingFee ?? 0) : 0;
  const productAmount = unitPrice * quantity;
  const totalAmount = productAmount + shippingFee;
  const maxQuantity = Math.max(1, Math.min(activeProduct.stock || 10, 10));

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
    if (!buyerName.trim() || !buyerContact.trim()) return alert('받는 분과 휴대폰 번호를 입력해주세요.');
    if (!/^01\d{8,9}$/.test(buyerContact.replace(/\D/g, ''))) return alert('국내 휴대폰 번호를 정확히 입력해주세요.');
    if (buyerEmail && !/^\S+@\S+\.\S+$/.test(buyerEmail)) return alert('이메일 주소를 정확히 입력해주세요.');
    if (!isPhysical && !buyerEmail.trim()) return alert('이메일을 입력해주세요.');
    if (isPhysical && (!postalCode || !baseAddress.trim() || !detailAddress.trim())) return alert('주소 검색 후 상세주소를 입력해주세요.');
    if (!agreed) return alert('주문 및 개인정보 수집·이용에 동의해주세요.');
    if (!ownerUid) return alert('판매자 정보를 확인할 수 없습니다.');
    try {
      setSubmitting(true);
      if (beforeCreateOrder && !(await beforeCreateOrder())) throw new Error('상품 변경사항을 저장하지 못했습니다.');
      const result = await createSalesOrder(ownerUid, {
        blockId: block.id,
        targetUsername: profile.username,
        productId: activeProduct.id,
        productName: activeProduct.name,
        amount: totalAmount,
        quantity,
        productAmount,
        shippingFee,
        salesType: config.salesType || 'product',
        buyerName: buyerName.trim(),
        buyerContact: buyerContact.trim(),
        buyerEmail: buyerEmail.trim(),
        shippingAddress: isPhysical ? `[${postalCode}] ${baseAddress.trim()} ${detailAddress.trim()}` : '',
        postalCode: isPhysical ? postalCode : '',
        orderRequest: orderRequest.trim(),
        paymentProvider,
        depositorName: buyerName.trim(),
      });
      if (paymentProvider === 'bank_transfer') {
        if (!result.bankTransfer) throw new Error('계좌이체 안내를 불러오지 못했습니다.');
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
        paymentKind: 'sales',
      });
    } catch (error) {
      console.error('Failed to create sales order:', error);
      alert(error instanceof Error ? error.message : '주문을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async () => {
    if (!ownerUid || !lookupOrderNumber.trim() || !lookupContact.trim()) return alert('주문번호와 휴대폰 번호를 모두 입력해주세요.');
    try {
      setLookupLoading(true);
      setLookupResults(await lookupSalesOrders(ownerUid, lookupOrderNumber, lookupContact));
    } catch (error) {
      alert(error instanceof Error ? error.message : '주문 정보를 조회하지 못했습니다.');
    } finally {
      setLookupLoading(false);
    }
  };

  if (!isOpen) return null;
  const image = config.image || block.icon;
  const fieldClass = 'w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-semibold outline-none transition focus:border-black';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 font-sans backdrop-blur-sm">
      <div className="min-h-full p-0 sm:flex sm:items-center sm:justify-center sm:p-5">
        <section role="dialog" aria-modal="true" aria-label={`${activeProduct.name} 구매`} className="relative min-h-screen w-full bg-white sm:min-h-0 sm:max-w-5xl sm:overflow-hidden sm:rounded-[2rem] sm:border sm:border-gray-200 sm:shadow-2xl">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur-xl sm:px-6">
            <button type="button" onClick={() => view === 'detail' ? onClose() : setView('detail')} className="flex cursor-pointer items-center gap-2 rounded-full p-2 text-sm font-black hover:bg-gray-100" aria-label="뒤로 가기">{view === 'detail' ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}<span className="hidden sm:inline">{view === 'detail' ? '닫기' : '상품으로'}</span></button>
            <strong className="text-sm font-black">{view === 'checkout' ? '주문·결제' : view === 'lookup' ? '주문 조회' : '상품 정보'}</strong>
            <button type="button" onClick={() => setView('lookup')} className="cursor-pointer rounded-full px-3 py-2 text-xs font-black hover:bg-gray-100">주문조회</button>
          </header>

          {view === 'lookup' ? <div className="mx-auto max-w-xl space-y-4 p-5 sm:p-8">
            <div className="rounded-2xl bg-gray-50 p-4 text-xs font-semibold leading-6 text-gray-600">주문번호와 주문할 때 입력한 휴대폰 번호로 결제·배송 상태를 확인할 수 있어요.</div>
            <input value={lookupOrderNumber} onChange={(event) => setLookupOrderNumber(event.target.value)} placeholder="LZ 주문번호" className={fieldClass} />
            <div className="flex gap-2"><input type="tel" value={lookupContact} onChange={(event) => setLookupContact(event.target.value)} placeholder="휴대폰 번호" className={fieldClass} /><button type="button" onClick={() => void handleLookup()} disabled={lookupLoading} className="shrink-0 cursor-pointer rounded-2xl bg-black px-5 text-sm font-black text-white disabled:opacity-50"><Search className="h-4 w-4" /></button></div>
            {lookupResults?.map((order) => <article key={order.orderNumber} className="rounded-2xl border border-gray-200 p-4 text-xs"><div className="flex justify-between gap-3"><strong>{order.productName}</strong><strong>{order.amount.toLocaleString()}원</strong></div><p className="mt-1 font-mono text-gray-400">{order.orderNumber}</p><div className="mt-3 flex gap-2"><span className="rounded-full bg-gray-100 px-2 py-1 font-bold">{paymentLabel[order.status]}</span><span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{fulfillmentLabel[order.fulfillmentStatus]}</span></div></article>)}
            {lookupResults?.length === 0 && <p className="py-8 text-center text-sm font-bold text-gray-400">일치하는 주문이 없어요.</p>}
          </div> : view === 'detail' ? <div className="grid sm:grid-cols-2">
            <div className="aspect-square bg-[#f2f1ed] sm:min-h-[560px] sm:aspect-auto">{image ? <img src={image} alt={activeProduct.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ShoppingBag className="h-16 w-16 text-black/20" /></div>}</div>
            <div className="flex min-h-[560px] flex-col p-5 sm:p-8">
              <div className="flex-1"><p className="text-xs font-black text-gray-400">{profile.name || profile.username}의 스토어</p><h1 className="mt-2 text-3xl font-black tracking-tight">{activeProduct.name}</h1><p className="mt-3 text-2xl font-black">{unitPrice.toLocaleString()}원</p>
                {config.products.length > 1 && <div className="mt-6"><p className="mb-2 text-xs font-black text-gray-500">상품 선택</p><div className="max-h-48 space-y-2 overflow-y-auto pr-1">{config.products.map((product, index) => <button key={product.id} type="button" onClick={() => { setSelectedProductIndex(index); setQuantity(1); }} className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-3.5 text-left transition ${selectedProductIndex === index ? 'border-black bg-black text-white' : 'border-gray-200 bg-white hover:border-gray-400'}`} aria-pressed={selectedProductIndex === index}><span className="min-w-0"><strong className="block truncate text-sm">{product.name}</strong>{product.fileName && <span className="mt-0.5 block truncate text-[10px] opacity-60">{product.fileName}</span>}</span><strong className="shrink-0 text-sm">{(product.discountPrice ?? product.price).toLocaleString()}원</strong></button>)}</div></div>}
                <div className="mt-8 border-y border-gray-200 py-5"><div className="flex items-center justify-between"><span className="text-sm font-black">수량</span><div className="flex items-center overflow-hidden rounded-xl border border-gray-300"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="cursor-pointer p-3 hover:bg-gray-100" aria-label="수량 줄이기"><Minus className="h-4 w-4" /></button><span className="min-w-12 text-center text-sm font-black">{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} className="cursor-pointer p-3 hover:bg-gray-100" aria-label="수량 늘리기"><Plus className="h-4 w-4" /></button></div></div>
                  <div className="mt-4 flex justify-between text-sm"><span className="font-semibold text-gray-500">상품 금액</span><strong>{productAmount.toLocaleString()}원</strong></div>{isPhysical && <div className="mt-2 flex justify-between text-sm"><span className="font-semibold text-gray-500">배송비</span><strong>{shippingFee === 0 ? '무료' : `${shippingFee.toLocaleString()}원`}</strong></div>}<div className="mt-4 flex justify-between border-t border-gray-100 pt-4"><span className="font-black">총 결제금액</span><strong className="text-xl">{totalAmount.toLocaleString()}원</strong></div></div>
                <div className="mt-8 flex border-b border-gray-200">{([['info', '상품 정보'], ['reviews', '후기 (0)'], ['seller', '판매자 정보']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setDetailTab(key)} className={`flex-1 cursor-pointer border-b-2 px-1 py-3 text-xs font-black ${detailTab === key ? 'border-black text-black' : 'border-transparent text-gray-400'}`}>{label}</button>)}</div>
                <div className="min-h-28 py-5 text-sm font-semibold leading-7 text-gray-600">{detailTab === 'info' ? (config.description || activeProduct.orderNote || '상품 설명이 아직 등록되지 않았어요.') : detailTab === 'reviews' ? '아직 작성된 후기가 없어요.' : <><strong className="text-black">{profile.name || profile.username}</strong><br />LinkZip에서 판매하는 상품입니다.</>}</div>
              </div>
              <button type="button" onClick={() => setView('checkout')} className="w-full cursor-pointer rounded-2xl bg-black py-4 text-base font-black text-white transition hover:bg-gray-800">{totalAmount.toLocaleString()}원 구매하기</button>
            </div>
          </div> : bankOrder?.bankTransfer ? <div className="mx-auto max-w-xl p-5 sm:p-8"><BankTransferInstructions orderNumber={bankOrder.orderNumber} amount={bankOrder.amount} instructions={bankOrder.bankTransfer} buyerContact={buyerContact} onDone={() => setView('lookup')} /></div> : <div className="mx-auto max-w-2xl p-5 pb-10 sm:p-8">
            <div className="rounded-3xl bg-[#f6f4ee] p-4"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{image ? <img src={image} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white"><Package className="h-5 w-5" /></div>}<div className="min-w-0"><p className="truncate text-sm font-black">{activeProduct.name}</p><p className="mt-1 text-xs font-semibold text-gray-500">수량 {quantity}개</p></div></div><strong className="shrink-0 text-sm">{totalAmount.toLocaleString()}원</strong></div></div>
            <h2 className="mt-7 text-lg font-black">{isPhysical ? '주문자·배송 정보' : '주문자 정보'}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} placeholder="받는 분 *" autoComplete="name" className={fieldClass} /><input type="tel" inputMode="tel" value={buyerContact} onChange={(event) => setBuyerContact(event.target.value)} placeholder="휴대폰 번호 (010-0000-0000) *" autoComplete="tel" className={fieldClass} /><input type="email" value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} placeholder={isPhysical ? '이메일 (선택)' : '이메일 *'} autoComplete="email" className={`${fieldClass} sm:col-span-2`} />{isPhysical && <><div className="flex gap-2 sm:col-span-2"><button type="button" onClick={() => void handleAddressSearch()} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-2xl border border-gray-200 px-4 py-4 text-left text-sm font-semibold"><MapPin className="h-4 w-4 shrink-0" /><span className={baseAddress ? 'text-black' : 'text-gray-400'}>{baseAddress ? `[${postalCode}] ${baseAddress}` : '우편번호·주소 검색 *'}</span></button><button type="button" onClick={() => void handleAddressSearch()} className="cursor-pointer rounded-2xl border border-black px-4 text-xs font-black">주소 검색</button></div><input ref={detailAddressRef} value={detailAddress} onChange={(event) => setDetailAddress(event.target.value)} placeholder="상세주소 *" autoComplete="address-line2" className={`${fieldClass} sm:col-span-2`} /><input value={orderRequest} maxLength={100} onChange={(event) => setOrderRequest(event.target.value)} placeholder="배송 요청사항 (선택)" className={`${fieldClass} sm:col-span-2`} /></>}</div>
            <h2 className="mt-8 text-lg font-black">결제 방법</h2><div className="mt-3 grid grid-cols-2 gap-3"><button type="button" onClick={() => setPaymentProvider('toss')} className={`cursor-pointer rounded-2xl border-2 px-3 py-4 text-sm font-black ${paymentProvider === 'toss' ? 'border-black bg-black text-white' : 'border-gray-200'}`}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#3182f6] text-xs font-black text-white">T</span>토스페이먼츠</button><button type="button" onClick={() => setPaymentProvider('bank_transfer')} className={`cursor-pointer rounded-2xl border-2 px-3 py-4 text-sm font-black ${paymentProvider === 'bank_transfer' ? 'border-black bg-black text-white' : 'border-gray-200'}`}>계좌이체</button></div><p className="mt-2 text-[11px] font-semibold leading-5 text-gray-400">토스 결제창에서 신용·체크카드와 지원되는 간편결제를 선택할 수 있어요.</p>
            <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl bg-gray-50 p-4"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${agreed ? 'border-black bg-black text-white' : 'border-gray-300 bg-white'}`}>{agreed && <Check className="h-3.5 w-3.5" />}</span><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="sr-only" /><span className="text-xs font-bold leading-5 text-gray-600"><strong className="text-black">[필수]</strong> 주문 내용을 확인했으며, 결제 및 배송을 위한 개인정보 수집·이용에 동의합니다.</span></label>
            <div className="mt-7 rounded-2xl border border-gray-200 p-4 text-sm"><div className="flex justify-between"><span className="text-gray-500">상품 금액</span><strong>{productAmount.toLocaleString()}원</strong></div><div className="mt-2 flex justify-between"><span className="text-gray-500">배송비</span><strong>{shippingFee.toLocaleString()}원</strong></div><div className="mt-4 flex justify-between border-t pt-4 text-base"><strong>총 결제금액</strong><strong>{totalAmount.toLocaleString()}원</strong></div></div>
            <button type="button" onClick={() => void handlePurchaseRequest()} disabled={submitting} className="mt-4 w-full cursor-pointer rounded-2xl bg-black py-4 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{submitting ? '주문을 준비하고 있어요' : paymentProvider === 'toss' ? `${totalAmount.toLocaleString()}원 결제하기` : `${totalAmount.toLocaleString()}원 입금 안내 받기`}</button>
          </div>}
        </section>
      </div>
    </div>
  );
};
