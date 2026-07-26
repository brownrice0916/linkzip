import React from 'react';
import { Check, Crown, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';

const PlanManagementEditor: React.FC = () => {
  const language = useStore((state) => state.language);
  const tr = (ko: string, en: string) => language === 'ko' ? ko : en;

  return (
    <div className="space-y-5 pb-20 font-sans">
      <section className="overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-sm">
        <div className="bg-gray-950 px-6 py-7 text-white sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12"><Crown className="h-5 w-5" /></div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">LinkZip plan</p>
              <h3 className="mt-0.5 text-xl font-black">{tr('무료 플랜', 'Free plan')}</h3>
            </div>
          </div>
          <p className="mt-5 max-w-lg text-xs font-medium leading-relaxed text-gray-300">{tr('현재 핵심 프로필·링크·디자인 기능을 무료로 이용하고 있습니다.', 'You currently have access to the core profile, link, and design features for free.')}</p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
          {[tr('여러 프로필 관리', 'Multiple profiles'), tr('링크와 컬렉션 편집', 'Links and collections'), tr('커스텀 디자인', 'Custom design'), tr('기본 통계 분석', 'Basic analytics')].map((feature) => (
            <div key={feature} className="flex items-center gap-2.5 rounded-2xl bg-gray-50 px-4 py-3 text-xs font-bold text-gray-700"><Check className="h-4 w-4 text-emerald-600" />{feature}</div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-between gap-4 rounded-[22px] border border-purple-100 bg-purple-50/70 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white"><Sparkles className="h-5 w-5" /></div>
          <div><h3 className="text-sm font-black text-gray-900">{tr('프로 플랜', 'Pro plan')}</h3><p className="mt-0.5 text-xs font-medium text-gray-500">{tr('고급 분석과 추가 기능은 준비 중입니다.', 'Advanced analytics and additional features are coming soon.')}</p></div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-purple-700 shadow-sm">{tr('출시 예정', 'Coming soon')}</span>
      </section>
    </div>
  );
};

export default PlanManagementEditor;
