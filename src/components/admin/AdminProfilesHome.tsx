import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, Plus, Trash2, X } from 'lucide-react';
import LinkTreePreview from '../LinkTreePreview';
import { useStore, type ProfileWorkspace } from '../../store/useStore';
import { normalizeUsername } from '../../domain/profileData';
import PrivateBetaBadge from '../PrivateBetaBadge';
import { entitlementsForPlan } from '../../domain/membershipPlans';
import { saveUserProfilesData } from '../../services/userService';
import { requestUpgradePrompt } from '../UpgradePromptHost';

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
    stickers: state.stickers,
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
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const workspaces = useMemo(
    () => state.profileWorkspaces.length > 0 ? state.profileWorkspaces : [workspaceFromCurrentState(state)],
    [state.profileWorkspaces, state.activeProfileId, state.profile, state.templateType, state.templateValue, state.socialLinks, state.customLinks, state.buttonStyle, state.buttonRoundness, state.buttonShadow, state.buttonColor, state.buttonTextColor, state.buttonOpacity, state.buttonTextOpacity, state.fontFamily, state.titleFontFamily, state.pageTextColor, state.pageTextOpacity, state.backgroundOpacity, state.sticker, state.stickerX, state.stickerY, state.stickers],
  );
  const maxProfiles = entitlementsForPlan(state.membershipPlan).maxProfiles;
  const showProfileUpgrade = () => requestUpgradePrompt({
    featureLabel: isKo ? '프로필 추가' : 'More profiles',
    title: isKo ? '프로필을 더 만들어 보세요' : 'Create more profiles',
    description: isKo
      ? `현재 플랜은 프로필을 최대 ${maxProfiles}개까지 만들 수 있습니다. 스탠다드는 3개, 프리미엄은 5개까지 운영할 수 있어요.`
      : `Your plan supports ${maxProfiles} profile(s). Standard supports 3 and Premium supports 5.`,
  });

  const openWorkspace = (workspace: ProfileWorkspace) => {
    state.syncActiveProfileWorkspace();
    state.switchProfileWorkspace(workspace.id);
    navigate('/admin/content');
  };

  const handleDelete = async (event: React.MouseEvent, workspace: ProfileWorkspace) => {
    event.preventDefault();
    event.stopPropagation();
    if (workspaces.length <= 1) {
      window.alert(isKo ? '마지막 프로필은 삭제할 수 없습니다.' : 'You cannot delete your last profile.');
      return;
    }
    const displayName = workspace.profile.name || workspace.profile.username;
    const confirmed = window.confirm(isKo
      ? `“${displayName}” (linkzip.kr/${workspace.profile.username}) 프로필을 정말 영구 삭제할까요?\n\n링크, 디자인, 공개 페이지가 모두 삭제되며 되돌릴 수 없습니다.`
      : `Permanently delete “${displayName}” (linkzip.kr/${workspace.profile.username})?\n\nIts links, design, and public page will be deleted and cannot be restored.`);
    if (!confirmed) return;

    setDeletingProfileId(workspace.id);
    try {
      useStore.getState().syncActiveProfileWorkspace();
      const latestState = useStore.getState();
      const remainingWorkspaces = latestState.profileWorkspaces.filter((candidate) => candidate.id !== workspace.id);
      const nextActiveProfileId = latestState.activeProfileId === workspace.id
        ? remainingWorkspaces[0].id
        : latestState.activeProfileId;
      if (latestState.user?.uid) {
        await saveUserProfilesData(latestState.user.uid, remainingWorkspaces, nextActiveProfileId, {
          teamMembers: latestState.teamMembers,
          alimtalkSettings: latestState.alimtalkSettings,
          pageViews: latestState.pageViews,
        });
      }
      useStore.getState().deleteProfileWorkspace(workspace.id);
      useStore.getState().markSaved();
    } catch (deleteError) {
      console.error('Failed to delete profile', deleteError);
      window.alert(deleteError instanceof Error
        ? deleteError.message
        : (isKo ? '프로필 삭제에 실패했습니다.' : 'Failed to delete the profile.'));
    } finally {
      setDeletingProfileId(null);
    }
  };

  const handleCreate = () => {
    if (workspaces.length >= maxProfiles) {
      setIsCreateOpen(false);
      showProfileUpgrade();
      return;
    }
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
    const createdProfileId = state.createProfileWorkspace(name.trim(), cleanUsername);
    if (!createdProfileId) {
      setIsCreateOpen(false);
      showProfileUpgrade();
      return;
    }
    setIsCreateOpen(false);
    navigate('/admin/header');
  };

  return (
    <div className="admin-profiles-home min-h-screen bg-[#f5f5f3] text-gray-950">
      <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-gray-200 bg-white/95 px-5 backdrop-blur sm:px-8">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5f35]">LinkZip</p>
            <PrivateBetaBadge language={state.language} compact />
          </div>
          <h1 className="text-xl font-black tracking-tight sm:text-2xl">{isKo ? '내 프로필' : 'My profiles'}</h1>
        </div>
        <button type="button" onClick={() => navigate('/admin/bug-report', { state: { sourceUrl: window.location.href } })} className="flex h-12 cursor-pointer items-center gap-2 rounded-full border-2 border-[#171714] bg-[#ffcf4a] px-5 text-sm font-black text-[#171714] shadow-[4px_4px_0_#171714] transition hover:-translate-y-0.5 hover:bg-[#d9ff67] sm:h-13 sm:px-6 sm:text-base">
          <Bug className="h-5 w-5" /> 오류 제보
        </button>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-5xl">{isKo ? '링크집을 관리하세요' : 'Manage your LinkZips'}</h2>
            <p className="mt-2 text-sm font-medium text-gray-500">{isKo ? '프로필마다 링크와 디자인을 독립적으로 설정할 수 있습니다.' : 'Give every profile its own links and design.'}</p>
          </div>
          <button type="button" onClick={() => { setError(''); if (workspaces.length >= maxProfiles) showProfileUpgrade(); else setIsCreateOpen(true); }} className="flex shrink-0 items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-gray-800 cursor-pointer">
            <Plus className="h-5 w-5" /> {isKo ? '프로필 추가' : 'Add profile'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {workspaces.map((workspace, workspaceIndex) => {
            const isOverPlanLimit = workspaceIndex >= maxProfiles;
            return (
            <article key={workspace.id} className="group relative overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(15,23,42,0.11)]">
              <button
                type="button"
                onClick={() => openWorkspace(workspace)}
                className="absolute inset-0 z-10 cursor-pointer rounded-[20px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff5f35]"
                aria-label={isKo ? `${workspace.profile.name || workspace.profile.username} 프로필 편집` : `Edit ${workspace.profile.name || workspace.profile.username}`}
              />
              <button
                type="button"
                onClick={(event) => void handleDelete(event, workspace)}
                disabled={deletingProfileId !== null}
                className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-gray-500 shadow-md backdrop-blur transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={isKo ? `${workspace.profile.name || workspace.profile.username} 프로필 삭제` : `Delete ${workspace.profile.name || workspace.profile.username}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="pointer-events-none block w-full text-left" aria-hidden="true">
                <div className="admin-profile-card-preview relative h-52 overflow-hidden sm:h-80" style={{ background: profilePreviewBackdrop(workspace) }}>
                  <div className="admin-profile-card-scale" aria-hidden="true">
                    <LinkTreePreview profile={workspace.profile} templateType={workspace.templateType} templateValue={workspace.templateValue} socialLinks={workspace.socialLinks} customLinks={workspace.customLinks} design={workspace.design} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/16 to-transparent opacity-0 transition group-hover:opacity-100" />
                  {isOverPlanLimit && <div className="absolute inset-0 flex items-center justify-center bg-black/50"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-gray-950">{isKo ? '플랜 한도 초과 · 비공개' : 'Over plan limit · Unpublished'}</span></div>}
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
            );
          })}
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
