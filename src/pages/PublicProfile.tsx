import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LinkTreePreview from '../components/LinkTreePreview';
import { QrCode } from 'lucide-react';
import type { UserProfile, SocialLink, CustomLink, DesignSettings } from '../store/useStore';
import { getCachedPublicProfile, resolveUserByUsername, type ResolvedUser } from '../services/userService';
import { recordPageView } from '../services/analyticsService';

type PublicPageData = {
  uid: string;
  profile: UserProfile;
  templateType: 'color' | 'preset';
  templateValue: string;
  socialLinks: SocialLink[];
  customLinks: CustomLink[];
  design: Partial<DesignSettings>;
  showLinkZipBranding: boolean;
};

const toPublicPageData = (resolvedUser: ResolvedUser): PublicPageData => {
  const docData = resolvedUser.data;
  return {
    uid: resolvedUser.uid,
    profile: docData.profile || { name: '', username: '', bio: '', avatarUrl: '' },
    templateType: docData.template?.type || 'preset',
    templateValue: docData.template?.value || 'minimalist',
    socialLinks: docData.socialLinks || [],
    customLinks: docData.customLinks || [],
    design: docData.design || {},
    // New public profiles carry the owner's plan. For older documents, keep
    // the previous saved watermark choice as a compatibility fallback.
    showLinkZipBranding: docData.membershipPlan
      ? docData.membershipPlan === 'basic'
      : docData.forceWatermark === true || docData.profile?.hideWatermark !== true,
  };
};

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const initialCachedProfile = username ? getCachedPublicProfile(username) : null;
  const [loading, setLoading] = useState(!initialCachedProfile);
  const [userData, setUserData] = useState<PublicPageData | null>(() => initialCachedProfile ? toPublicPageData(initialCachedProfile) : null);
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(() => initialCachedProfile ? username || null : null);

  useEffect(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        if (!username) {
          if (active) {
            setUserData(null);
            setResolvedUsername(null);
            setLoading(false);
          }
          return;
        }
        const cachedProfile = getCachedPublicProfile(username);
        if (cachedProfile) {
          if (active) {
            setUserData(toPublicPageData(cachedProfile));
            setResolvedUsername(username);
            setLoading(false);
          }
        } else {
          setLoading(true);
        }
        const resolvedUser = await resolveUserByUsername(username);
        if (active && resolvedUser) {
          setUserData(toPublicPageData(resolvedUser));
          setResolvedUsername(username);
          void recordPageView(resolvedUser.uid).catch((error) => {
            console.warn('Unable to record page view:', error);
          });
        } else if (active && !resolvedUser) {
          setUserData(null);
          setResolvedUsername(username);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        if (active) {
          setUserData(null);
          setResolvedUsername(username || null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    
    void fetchProfile();
    return () => { active = false; };
  }, [username]);

  useEffect(() => {
    if (!userData || !username) return;
    const creatorName = userData.profile.name?.trim() || username;
    const description = userData.profile.bio?.trim() || `${creatorName}의 LinkZip 프로필`;
    const canonicalUrl = `https://linkzip.kr/${encodeURIComponent(username)}`;
    const previousTitle = document.title;
    document.title = `${creatorName} | LinkZip`;

    const setMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    setMeta('meta[name="description"]', 'name', 'description', description.slice(0, 160));
    setMeta('meta[property="og:title"]', 'property', 'og:title', `${creatorName} | LinkZip`);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description.slice(0, 160));
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    if (userData.profile.avatarUrl) setMeta('meta[property="og:image"]', 'property', 'og:image', userData.profile.avatarUrl);
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = canonicalUrl;

    return () => {
      document.title = previousTitle;
    };
  }, [userData, username]);

  if (loading || resolvedUsername !== username) {
    return null;
  }

  if (!userData) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">프로필을 찾을 수 없습니다</h1>
        <p className="text-gray-500">요청한 프로필이 없거나 아직 설정되지 않았습니다.</p>
      </div>
    );
  }

  const { uid, profile, templateType, templateValue, socialLinks, customLinks, design, showLinkZipBranding } = userData;
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
        showLinkZipBranding={showLinkZipBranding}
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
