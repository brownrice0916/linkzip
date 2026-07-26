import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, Lock, User, Sparkles, CheckCircle2, Reply, X } from 'lucide-react';
import type { UserProfile } from '../store/useStore';
import clsx from 'clsx';
import { resolveUserByUsername } from '../services/userService';
import { addGuestbookEntry, addGuestbookReply, subscribeToGuestbook, subscribeToGuestbookReplies, type GuestbookEntry, type GuestbookReply } from '../services/guestbookService';
import { normalizeUsername } from '../domain/profileData';

const GuestbookPage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [replies, setReplies] = useState<GuestbookReply[]>([]);

  // Form input state
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyAuthorName, setReplyAuthorName] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  const cleanUsername = normalizeUsername(username || '');

  // 1. Fetch Profile Data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!cleanUsername) return;
        const resolvedUser = await resolveUserByUsername(cleanUsername);

        if (resolvedUser) {
          const docData = resolvedUser.data;
          setProfile(docData.profile || { name: cleanUsername, username: cleanUsername, bio: '', avatarUrl: '' });
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

    fetchProfile();
  }, [cleanUsername]);

  useEffect(() => {
    if (!cleanUsername) return;
    return subscribeToGuestbookReplies(cleanUsername, setReplies, (err) => {
      console.warn('Realtime guestbook reply listener error:', err);
    });
  }, [cleanUsername]);

  // 2. Fetch Guestbook Messages (Realtime listener with fallback)
  useEffect(() => {
    if (!cleanUsername) return;

    try {
      const unsubscribe = subscribeToGuestbook(cleanUsername, setEntries, (err) => {
        console.warn('Realtime guestbook listener error, using local fallback:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error('Guestbook subscription error:', e);
    }
  }, [cleanUsername]);

  // 3. Handle Submit New Message
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('방명록 메시지를 입력해주세요!');
      return;
    }

    const nameToUse = authorName.trim() || '익명';
    setSubmitting(true);

    const newEntry = {
      targetUsername: cleanUsername,
      authorName: nameToUse,
      content: content.trim(),
      isSecret,
      likes: 0,
    };

    try {
      await addGuestbookEntry(newEntry);
      
      // Optimistic update
      setEntries((prev) => [
        {
          id: `guest-${Date.now()}`,
          authorName: nameToUse,
          content: content.trim(),
          isSecret,
          likes: 0,
          createdAt: { seconds: Math.floor(Date.now() / 1000) }
        },
        ...prev
      ]);

      setContent('');
      setAuthorName('');
      setIsSecret(false);
      setSubmittedSuccess(true);
      setTimeout(() => setSubmittedSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to submit guestbook:', error);
      alert('방명록 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (event: React.FormEvent, entryId: string) => {
    event.preventDefault();
    const trimmedContent = replyContent.trim();
    if (!trimmedContent) return;

    const nameToUse = replyAuthorName.trim() || '익명';
    setSubmittingReplyId(entryId);
    try {
      await addGuestbookReply({
        entryId,
        targetUsername: cleanUsername,
        authorName: nameToUse,
        content: trimmedContent,
      });
      setReplyingToId(null);
      setReplyAuthorName('');
      setReplyContent('');
    } catch (error) {
      console.error('Failed to submit guestbook reply:', error);
      alert('답글 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FA] text-gray-500 font-sans">
        <div className="flex items-center gap-2 font-bold animate-pulse">
          <MessageSquare className="w-5 h-5 text-purple-600" />
          <span>방명록 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] py-6 sm:py-12 px-4 font-sans select-none">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Top Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/${cleanUsername}`)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-100 transition cursor-pointer border border-gray-200"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
            <span>{profile?.name || cleanUsername} 프로필로 돌아가기</span>
          </button>
        </div>

        {/* Profile & Guestbook Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-1 shadow-md">
            <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={cleanUsername} className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="w-10 h-10 text-gray-400" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-2">
              <span>{profile?.name || cleanUsername} 님의 방명록</span>
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-400" />
            </h1>
            <p className="text-xs font-medium text-gray-500">
              응원 메시지나 자유로운 댓글을 남겨보세요! ✨
            </p>
          </div>
        </div>

        {/* Write Guestbook Message Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-600" />
            <span>방명록 작성하기</span>
          </h2>

          {submittedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>방명록이 성황리에 남겨졌습니다! 💖</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">작성자 닉네임</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="미입력 시 익명"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">메시지 내용 *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="따뜻한 응원의 한마디나 하고 싶은 말을 자유롭게 적어주세요!"
                rows={3}
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-600 focus:bg-white transition resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  비밀글로 작성
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className={clsx(
                  "px-6 py-2.5 rounded-full font-extrabold text-xs transition cursor-pointer shadow-md flex items-center gap-2",
                  content.trim() && !submitting
                    ? "bg-[#7C3AED] hover:bg-[#6D28D9] text-white ring-2 ring-purple-300 scale-105"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? "등록 중..." : "작성 완료"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Guestbook Messages List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wide">
              등록된 방명록 ({entries.length})
            </h3>
          </div>

          {entries.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 text-gray-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-xs font-bold">아직 작성된 방명록이 없습니다.</p>
              <p className="text-[11px]">첫 번째 응원 방명록 메시지를 남겨보세요!</p>
            </div>
          ) : (
            entries.map((entry) => {
              const entryReplies = replies.filter((reply) => reply.entryId === entry.id);
              return (
              <div key={entry.id} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-3 transition hover:border-purple-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                      {entry.authorName.charAt(0)}
                    </div>
                    <span className="text-xs font-extrabold text-gray-900">{entry.authorName}</span>
                    {entry.isSecret && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Lock className="w-3 h-3" /> 비밀글
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-medium text-gray-400">
                    {entry.createdAt?.seconds
                      ? new Date(entry.createdAt.seconds * 1000).toLocaleDateString()
                      : '방금 전'}
                  </span>
                </div>

                <p className="text-xs font-medium text-gray-800 leading-relaxed whitespace-pre-wrap pl-9">
                  {entry.content}
                </p>

                {entryReplies.length > 0 && (
                  <div className="ml-9 space-y-2 border-l-2 border-purple-100 pl-3">
                    {entryReplies.map((reply) => (
                      <div key={reply.id} className="rounded-2xl bg-gray-50 px-3.5 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <Reply className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                            <span className="truncate text-[11px] font-extrabold text-gray-800">{reply.authorName}</span>
                          </div>
                          <span className="shrink-0 text-[9px] font-medium text-gray-400">{reply.createdAt?.seconds ? new Date(reply.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}</span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap pl-5.5 text-[11px] font-medium leading-relaxed text-gray-700">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <button type="button" onClick={() => { const nextId = replyingToId === entry.id ? null : entry.id; setReplyingToId(nextId); setReplyAuthorName(''); setReplyContent(''); }} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-gray-500 transition hover:bg-purple-50 hover:text-purple-700 cursor-pointer">
                    {replyingToId === entry.id ? <X className="h-3.5 w-3.5" /> : <Reply className="h-3.5 w-3.5" />}
                    <span>{replyingToId === entry.id ? '취소' : `답글${entryReplies.length ? ` ${entryReplies.length}` : ''}`}</span>
                  </button>
                </div>

                {replyingToId === entry.id && (
                  <form onSubmit={(event) => handleReplySubmit(event, entry.id)} className="ml-9 space-y-2 rounded-2xl border border-purple-100 bg-purple-50/50 p-3">
                    <input type="text" value={replyAuthorName} onChange={(event) => setReplyAuthorName(event.target.value)} placeholder="미입력 시 익명" maxLength={50} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] font-semibold outline-none focus:border-purple-400" />
                    <textarea autoFocus value={replyContent} onChange={(event) => setReplyContent(event.target.value)} placeholder="답글을 입력해주세요" maxLength={1000} rows={2} className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] font-semibold outline-none focus:border-purple-400" />
                    <div className="flex justify-end">
                      <button type="submit" disabled={!replyContent.trim() || submittingReplyId === entry.id} className={clsx('flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-extrabold transition', replyContent.trim() && submittingReplyId !== entry.id ? 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}>
                        <Send className="h-3 w-3" /><span>{submittingReplyId === entry.id ? '등록 중...' : '답글 등록'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default GuestbookPage;
