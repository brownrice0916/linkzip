import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MessageSquare,
  Pencil,
  Reply,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore, type UserProfile } from '../store/useStore';
import { resolveUserByUsername } from '../services/userService';
import {
  addGuestbookEntry,
  addGuestbookReply,
  claimLegacyGuestbookReply,
  deleteGuestbookEntry,
  deleteGuestbookReply,
  setGuestbookEntryHidden,
  subscribeToGuestbook,
  subscribeToGuestbookReplies,
  updateGuestbookEntryAsUser,
  updateGuestbookEntryWithPassword,
  type GuestbookEntry,
  type GuestbookReply,
} from '../services/guestbookService';
import { normalizeUsername } from '../domain/profileData';

const GuestbookPage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const currentUser = useStore((state) => state.user);
  const cleanUsername = normalizeUsername(username || '');

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [targetOwnerUid, setTargetOwnerUid] = useState('');
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [replies, setReplies] = useState<GuestbookReply[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GuestbookEntry | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyAuthorName, setReplyAuthorName] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [busyReplyId, setBusyReplyId] = useState<string | null>(null);

  const isProfileOwner = Boolean(currentUser && targetOwnerUid && currentUser.uid === targetOwnerUid);
  const signedInName = (isProfileOwner ? profile?.name?.trim() : '')
    || currentUser?.displayName?.trim()
    || currentUser?.email?.split('@')[0]
    || '로그인 사용자';
  const visibleEntries = useMemo(
    () => entries.filter((entry) => !entry.isHidden || isProfileOwner),
    [entries, isProfileOwner],
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!cleanUsername) return;
        const resolvedUser = await resolveUserByUsername(cleanUsername);
        if (resolvedUser) {
          setTargetOwnerUid(resolvedUser.uid);
          setProfile(resolvedUser.data.profile || { name: cleanUsername, username: cleanUsername, bio: '', avatarUrl: '' });
        } else {
          setProfile({ name: cleanUsername, username: cleanUsername, bio: '', avatarUrl: '' });
        }
      } catch (error) {
        console.error('Error fetching guestbook profile:', error);
        setProfile({ name: cleanUsername, username: cleanUsername, bio: '', avatarUrl: '' });
      } finally {
        setLoading(false);
      }
    };
    void fetchProfile();
  }, [cleanUsername]);

  useEffect(() => {
    if (!cleanUsername) return;
    return subscribeToGuestbook(cleanUsername, setEntries, (error) => console.warn('Guestbook listener error:', error));
  }, [cleanUsername]);

  useEffect(() => {
    if (!cleanUsername) return;
    return subscribeToGuestbookReplies(cleanUsername, setReplies, (error) => console.warn('Guestbook reply listener error:', error));
  }, [cleanUsername]);

  useEffect(() => {
    if (!isProfileOwner || !currentUser || !profile?.name) return;
    const legacyOwnerReplies = replies.filter(
      (reply) => !reply.authorUid && reply.authorName.trim() === profile.name.trim(),
    );
    if (legacyOwnerReplies.length === 0) return;
    void Promise.all(legacyOwnerReplies.map((reply) => claimLegacyGuestbookReply(
      reply.id,
      currentUser.uid,
      profile.avatarUrl || currentUser.photoURL || null,
    ))).catch((error) => console.warn('Unable to connect legacy owner replies:', error));
  }, [currentUser, isProfileOwner, profile?.avatarUrl, profile?.name, replies]);

  const closeComposer = () => {
    setComposerOpen(false);
    setEditingEntry(null);
    setAuthorName('');
    setContent('');
    setEditPassword('');
    setIsSecret(false);
  };

  const openNewComposer = () => {
    setEditingEntry(null);
    setAuthorName('');
    setContent('');
    setEditPassword('');
    setIsSecret(false);
    setComposerOpen(true);
  };

  const openEditComposer = (entry: GuestbookEntry) => {
    setEditingEntry(entry);
    setAuthorName(entry.authorName);
    setContent(entry.content);
    setEditPassword('');
    setIsSecret(entry.isSecret);
    setComposerOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    if (!currentUser && !editingEntry && editPassword.length < 4) {
      alert('편집에 사용할 비밀번호를 4자 이상 입력해주세요.');
      return;
    }

    const nameToUse = currentUser ? signedInName : (authorName.trim() || '익명');
    setSubmitting(true);
    try {
      if (editingEntry) {
        const changes = { authorName: nameToUse, content: trimmedContent, isSecret };
        if (currentUser) {
          await updateGuestbookEntryAsUser(editingEntry.id, changes);
        } else {
          if (!editPassword) {
            alert('작성할 때 설정한 비밀번호를 입력해주세요.');
            return;
          }
          await updateGuestbookEntryWithPassword(editingEntry.id, cleanUsername, editPassword, changes);
        }
      } else {
        await addGuestbookEntry({
          targetUsername: cleanUsername,
          targetOwnerUid,
          authorName: nameToUse,
          authorUid: currentUser?.uid || null,
          content: trimmedContent,
          isSecret,
          likes: 0,
        }, currentUser ? undefined : editPassword);
      }
      closeComposer();
      setSubmittedSuccess(true);
      window.setTimeout(() => setSubmittedSuccess(false), 2500);
    } catch (error) {
      console.error('Failed to save guestbook:', error);
      alert(editingEntry ? '비밀번호가 맞지 않거나 편집 권한이 없습니다.' : '방명록 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHidden = async (entry: GuestbookEntry) => {
    setBusyEntryId(entry.id);
    try {
      await setGuestbookEntryHidden(entry.id, !entry.isHidden);
    } catch (error) {
      console.error('Failed to hide guestbook entry:', error);
      alert('숨김 상태를 변경하지 못했습니다.');
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleDelete = async (entry: GuestbookEntry) => {
    if (!window.confirm('이 방명록과 답글을 모두 삭제할까요? 삭제 후 복구할 수 없습니다.')) return;
    setBusyEntryId(entry.id);
    try {
      await deleteGuestbookEntry(entry.id, replies.filter((reply) => reply.entryId === entry.id).map((reply) => reply.id));
    } catch (error) {
      console.error('Failed to delete guestbook entry:', error);
      alert('방명록을 삭제하지 못했습니다.');
    } finally {
      setBusyEntryId(null);
    }
  };

  const handleReplySubmit = async (event: React.FormEvent, entryId: string) => {
    event.preventDefault();
    const trimmedContent = replyContent.trim();
    if (!trimmedContent) return;
    setSubmittingReplyId(entryId);
    try {
      await addGuestbookReply({
        entryId,
        targetUsername: cleanUsername,
        authorUid: currentUser?.uid || null,
        authorPhotoUrl: isProfileOwner ? (profile?.avatarUrl || null) : (currentUser?.photoURL || null),
        authorName: currentUser ? signedInName : (replyAuthorName.trim() || '익명'),
        content: trimmedContent,
      });
      setReplyingToId(null);
      setReplyAuthorName('');
      setReplyContent('');
    } catch (error) {
      console.error('Failed to submit guestbook reply:', error);
      alert('답글 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleDeleteReply = async (reply: GuestbookReply) => {
    if (!window.confirm('이 답글을 삭제할까요?')) return;
    setBusyReplyId(reply.id);
    try {
      await deleteGuestbookReply(reply.id);
    } catch (error) {
      console.error('Failed to delete guestbook reply:', error);
      alert('답글을 삭제하지 못했습니다.');
    } finally {
      setBusyReplyId(null);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#F8F9FA] text-sm font-bold text-gray-500">방명록 로딩 중...</div>;
  }

  return (
    <div className="min-h-screen select-none bg-[#F3F4F6] px-4 py-6 font-sans sm:py-12">
      <div className="mx-auto max-w-xl space-y-6">
        <button onClick={() => navigate(`/${cleanUsername}`)} className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4" />
          <span>{profile?.name || cleanUsername} 프로필로 돌아가기</span>
        </button>

        <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white ring-4 ring-purple-100">
            {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={cleanUsername} className="h-full w-full object-cover" /> : <User className="h-10 w-10 text-gray-400" />}
          </div>
          <div>
            <h1 className="flex items-center justify-center gap-2 text-2xl font-black tracking-tight text-gray-900">
              <span>{profile?.name || cleanUsername} 님의 방명록</span><Sparkles className="h-5 w-5 fill-amber-400 text-amber-500" />
            </h1>
            <p className="mt-1 text-xs font-medium text-gray-500">응원 메시지나 자유로운 댓글을 남겨보세요!</p>
          </div>
          <button type="button" onClick={openNewComposer} className="mx-auto flex cursor-pointer items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-xs font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-purple-700">
            <MessageSquare className="h-4 w-4" /> 방명록 작성
          </button>
        </section>

        {submittedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> 변경사항이 반영되었습니다.
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black tracking-wide text-gray-700">등록된 방명록 ({visibleEntries.length})</h2>
            {isProfileOwner && <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700"><Crown className="h-3 w-3" /> 주인장 관리 모드</span>}
          </div>

          {visibleEntries.length === 0 ? (
            <div className="space-y-2 rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-400">
              <MessageSquare className="mx-auto h-8 w-8 text-gray-300" />
              <p className="text-xs font-bold">아직 작성된 방명록이 없습니다.</p>
            </div>
          ) : visibleEntries.map((entry) => {
            const entryReplies = replies.filter((reply) => reply.entryId === entry.id);
            const entryIsOwner = Boolean(entry.authorUid && entry.authorUid === targetOwnerUid);
            const canAccountEdit = Boolean(currentUser && (entry.authorUid === currentUser.uid || isProfileOwner));
            const canPasswordEdit = !currentUser && entry.hasEditPassword;
            return (
              <article key={entry.id} className={clsx('space-y-3 rounded-3xl border bg-white p-5 shadow-sm transition hover:border-purple-300', entry.isHidden ? 'border-dashed border-amber-300 opacity-75' : 'border-gray-200')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold', entryIsOwner ? 'bg-amber-50 ring-2 ring-amber-300' : 'bg-purple-100 text-purple-700')}>
                      {entryIsOwner && profile?.avatarUrl ? <img src={profile.avatarUrl} alt="주인장" className="h-full w-full object-cover" /> : entry.authorName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-xs font-extrabold text-gray-900">{entry.authorName}</span>
                        {entryIsOwner && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700"><Crown className="h-3 w-3 fill-amber-400" /> 주인장</span>}
                        {entry.isSecret && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-600"><Lock className="h-3 w-3" /> 비밀글</span>}
                        {entry.isHidden && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">숨김</span>}
                      </div>
                      <span className="text-[9px] font-medium text-gray-400">{entry.createdAt?.seconds ? new Date(entry.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {(canAccountEdit || canPasswordEdit) && <button type="button" onClick={() => openEditComposer(entry)} title="편집" className="cursor-pointer rounded-full p-2 text-gray-400 transition hover:bg-purple-50 hover:text-purple-700"><Pencil className="h-3.5 w-3.5" /></button>}
                    {isProfileOwner && <button type="button" disabled={busyEntryId === entry.id} onClick={() => void handleToggleHidden(entry)} title={entry.isHidden ? '숨김 해제' : '숨기기'} className="cursor-pointer rounded-full p-2 text-gray-400 transition hover:bg-amber-50 hover:text-amber-700">{entry.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>}
                    {isProfileOwner && <button type="button" disabled={busyEntryId === entry.id} onClick={() => void handleDelete(entry)} title="삭제" className="cursor-pointer rounded-full p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                </div>

                <p className="whitespace-pre-wrap pl-10 text-xs font-medium leading-relaxed text-gray-800">{entry.content}</p>

                {entryReplies.length > 0 && <div className="ml-10 space-y-2 border-l-2 border-purple-100 pl-3">{entryReplies.map((reply) => (
                  <div key={reply.id} className="rounded-2xl bg-gray-50 px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><div className={clsx('flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[9px] font-black', reply.authorUid === targetOwnerUid ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-purple-100 text-purple-700')}>{reply.authorPhotoUrl ? <img src={reply.authorPhotoUrl} alt={reply.authorName} className="h-full w-full object-cover" /> : reply.authorName.charAt(0)}</div><span className="truncate text-[11px] font-extrabold text-gray-800">{reply.authorName}</span>{reply.authorUid === targetOwnerUid && <Crown className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-600" aria-label="주인장" />}</div><div className="flex shrink-0 items-center gap-1"><span className="text-[9px] text-gray-400">{reply.createdAt?.seconds ? new Date(reply.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}</span>{isProfileOwner && <button type="button" disabled={busyReplyId === reply.id} onClick={() => void handleDeleteReply(reply)} title="답글 삭제" className="cursor-pointer rounded-full p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>}</div></div>
                    <p className="mt-1.5 whitespace-pre-wrap pl-8 text-[11px] font-medium text-gray-700">{reply.content}</p>
                  </div>
                ))}</div>}

                <div className="flex justify-end"><button type="button" onClick={() => { setReplyingToId(replyingToId === entry.id ? null : entry.id); setReplyAuthorName(''); setReplyContent(''); }} className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-gray-500 transition hover:bg-purple-50 hover:text-purple-700">{replyingToId === entry.id ? <X className="h-3.5 w-3.5" /> : <Reply className="h-3.5 w-3.5" />} {replyingToId === entry.id ? '취소' : `답글${entryReplies.length ? ` ${entryReplies.length}` : ''}`}</button></div>

                {replyingToId === entry.id && <form onSubmit={(event) => handleReplySubmit(event, entry.id)} className="ml-10 space-y-2 rounded-2xl border border-purple-100 bg-purple-50/50 p-3">
                  {currentUser ? <p className="text-[10px] font-bold text-purple-700">{signedInName}(으)로 답글 작성</p> : <input type="text" value={replyAuthorName} onChange={(event) => setReplyAuthorName(event.target.value)} placeholder="미입력 시 익명" maxLength={50} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] font-semibold outline-none focus:border-purple-400" />}
                  <textarea autoFocus value={replyContent} onChange={(event) => setReplyContent(event.target.value)} placeholder="답글을 입력해주세요" maxLength={1000} rows={2} className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] font-semibold outline-none focus:border-purple-400" />
                  <div className="flex justify-end"><button type="submit" disabled={!replyContent.trim() || submittingReplyId === entry.id} className={clsx('flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-extrabold transition', replyContent.trim() ? 'cursor-pointer bg-purple-600 text-white hover:bg-purple-700' : 'cursor-not-allowed bg-gray-200 text-gray-400')}><Send className="h-3 w-3" />{submittingReplyId === entry.id ? '등록 중...' : '답글 등록'}</button></div>
                </form>}
              </article>
            );
          })}
        </section>
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) closeComposer(); }}>
          <div role="dialog" aria-modal="true" aria-label={editingEntry ? '방명록 편집' : '방명록 작성'} className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="text-lg font-black text-gray-900">{editingEntry ? '방명록 편집' : '방명록 작성'}</h2><p className="mt-1 text-[11px] font-medium text-gray-500">{currentUser ? `${signedInName}(으)로 작성합니다.` : '비밀번호는 나중에 글을 편집할 때 사용합니다.'}</p></div>
              <button type="button" onClick={closeComposer} className="cursor-pointer rounded-full bg-gray-100 p-2.5 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {!currentUser && <div><label className="mb-1 block text-[11px] font-bold text-gray-600">작성자 닉네임</label><input type="text" value={authorName} onChange={(event) => setAuthorName(event.target.value)} placeholder="미입력 시 익명" maxLength={50} className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold outline-none transition focus:border-purple-400 focus:bg-white" /></div>}
              <div><label className="mb-1 block text-[11px] font-bold text-gray-600">메시지 내용</label><textarea autoFocus value={content} onChange={(event) => setContent(event.target.value)} placeholder="따뜻한 응원의 한마디를 남겨주세요" rows={5} maxLength={1000} required className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs font-semibold outline-none transition focus:border-purple-400 focus:bg-white" /></div>
              {!currentUser && <div><label className="mb-1 block text-[11px] font-bold text-gray-600">{editingEntry ? '작성 비밀번호' : '편집 비밀번호'}</label><div className="relative"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} placeholder={editingEntry ? '작성할 때 설정한 비밀번호' : '4자 이상 입력'} minLength={editingEntry ? undefined : 4} required className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-3 text-xs font-semibold outline-none transition focus:border-purple-400 focus:bg-white" /></div></div>}
              <div className="flex items-center justify-between pt-2">
                <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={isSecret} onChange={(event) => setIsSecret(event.target.checked)} className="h-4 w-4 cursor-pointer rounded text-purple-600" /><span className="flex items-center gap-1 text-xs font-bold text-gray-700"><Lock className="h-3.5 w-3.5 text-gray-400" /> 비밀글</span></label>
                <button type="submit" disabled={submitting || !content.trim()} className={clsx('flex items-center gap-2 rounded-full px-6 py-3 text-xs font-extrabold transition', content.trim() && !submitting ? 'cursor-pointer bg-purple-600 text-white shadow-md hover:bg-purple-700' : 'cursor-not-allowed bg-gray-200 text-gray-400')}><Send className="h-3.5 w-3.5" />{submitting ? '저장 중...' : editingEntry ? '변경 저장' : '작성 완료'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestbookPage;
