import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Settings, X } from 'lucide-react';
import LinkTreePreview from '../LinkTreePreview';
import { useStore, type ProfileWorkspace } from '../../store/useStore';
import { normalizeUsername } from '../../domain/profileData';

const profilePreviewBackdrop = (workspace: ProfileWorkspace) => {
  if (workspace.templateType === 'color') {
    return `color-mix(in srgb, ${workspace.templateValue} 22%, #f5f5f4)`;
  }
  return ({
    'neon-dark': '#d9dbe2',
    'soft-gradient': '#eee7f5',
    'neo-pop': '#f5e4e9',
    'neo-sunshine': '#f5eed7',
    'neo-cyber': '#dceff0',
    'neo-mint': '#dcece5',
    bloom: '#f1e1e7',
    sunbloom: '#f3ead3',
    blocks: '#e9e3f2',
    groove: '#eee1dc',
    lake: '#dde2e7',
    nourish: '#dde8e2',
  } as Record<string, string>)[workspace.templateValue] || '#e7e5e4';
};

const workspaceFromCurrentState = (state: ReturnType<typeof useStore.getState>): ProfileWorkspace => ({
  id: state.activeProfileId || 'primary',
  profile: state.profile,
  templateType: state.templateType,
  templateValue: state.templateValue,
  socialLinks: state.socialLinks,
  customLinks: state.customLinks,
  design: {
    buttonStyle: state.buttonStyle,
    buttonRoundness: state.buttonRoundness,
    buttonShadow: state.buttonShadow,
    buttonColor: state.buttonColor,
    buttonTextColor: state.buttonTextColor,
    buttonOpacity: state.buttonOpacity,
    buttonTextOpacity: state.buttonTextOpacity,
    fontFamily: state.fontFamily,
    titleFontFamily: state.titleFontFamily,
    pageTextColor: state.pageTextColor,
    pageTextOpacity: state.pageTextOpacity,
    backgroundOpacity: state.backgroundOpacity,
    sticker: state.sticker,
    stickerX: state.stickerX,
    stickerY: state.stickerY,
  },
});

