import React, { useState } from 'react';
import { Check, Crown, Download, LoaderCircle, Sparkles } from 'lucide-react';
import { MEMBERSHIP_PLANS, membershipCheckoutAmount, type MembershipPlan, type MembershipPlanDefinition } from '../../domain/membershipPlans';
import { useStore } from '../../store/useStore';
import { createMembershipPaymentOrder } from '../../services/membershipService';
import { requestTossPayment } from '../../services/tossPaymentService';

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
    card: 'border-violet-300 bg-gradient-to-b from-violet-50 to-white shadow-[0_16px_40px_rgba(124,58,237,0.12)]',
    icon: 'bg-violet-600 text-white',
    check: 'text-violet-600',
    button: 'bg-violet-600 text-white',
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
  const language = useStore((state) => state.language);
  const membershipPlan = useStore((state) => state.membershipPlan);
  const user = useStore((state) => state.user);
  const profile = useStore((state) => state.profile);
  const isKo = language === 'ko';
  const currentPlan = MEMBERSHIP_PLANS.find((plan) => plan.id === membershipPlan) || MEMBERSHIP_PLANS[0];
  const displayedPrice = (monthlyPrice: number) => annualBilling ? Math.round(monthlyPrice * 0.5) : monthlyPrice;
  const planRank: Record<MembershipPlan, number> = { basic: 0, standard: 1, premium: 2 };

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
      const order = await createMembershipPaymentOrder(plan.id, billingCycle);
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
    <div className="space-y-6 pb-20 font-sans">
      <section className="overflow-hidden rounded-[24px] bg-gray-950 px-6 py-7 text-white shadow-sm sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Crown className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{isKo ? '현재 플랜' : 'Current membership'}</p>
              <h3 className="mt-0.5 text-xl font-black">{isKo ? currentPlan.nameKo : currentPlan.name}</h3>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black">
            {currentPlan.monthlyPrice.toLocaleString()}{isKo ? '원 / 월' : ' KRW / month'}
          </span>
        </div>
        <p className="mt-5 max-w-xl text-xs font-medium leading-relaxed text-gray-300">
          {isKo ? '결제가 승인되면 계정에 플랜이 바로 적용됩니다. 월간·연간 이용권은 자동 갱신되지 않습니다.' : 'Your plan activates immediately after payment. Monthly and annual passes do not renew automatically.'}
        </p>
      </section>

      <div className="flex items-center justify-center gap-3 py-1">
        <span className={`text-sm font-black ${!annualBilling ? 'text-gray-950' : 'text-gray-400'}`}>{isKo ? '월간' : 'Monthly'}</span>
        <button
          type="button"
          role="switch"
          aria-checked={annualBilling}
          onClick={() => setAnnualBilling((value) => !value)}
          className={`relative h-9 w-[68px] rounded-full p-1 transition-colors ${annualBilling ? 'bg-violet-600' : 'bg-gray-950'}`}
        >
          <span className={`block h-7 w-7 rounded-full bg-white shadow-sm transition-transform ${annualBilling ? 'translate-x-8' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-black ${annualBilling ? 'text-gray-950' : 'text-gray-400'}`}>{isKo ? '연간' : 'Annual'}</span>
        <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black text-orange-600">{isKo ? '50% 할인' : '50% off'}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {MEMBERSHIP_PLANS.map((plan) => {
          const active = plan.id === membershipPlan;
          const canPurchase = plan.id !== 'basic' && planRank[plan.id] > planRank[membershipPlan];
          const isProcessing = processingPlan === plan.id;
          const styles = accentStyles[plan.accent];
          return (
            <article key={plan.id} className={`relative flex min-h-[360px] flex-col rounded-[24px] border p-5 ${styles.card}`}>
              {plan.recommended && <span className="absolute right-4 top-4 rounded-full bg-violet-100 px-2.5 py-1 text-[9px] font-black text-violet-700">{isKo ? '추천' : 'Recommended'}</span>}
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
                  <li key={feature} className="flex items-center gap-2 text-xs font-bold text-gray-700">{feature === '데이터 다운로드' || feature === 'Data download' ? <Download className={`h-4 w-4 shrink-0 ${styles.check}`} /> : <Check className={`h-4 w-4 shrink-0 ${styles.check}`} />}{feature}</li>
                ))}
              </ul>
              <button
                type="button"
                disabled={!canPurchase || processingPlan !== null}
                onClick={() => void handleCheckout(plan)}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3 text-xs font-black transition ${canPurchase && processingPlan === null ? 'hover:-translate-y-0.5 hover:shadow-lg' : 'cursor-not-allowed opacity-50'} ${styles.button}`}
              >
                {isProcessing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {active
                  ? (isKo ? '현재 플랜' : 'Current plan')
                  : plan.id === 'basic'
                    ? (isKo ? '무료 플랜' : 'Free plan')
                    : !canPurchase
                      ? (isKo ? '현재 플랜보다 낮음' : 'Lower plan')
                      : isProcessing
                        ? (isKo ? '결제 준비 중' : 'Preparing payment')
                        : annualBilling
                          ? (isKo ? '연간 결제하기' : 'Pay annually')
                          : (isKo ? '월간 결제하기' : 'Pay monthly')}
              </button>
            </article>
          );
        })}
      </div>

      {checkoutError && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[11px] font-bold leading-relaxed text-red-700">{checkoutError}</p>}
      <p className="rounded-2xl bg-gray-100 px-4 py-3 text-[11px] font-semibold leading-relaxed text-gray-500">
        {isKo ? '토스페이먼츠에서 결제를 완료하면 선택한 기간 동안 플랜이 활성화됩니다. 현재는 자동 갱신 없는 기간제 이용권이며, PG 결제창에서 최종 금액을 다시 확인할 수 있습니다.' : 'The selected plan activates after Toss Payments approval. Passes are prepaid and do not renew automatically.'}
      </p>
    </div>
  );
};

export default PlanManagementEditor;
