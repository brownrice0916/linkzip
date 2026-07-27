import React, { useState } from 'react';
import { Check, Crown, Download, Sparkles } from 'lucide-react';
import { MEMBERSHIP_PLANS, type MembershipPlanDefinition } from '../../domain/membershipPlans';
import { useStore } from '../../store/useStore';

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
  const language = useStore((state) => state.language);
  const membershipPlan = useStore((state) => state.membershipPlan);
  const isKo = language === 'ko';
  const currentPlan = MEMBERSHIP_PLANS.find((plan) => plan.id === membershipPlan) || MEMBERSHIP_PLANS[0];
  const displayedPrice = (monthlyPrice: number) => annualBilling ? Math.round(monthlyPrice * 0.5) : monthlyPrice;

  return (
    <div className="space-y-6 pb-20 font-sans">
      <section className="overflow-hidden rounded-[24px] bg-gray-950 px-6 py-7 text-white shadow-sm sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Crown className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Current membership</p>
              <h3 className="mt-0.5 text-xl font-black">{isKo ? currentPlan.nameKo : currentPlan.name}</h3>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black">
            {currentPlan.monthlyPrice.toLocaleString()}{isKo ? '원 / 월' : ' KRW / month'}
          </span>
        </div>
        <p className="mt-5 max-w-xl text-xs font-medium leading-relaxed text-gray-300">
          {isKo ? '회원 타입은 계정 단위로 적용됩니다. 결제 기능 연결 전까지 현재 회원은 베이직으로 표시됩니다.' : 'Membership applies to your account. Until billing is connected, existing members are shown as Basic.'}
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
              {annualBilling && plan.monthlyPrice > 0 && <p className="mt-1 text-[10px] font-bold text-gray-400">{isKo ? `연 ${Math.round(plan.monthlyPrice * 6).toLocaleString()}원 청구` : `${Math.round(plan.monthlyPrice * 6).toLocaleString()} KRW billed yearly`}</p>}
              <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 px-3 py-2.5">
                <p className="text-[10px] font-bold text-gray-500">{isKo ? '상품 판매 수수료' : 'Sales fee'}</p>
                <p className="mt-0.5 text-lg font-black text-gray-950">{plan.salesFeePercent}% <span className="text-[9px] font-bold text-gray-400">{isKo ? 'PG 수수료 별도' : 'PG fee separate'}</span></p>
              </div>
              <ul className="mt-5 flex-1 space-y-3">
                {(isKo ? plan.featuresKo : plan.features).map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs font-bold text-gray-700">{feature === '데이터 다운로드' || feature === 'Data download' ? <Download className={`h-4 w-4 shrink-0 ${styles.check}`} /> : <Check className={`h-4 w-4 shrink-0 ${styles.check}`} />}{feature}</li>
                ))}
              </ul>
              <button type="button" disabled className={`mt-6 w-full cursor-not-allowed rounded-full py-3 text-xs font-black ${active ? 'opacity-100' : 'opacity-50'} ${styles.button}`}>
                {active ? (isKo ? '현재 플랜' : 'Current plan') : (isKo ? '결제 연동 예정' : 'Billing coming soon')}
              </button>
            </article>
          );
        })}
      </div>

      <p className="rounded-2xl bg-gray-100 px-4 py-3 text-[11px] font-semibold leading-relaxed text-gray-500">
        {isKo ? '현재는 회원 타입과 플랜 화면만 구분했습니다. 기능 제한은 결제·구독 검증을 서버에 연결할 때 적용해야 기존 사용자의 기능이 갑자기 막히지 않습니다.' : 'Membership types and plan UI are now separated. Feature limits will be enabled with server-side billing verification so existing users are not unexpectedly restricted.'}
      </p>
    </div>
  );
};

export default PlanManagementEditor;