const AdminProfilesHome: React.FC = () => {
  const state = useStore();
  const navigate = useNavigate();
  const isKo = state.language === 'ko';
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const workspaces = useMemo(
    () => state.profileWorkspaces.length > 0 ? state.profileWorkspaces : [workspaceFromCurrentState(state)],
    [state.profileWorkspaces, state.activeProfileId, state.profile, state.templateType, state.templateValue, state.socialLinks, state.customLinks, state.buttonStyle, state.buttonRoundness, state.buttonShadow, state.buttonColor, state.buttonTextColor, state.buttonOpacity, state.buttonTextOpacity, state.fontFamily, state.titleFontFamily, state.pageTextColor, state.pageTextOpacity, state.backgroundOpacity, state.sticker, state.stickerX, state.stickerY],
  );

  const openWorkspace = (workspace: ProfileWorkspace) => {
    state.syncActiveProfileWorkspace();
    state.switchProfileWorkspace(workspace.id);
    navigate('/admin/content');
  };

  const handleCreate = () => {
    const cleanUsername = normalizeUsername(username);
    if (!name.trim() || !cleanUsername) {
      setError(isKo ? '프로필 이름과 주소를 모두 입력해 주세요.' : 'Enter a profile name and username.');
      return;
    }
    if (!/^[\p{L}\p{N}._-]{3,30}$/u.test(cleanUsername)) {
      setError(isKo ? '주소는 3~30자의 문자, 숫자, 마침표, 밑줄, 하이픈만 사용할 수 있습니다.' : 'Use 3–30 letters, numbers, dots, underscores, or hyphens.');
      return;
    }
    if (workspaces.some((workspace) => normalizeUsername(workspace.profile.username) === cleanUsername)) {
      setError(isKo ? '이미 목록에 있는 프로필 주소입니다.' : 'That username is already in your profiles.');
      return;
    }
    state.createProfileWorkspace(name.trim(), cleanUsername);
    setIsCreateOpen(false);
    navigate('/admin/header');
  };

  return (
    <div className="admin-profiles-home min-h-screen bg-[#f5f5f3] text-gray-950">
      <header className="sticky top-0 z-20 flex h-20 items-center border-b border-gray-200 bg-white/95 px-5 backdrop-blur sm:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">LinkZip</p>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">{isKo ? '내 프로필' : 'My profiles'}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="admin-home-icon" aria-label={isKo ? '알림' : 'Notifications'}><Bell /></button>
          <button type="button" onClick={() => navigate('/admin/settings')} className="admin-home-icon" aria-label={isKo ? '설정' : 'Settings'}><Settings /></button>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-5xl">{isKo ? '링크집을 관리하세요' : 'Manage your LinkZips'}</h2>
            <p className="mt-2 text-sm font-medium text-gray-500">{isKo ? '프로필마다 링크와 디자인을 독립적으로 설정할 수 있습니다.' : 'Each profile has its own links and design.'}</p>
          </div>
          <button type="button" onClick={() => { setError(''); setIsCreateOpen(true); }} className="flex shrink-0 items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-gray-800 cursor-pointer">
            <Plus className="h-5 w-5" /> {isKo ? '프로필 추가' : 'Add profile'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {workspaces.map((workspace) => (
            <article key={workspace.id} className="group overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(15,23,42,0.11)]">
              <div role="button" tabIndex={0} onClick={() => openWorkspace(workspace)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openWorkspace(workspace); }} className="block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500">
                <div className="admin-profile-card-preview relative h-52 overflow-hidden sm:h-80" style={{ background: profilePreviewBackdrop(workspace) }}>
                  <div className="admin-profile-card-scale" aria-hidden="true">
                    <LinkTreePreview profile={workspace.profile} templateType={workspace.templateType} templateValue={workspace.templateValue} socialLinks={workspace.socialLinks} customLinks={workspace.customLinks} design={workspace.design} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/16 to-transparent opacity-0 transition group-hover:opacity-100" />
                </div>
                <div className="flex items-center gap-2.5 p-3 sm:p-4">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 sm:h-10 sm:w-10">
                    {workspace.profile.avatarUrl ? <img src={workspace.profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-base">👤</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-black sm:text-base">{workspace.profile.name || workspace.profile.username}</h3>
                    <p className="truncate text-[10px] font-semibold text-gray-500 sm:text-xs">linkzip.kr/{workspace.profile.username}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div><h2 className="text-xl font-black">{isKo ? '새 프로필 만들기' : 'Create profile'}</h2><p className="mt-1 text-xs text-gray-500">{isKo ? '링크와 디자인이 독립된 새 링크집입니다.' : 'A separate LinkZip with its own links and design.'}</p></div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="admin-home-icon"><X /></button>
            </div>
            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-600">{isKo ? '프로필 이름' : 'Profile name'}<input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black" placeholder={isKo ? '예: 싸리의 작업실' : 'e.g. My studio'} /></label>
              <label className="block text-xs font-black text-gray-600">{isKo ? '프로필 주소' : 'Username'}<div className="mt-2 flex items-center rounded-2xl border border-gray-200 px-4 focus-within:border-black"><span className="text-sm text-gray-400">linkzip.kr/</span><input value={username} onChange={(event) => setUsername(event.target.value)} className="min-w-0 flex-1 py-3 text-sm outline-none" placeholder="username" /></div></label>
              {error && <p className="text-xs font-bold text-red-600">{error}</p>}
              <button type="button" onClick={handleCreate} className="w-full rounded-full bg-black py-3.5 text-sm font-black text-white hover:bg-gray-800 cursor-pointer">{isKo ? '만들고 편집하기' : 'Create and edit'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfilesHome;
