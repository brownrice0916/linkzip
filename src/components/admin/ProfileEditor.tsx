import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FileText, UploadCloud, Image as ImageIcon, Type, Palette, Plus, Check, X, Zap } from 'lucide-react';
import { uploadPublicImage } from '../../services/storageService';
import clsx from 'clsx';
import { entitlementsForPlan, isAdvancedProfileLayout } from '../../domain/membershipPlans';
import { GiphyPicker } from './GiphyPicker';
import { ColorPickerPopover } from './ColorPickerPopover';

const layouts = [
  { id: 'classic', label: 'Classic', desc: 'Standard circular avatar' },
  { id: 'hero', label: 'Hero', desc: 'Full-width photo fading into background' },
  { id: 'banner', label: 'Banner', desc: 'Cover photo + overlapping avatar' },
] as const;

const titleColors = [
  '#000000',
  '#0A171C',
  '#2563EB',
  '#D97706',
  '#DC2626',
  '#059669',
  '#7C3AED',
  '#DB2777',
];

const ProfileEditor = () => {
  const { profile, setProfile, user, language, membershipPlan } = useStore();
  const isKo = language === 'ko';
  const entitlements = entitlementsForPlan(membershipPlan);
  const [uploadingField, setUploadingField] = useState<'avatar' | 'banner' | 'logo' | null>(null);
  const [showBannerGifPicker, setShowBannerGifPicker] = useState(false);
  const [isAvatarRemoveArmed, setIsAvatarRemoveArmed] = useState(false);

  const activeLayout = profile.profileLayout || 'classic';
  const activeTitleStyle = profile.titleStyle || 'text';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  // Clearing the URL is the whole job -- the manual save already removes any
  // profile image no workspace still points at, so the stored file goes with it.
  const handleRemoveImage = (field: 'avatarUrl' | 'bannerUrl' | 'logoUrl') => {
    setProfile({ ...profile, [field]: '' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'bannerUrl' | 'logoUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.uid) {
      alert("로그인이 필요합니다.");
      return;
    }

    const fieldName = field === 'avatarUrl' ? 'avatar' : field === 'bannerUrl' ? 'banner' : 'logo';
    setUploadingField(fieldName);

    try {
      const downloadURL = await uploadPublicImage(`profiles/${user.uid}/${field}`, file);
      setProfile({ ...profile, [field]: downloadURL });
    } catch (error) {
      console.error("Upload failed:", error);
      alert(`업로드 에러: ${(error as any).message}`);
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 font-sans">
      
      <div className="space-y-8 rounded-[24px] bg-white p-6">

        {/* 1. Layout Picker */}
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
          <h3 className="pt-2 text-sm font-bold text-gray-900">{isKo ? '레이아웃' : 'Layout'}</h3>
          <div className="grid grid-cols-3 gap-3">
            {layouts.map((l) => {
              const isSelected = activeLayout === l.id;
              // The badge marks what this plan cannot have, so it is pointless
              // on a plan that already includes every layout.
              const isLocked = !entitlements.canUseAdvancedDesign && isAdvancedProfileLayout(l.id);
              return (
                <button
                  key={l.id}
                  // A locked layout still applies, so it can be previewed. The
                  // upgrade prompt comes at save time, same as advanced themes.
                  onClick={() => setProfile({ ...profile, profileLayout: l.id })}
                  className={clsx(
                    "flex flex-col items-center justify-between p-2.5 rounded-2xl border-2 transition-all text-center relative overflow-hidden bg-white cursor-pointer",
                    isSelected ? "border-black ring-1 ring-black shadow-xs" : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  {/* Visual Layout Mockup Icon */}
                  <div className="w-full h-24 bg-[#F7F7F5] rounded-xl flex items-center justify-center relative overflow-hidden p-2">
                    {isLocked && (
                      <span
                        className="design-premium-badge absolute right-1.5 top-1.5 z-20"
                        aria-label={isKo ? '유료 레이아웃' : 'Premium layout'}
                      >
                        <Zap aria-hidden="true" />
                      </span>
                    )}

                    {l.id === 'classic' && (
                      // Rose only stands in for a missing photo. Once there is
                      // one, back it with the same faint grey the real layout
                      // uses, so a transparent PNG does not read as red here
                      // and grey on the page.
                      <div className={clsx(
                        "w-11 h-11 rounded-full shadow-xs flex items-center justify-center overflow-hidden",
                        profile.avatarUrl ? "bg-black/5" : "bg-rose-500",
                      )}>
                        {profile.avatarUrl && (
                          <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        )}
                      </div>
                    )}

                    {l.id === 'hero' && (
                      // Hero puts the photo across the full width and fades it
                      // into the background -- there is no avatar circle, so
                      // drawing one here misrepresented the layout.
                      <div className="w-full h-full rounded-xl overflow-hidden shadow-xs">
                        {profile.avatarUrl ? (
                          <img
                            src={profile.avatarUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                            style={{
                              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 98%)',
                              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 98%)',
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-rose-500 via-rose-400 to-transparent" />
                        )}
                      </div>
                    )}

                    {l.id === 'banner' && (
                      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden rounded-lg">
                        <div className="w-full h-12 bg-rose-500 absolute top-0" />
                        <div className="w-9 h-9 rounded-full bg-white z-10 border-2 border-white/60 shadow-sm overflow-hidden mt-4">
                          {profile.avatarUrl && <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-xs font-bold text-gray-900 mt-2">{isKo ? ({ classic: '기본', hero: '히어로', banner: '배너' } as const)[l.id] : l.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* 2. Profile Image & Banner Image */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
            <h3 className="text-sm font-bold text-gray-900">{isKo ? '프로필 이미지' : 'Profile image'}</h3>

            <div className="ml-auto relative w-16 h-16">
              <div className="relative w-16 h-16 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-gray-400 transition-colors">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
                ) : (
                  <Plus className="w-6 h-6 text-gray-400" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'avatarUrl')}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploadingField === 'avatar'}
                />
              </div>

              {/* Above the file input, which covers the box edge to edge -- a
                  lower stacking order here would just open the picker. */}
              {profile.avatarUrl && !isAvatarRemoveArmed && (
                <button
                  type="button"
                  onClick={() => setIsAvatarRemoveArmed(true)}
                  className="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-gray-500 text-white shadow-xs transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
                  aria-label={isKo ? '프로필 이미지 삭제' : 'Remove profile image'}
                >
                  <X className="h-3 w-3" />
                </button>
              )}

              {/* Asked in the page rather than through window.confirm, which
                  in-app webviews suppress -- a suppressed dialog reads as a
                  dead button. Same reasoning as ConfirmActionButton. */}
              {isAvatarRemoveArmed && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-30 flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-red-50 px-2.5 py-1.5 shadow-md">
                  <span className="text-[11px] font-bold text-red-700">
                    {isKo ? '정말 삭제할까요?' : 'Remove this image?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAvatarRemoveArmed(false);
                      handleRemoveImage('avatarUrl');
                    }}
                    className="cursor-pointer rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-black text-white transition hover:bg-red-700"
                  >
                    {isKo ? '삭제' : 'Remove'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAvatarRemoveArmed(false)}
                    className="cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold text-gray-500 transition hover:text-gray-800"
                  >
                    {isKo ? '취소' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>
          </div>
          {uploadingField === 'avatar' && <p className="text-xs text-indigo-600 font-medium">{isKo ? '프로필 이미지 업로드 중...' : 'Avatar Uploading...'}</p>}

          {/* Banner Upload Option if layout === 'banner' */}
          {activeLayout === 'banner' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
              <h3 className="text-sm font-bold text-gray-900">{isKo ? '배너 커버 이미지' : 'Banner cover image'}</h3>

              <div className="relative ml-auto w-24 h-14 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-gray-400 transition-colors">
                {profile.bannerUrl ? (
                  <img src={profile.bannerUrl} alt="Banner" className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileUpload(e, 'bannerUrl')}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  disabled={uploadingField === 'banner'}
                />
              </div>
              </div>
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
                <span className="text-sm font-bold text-gray-900">GIF</span>
                <button type="button" onClick={() => setShowBannerGifPicker((open) => !open)} className={clsx("w-full rounded-2xl border py-3 text-xs font-black transition", showBannerGifPicker ? "border-black bg-black text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400")}>{showBannerGifPicker ? 'GIF 검색 닫기' : 'GIPHY GIF 검색'}</button>
              </div>
              {showBannerGifPicker && <GiphyPicker kind="gifs" onSelect={(url) => { setProfile({ ...useStore.getState().profile, bannerUrl: url }); setShowBannerGifPicker(false); }} />}
            </div>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* 3. Title & Username & Bio */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
            <label className="text-sm font-bold text-gray-900">{isKo ? '사용자 이름(URL)' : 'Username (URL)'}</label>
            <div className="flex rounded-xl shadow-sm border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-black">
              <span className="inline-flex items-center px-3 bg-gray-50 text-gray-500 text-xs font-medium border-r border-gray-200">
                {window.location.host}/
              </span>
              <input
                type="text"
                name="username"
                value={profile.username}
                onChange={handleChange}
                className="flex-1 block w-full text-xs font-semibold p-3 border-none focus:ring-0 text-gray-900"
                placeholder="username"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
            <label className="text-sm font-bold text-gray-900">{isKo ? '프로필 제목' : 'Title'}</label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
              className="block w-full text-sm font-semibold p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
              placeholder="brownrice0916"
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
            <label className="pt-3 text-sm font-bold text-gray-900">{isKo ? '자기소개' : 'Bio'}</label>
            <div className="space-y-2">
              <div className="flex justify-end items-center">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-400">{profile.bio.length}/160</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile.showBio !== false}
                  aria-label={isKo ? '자기소개 공개' : 'Show bio'}
                  onClick={() => setProfile({ ...profile, showBio: profile.showBio === false })}
                  className={clsx(
                    "relative h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors",
                    profile.showBio !== false ? "bg-black" : "bg-gray-200"
                  )}
                >
                  <span className={clsx(
                    "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform",
                    profile.showBio !== false && "translate-x-5"
                  )} />
                </button>
              </div>
            </div>
            <textarea
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              maxLength={160}
              rows={3}
              className="block w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black resize-none"
              placeholder={isKo ? '프로필에 표시할 자기소개를 입력하세요.' : 'Digital creator sharing unique insights through art...'}
            />
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
            <label className="pt-3 text-sm font-bold text-gray-900">{isKo ? '이메일' : 'Email'}</label>
            <div className="space-y-2">
              <div className="flex justify-end items-center">
              <button
                type="button"
                role="switch"
                aria-checked={profile.showEmail !== false}
                aria-label={isKo ? '이메일 공개' : 'Show email'}
                onClick={() => setProfile({ ...profile, showEmail: profile.showEmail === false })}
                className={clsx(
                  "relative h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors",
                  profile.showEmail !== false ? "bg-black" : "bg-gray-200"
                )}
              >
                <span className={clsx(
                  "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform",
                  profile.showEmail !== false && "translate-x-5"
                )} />
              </button>
            </div>
            <input
              type="email"
              name="email"
              value={profile.email || ''}
              onChange={handleChange}
              className="block w-full text-xs font-semibold p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
              placeholder="contact@example.com"
            />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* 4. Title Style (Text vs Logo) */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
            <h3 className="text-sm font-bold text-gray-900">{isKo ? '제목 스타일' : 'Title style'}</h3>
            <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setProfile({ ...profile, titleStyle: 'text' })}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1",
                activeTitleStyle === 'text' ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <span className="text-2xl font-serif font-bold text-gray-900">Aa</span>
              <span className="text-xs font-semibold text-gray-700">{isKo ? '텍스트' : 'Text'}</span>
            </button>

            <button
              type="button"
              onClick={() => setProfile({ ...profile, titleStyle: 'logo' })}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1",
                activeTitleStyle === 'logo' ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <ImageIcon className="w-6 h-6 text-gray-800" />
              <span className="text-xs font-semibold text-gray-700">{isKo ? '로고' : 'Logo'}</span>
            </button>
            </div>
          </div>

          {/* If Logo selected -> Show Logo Image Upload */}
          {activeTitleStyle === 'logo' && (
            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
              <h4 className="text-sm font-bold text-gray-900">{isKo ? '브랜드 로고' : 'Brand logo'}</h4>

              <div className="relative ml-auto w-20 h-10 bg-white border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden group cursor-pointer">
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <UploadCloud className="w-5 h-5 text-gray-400" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileUpload(e, 'logoUrl')}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  disabled={uploadingField === 'logo'}
                />
              </div>
            </div>
          )}

          {/* If Text selected -> Show Title Color Picker */}
          {activeTitleStyle === 'text' && (
            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
              <label className="text-sm font-bold text-gray-900">{isKo ? '제목 색상' : 'Title color'}</label>
              <ColorPickerPopover
                label={isKo ? '제목 색상' : 'Title color'}
                value={profile.titleColor || '#000000'}
                onChange={(titleColor) => setProfile({ ...profile, titleColor })}
                suggested={titleColors}
              />
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default ProfileEditor;
