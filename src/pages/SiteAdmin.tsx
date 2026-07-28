import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Clipboard, KeyRound, Loader2, Plus, RefreshCw,
  Search, ShieldCheck, Ticket, UserCheck, UserX, Users, X,
} from 'lucide-react';
import {
  betaErrorMessage,
  createBetaInviteCode,
  getSiteAdminDashboard,
  setBetaInviteStatus,
  setBetaMemberStatus,
  type BetaInvite,
  type BetaMember,
} from '../services/betaAccessService';

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '-';

const SiteAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<BetaMember[]>([]);
  const [invites, setInvites] = useState<BetaInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [label, setLabel] = useState('비공개 베타 초대');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [workingId, setWorkingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSiteAdminDashboard();
      setMembers(data.members);
      setInvites(data.invites);
    } catch (loadError) {
      setError(betaErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredMembers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return members;
    return members.filter((member) => `${member.email} ${member.displayName} ${member.inviteLabel}`.toLowerCase().includes(keyword));
  }, [members, query]);

  const activeMembers = members.filter((member) => !member.disabled && member.status !== 'disabled').length;
  const activeInvites = invites.filter((invite) => invite.status === 'active' && invite.useCount < invite.maxUses).length;
  const inviteUses = invites.reduce((sum, invite) => sum + invite.useCount, 0);

  const handleCreate = async () => {
    setWorkingId('create');
    setError('');
    try {
      const result = await createBetaInviteCode({
        label,
        maxUses,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59+09:00`).toISOString() : undefined,
      });
      setCreatedCode(result.code);
      await load();
    } catch (createError) {
      setError(betaErrorMessage(createError));
    } finally {
      setWorkingId('');
    }
  };

  const toggleInvite = async (invite: BetaInvite) => {
    setWorkingId(invite.id);
    try {
      await setBetaInviteStatus(invite.id, invite.status === 'active' ? 'disabled' : 'active');
      await load();
    } catch (toggleError) {
      setError(betaErrorMessage(toggleError));
    } finally {
      setWorkingId('');
    }
  };

  const toggleMember = async (member: BetaMember) => {
    setWorkingId(member.uid);
    try {
      await setBetaMemberStatus(member.uid, member.disabled || member.status === 'disabled' ? 'active' : 'disabled');
      await load();
    } catch (toggleError) {
      setError(betaErrorMessage(toggleError));
    } finally {
      setWorkingId('');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-5 sm:px-8">
          <button type="button" onClick={() => navigate('/admin')} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 transition hover:bg-slate-100" aria-label="내 프로필로 돌아가기"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white"><ShieldCheck className="h-6 w-6" /></div>
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">LinkZip 운영</p><h1 className="text-xl font-black">사이트 관리자</h1></div>
          <button type="button" onClick={() => void load()} disabled={loading} className="ml-auto flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black transition hover:bg-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        {error && <div className="flex items-start justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"><span>{error}</span><button type="button" onClick={() => setError('')} className="cursor-pointer"><X className="h-4 w-4" /></button></div>}

        <section className="grid gap-4 sm:grid-cols-3">
          {[{label:'전체 가입자', value:members.length, icon:Users}, {label:'활성 초대코드', value:activeInvites, icon:Ticket}, {label:'초대코드 사용', value:inviteUses, icon:UserCheck}].map(({label: itemLabel, value, icon: Icon}) => <article key={itemLabel} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-500">{itemLabel}</span><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5" /></span></div><strong className="mt-5 block text-4xl font-black tracking-tight">{value}</strong></article>)}
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5 sm:p-6"><div><h2 className="text-xl font-black">초대코드</h2><p className="mt-1 text-xs font-medium text-slate-500">사용 인원과 만료일을 지정하고 언제든 중지할 수 있습니다.</p></div><button type="button" onClick={() => { setCreatedCode(''); setIsCreateOpen(true); }} className="ml-auto flex cursor-pointer items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"><Plus className="h-4 w-4" /> 초대코드 만들기</button></div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
            {invites.map((invite) => <article key={invite.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><KeyRound className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black">{invite.label}</h3><button type="button" onClick={() => navigator.clipboard.writeText(invite.code)} className="mt-1 flex cursor-pointer items-center gap-1 font-mono text-xs font-bold text-slate-500 hover:text-black">{invite.code}<Clipboard className="h-3.5 w-3.5" /></button></div><button type="button" onClick={() => void toggleInvite(invite)} disabled={workingId === invite.id} className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-black ${invite.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{workingId === invite.id ? '처리 중' : invite.status === 'active' ? '사용 중' : '중지됨'}</button></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">사용 인원</span><strong className="mt-1 block">{invite.useCount} / {invite.maxUses}명</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">만료일</span><strong className="mt-1 block truncate">{invite.expiresAt ? formatDate(invite.expiresAt) : '제한 없음'}</strong></div></div></article>)}
            {!loading && invites.length === 0 && <p className="col-span-full py-8 text-center text-sm font-semibold text-slate-400">아직 만든 초대코드가 없습니다.</p>}
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-5 sm:p-6"><div><h2 className="text-xl font-black">가입자</h2><p className="mt-1 text-xs font-medium text-slate-500">활성 {activeMembers}명 · 전체 {members.length}명</p></div><label className="ml-auto flex min-w-[240px] items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 또는 이메일 검색" className="min-w-0 flex-1 text-sm outline-none" /></label></div>
          <div className="divide-y divide-slate-100">
            {filteredMembers.map((member) => <article key={member.uid} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6"><div className="h-11 w-11 overflow-hidden rounded-full bg-slate-100">{member.photoURL ? <img src={member.photoURL} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-black text-slate-400">{(member.displayName || member.email || '?')[0]}</div>}</div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black">{member.displayName || '이름 없음'}</h3><p className="truncate text-xs font-medium text-slate-500">{member.email || '이메일 없음'}</p></div><div className="hidden min-w-32 sm:block"><p className="text-[10px] font-bold text-slate-400">가입 경로</p><p className="mt-1 text-xs font-bold">{member.inviteLabel || (member.source === 'legacy' ? '기존 가입자' : member.source === 'admin' ? '관리자' : '인증 계정')}</p></div><div className="hidden min-w-36 lg:block"><p className="text-[10px] font-bold text-slate-400">가입일</p><p className="mt-1 text-xs font-bold">{formatDate(member.joinedAt)}</p></div><button type="button" onClick={() => void toggleMember(member)} disabled={workingId === member.uid} className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black transition ${member.disabled || member.status === 'disabled' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>{workingId === member.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : member.disabled || member.status === 'disabled' ? <><UserCheck className="h-4 w-4" /> 복구</> : <><UserX className="h-4 w-4" /> 이용 중지</>}</button></article>)}
            {!loading && filteredMembers.length === 0 && <p className="py-12 text-center text-sm font-semibold text-slate-400">조건에 맞는 가입자가 없습니다.</p>}
            {loading && <p className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> 불러오는 중</p>}
          </div>
        </section>
      </main>

      {isCreateOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)}><section className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">초대코드 만들기</h2><p className="mt-1 text-xs text-slate-500">코드는 서버에서 안전하게 자동 생성됩니다.</p></div><button type="button" onClick={() => setIsCreateOpen(false)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button></div>{createdCode ? <div className="mt-6"><div className="rounded-2xl bg-emerald-50 p-5 text-center"><Check className="mx-auto h-7 w-7 text-emerald-600" /><p className="mt-2 text-xs font-bold text-emerald-700">초대코드가 생성되었습니다.</p><code className="mt-3 block text-xl font-black tracking-wider">{createdCode}</code></div><button type="button" onClick={() => navigator.clipboard.writeText(createdCode)} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-black py-3.5 text-sm font-black text-white"><Clipboard className="h-4 w-4" /> 코드 복사</button></div> : <div className="mt-6 space-y-4"><label className="block text-xs font-black text-slate-600">용도<input value={label} onChange={(event) => setLabel(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-black" /></label><label className="block text-xs font-black text-slate-600">사용 가능 인원<input type="number" min="1" max="1000" value={maxUses} onChange={(event) => setMaxUses(Math.max(1, Number(event.target.value)))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-black" /></label><label className="block text-xs font-black text-slate-600">만료일 (선택)<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-black" /></label><button type="button" onClick={() => void handleCreate()} disabled={workingId === 'create'} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-black py-3.5 text-sm font-black text-white disabled:opacity-50">{workingId === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 생성하기</button></div>}</section></div>}
    </div>
  );
};

export default SiteAdmin;
