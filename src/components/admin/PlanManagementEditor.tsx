import React, { useState } from 'react';
import { Check, Crown, Download, LoaderCircle, Sparkles } from 'lucide-react';
import { BETA_LIFETIME_PREMIUM_GRANT, MEMBERSHIP_PLANS, entitlementsForPlan, membershipCheckoutAmount, workspaceUsage, type MembershipPlan, type MembershipPlanDefinition } from '../../domain/membershipPlans';
import { useStore } from '../../store/useStore';
import { createMembershipPaymentOrder, setOwnAdminMembershipPlan } from '../../services/membershipService';
import { requestTossPayment } from '../../services/tossPaymentService';
import type { MembershipPaymentOrder } from '../../services/membershipService';
import BankTransferInstructions from '../BankTransferInstructions';
import { BUSINESS_INFO } from '../../constants/businessInfo';

const accentStyles: Record<MembershipPlanDefinition['accent'], {
  card: string;
  icon: string;
  check: string;
  button: string;
}> = {
  slate: {
    card: 'border-slate-200 bg-white',
    icon: 'bg-slate-900 text-white',
    check: 'text-slate-700',
    button: 'bg-slate-950 text-white',
  },
  violet: {
    card: 'border-2 border-[#171714] bg-[#fffdf8] shadow-[8px_8px_0_#171714]',
    icon: 'border-2 border-[#171714] bg-[#ff5f35] text-[#171714] shadow-[3px_3px_0_#171714]',
    check: 'text-[#ff5f35]',
    button: 'border-2 border-[#171714] bg-[#171714] text-white shadow-[4px_4px_0_#ff5f35]',
  },
  amber: {
    card: 'border-amber-300 bg-gradient-to-b from-amber-50 to-white',
    icon: 'bg-amber-400 text-amber-950',
    check: 'text-amber-600',
    button: 'bg-amber-400 text-amber-950',
  },
};

