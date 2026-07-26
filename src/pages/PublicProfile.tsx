import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LinkTreePreview from '../components/LinkTreePreview';
import { QrCode } from 'lucide-react';
import type { UserProfile, SocialLink, CustomLink, DesignSettings } from '../store/useStore';
import { resolveUserByUsername } from '../services/userService';
import { recordPageView } from '../services/analyticsService';

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<{
    uid: string;
    profile: UserProfile;
    templateType: 'color' | 'preset';
    templateValue: string;
    socialLinks: SocialLink[];
    customLinks: CustomLink[];
    design: Partial<DesignSettings>;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!username) return;
        const resolvedUser = await resolveUserByUsername(username);
        if (resolvedUser) {
          const docData = resolvedUser.data;
          setUserData({
            uid: resolvedUser.uid,
            profile: docData.profile || { name: '', username: '', bio: '', avatarUrl: '' },
            templateType: docData.template?.type || 'preset',
            templateValue: docData.template?.value || 'minimalist',
            socialLinks: docData.socialLinks || [],
            customLinks: docData.customLinks || [],
            design: docData.design || {},
          });
          void recordPageView(resolvedUser.uid).catch((error) => {
            console.warn('Unable to record page view:', error);
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [username]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-gray-100">Loading...</div>;
  }

  if (!userData) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">User not found</h1>
        <p className="text-gray-500">The profile you are looking for does not exist or hasn't been set up.</p>
      </div>
    );
  }

  const { uid, profile, templateType, templateValue, socialLinks, customLinks, design } = userData;
  const outerBg = templateValue === 'minimalist' ? '#b6aba0' : '#0f172a';

  return (
    <div 
      className="min-h-screen w-full relative sm:py-8 overflow-y-auto"
      style={{ backgroundColor: templateType === 'color' ? '#b6aba0' : outerBg }}
    >
      <LinkTreePreview 
        profile={profile}
        templateType={templateType}
        templateValue={templateValue}
        socialLinks={socialLinks}
        customLinks={customLinks}
        ownerUid={uid}
        design={design}
        isPublic={true}
      />
      
      {/* Desktop QR Code */}
      <div className="hidden lg:flex fixed bottom-8 right-8 flex-col items-center">
        <span className="text-xs font-semibold mb-2 opacity-80" style={{ color: templateType === 'preset' && templateValue === 'neon-dark' ? 'white' : 'black' }}>
          View on mobile
        </span>
        <div className="bg-white p-2 rounded-xl shadow-lg border border-black/10">
          <QrCode className="w-20 h-20 text-black" />
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
