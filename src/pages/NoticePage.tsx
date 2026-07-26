import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, type CustomLink, type UserProfile } from '../store/useStore';
import { resolveUserByUsername } from '../services/userService';
import { Megaphone, ArrowLeft, Calendar, Pin, Check, Copy } from 'lucide-react';

export const NoticePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const store = useStore();

  const [profileData, setProfileData] = useState<UserProfile>(store.profile);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>(store.customLinks);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!username || username === 'preview' || username === store.profile.username) {
        setProfileData(store.profile);
        setCustomLinks(store.customLinks);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const resolvedUser = await resolveUserByUsername(username);
        if (resolvedUser) {
          const data = resolvedUser.data;
          if (data.profile) setProfileData(data.profile);
          if (data.customLinks) setCustomLinks(data.customLinks);
        }
      } catch (err) {
        console.error('Error fetching notice profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username, store.profile, store.customLinks]);

  // Filter notice blocks from customLinks
  const noticeBlocks = customLinks.filter(
    (b) => b.type === 'notice' || b.iconName === 'megaphone' || b.title?.includes('공지')
  );

  const handleCopyNotice = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans text-gray-500 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
          <span>공지사항을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] font-sans text-gray-900 pb-20">
      
      {/* Top Header Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 py-3 sm:px-8 flex items-center justify-between shadow-2xs">
        <button
          onClick={() => navigate(`/${username || ''}`)}
          className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-black transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>프로필로 돌아가기</span>
        </button>

        <div className="flex items-center gap-2">
          {profileData.avatarUrl ? (
            <img src={profileData.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover border" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs">👤</div>
          )}
          <span className="text-xs font-extrabold text-gray-900">{profileData.name || profileData.username}</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        
        {/* Title Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Megaphone className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">공지사항 (Notice)</h1>
            <p className="text-xs font-semibold text-gray-500 mt-1">
              {profileData.name || profileData.username} 님의 최신소식과 안내글을 확인하세요.
            </p>
          </div>
        </div>

        {/* Notice List */}
        <div className="space-y-4">
          {noticeBlocks.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center space-y-3">
              <Megaphone className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-700">등록된 공지사항이 없습니다.</p>
              <p className="text-xs text-gray-400">크리에이터가 새로 등록한 공지가 있을 때 여기에 표시됩니다.</p>
            </div>
          ) : (
            noticeBlocks.map((block) => {
              const notice = block.noticeConfig || {
                title: block.title || '공지사항',
                content: '상세 공지 내용이 등록되지 않았습니다.',
                date: new Date().toLocaleDateString('ko-KR')
              };

              return (
                <div 
                  key={block.id}
                  className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-4 hover:shadow-md transition"
                >
                  {/* Badge & Date */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                      <Pin className="w-3 h-3 text-amber-600" />
                      <span>공지사항</span>
                    </span>

                    <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{notice.date || '2026. 07. 25'}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-black text-gray-900 leading-snug">{notice.title}</h2>

                  {/* Content Body */}
                  <div className="text-xs sm:text-sm font-medium text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    {notice.content}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end pt-2">
                    <button
                      onClick={() => handleCopyNotice(block.id, `${notice.title}\n${notice.content}`)}
                      className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedId === block.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === block.id ? '복사완료!' : '내용 복사'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default NoticePage;