const PlanManagementEditor: React.FC = () => {
  const [annualBilling, setAnnualBilling] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<MembershipPlan | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<'toss' | 'bank_transfer'>('toss');
  const [depositorName, setDepositorName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [bankOrder, setBankOrder] = useState<MembershipPaymentOrder | null>(null);
  const language = useStore((state) => state.language);
  const membershipPlan = useStore((state) => state.membershipPlan);
  const user = useStore((state) => state.user);
  const loadData = useStore((state) => state.loadData);
  const profile = useStore((state) => state.profile);
  const isKo = language === 'ko';
  const currentPlan = MEMBERSHIP_PLANS.find((plan) => plan.id === membershipPlan) || MEMBERSHIP_PLANS[0];
  const currentEntitlements = entitlementsForPlan(membershipPlan);
  const workspaces = useStore((state) => state.profileWorkspaces);
  const membershipPeriodEndsAt = useStore((state) => state.membershipPeriodEndsAt);
  const membershipGrant = useStore((state) => state.membershipGrant);
  const hasBetaLifetimePremium = membershipGrant === BETA_LIFETIME_PREMIUM_GRANT;
  const dmRulesCount = useStore((state) => state.dmRules.length);
  const profileCount = Math.max(1, workspaces.length);
  const totalProducts = workspaces.reduce((sum, workspace) => sum + workspaceUsage(workspace).products, 0);
  const displayedPrice = (monthlyPrice: number) => annualBilling ? Math.round(monthlyPrice * 10 / 12) : monthlyPrice;
  const planRank: Record<MembershipPlan, number> = { basic: 0, standard: 1, premium: 2 };
  const isSiteAdmin = user?.email?.trim().toLowerCase() === 'brownrice0916@gmail.com';

  const handleAdminPlanChange = async (plan: MembershipPlanDefinition) => {
    if (!isSiteAdmin || processingPlan !== null || plan.id === membershipPlan) return;
    setCheckoutError('');
    setProcessingPlan(plan.id);
    try {
      const result = await setOwnAdminMembershipPlan(plan.id);
      loadData({membershipPlan: result.planId, membershipPeriodEndsAt: result.periodEndsAt});
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : '관리자 플랜을 변경하지 못했습니다.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleCheckout = async (plan: MembershipPlanDefinition) => {
    if (plan.id === 'basic' || planRank[plan.id] <= planRank[membershipPlan]) return;
    if (!user) {
      setCheckoutError(isKo ? '로그인 후 플랜을 결제해주세요.' : 'Please sign in before purchasing a plan.');
      return;
    }
    setCheckoutError('');
    setProcessingPlan(plan.id);
    try {
      const billingCycle = annualBilling ? 'annual' : 'monthly';
      if (paymentProvider === 'bank_transfer' && (!depositorName.trim() || !/^\d{9,15}$/.test(buyerContact.replace(/\D/g, '')))) {
        throw new Error(isKo ? '입금자명과 휴대폰 번호를 확인해주세요.' : 'Check the depositor name and phone number.');
      }
      const order = await createMembershipPaymentOrder(plan.id, billingCycle, {
        paymentProvider,
        depositorName: depositorName.trim(),
        buyerContact,
      });
      if (paymentProvider === 'bank_transfer') {
        if (!order.bankTransfer) {
          throw new Error(isKo ? '계좌이체 안내를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' : 'Unable to load bank transfer instructions. Please try again.');
        }
        setBankOrder({ ...order, paymentProvider: 'bank_transfer' });
        setProcessingPlan(null);
        return;
      }
      await requestTossPayment({
        orderId: order.orderNumber,
        orderName: order.orderName,
        amount: order.amount,
        customerName: profile.name || user.displayName || 'LinkZip 회원',
        customerEmail: user.email || undefined,
        paymentKind: 'membership',
      });
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : (isKo ? '결제를 시작하지 못했습니다.' : 'Unable to start payment.'));
      setProcessingPlan(null);
    }
  };

  return (
    <div className="space-y-8 pb-20 font-sans">
      <section className="overflow-hidden rounded-[28px] bg-gray-950 px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Crown className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{isKo ? '현재 플랜' : 'Current membership'}</p>
              <h3 className="mt-0.5 text-xl font-black">{isKo ? currentPlan.nameKo : currentPlan.name}</h3>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black">
            {hasBetaLifetimePremium ? (isKo ? '베타 평생 이용' : 'Lifetime beta access') : `${currentPlan.monthlyPrice.toLocaleString()}${isKo ? '원 / 월' : ' KRW / month'}`}
          </span>
        </div>
        <p className="mt-5 max-w-xl text-xs font-medium leading-relaxed text-gray-300">
          {hasBetaLifetimePremium
            ? (isKo ? '비공개 베타 참여 혜택으로 프리미엄 기능을 이 계정에서 평생 이용할 수 있습니다.' : 'Your private beta benefit keeps Premium active for the lifetime of this account.')
            : (isKo ? '결제가 승인되면 계정에 플랜이 바로 적용됩니다. 월간·연간 이용권은 자동 갱신되지 않습니다.' : 'Your plan activates immediately after payment. Monthly and annual passes do not renew automatically.')}
        </p>
        {hasBetaLifetimePremium && (
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-[11px] font-bold leading-relaxed text-gray-200">
            {isKo
              ? '베타 운영 한도: 공유 파일 업로드 합계 100MB/일 · 공유 파일 다운로드 합계 100회/일'
              : 'Beta usage limits: 100MB of shared-file uploads and 100 shared-file downloads per day.'}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/8 px-3 py-2.5"><p className="text-[9px] font-black text-gray-400">프로필</p><strong className="mt-1 block text-sm">{profileCount}/{currentEntitlements.maxProfiles}</strong></div>
          <div className="rounded-2xl bg-white/8 px-3 py-2.5"><p className="text-[9px] font-black text-gray-400">등록 상품</p><strong className="mt-1 block text-sm">{totalProducts}/무제한</strong></div>
          <div className="rounded-2xl bg-white/8 px-3 py-2.5"><p className="text-[9px] font-black text-gray-400">DM 규칙</p><strong className="mt-1 block text-sm">{dmRulesCount}/무제한</strong></div>
          <div className="rounded-2xl bg-white/8 px-3 py-2.5"><p className="text-[9px] font-black text-gray-400">이용 종료</p><strong className="mt-1 block text-xs">{hasBetaLifetimePremium ? '평생 유지' : membershipPeriodEndsAt ? new Date(membershipPeriodEndsAt).toLocaleDateString('ko-KR') : '무료 계속'}</strong></div>
        </div>
      </section>

      {bankOrder?.bankTransfer && <BankTransferInstructions orderNumber={bankOrder.orderNumber} amount={bankOrder.amount} instructions={bankOrder.bankTransfer} buyerContact={buyerContact} onDone={() => setBankOrder(null)} />}

      {isSiteAdmin && (
        <section className="rounded-[28px] border border-sky-200 bg-sky-50 p-5 sm:p-7">
          <p className="text-sm font-black text-sky-950">관리자 플랜 선택 모드</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-sky-700">결제 없이 아래 플랜을 자유롭게 선택할 수 있습니다. 선택 즉시 실제 기능 권한과 판매 수수료가 변경됩니다.</p>
        </section>
      )}

      {!isSiteAdmin && <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-7">
        <p className="text-xs font-black text-gray-900">결제 방법</p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
          <button type="button" onClick={() => setPaymentProvider('toss')} className={`cursor-pointer rounded-xl py-2.5 text-xs font-black ${paymentProvider === 'toss' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>토스페이먼츠</button>
          <button type="button" onClick={() => setPaymentProvider('bank_transfer')} className={`cursor-pointer rounded-xl py-2.5 text-xs font-black ${paymentProvider === 'bank_transfer' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>계좌이체</button>
        </div>
        {paymentProvider === 'bank_transfer' && <div className="mt-3 grid gap-2 sm:grid-cols-2"><input value={depositorName} onChange={(event) => setDepositorName(event.target.value)} placeholder="입금자명" className="rounded-xl border border-gray-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-black" /><input type="tel" inputMode="tel" value={buyerContact} onChange={(event) => setBuyerContact(event.target.value)} placeholder="입금 확인 알림을 받을 휴대폰 번호" className="rounded-xl border border-gray-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-black" /></div>}
      </section>}

      {!isSiteAdmin && <div className="flex items-center justify-center gap-3 py-1">
        <span className={`text-sm font-black ${!annualBilling ? 'text-gray-950' : 'text-gray-400'}`}>{isKo ? '월간' : 'Monthly'}</span>
        <button
          type="button"
          role="switch"
          aria-checked={annualBilling}
          onClick={() => setAnnualBilling((value) => !value)}
          className={`relative h-9 w-[68px] rounded-full border-2 border-[#171714] p-1 transition-colors ${annualBilling ? 'bg-[#ff5f35]' : 'bg-gray-950'}`}
        >
          <span className={`block h-7 w-7 rounded-full bg-white shadow-sm transition-transform ${annualBilling ? 'translate-x-8' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-black ${annualBilling ? 'text-gray-950' : 'text-gray-400'}`}>{isKo ? '연간' : 'Annual'}</span>
        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black text-orange-600">{isKo ? '2개월 무료' : '2 months free'}</span>
      </div>}

      <div className="grid gap-5 lg:grid-cols-3 xl:gap-7">
        {MEMBERSHIP_PLANS.map((plan) => {
          const active = plan.id === membershipPlan;
          const canPurchase = isSiteAdmin
            ? plan.id !== membershipPlan
            : plan.id !== 'basic' && planRank[plan.id] > planRank[membershipPlan];
          const isProcessing = processingPlan === plan.id;
          const styles = accentStyles[plan.accent];
          return (
            <article key={plan.id} className={`relative flex min-h-[560px] flex-col rounded-[28px] border p-6 xl:p-7 ${styles.card}`}>
              {plan.recommended && <span className="absolute right-4 top-4 rounded-full border border-[#171714] bg-[#d9ff67] px-2.5 py-1 text-[9px] font-black text-[#171714]">{isKo ? '추천' : 'Recommended'}</span>}
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${styles.icon}`}>
                {plan.id === 'premium' ? <Crown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">{plan.name}</p>
              <h3 className="mt-1 text-xl font-black text-gray-950">{isKo ? plan.nameKo : plan.name}</h3>
              <p className="mt-2 min-h-10 text-xs font-medium leading-relaxed text-gray-500">{isKo ? plan.descriptionKo : plan.description}</p>
              <div className="mt-5 flex items-end gap-1 text-gray-950">
                <strong className="text-3xl font-black tracking-tight">{displayedPrice(plan.monthlyPrice).toLocaleString()}</strong>
                <span className="pb-1 text-[11px] font-bold text-gray-500">{isKo ? '원 / 월' : 'KRW / mo'}</span>
              </div>
              {annualBilling && plan.monthlyPrice > 0 && <p className="mt-1 text-[10px] font-bold text-gray-400">{isKo ? `연 ${membershipCheckoutAmount(plan, 'annual').toLocaleString()}원 일시 결제` : `${membershipCheckoutAmount(plan, 'annual').toLocaleString()} KRW prepaid yearly`}</p>}
              <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 px-3 py-2.5">
                <p className="text-[10px] font-bold text-gray-500">{isKo ? '상품 판매 수수료' : 'Sales fee'}</p>
                <p className="mt-0.5 text-lg font-black text-gray-950">{plan.salesFeePercent}% <span className="text-[9px] font-bold text-gray-400">{isKo ? 'PG 수수료 별도' : 'PG fee separate'}</span></p>
              </div>
              <ul className="mt-5 flex-1 space-y-3">
                {(isKo ? plan.featuresKo : plan.features).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs font-bold leading-relaxed text-gray-700">{feature.includes('내보내기') || feature.includes('export') ? <Download className={`mt-0.5 h-4 w-4 shrink-0 ${styles.check}`} /> : <Check className={`mt-0.5 h-4 w-4 shrink-0 ${styles.check}`} />}{feature}</li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!canPurchase || processingPlan !== null}
                onClick={() => void (isSiteAdmin ? handleAdminPlanChange(plan) : handleCheckout(plan))}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-black transition ${canPurchase && processingPlan === null ? 'hover:-translate-y-0.5 hover:shadow-lg' : 'cursor-not-allowed opacity-50'} ${styles.button}`}
              >
                {isProcessing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {active
                  ? (isKo ? '현재 플랜' : 'Current plan')
                  : isSiteAdmin
                    ? (isProcessing ? '변경 중' : `${isKo ? plan.nameKo : plan.name} 선택`)
                  : plan.id === 'basic'
                    ? (isKo ? '무료 플랜' : 'Free plan')
                    : !canPurchase
                      ? (isKo ? '현재 플랜보다 낮음' : 'Lower plan')
                      : isProcessing
                        ? (isKo ? '결제 준비 중' : 'Preparing payment')
                        : paymentProvider === 'bank_transfer'
                          ? (isKo ? '입금 안내 받기' : 'Get bank details')
                          : annualBilling
                            ? (isKo ? '연간 결제하기' : 'Pay annually')
                            : (isKo ? '월간 결제하기' : 'Pay monthly')}
              </button>
            </article>
          );
        })}
      </div>

      {checkoutError && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[11px] font-bold leading-relaxed text-red-700">{checkoutError}</p>}
      {!isSiteAdmin && <p className="rounded-2xl bg-gray-100 px-4 py-3 text-[11px] font-semibold leading-relaxed text-gray-500">
        {paymentProvider === 'bank_transfer'
          ? (isKo ? '계좌이체 주문을 접수하면 입금 계좌와 기한이 표시됩니다. 입금 확인 후 선택한 기간 동안 플랜이 활성화됩니다.' : 'Bank details and a due date are shown after placing the order. Your plan activates after the transfer is confirmed.')
          : (isKo ? '토스페이먼츠에서 결제를 완료하면 선택한 기간 동안 플랜이 활성화됩니다. 현재는 자동 갱신 없는 기간제 이용권이며, PG 결제창에서 최종 금액을 다시 확인할 수 있습니다.' : 'The selected plan activates after Toss Payments approval. Passes are prepaid and do not renew automatically.')}
      </p>}

      {!isSiteAdmin && <section className="rounded-[24px] border border-gray-200 bg-white p-5 text-gray-600 sm:p-6">
        <h3 className="text-sm font-black text-gray-950">{isKo ? '결제 및 환불 안내' : 'Payment and refund information'}</h3>
        <div className="mt-3 space-y-2 text-[11px] font-semibold leading-6">
          <p>{isKo ? '본 상품은 1개월(또는 1년) 단위로 이용하는 기간제 이용권이며, 현재 자동 갱신되지 않습니다.' : 'Plans are prepaid for one month or one year and currently do not renew automatically.'}</p>
          <p>
            {isKo ? '결제 진행 시, 아래 ' : 'By proceeding with payment, you agree to the '}
            <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="font-black text-gray-950 underline underline-offset-2">
              {isKo ? '[환불·취소 정책]' : '[Refund and cancellation policy]'}
            </a>
            {isKo ? '에 동의한 것으로 간주됩니다.' : '.'}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{isKo ? '서비스 이용 종료 또는 환불 요청은 이용약관과 환불·취소 정책 및 관련 법령에 따라 처리됩니다.' : 'Cancellation and refund requests are handled under the terms, refund policy, and applicable law.'}</li>
            <li>{isKo ? '장기 결제 할인 제공은 별도의 안내 없이 변경되거나 종료될 수 있습니다.' : 'Long-term payment discounts may change or end without separate notice.'}</li>
            <li>
              {isKo ? '기타 결제 및 이용권 관련 문의는 고객센터로 연락해 주세요: ' : 'For billing questions, contact customer support: '}
              <a href={`mailto:${BUSINESS_INFO.customerServiceEmail}`} className="font-black text-gray-950 underline underline-offset-2">{BUSINESS_INFO.customerServiceEmail}</a>
              <span> · </span>
              <a href={`tel:${BUSINESS_INFO.customerServicePhone.replace(/-/g, '')}`} className="font-black text-gray-950 underline underline-offset-2">{BUSINESS_INFO.customerServicePhone}</a>
            </li>
          </ul>
        </div>
      </section>}
    </div>
  );
};

export default PlanManagementEditor;
