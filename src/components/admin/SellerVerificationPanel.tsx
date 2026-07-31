import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Clock3, ShieldCheck, UserRound } from 'lucide-react';
import {
  getSellerVerification,
  submitSellerVerification,
  type SellerVerificationApplication,
  type SellerVerificationState,
  type SellerVerificationStatus,
} from '../../services/sellerVerificationService';

const emptyApplication: SellerVerificationApplication = {
  sellerType: 'individual_creator',
  businessRegistrationNumber: '', businessName: '', representativeName: '', businessAddress: '',
  contactPhone: '', contactEmail: '', mailOrderRegistrationNumber: '', mailOrderExemptionReason: '',
  bankName: '', accountHolder: '', accountNumber: '', shippingPolicy: '', prohibitedGoodsAgreed: false,
  privacyTermsAgreed: false, sellerTermsAgreed: false,
  creatorDigitalOnlyAgreed: false, creatorBusinessTransitionAgreed: false, creatorTaxResponsibilityAgreed: false,
};

interface Props {
  defaultEmail?: string;
  defaultShippingPolicy?: string;
  onStatusChange: (status: SellerVerificationStatus, verification?: SellerVerificationState) => void;
}

const messageFromError = (error: unknown) => {
  const raw = error instanceof Error ? error.message : '판매자 신청을 접수하지 못했습니다.';
  return raw.replace(/^Firebase:\s*/i, '').replace(/^Error:\s*/i, '').replace(/^\[functions\/[^\]]+\]\s*/i, '');
};

