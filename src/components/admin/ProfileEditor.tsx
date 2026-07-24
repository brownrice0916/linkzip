import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { User, FileText, UploadCloud } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ProfileEditor = () => {
  const { profile, setProfile, user } = useStore();
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.uid) {
      alert("로그인이 필요합니다.");
      return;
    }
    
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setProfile({ ...profile, avatarUrl: downloadURL });
    } catch (error) {
      console.error("Upload failed:", error);
      alert(`업로드 에러: ${(error as any).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Profile</h2>
        <p className="text-sm text-gray-500">Tell your audience who you are.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-4 group cursor-pointer transition-colors hover:bg-gray-50">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
            ) : (
              <User className="w-10 h-10 text-gray-400 group-hover:opacity-50 transition-opacity" />
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <UploadCloud className="w-8 h-8 text-white" />
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              disabled={isUploading} 
            />
          </div>
          {isUploading && <p className="text-sm text-indigo-600 font-medium">업로드 중...</p>}
          {!isUploading && <p className="text-xs text-gray-500">프로필 사진 업로드 (클릭)</p>}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            <User className="w-4 h-4 mr-2 text-gray-400" /> Username (URL)
          </label>
          <div className="flex rounded-md shadow-sm mt-1">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm font-medium">
              {window.location.host}/
            </span>
            <input
              type="text"
              name="username"
              value={profile.username}
              onChange={handleChange}
              className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 py-2 px-3 border"
              placeholder="graintoon"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            <User className="w-4 h-4 mr-2 text-gray-400" /> Display Name
          </label>
          <input
            type="text"
            name="name"
            value={profile.name}
            onChange={handleChange}
            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
            placeholder="e.g. Jane Doe"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            <FileText className="w-4 h-4 mr-2 text-gray-400" /> Bio
          </label>
          <textarea
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            rows={3}
            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border resize-none"
            placeholder="A short bio about yourself"
          />
        </div>

      </div>
    </div>
  );
};

export default ProfileEditor;
