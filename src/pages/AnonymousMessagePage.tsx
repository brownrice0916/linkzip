import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, MessageCircle, Send } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { sendAnonymousMessage } from '../services/anonymousMessageService';
import { resolveUserByUsername } from '../services/userService';
import { useStore, type CustomLink, type UserProfile } from '../store/useStore';

const findMessageBlock = (links: CustomLink[]): CustomLink | undefined => {
  for (const link of links) {
    if (link.type === 'anonymous_message') return link;
    const nested = link.links ? findMessageBlock(link.links) : undefined;
    if (nested) return nested;
  }
  return undefined;
};

const AnonymousMessagePage: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const store = useStore();
  const [ownerUid, setOwnerUid] = useState<string>();
  const [profile, setProfile] = useState<UserProfile>();
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        if (username === 'preview' || (username === store.profile.username && store.user?.uid)) {
          if (!active) return;
          setOwnerUid(store.user?.uid);
          setProfile(store.profile);
          setLinks(store.customLinks);
          return;
        }
        const resolved = await resolveUserByUsername(username);
        if (!active || !resolved) return;
        setOwnerUid(resolved.uid);
        setProfile(resolved.data.profile);
        setLinks(resolved.data.customLinks || []);
      } catch (loadError) {
        console.error('Unable to load anonymous message page:', loadError);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProfile();
    return () => { active = false; };
  }, [store.customLinks, store.profile, store.user?.uid, username]);

  const messageBlock = useMemo(() => findMessageBlock(links), [links]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = content.trim();
    if (!message || !ownerUid || !messageBlock || submitting) return;
    try {
      setSubmitting(true);
      setError('');
      await sendAnonymousMessage(ownerUid, messageBlock.id, username, message);
      setSubmitted(true);
      setContent('');
    } catch (submitError) {
      console.error('Unable to send anonymous message:', submitError);
      setError('메시지를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8] text-sm font-bold text-gray-400">메시지 페이지를 불러오는 중...</div>;
  }

  if (!profile || !ownerUid || !messageBlock) {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4F6F8] px-6 text-center"><MessageCircle className="h-10 w-10 text-gray-300" /><p className="text-sm font-black text-gray-700">사용할 수 있는 익명 메시지 페이지가 없습니다.</p><button type="button" onClick={() => navigate(`/${username}`)} className="cursor-pointer rounded-full bg-black px-5 py-2.5 text-xs font-black text-white">프로필로 돌아가기</button></div>;
  }

  return (
    <main className="min-h-screen bg-[#F4F6F8] px-4 pb-16 pt-4 font-sans text-gray-900 sm:pt-8">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-4 flex items-center justify-between rounded-3xl border border-gray-200 bg-white px-4 py-3 shadow-xs">
          <button type="button" onClick={() => navigate(`/${username}`)} className="flex cursor-pointer items-center gap-2 rounded-full px-2 py-2 text-xs font-black transition hover:bg-gray-100"><ArrowLeft className="h-4 w-4" />프로필</button>
          <div className="flex min-w-0 items-center gap-2">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-gray-200 object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm">👤</span>}
            <span className="max-w-36 truncate text-xs font-black">{profile.name || profile.username}</span>
          </div>
        </header>

        <section className="overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="border-b border-gray-100 px-6 py-7 sm:px-8">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><MessageCircle className="h-6 w-6" /></span>
            <h1 className="text-2xl font-black tracking-tight">{messageBlock.title || '익명 메시지 보내기'}</h1>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-500">이름이나 계정 정보 없이 익명으로 전달됩니다.</p>
          </div>

          {submitted ? (
            <div className="space-y-4 px-6 py-14 text-center sm:px-8"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /><h2 className="text-lg font-black">메시지를 보냈어요</h2><p className="text-sm font-semibold text-gray-400">소중한 사연이 안전하게 전달되었습니다.</p><button type="button" onClick={() => setSubmitted(false)} className="mt-3 w-full cursor-pointer rounded-2xl bg-gray-950 py-4 text-sm font-black text-white transition hover:bg-black">메시지 하나 더 보내기</button></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 p-6 sm:p-8">
              <label htmlFor="anonymous-message" className="block text-sm font-black">보낼 사연</label>
              <textarea id="anonymous-message" value={content} onChange={(event) => setContent(event.target.value.slice(0, 1000))} rows={10} placeholder="익명으로 전할 이야기를 편하게 적어주세요." className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold leading-relaxed outline-none transition placeholder:text-gray-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" autoFocus />
              <div className="flex items-center justify-between px-1 text-[11px] font-bold text-gray-400"><span>개인정보는 적지 않는 것을 권장합니다.</span><span>{content.length}/1000</span></div>
              {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>}
              <button type="submit" disabled={!content.trim() || submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:bg-gray-200 enabled:cursor-pointer enabled:bg-violet-600 enabled:hover:bg-violet-700"><Send className="h-4 w-4" />{submitting ? '보내는 중...' : '익명으로 보내기'}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
};

export default AnonymousMessagePage;
