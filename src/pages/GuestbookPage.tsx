import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, Lock, User, Sparkles, CheckCircle2 } from 'lucide-react';
import type { UserProfile } from '../store/useStore';
import clsx from 'clsx';
import { resolveUserByUsername } from '../services/userService';
import { addGuestbookEntry, subscribeToGuestbook, type GuestbookEntry } from '../services/guestbookService';
import { normalizeUsername } from '../domain/profileData';

const GuestbookPage = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);

  // Form input state
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

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

    const nameToUse = authorName.trim() || '익명 팬';
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
            entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-2 transition hover:border-purple-300"
              >
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
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default GuestbookPage;
