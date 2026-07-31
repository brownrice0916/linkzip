import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import PlanManagementEditor from '../components/admin/PlanManagementEditor';
import BusinessFooter from '../components/BusinessFooter';
import LinkZipLogo from '../components/brand/LinkZipLogo';
import { MEMBERSHIP_PLANS } from '../domain/membershipPlans';
import { useStore } from '../store/useStore';

const PlanManagementPage = () => {
  const membershipPlan = useStore((state) => state.membershipPlan);
  const user = useStore((state) => state.user);
  const currentPlan = MEMBERSHIP_PLANS.find((plan) => plan.id === membershipPlan) || MEMBERSHIP_PLANS[0];

  return (
    <div className="min-h-screen bg-[#f4f1e8] text-[#171714]">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-[1520px] items-center gap-4 px-5 sm:px-8 lg:px-10">
          <Link to="/admin" className="inline-flex items-center" aria-label="LinkZip 프로필 목록으로 이동">
            <LinkZipLogo markClassName="h-10 w-10" textClassName="text-xl" />
          </Link>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-xs font-black">{user?.email || 'LinkZip 회원'}</p>
              <p className="mt-0.5 text-[10px] font-bold text-gray-400">현재 {currentPlan.nameKo} 플랜</p>
            </div>
            <Link to="/admin" className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-xs font-black text-gray-700 transition hover:border-gray-950 hover:text-gray-950">
              <ArrowLeft className="h-4 w-4" /> 프로필로 돌아가기
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1520px] px-4 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#ff5f35]"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[0.18em]">Membership</span></div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-5xl lg:text-6xl">플랜 관리</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-gray-500 sm:text-base">운영 규모에 맞는 플랜을 비교하고 결제 방식과 이용 기간을 한곳에서 관리하세요.</p>
          </div>
        </div>
        <PlanManagementEditor />
      </main>

      <BusinessFooter />
    </div>
  );
};

export default PlanManagementPage;
