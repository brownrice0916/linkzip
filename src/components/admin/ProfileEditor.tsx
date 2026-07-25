import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User, FileText, UploadCloud, Image as ImageIcon, Type, Palette, Plus, Check } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import clsx from 'clsx';

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
  const { profile, setProfile, user } = useStore();
  const [uploadingField, setUploadingField] = useState<'avatar' | 'banner' | 'logo' | null>(null);

  const activeLayout = profile.profileLayout || 'classic';
  const activeTitleStyle = profile.titleStyle || 'text';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
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
      const storageRef = ref(storage, `profiles/${user.uid}/${field}_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
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
      
      {/* Header Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Header</h2>
        <p className="text-sm text-gray-500">Customize your bio, title, and profile layout.</p>
      </div>

      <div className="space-y-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">

        {/* 1. Layout Picker */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900">Layout</h3>
          <div className="grid grid-cols-3 gap-3">
            {layouts.map((l) => {
              const isSelected = activeLayout === l.id;
              const hasBadge = l.id !== 'classic';
              return (
                <button
                  key={l.id}
                  onClick={() => setProfile({ ...profile, profileLayout: l.id })}
                  className={clsx(
                    "flex flex-col items-center justify-between p-2.5 rounded-2xl border-2 transition-all text-center relative overflow-hidden bg-white cursor-pointer",
                    isSelected ? "border-black ring-1 ring-black shadow-xs" : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  {/* Visual Layout Mockup Icon */}
                  <div className="w-full h-24 bg-[#F7F7F5] rounded-xl flex items-center justify-center relative overflow-hidden p-2">
                    {hasBadge && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-stone-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold z-20 shadow-xs">
                        ⚡
                      </div>
                    )}

                    {l.id === 'classic' && (
                      <div className="w-11 h-11 rounded-full bg-rose-500 shadow-xs flex items-center justify-center text-white text-xs font-bold">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          '👤'
                        )}
                      </div>
                    )}

                    {l.id === 'hero' && (
                      <div className="w-full h-full rounded-xl bg-gradient-to-b from-rose-500 via-rose-400 to-transparent shadow-xs flex flex-col items-center justify-start pt-2 overflow-hidden">
                        <div className="w-9 h-9 rounded-full bg-white/20 border border-white/40 overflow-hidden flex items-center justify-center">
                          {profile.avatarUrl ? (
                            <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            '📸'
                          )}
                        </div>
                      </div>
                    )}

                    {l.id === 'banner' && (
                      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden rounded-lg">
                        <div className="w-full h-12 bg-rose-500 absolute top-0" />
                        <div className="w-9 h-9 rounded-full bg-white z-10 border-2 border-white/60 shadow-sm overflow-hidden mt-4">
                          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-amber-200" />}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-xs font-bold text-gray-900 mt-2">{l.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* 2. Profile Image & Banner Image */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Profile image</h3>
              <p className="text-xs text-gray-400">Click to upload your avatar</p>
            </div>

            <div className="relative w-16 h-16 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-gray-400 transition-colors">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-60 transition-opacity" />
              ) : (
                <User className="w-6 h-6 text-gray-400" />
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
          </div>
          {uploadingField === 'avatar' && <p className="text-xs text-indigo-600 font-medium">Avatar Uploading...</p>}

          {/* Banner Upload Option if layout === 'banner' */}
          {activeLayout === 'banner' && (
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Banner cover image</h3>
                <p className="text-xs text-gray-400">Background photo behind profile</p>
              </div>

              <div className="relative w-24 h-14 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-gray-400 transition-colors">
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
          )}
        </div>

        <hr className="border-gray-100" />

        {/* 3. Title & Username & Bio */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">Username (URL)</label>
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

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">Title</label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
              className="block w-full text-sm font-semibold p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black"
              placeholder="brownrice0916"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-gray-700">Bio (자기소개)</label>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-400">{profile.bio.length}/160</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={profile.showBio !== false}
                    onChange={(e) => setProfile({ ...profile, showBio: e.target.checked })}
                    className="w-3.5 h-3.5 text-black rounded focus:ring-black cursor-pointer"
                  />
                  <span>{profile.showBio !== false ? "👁️ 공개 중" : "🙈 숨김"}</span>
                </label>
              </div>
            </div>
            <textarea
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              maxLength={160}
              rows={3}
              className="block w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black resize-none"
              placeholder="Digital creator sharing unique insights through art..."
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-gray-700">Contact Email (이메일 주소)</label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                <input
                  type="checkbox"
                  checked={profile.showEmail !== false}
                  onChange={(e) => setProfile({ ...profile, showEmail: e.target.checked })}
                  className="w-3.5 h-3.5 text-black rounded focus:ring-black cursor-pointer"
                />
                <span>{profile.showEmail !== false ? "👁️ 공개 중" : "🙈 숨김"}</span>
              </label>
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

        <hr className="border-gray-100" />

        {/* 4. Title Style (Text vs Logo) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Title style</h3>
          
          <div className="flex gap-4">
            <button
              onClick={() => setProfile({ ...profile, titleStyle: 'text' })}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1",
                activeTitleStyle === 'text' ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <span className="text-2xl font-serif font-bold text-gray-900">Aa</span>
              <span className="text-xs font-semibold text-gray-700">Text</span>
            </button>

            <button
              onClick={() => setProfile({ ...profile, titleStyle: 'logo' })}
              className={clsx(
                "flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-1",
                activeTitleStyle === 'logo' ? "border-black bg-gray-50 ring-1 ring-black" : "border-gray-200 hover:bg-gray-50"
              )}
            >
              <ImageIcon className="w-6 h-6 text-gray-800" />
              <span className="text-xs font-semibold text-gray-700">Logo</span>
            </button>
          </div>

          {/* If Logo selected -> Show Logo Image Upload */}
          {activeTitleStyle === 'logo' && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900">Brand Logo Image</h4>
                <p className="text-[11px] text-gray-500">Replaces text title with your logo</p>
              </div>

              <div className="relative w-20 h-10 bg-white border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden group cursor-pointer">
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
            <div className="pt-2 space-y-2">
              <label className="block text-xs font-bold text-gray-700">Title color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={profile.titleColor || '#000000'}
                  onChange={(e) => setProfile({ ...profile, titleColor: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-gray-200"
                />
                <span className="text-xs font-mono font-bold uppercase text-gray-600">
                  {profile.titleColor || '#000000'}
                </span>
                <div className="flex gap-1.5 ml-auto flex-wrap">
                  {titleColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setProfile({ ...profile, titleColor: c })}
                      className="w-6 h-6 rounded-full border border-gray-300 shadow-xs"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default ProfileEditor;
