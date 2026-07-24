import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { User, Image as ImageIcon, FileText, CheckCircle2, UploadCloud } from 'lucide-react';
import { db, auth, storage } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { profile, setProfile, user, templateType, templateValue, socialLinks, customLinks } = useStore();
  const [isSaving, setIsSaving] = useState(false);
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
      alert(`업로드 에러: ${(error as any).message}\n\nFirebase Console > Storage > Rules 탭에서 읽기/쓰기 권한이 허용되어 있는지 확인해주세요.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // Save to Firebase if user is logged in
      if (user?.uid) {
        await setDoc(doc(db, 'users', user.uid), {
          username: profile.username || user.uid, // Root level username for easy querying
          profile,
          template: { type: templateType, value: templateValue },
          socialLinks,
          customLinks,
          updatedAt: new Date()
        });
      }
      navigate('/admin');
    } catch (error) {
      console.error("Error saving data:", error);
      alert(`데이터 저장 실패: ${(error as any).message}\n\nFirestore Database가 생성되었는지, 그리고 Rules(규칙)가 올바른지 확인해주세요.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/links');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-10 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Complete Your Profile</h1>
          <p className="mt-4 text-gray-600">Last step! Tell visitors a little bit about yourself.</p>
        </div>

        <div className="space-y-6">
          
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

        <div className="flex justify-between pt-8 border-t border-gray-100">
          <button
            onClick={handleBack}
            className="px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleFinish}
            disabled={isSaving}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : <><CheckCircle2 className="w-5 h-5 mr-2" /> Finish & Build</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileSetup;
