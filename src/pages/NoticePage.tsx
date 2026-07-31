import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Check, ChevronDown, Copy, FileText } from 'lucide-react';
import { useStore, type CustomLink, type NoticeConfig, type UserProfile } from '../store/useStore';
import { resolveUserByUsername } from '../services/userService';

type DisplayNotice = NoticeConfig & { key: string };

const getNoticeEntries = (links: CustomLink[]): DisplayNotice[] => {
  const entries: DisplayNotice[] = [];

  const visit = (items: CustomLink[]) => {
    items.forEach((block) => {
      if (block.type === 'notice' || block.iconName === 'megaphone' || block.url?.includes('/notice')) {
        const notices = block.notices?.length
          ? block.notices
          : block.noticeConfig
            ? [block.noticeConfig]
            : [];

        notices.forEach((notice, index) => {
          entries.push({
            ...notice,
            title: notice.title.replace(/^[\s]*(?:📢|📣|📯)[\s]*/u, '').trim(),
            key: `${block.id}-${notice.id || index}`,
          });
        });
      }
      if (block.links?.length) visit(block.links);
    });
  };

  visit(links);
  return entries.slice(0, 3);
};

export const NoticePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const store = useStore();
  const [profileData, setProfileData] = useState<UserProfile>(store.profile);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>(store.customLinks);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
          if (resolvedUser.data.profile) setProfileData(resolvedUser.data.profile);
          if (resolvedUser.data.customLinks) setCustomLinks(resolvedUser.data.customLinks);
        }
      } catch (error) {
        console.error('Error fetching notice profile:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchUserData();
  }, [username, store.profile, store.customLinks]);

  const notices = useMemo(() => getNoticeEntries(customLinks), [customLinks]);

  useEffect(() => {
    if (!expandedKey && notices[0]) setExpandedKey(notices[0].key);
  }, [expandedKey, notices]);

  const handleCopyNotice = async (notice: DisplayNotice) => {
    await navigator.clipboard.writeText(`${notice.title}\n${notice.content}`);
    setCopiedKey(notice.key);
    window.setTimeout(() => setCopiedKey(null), 1600);
  };

  if (loading) return null;

  const displayName = profileData.name || profileData.username || 'LinkZip';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'L';

  return (
    <div className="min-h-screen bg-[#F7F5EE] pb-16 font-sans text-[#151513]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#F7F5EE]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(`/${username || ''}`)}
            aria-label="프로필로 돌아가기"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition hover:bg-black/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            {profileData.avatarUrl ? (
              <img src={profileData.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-black/10 object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-black text-white">{initial}</div>
            )}
            <span className="max-w-40 truncate text-sm font-black">{displayName}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF5A36]">NEWS</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">공지사항</h1>
          <p className="mt-3 text-sm font-semibold text-black/50">
            {notices.length > 0 ? `${displayName}님의 새 소식 ${notices.length}개` : `${displayName}님의 새로운 소식을 확인해 보세요.`}
          </p>
        </section>

        {notices.length === 0 ? (
          <div className="flex flex-col items-center rounded-[28px] border border-black/10 bg-white px-6 py-16 text-center shadow-[0_8px_0_rgba(21,21,19,0.08)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5">
              <FileText className="h-5 w-5 text-black/45" />
            </div>
            <p className="mt-5 text-base font-black">아직 등록된 공지가 없어요.</p>
            <p className="mt-2 text-sm font-medium text-black/45">새 소식이 등록되면 이곳에서 확인할 수 있어요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice, index) => {
              const isExpanded = expandedKey === notice.key;
              return (
                <article key={notice.key} className="overflow-hidden rounded-[24px] border border-black/15 bg-white shadow-[0_5px_0_rgba(21,21,19,0.08)]">
                  <button
                    type="button"
                    onClick={() => setExpandedKey(isExpanded ? null : notice.key)}
                    aria-expanded={isExpanded}
                    className="flex w-full cursor-pointer items-center gap-3 px-5 py-5 text-left sm:px-6"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D6FF51] text-xs font-black">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-black">{notice.title || '공지사항'}</span>
                      <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-black/40">
                        <Calendar className="h-3 w-3" /> {notice.date}
                      </span>
                    </span>
                    <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-black/8 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                      <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-black/70">{notice.content}</p>
                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleCopyNotice(notice)}
                          className="flex cursor-pointer items-center gap-1.5 rounded-full bg-black/5 px-3.5 py-2 text-xs font-black transition hover:bg-black/10"
                        >
                          {copiedKey === notice.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedKey === notice.key ? '복사했어요' : '내용 복사'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default NoticePage;