export default function SellerVerificationPanel({ defaultEmail = '', defaultShippingPolicy = '', onStatusChange }: Props) {
  const [verification, setVerification] = useState<SellerVerificationState>({ status: 'not_submitted' });
  const [application, setApplication] = useState<SellerVerificationApplication>({ ...emptyApplication, contactEmail: defaultEmail, shippingPolicy: defaultShippingPolicy });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void getSellerVerification().then((value) => {
      if (!active) return;
      setVerification(value);
      setApplication({ ...emptyApplication, contactEmail: defaultEmail, shippingPolicy: defaultShippingPolicy, ...value });
      setEditing(value.status === 'not_submitted' || value.status === 'rejected');
      onStatusChange(value.status, value);
    }).catch((loadError) => setError(messageFromError(loadError))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [defaultEmail, defaultShippingPolicy, onStatusChange]);

  const set = <K extends keyof SellerVerificationApplication>(key: K, value: SellerVerificationApplication[K]) =>
    setApplication((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSubmitting(true); setError('');
    try {
      const next = await submitSellerVerification(application);
      setVerification(next); setEditing(false); onStatusChange(next.status, next);
    } catch (submitError) {
      setError(messageFromError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="rounded-3xl border-2 border-black/10 bg-[#faf9f5] p-5 text-sm font-bold text-black/45">판매자 자격을 확인하고 있어요.</div>;
  if (!editing) return (
    <section className={`rounded-3xl border-2 p-5 ${verification.status === 'approved' ? 'border-emerald-500 bg-emerald-50' : 'border-amber-400 bg-amber-50'}`}>
      <div className="flex items-start gap-3">
        {verification.status === 'approved' ? <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" /> : <Clock3 className="mt-0.5 h-6 w-6 text-amber-700" />}
        <div className="min-w-0"><h2 className="font-black">{verification.status === 'approved' ? `${verification.sellerType === 'individual_creator' ? '개인 크리에이터' : '사업자'} 판매 승인 완료` : '판매자 심사 중'}</h2><p className="mt-1 text-xs font-semibold leading-5 text-black/55">{verification.status === 'approved' ? verification.sellerType === 'individual_creator' ? '디지털 상품은 본인 명의 계좌이체 주문을 받을 수 있어요. 토스 자동결제는 판매자별 정산 계약 확인 후 열립니다.' : '본인 명의 계좌이체 주문을 받을 수 있고, 토스 자동결제는 판매자별 정산 계약 확인 후 열립니다.' : '승인 전에는 스토어 꾸미기와 외부 구매 링크만 사용할 수 있어요.'}</p></div>
      </div>
    </section>
  );

  const field = 'mt-2 w-full rounded-xl border border-black/15 bg-white px-3.5 py-3 text-sm font-semibold outline-none focus:border-black';
  return (
    <section className="rounded-3xl border-2 border-black bg-[#fff8df] p-4 shadow-[4px_4px_0_#171714] sm:p-5">
      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ceff4f]">{application.sellerType === 'business' ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</span><div><h2 className="font-black">판매자 유형을 선택해주세요</h2><p className="mt-1 text-xs font-semibold leading-5 text-black/55">사업자가 없어도 디지털 상품 판매를 신청할 수 있어요. 입력 정보는 심사와 정산 목적으로 비공개 보관됩니다.</p></div></div>
      {verification.status === 'rejected' && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">반려 사유: {verification.rejectionReason || '입력 정보를 다시 확인해주세요.'}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => set('sellerType', 'individual_creator')} className={`cursor-pointer rounded-2xl border-2 p-4 text-left transition ${application.sellerType === 'individual_creator' ? 'border-black bg-[#ceff4f]' : 'border-black/10 bg-white'}`}><UserRound className="h-5 w-5" /><strong className="mt-3 block text-sm">사업자 없는 크리에이터</strong><span className="mt-1 block text-[11px] font-semibold leading-4 text-black/50">전자책·PDF 등 디지털 상품만</span></button>
        <button type="button" onClick={() => set('sellerType', 'business')} className={`cursor-pointer rounded-2xl border-2 p-4 text-left transition ${application.sellerType === 'business' ? 'border-black bg-[#ceff4f]' : 'border-black/10 bg-white'}`}><Building2 className="h-5 w-5" /><strong className="mt-3 block text-sm">사업자 판매자</strong><span className="mt-1 block text-[11px] font-semibold leading-4 text-black/50">디지털·실물 상품 판매</span></button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {application.sellerType === 'business' && <><label className="text-xs font-black">사업자등록번호<input value={application.businessRegistrationNumber} inputMode="numeric" onChange={(e) => set('businessRegistrationNumber', e.target.value)} className={field} placeholder="숫자 10자리" /></label>
        <label className="text-xs font-black">상호<input value={application.businessName} onChange={(e) => set('businessName', e.target.value)} className={field} /></label></>}
        <label className="text-xs font-black">{application.sellerType === 'business' ? '대표자명' : '실명'}<input value={application.representativeName} onChange={(e) => set('representativeName', e.target.value)} className={field} /></label>
        <label className="text-xs font-black">고객 문의 전화번호<input value={application.contactPhone} inputMode="tel" onChange={(e) => set('contactPhone', e.target.value)} className={field} /></label>
        {application.sellerType === 'business' && <label className="text-xs font-black sm:col-span-2">사업장 주소<input value={application.businessAddress} onChange={(e) => set('businessAddress', e.target.value)} className={field} /></label>}
        <label className="text-xs font-black sm:col-span-2">고객 문의 이메일<input type="email" value={application.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} className={field} /></label>
        {application.sellerType === 'business' && <><label className="text-xs font-black">통신판매업 신고번호<input value={application.mailOrderRegistrationNumber} onChange={(e) => set('mailOrderRegistrationNumber', e.target.value)} className={field} placeholder="신고한 경우 입력" /></label>
        <label className="text-xs font-black">신고 면제 사유<input value={application.mailOrderExemptionReason} onChange={(e) => set('mailOrderExemptionReason', e.target.value)} className={field} placeholder="신고번호가 없을 때 입력" /></label></>}
        <label className="text-xs font-black">정산 은행<input value={application.bankName} onChange={(e) => set('bankName', e.target.value)} className={field} /></label>
        <label className="text-xs font-black">예금주<input value={application.accountHolder} onChange={(e) => set('accountHolder', e.target.value)} className={field} /></label>
        <label className="text-xs font-black sm:col-span-2">정산 계좌번호<input value={application.accountNumber} inputMode="numeric" onChange={(e) => set('accountNumber', e.target.value)} className={field} placeholder="하이픈 없이 입력" /></label>
        <label className="text-xs font-black sm:col-span-2">배송·교환·반품 정책<textarea value={application.shippingPolicy} onChange={(e) => set('shippingPolicy', e.target.value)} className={`${field} min-h-28 resize-none`} /></label>
      </div>
      <div className="mt-4 space-y-2">{([
        ['prohibitedGoodsAgreed', '판매 금지 상품 정책을 확인하고 동의합니다.'],
        ['privacyTermsAgreed', '판매자 정보 수집·이용 및 심사에 동의합니다.'],
        ['sellerTermsAgreed', '판매자 약관과 환불·분쟁 처리 책임을 확인했습니다.'],
      ] as const).map(([key, label]) => <label key={key} className="flex cursor-pointer items-start gap-2 rounded-xl bg-white/70 p-3 text-xs font-bold"><input type="checkbox" checked={application[key]} onChange={(e) => set(key, e.target.checked)} className="mt-0.5 h-4 w-4 accent-black" /><span>{label}</span></label>)}</div>
      {application.sellerType === 'individual_creator' && <div className="mt-2 space-y-2">{([
        ['creatorDigitalOnlyAgreed', '사업자 없는 판매자는 전자책·PDF 등 디지털 상품만 LinkZip에서 판매합니다.'],
        ['creatorBusinessTransitionAgreed', '계속적·반복적으로 영리 판매를 하는 경우 사업자등록 후 사업자 판매자로 전환해야 함을 확인했습니다.'],
        ['creatorTaxResponsibilityAgreed', '판매 소득의 신고·납부 책임과 환불·분쟁 처리 의무를 확인했습니다.'],
      ] as const).map(([key, label]) => <label key={key} className="flex cursor-pointer items-start gap-2 rounded-xl border border-black/10 bg-[#fffdf5] p-3 text-xs font-bold"><input type="checkbox" checked={application[key]} onChange={(e) => set(key, e.target.checked)} className="mt-0.5 h-4 w-4 accent-black" /><span>{label}</span></label>)}</div>}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-white p-3 text-[11px] font-semibold leading-5 text-black/50"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>{application.sellerType === 'business' ? '사업자번호 체크섬을 먼저 확인한 뒤 심사 대기 상태로 접수합니다. 국세청 진위 확인과 토스페이먼츠 입점·정산 계약 확인 전에는 자동 승인하지 않습니다.' : '본인·계좌 확인 후 판매자 본인 명의 계좌이체 주문을 받을 수 있습니다. LinkZip 명의 토스 결제와 판매자별 자동 정산은 지급대행 계약이 확인된 뒤에만 열고, 그전에는 외부 구매 링크도 이용할 수 있어요.'}</p></div>
      {error && <p role="alert" className="mt-3 text-xs font-bold text-red-600">{error}</p>}
      <button type="button" disabled={submitting} onClick={() => void submit()} className="mt-4 w-full cursor-pointer rounded-2xl bg-black py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? '신청을 접수하고 있어요' : `${application.sellerType === 'business' ? '사업자' : '개인 크리에이터'} 판매 신청`}</button>
    </section>
  );
}
