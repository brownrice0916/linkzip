import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CalendarClock, Check, ChevronRight, Clipboard,
  CreditCard, ExternalLink, FileStack, Gift, KeyRound, LayoutDashboard, Loader2,
  Mail, MessageCircle, PackageCheck, Plus, RefreshCw, Search, ShieldCheck, Ticket,
  UserCheck, UserRound, UserX, Users, WalletCards, X,
} from 'lucide-react';
import {
  betaErrorMessage,
  createBetaInviteCode,
  getSiteAdminDashboard,
  setBetaInviteStatus,
  setBetaMemberStatus,
  type BetaInvite,
  type BetaMember,
  type SiteAdminMetrics,
} from '../services/betaAccessService';
import {
  listBankTransferOrders,
  manageBankTransferOrder,
  type BankTransferOrderSummary,
} from '../services/commerceService';

type AdminTab = 'overview' | 'members' | 'beta';
type PlanFilter = 'all' | 'basic' | 'standard' | 'premium';
type StatusFilter = 'all' | 'active' | 'disabled';

const EMPTY_METRICS: SiteAdminMetrics = {
  totalProfiles: 0, totalBlocks: 0, salesOrders: 0, donations: 0, guestbookEntries: 0,
  anonymousMessages: 0, collectedCustomers: 0, grossSalesAmount: 0, grossDonationAmount: 0,
  paidMemberships: 0, membershipRevenue: 0,
  planBreakdown: { basic: 0, standard: 0, premium: 0 },
};

const dateFormatter = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
const formatDate = (value: string | null | undefined) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date);
};
const formatMoney = (value: number) => `${Math.max(0, value || 0).toLocaleString('ko-KR')}원`;
const planLabel = (plan: string) => plan === 'premium' ? '프리미엄' : plan === 'standard' ? '스탠다드' : '베이직';
const planClass = (plan: string) => plan === 'premium'
  ? 'bg-amber-100 text-amber-800'
  : plan === 'standard' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600';
const betaLabel = (status: string) => status === 'active'
  ? '베타 참여 중'
  : status === 'legacy' ? '기존 회원' : status === 'disabled' ? '이용 중지' : '초대 대기';
const isMemberDisabled = (member: BetaMember) => member.disabled || member.status === 'disabled' || member.betaStatus === 'disabled';

const MetricCard = ({ label, value, caption, icon: Icon, tone = 'slate' }: {
  label: string; value: string | number; caption?: string; icon: React.ElementType; tone?: 'slate' | 'violet' | 'emerald' | 'amber';
}) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700', violet: 'bg-violet-100 text-violet-700',
    emerald: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700',
  };
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-xs font-bold text-slate-500">{label}</p><strong className="mt-3 block text-3xl font-black tracking-tight">{value}</strong>{caption && <p className="mt-1 text-[11px] font-semibold text-slate-400">{caption}</p>}</div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
    </div>
  </article>;
};

const SiteAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<BetaMember[]>([]);
  const [invites, setInvites] = useState<BetaInvite[]>([]);
  const [metrics, setMetrics] = useState<SiteAdminMetrics>(EMPTY_METRICS);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedMember, setSelectedMember] = useState<BetaMember | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [label, setLabel] = useState('비공개 베타 초대');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [workingId, setWorkingId] = useState('');
  const [membershipTransfers, setMembershipTransfers] = useState<BankTransferOrderSummary[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, transfers] = await Promise.all([
        getSiteAdminDashboard(),
        listBankTransferOrders(true),
      ]);
      const nextMembers = data.members || [];
      setMembers(nextMembers);
      setInvites(data.invites || []);
      setMetrics({ ...EMPTY_METRICS, ...(data.metrics || {}) });
      setMembershipTransfers(transfers.filter((order) => order.kind === 'membership'));
      setSelectedMember((current) => current ? nextMembers.find((member) => member.uid === current.uid) || null : null);
    } catch (loadError) {
      setError(betaErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedMember && !isCreateOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectedMember(null);
      setIsCreateOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isCreateOpen, selectedMember]);

  const activeMembers = members.filter((member) => !isMemberDisabled(member)).length;
  const betaMembers = members.filter((member) => member.betaStatus === 'active' || member.betaStatus === 'legacy').length;
  const activeInvites = invites.filter((invite) => invite.status === 'active' && invite.useCount < invite.maxUses).length;
  const unreadMessages = members.reduce((sum, member) => sum + (member.unreadAnonymousMessages || 0), 0);
  const pendingOrders = members.reduce((sum, member) => sum + (member.pendingSalesOrders || 0), 0);
  const expiringPlans = members.filter((member) => {
    if (!member.membershipPeriodEndsAt) return false;
    const remaining = new Date(member.membershipPeriodEndsAt).getTime() - Date.now();
    return remaining > 0 && remaining < 14 * 24 * 60 * 60 * 1000;
  }).length;

  const filteredMembers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return members.filter((member) => {
      const matchesText = !keyword || `${member.email} ${member.displayName} ${member.username} ${member.inviteLabel}`.toLowerCase().includes(keyword);
      const matchesPlan = planFilter === 'all' || member.membershipPlan === planFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'disabled' ? isMemberDisabled(member) : !isMemberDisabled(member));
      return matchesText && matchesPlan && matchesStatus;
    });
  }, [members, planFilter, query, statusFilter]);

  const handleCreate = async () => {
    setWorkingId('create'); setError('');
    try {
      const result = await createBetaInviteCode({ label, maxUses, expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59+09:00`).toISOString() : undefined });
      setCreatedCode(result.code); await load();
    } catch (createError) { setError(betaErrorMessage(createError)); } finally { setWorkingId(''); }
  };

  const toggleInvite = async (invite: BetaInvite) => {
    setWorkingId(invite.id);
    try { await setBetaInviteStatus(invite.id, invite.status === 'active' ? 'disabled' : 'active'); await load(); }
    catch (toggleError) { setError(betaErrorMessage(toggleError)); } finally { setWorkingId(''); }
  };

  const toggleMember = async (member: BetaMember) => {
    setWorkingId(member.uid);
    try { await setBetaMemberStatus(member.uid, isMemberDisabled(member) ? 'active' : 'disabled'); await load(); }
    catch (toggleError) { setError(betaErrorMessage(toggleError)); } finally { setWorkingId(''); }
  };

  const handleMembershipTransfer = async (order: BankTransferOrderSummary, action: 'confirm' | 'cancel') => {
    setWorkingId(order.orderNumber);
    try {
      await manageBankTransferOrder(order.orderNumber, action);
      await load();
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : '플랜 입금 상태를 변경하지 못했습니다.');
    } finally {
      setWorkingId('');
    }
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ElementType; count?: number }> = [
    { id: 'overview', label: '운영 요약', icon: LayoutDashboard },
    { id: 'members', label: '가입자 관리', icon: Users, count: members.length },
    { id: 'beta', label: '베타 초대', icon: Ticket, count: activeInvites },
  ];

  return <div className="min-h-screen bg-[#f5f6f8] text-slate-950">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-[1440px] items-center gap-3 px-4 sm:px-7">
        <button type="button" onClick={() => navigate('/admin')} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 hover:bg-slate-100" aria-label="프로필 관리로 돌아가기"><ArrowLeft className="h-5 w-5" /></button>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white"><ShieldCheck className="h-5 w-5" /></span>
        <div><h1 className="text-base font-black sm:text-lg">LinkZip 관리자</h1><p className="text-[10px] font-bold text-slate-400">비공개 베타 운영</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="ml-auto flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black hover:bg-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">새로고침</span></button>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-7 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-24">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {navItems.map(({ id, label: itemLabel, icon: Icon, count }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex min-w-max cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition lg:w-full ${tab === id ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}><Icon className="h-4 w-4" /><span>{itemLabel}</span>{typeof count === 'number' && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${tab === id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}</button>)}
        </nav>
      </aside>

      <main className="min-w-0 space-y-6">
        {error && <div className="flex items-start justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"><span>{error}</span><button type="button" onClick={() => setError('')} className="cursor-pointer"><X className="h-4 w-4" /></button></div>}

        {tab === 'overview' && <>
          <section><h2 className="text-2xl font-black">운영 요약</h2><p className="mt-1 text-sm font-medium text-slate-500">가입, 콘텐츠, 거래 상태를 한눈에 확인합니다.</p></section>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="전체 가입자" value={`${members.length}명`} caption={`활성 ${activeMembers}명`} icon={Users} />
            <MetricCard label="베타 참여자" value={`${betaMembers}명`} caption={`활성 초대 ${activeInvites}개`} icon={ShieldCheck} tone="violet" />
            <MetricCard label="거래액" value={formatMoney(metrics.grossSalesAmount + metrics.grossDonationAmount)} caption={`주문 ${metrics.salesOrders}건 · 후원 ${metrics.donations}건`} icon={WalletCards} tone="emerald" />
            <MetricCard label="플랜 결제" value={formatMoney(metrics.membershipRevenue)} caption={`완료 ${metrics.paidMemberships}건`} icon={CreditCard} tone="amber" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5"><h3 className="font-black">서비스 사용 현황</h3></div>
              <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ['공개 프로필', metrics.totalProfiles, '개', FileStack], ['등록 블록', metrics.totalBlocks, '개', PackageCheck],
                  ['상품 주문', metrics.salesOrders, '건', CreditCard], ['후원', metrics.donations, '건', Gift],
                  ['방명록', metrics.guestbookEntries, '개', MessageCircle], ['수집 고객', metrics.collectedCustomers, '명', UserRound],
                ] as Array<[string, number, string, React.ElementType]>).map(([itemLabel, value, unit, Icon]) => <div key={itemLabel} className="flex items-center gap-3 bg-white p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon className="h-5 w-5" /></span><div><p className="text-[11px] font-bold text-slate-400">{itemLabel}</p><strong className="text-xl">{value.toLocaleString()}<small className="ml-1 text-xs text-slate-400">{unit}</small></strong></div></div>)}
              </div>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-black">플랜 구성</h3>
              <div className="mt-5 space-y-4">{(['basic', 'standard', 'premium'] as const).map((plan) => {
                const count = metrics.planBreakdown[plan]; const ratio = members.length ? Math.round((count / members.length) * 100) : 0;
                return <div key={plan}><div className="flex items-center justify-between text-xs"><span className="font-black">{planLabel(plan)}</span><span className="font-bold text-slate-400">{count}명 · {ratio}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${plan === 'premium' ? 'bg-amber-400' : plan === 'standard' ? 'bg-violet-500' : 'bg-slate-400'}`} style={{ width: `${ratio}%` }} /></div></div>;
              })}</div>
            </article>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><h3 className="font-black">확인할 항목</h3><button type="button" onClick={() => setTab('members')} className="cursor-pointer text-xs font-black text-violet-600">가입자 보기</button></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {([
                ['결제 대기 주문', pendingOrders, '배송·결제 상태 확인', CalendarClock, pendingOrders > 0],
                ['읽지 않은 메시지', unreadMessages, '고객 응답 확인', Mail, unreadMessages > 0],
                ['14일 내 플랜 만료', expiringPlans, '갱신 여부 확인', CreditCard, expiringPlans > 0],
                ['이용 중지 계정', members.length - activeMembers, '접근 제한 계정', UserX, members.length !== activeMembers],
              ] as Array<[string, number, string, React.ElementType, boolean]>).map(([itemLabel, value, caption, Icon, attention]) => <div key={itemLabel} className={`rounded-2xl border p-4 ${attention ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}><div className="flex items-center justify-between"><Icon className={`h-4 w-4 ${attention ? 'text-amber-700' : 'text-slate-400'}`} /><strong>{value}</strong></div><p className="mt-3 text-xs font-black">{itemLabel}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{caption}</p></div>)}
            </div>
          </section>

          {membershipTransfers.filter((order) => order.status === 'WAITING_DEPOSIT').length > 0 && <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-amber-700" /><div><h3 className="font-black">플랜 입금 확인 대기</h3><p className="text-[11px] font-semibold text-amber-800">실제 입금 내역과 입금자명을 확인한 뒤 처리해주세요.</p></div></div><div className="mt-4 space-y-2">{membershipTransfers.filter((order) => order.status === 'WAITING_DEPOSIT').map((order) => <div key={order.orderNumber} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4"><div><p className="text-sm font-black">{order.planName || order.productName} · {formatMoney(order.amount)}</p><p className="mt-1 text-[10px] font-bold text-slate-500">입금자 {order.depositorName} · {order.buyerContact} · {order.orderNumber}</p></div><div className="flex gap-2"><button type="button" disabled={workingId === order.orderNumber} onClick={() => void handleMembershipTransfer(order, 'confirm')} className="cursor-pointer rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50">입금 확인</button><button type="button" disabled={workingId === order.orderNumber} onClick={() => void handleMembershipTransfer(order, 'cancel')} className="cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-500 disabled:opacity-50">취소</button></div></div>)}</div></section>}
        </>}

        {tab === 'members' && <>
          <section className="flex flex-wrap items-end gap-3"><div><h2 className="text-2xl font-black">가입자 관리</h2><p className="mt-1 text-sm font-medium text-slate-500">가입자별 플랜과 서비스 이용 상태를 확인합니다.</p></div><span className="ml-auto rounded-full bg-white px-4 py-2 text-xs font-black shadow-sm">{filteredMembers.length}명</span></section>
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px]">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 이메일, 사용자명 검색" className="min-w-0 flex-1 text-sm outline-none" /></label>
              <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value as PlanFilter)} className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"><option value="all">전체 플랜</option><option value="basic">베이직</option><option value="standard">스탠다드</option><option value="premium">프리미엄</option></select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"><option value="all">전체 상태</option><option value="active">이용 중</option><option value="disabled">이용 중지</option></select>
            </div>
          </section>
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[minmax(220px,1.4fr)_130px_120px_150px_40px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-black text-slate-400 md:grid"><span>가입자</span><span>플랜</span><span>프로필</span><span>최근 로그인</span><span /></div>
            <div className="divide-y divide-slate-100">
              {filteredMembers.map((member) => <button key={member.uid} type="button" onClick={() => setSelectedMember(member)} className="grid w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50 md:grid-cols-[minmax(220px,1.4fr)_130px_120px_150px_40px]">
                <div className="flex min-w-0 items-center gap-3"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100">{member.photoURL ? <img src={member.photoURL} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-black text-slate-400">{(member.displayName || member.email || '?')[0]}</div>}</div><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-black">{member.displayName || member.username || '이름 없음'}</h3>{isMemberDisabled(member) && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-black text-red-600">중지</span>}</div><p className="truncate text-xs font-medium text-slate-500">{member.email || '이메일 없음'}</p></div></div>
                <div><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${planClass(member.membershipPlan)}`}>{planLabel(member.membershipPlan)}</span>{member.membershipBillingCycle && <p className="mt-1 text-[9px] font-bold text-slate-400">{member.membershipBillingCycle === 'annual' ? '연간 결제' : '월간 결제'}</p>}</div>
                <div><strong className="text-sm">{member.profileCount || 0}개</strong><p className="text-[10px] font-bold text-slate-400">블록 {member.blockCount || 0}개</p></div>
                <span className="text-[11px] font-bold text-slate-500">{formatDate(member.lastSignInAt)}</span><ChevronRight className="h-4 w-4 text-slate-300" />
              </button>)}
              {!loading && filteredMembers.length === 0 && <p className="py-14 text-center text-sm font-semibold text-slate-400">조건에 맞는 가입자가 없습니다.</p>}
              {loading && <p className="flex items-center justify-center gap-2 py-14 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> 불러오는 중</p>}
            </div>
          </section>
        </>}

        {tab === 'beta' && <>
          <section className="flex flex-wrap items-end gap-3"><div><h2 className="text-2xl font-black">베타 초대</h2><p className="mt-1 text-sm font-medium text-slate-500">초대 인원과 유효 기간을 관리합니다.</p></div><button type="button" onClick={() => { setCreatedCode(''); setIsCreateOpen(true); }} className="ml-auto flex cursor-pointer items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"><Plus className="h-4 w-4" /> 코드 만들기</button></section>
          <section className="grid gap-4 md:grid-cols-2">
            {invites.map((invite) => <article key={invite.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><KeyRound className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black">{invite.label}</h3><button type="button" onClick={() => navigator.clipboard.writeText(invite.code)} className="mt-1 flex cursor-pointer items-center gap-1 font-mono text-xs font-bold text-slate-500 hover:text-black">{invite.code}<Clipboard className="h-3.5 w-3.5" /></button></div><button type="button" onClick={() => void toggleInvite(invite)} disabled={workingId === invite.id} className={`cursor-pointer rounded-full px-3 py-1.5 text-[10px] font-black ${invite.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{workingId === invite.id ? '처리 중' : invite.status === 'active' ? '사용 중' : '중지됨'}</button></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">사용</span><strong className="mt-1 block">{invite.useCount} / {invite.maxUses}명</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">만료</span><strong className="mt-1 block truncate">{invite.expiresAt ? formatDate(invite.expiresAt) : '제한 없음'}</strong></div></div></article>)}
            {!loading && invites.length === 0 && <p className="col-span-full rounded-3xl border border-dashed border-slate-300 py-14 text-center text-sm font-semibold text-slate-400">만든 초대코드가 없습니다.</p>}
          </section>
        </>}
      </main>
    </div>

    {selectedMember && <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedMember(null)}><aside role="dialog" aria-modal="true" aria-label="가입자 상세" className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur"><div className="min-w-0 flex-1"><p className="text-[10px] font-black text-violet-600">가입자 상세</p><h2 className="truncate text-xl font-black">{selectedMember.displayName || selectedMember.username || '이름 없음'}</h2></div><button type="button" aria-label="가입자 상세 닫기" onClick={() => setSelectedMember(null)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="space-y-5 p-5">
        <section className="flex items-center gap-4 rounded-3xl bg-slate-950 p-5 text-white"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/10">{selectedMember.photoURL ? <img src={selectedMember.photoURL} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl font-black">{(selectedMember.displayName || selectedMember.email || '?')[0]}</div>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{selectedMember.email || '이메일 없음'}</p><p className="mt-1 text-xs text-slate-400">{selectedMember.uid}</p><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${planClass(selectedMember.membershipPlan)}`}>{planLabel(selectedMember.membershipPlan)}</span><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black">{betaLabel(selectedMember.betaStatus)}</span>{selectedMember.emailVerified && <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-black text-emerald-300">이메일 인증</span>}</div></div></section>

        <section className="rounded-3xl border border-slate-200 p-5"><div className="flex items-center justify-between"><h3 className="font-black">플랜 및 결제</h3><CreditCard className="h-4 w-4 text-slate-400" /></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">현재 플랜</span><strong className="mt-1 block">{planLabel(selectedMember.membershipPlan)}</strong></div><div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">결제 주기</span><strong className="mt-1 block">{selectedMember.membershipBillingCycle === 'annual' ? '연간' : selectedMember.membershipBillingCycle === 'monthly' ? '월간' : '무료'}</strong></div><div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">이용 만료</span><strong className="mt-1 block">{formatDate(selectedMember.membershipPeriodEndsAt)}</strong></div><div className="rounded-2xl bg-slate-50 p-3"><span className="text-slate-400">누적 플랜 결제</span><strong className="mt-1 block">{formatMoney(selectedMember.membershipPaidAmount)}</strong></div></div></section>

        <section className="rounded-3xl border border-slate-200 p-5"><h3 className="font-black">활동 및 거래</h3><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{[
          ['상품 주문', `${selectedMember.salesOrders || 0}건`, formatMoney(selectedMember.salesRevenue), PackageCheck],
          ['후원', `${selectedMember.donations || 0}건`, formatMoney(selectedMember.donationRevenue), Gift],
          ['방명록', `${selectedMember.guestbookEntries || 0}개`, '받은 글', MessageCircle],
          ['익명 메시지', `${selectedMember.anonymousMessages || 0}개`, `미확인 ${selectedMember.unreadAnonymousMessages || 0}개`, Mail],
          ['수집 고객', `${selectedMember.collectedCustomers || 0}명`, '고객 데이터', Users],
          ['등록 블록', `${selectedMember.blockCount || 0}개`, `프로필 ${selectedMember.profileCount || 0}개`, FileStack],
        ].map(([itemLabel, value, caption, Icon]) => <div key={String(itemLabel)} className="rounded-2xl bg-slate-50 p-3"><Icon className="h-4 w-4 text-slate-400" /><p className="mt-3 text-[10px] font-bold text-slate-400">{String(itemLabel)}</p><strong className="mt-0.5 block text-sm">{String(value)}</strong><p className="text-[9px] font-semibold text-slate-400">{String(caption)}</p></div>)}</div></section>

        <section className="rounded-3xl border border-slate-200 p-5"><div className="flex items-center justify-between"><h3 className="font-black">운영 프로필</h3><span className="text-xs font-bold text-slate-400">{selectedMember.profiles?.length || 0}개</span></div><div className="mt-3 space-y-2">{selectedMember.profiles?.map((profile) => <a key={profile.id || profile.username} href={`/${profile.username}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-slate-100"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm"><UserRound className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{profile.name || profile.username || '이름 없음'}</p><p className="truncate text-[10px] font-semibold text-slate-400">linkzip.kr/{profile.username} · 공개 {profile.visibleBlockCount}/{profile.blockCount}개</p></div><ExternalLink className="h-4 w-4 text-slate-300" /></a>)}{!selectedMember.profiles?.length && <p className="rounded-2xl bg-slate-50 py-8 text-center text-xs font-semibold text-slate-400">저장된 공개 프로필이 없습니다.</p>}</div></section>

        <section className="rounded-3xl border border-slate-200 p-5"><h3 className="font-black">계정 정보</h3><dl className="mt-4 divide-y divide-slate-100 text-xs">{[
          ['가입일', formatDate(selectedMember.joinedAt)], ['최근 로그인', formatDate(selectedMember.lastSignInAt)], ['최근 서비스 활동', formatDate(selectedMember.latestActivityAt)], ['마지막 저장', formatDate(selectedMember.updatedAt)], ['로그인 방식', selectedMember.providers?.map((provider) => provider.replace('.com', '')).join(', ') || '-'], ['가입 경로', selectedMember.inviteLabel || (selectedMember.source === 'legacy' ? '기존 가입자' : selectedMember.source === 'admin' ? '관리자' : '인증 계정')],
        ].map(([term, value]) => <div key={term} className="flex items-center justify-between gap-4 py-3"><dt className="font-bold text-slate-400">{term}</dt><dd className="text-right font-black">{value}</dd></div>)}</dl></section>

        <button type="button" onClick={() => void toggleMember(selectedMember)} disabled={workingId === selectedMember.uid} className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3.5 text-sm font-black ${isMemberDisabled(selectedMember) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{workingId === selectedMember.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : isMemberDisabled(selectedMember) ? <><UserCheck className="h-4 w-4" /> 이용 복구</> : <><UserX className="h-4 w-4" /> 이용 중지</>}</button>
      </div>
    </aside></div>}

    {isCreateOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="create-invite-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 id="create-invite-title" className="text-xl font-black">초대코드 만들기</h2><button type="button" aria-label="초대코드 창 닫기" onClick={() => setIsCreateOpen(false)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button></div>{createdCode ? <div className="mt-6"><div className="rounded-2xl bg-emerald-50 p-5 text-center"><Check className="mx-auto h-7 w-7 text-emerald-600" /><p className="mt-2 text-xs font-bold text-emerald-700">초대코드가 생성되었습니다.</p><code className="mt-3 block text-xl font-black tracking-wider">{createdCode}</code></div><button type="button" onClick={() => navigator.clipboard.writeText(createdCode)} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-black py-3.5 text-sm font-black text-white"><Clipboard className="h-4 w-4" /> 코드 복사</button></div> : <div className="mt-6 space-y-4"><label className="block text-xs font-black text-slate-600">용도<input value={label} onChange={(event) => setLabel(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-black" /></label><label className="block text-xs font-black text-slate-600">사용 가능 인원<input type="number" min="1" max="1000" value={maxUses} onChange={(event) => setMaxUses(Math.max(1, Number(event.target.value)))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-black" /></label><label className="block text-xs font-black text-slate-600">만료일 (선택)<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-black" /></label><button type="button" onClick={() => void handleCreate()} disabled={workingId === 'create'} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-black py-3.5 text-sm font-black text-white disabled:opacity-50">{workingId === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 생성하기</button></div>}</section></div>}
  </div>;
};

export default SiteAdmin;
