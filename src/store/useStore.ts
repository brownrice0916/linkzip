import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { applyLinkClicks } from '../domain/profileData.ts';
import { getThemeDesignPreset } from '../domain/themePresets.ts';

export interface SocialLink {
  id: string;
  platform: string;
  url?: string;
}

export interface DonationConfig {
  mainText: string;
  detailText?: string;
  minAmount: number;
  buttonText: string;
  imageUrl?: string;
  accountConnected?: boolean;
  accountType?: 'personal' | 'corporate';
  idNumber?: string;
  bankName?: string;
  accountOwnerName?: string;
  accountNumber?: string;
}

export interface FileConfig {
  title: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
}

export interface SNSItem {
  id: string;
  platform: string;
  value: string;
  countryCode?: string;
}

export interface NoticeConfig {
  title: string;
  content: string;
  date?: string;
  isPinned?: boolean;
}

export interface CustomerInfoConfig {
  mainText: string;
  detailText?: string;
  receiveEmail?: boolean;
  receivePhone?: boolean;
  receiveName?: boolean;
  submitButtonText?: string;
  submitButtonColor?: string;
  submitButtonTextColor?: string;
}

export interface CollectedCustomerData {
  id: string;
  blockId?: string;
  email?: string;
  phone?: string;
  name?: string;
  createdAt: string;
}

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  fileName?: string;
  fileUrl?: string;
  discountPrice?: number;
  stock?: number;
  orderNote?: string;
}

export interface SalesConfig {
  salesType?: 'digital_file' | 'product';
  mainText: string;
  image?: string;
  description?: string;
  descriptionViewType?: 'simple' | 'detail';
  products: ProductItem[];
  creatorMessage?: string;
  bankName?: string;
  accountNumber?: string;
  accountOwner?: string;
  sellerInfo?: {
    businessType?: string;
    sellerName?: string;
    contactInfo?: string;
    address?: string;
  };
}

export interface ReservationScheduleItem {
  id: string;
  startDate: string;
  endDate: string;
  startHour?: string;
  endHour?: string;
  title: string;
  linkUrl?: string;
  status?: 'OPEN' | 'CLOSED' | 'FULL';
}

export interface ReservationConfig {
  headerText?: string;
  schedules: ReservationScheduleItem[];
  autoNotification?: boolean;
}

export interface AffiliateProductConfig {
  imageUrl?: string;
  affiliateUrl: string;
  price?: number;
  currency?: 'KRW' | 'USD' | 'JPY' | 'EUR';
  displayMode?: 'compact' | 'featured';
}

export interface MapConfig {
  query: string;
  displayMode?: 'classic' | 'featured';
}

export interface CustomLink {
  id: string;
  type?: 'link' | 'collection' | 'donation' | 'file' | 'sns' | 'notice' | 'customer_info' | 'anonymous_message' | 'sales' | 'reservation' | 'affiliate_product' | 'map';
  title: string;
  publicTitle?: string;
  url?: string;
  clicks?: number; // Total clicks counter for analytics
  layout?: 'list' | 'grid' | 'carousel';
  hideTitle?: boolean;
  links?: CustomLink[]; // For collections
  isVisible?: boolean;
  icon?: string; // image thumbnail URL
  thumbnailType?: 'image' | 'icon' | 'none'; // thumbnail mode
  iconName?: string; // selected icon key e.g. 'link', 'globe', 'instagram', etc.
  buttonColor?: string; // Custom button background color
  buttonTextColor?: string; // Custom button text color
  customStyle?: LinkButtonStyle;
  donationConfig?: DonationConfig;
  fileConfig?: FileConfig;
  snsLinks?: SNSItem[];
  noticeConfig?: NoticeConfig;
  customerInfoConfig?: CustomerInfoConfig;
  salesConfig?: SalesConfig;
  reservationConfig?: ReservationConfig;
  affiliateProductConfig?: AffiliateProductConfig;
  mapConfig?: MapConfig;
}

export interface LinkButtonStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 400 | 500 | 600 | 700 | 800 | 900;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  textOpacity?: number;
  iconColor?: string;
  iconOpacity?: number;
  iconBackgroundColor?: string;
  iconBackgroundOpacity?: number;
  calendarButtonColor?: string;
  calendarButtonOpacity?: number;
  calendarButtonTextColor?: string;
  calendarButtonTextOpacity?: number;
  shadow?: 'inherit' | 'none' | 'soft' | 'medium' | 'strong';
}

export interface AnalyticsDailyItem {
  date: string;
  views: number;
  clicks: number;
}

export interface DesignSettings {
  buttonStyle: 'solid' | 'glass' | 'outline';
  buttonRoundness: 'none' | 'sm' | 'md' | 'full';
  buttonShadow: 'none' | 'soft' | 'strong' | 'hard';
  buttonColor?: string;
  buttonTextColor?: string;
  buttonOpacity?: number;
  buttonTextOpacity?: number;
  fontFamily: string;
  titleFontFamily?: string;
  pageTextColor?: string;
  pageTextOpacity?: number;
  backgroundOpacity?: number;
  sticker?: string;
  stickerX?: number;
  stickerY?: number;
}

export interface VerifiedAccountInfo {
  accountType: 'personal' | 'corporate';
  idNumber: string;
  bankName: string;
  accountOwnerName: string;
  accountNumber: string;
  accountConnected: boolean;
}

export interface UserProfile {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  showEmail?: boolean;
  showBio?: boolean;
  profileLayout?: 'classic' | 'hero' | 'avatar-hero' | 'banner' | 'cutout' | 'shape';
  titleStyle?: 'text' | 'logo';
  logoUrl?: string;
  titleColor?: string;
  bannerUrl?: string;
  hideWatermark?: boolean;
  verifiedAccount?: VerifiedAccountInfo;
}

export interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'pending';
  invitedAt: string;
}

export interface DMAutomationRule {
  id: string;
  keyword: string;
  responseMessage: string;
  targetLinkUrl: string;
  isActive: boolean;
}

export interface AlimtalkSettings {
  apiKey: string;
  apiSecret: string;
  senderPhone: string;
  templateCode: string;
  customMessage?: string;
  isEnabled: boolean;
}

export interface AppStateSnapshot {
  templateType: 'color' | 'preset';
  templateValue: string;
  socialLinks: SocialLink[];
  customLinks: CustomLink[];
  profile: UserProfile;
  buttonStyle: 'solid' | 'glass' | 'outline';
  buttonRoundness: 'none' | 'sm' | 'md' | 'full';
  buttonShadow: 'none' | 'soft' | 'strong' | 'hard';
  buttonColor?: string;
  buttonTextColor?: string;
  buttonOpacity?: number;
  buttonTextOpacity?: number;
  fontFamily: string;
  titleFontFamily?: string;
  pageTextColor?: string;
  pageTextOpacity?: number;
  backgroundOpacity?: number;
  sticker?: string;
  stickerX?: number;
  stickerY?: number;
  teamMembers?: TeamMember[];
  dmRules?: DMAutomationRule[];
  alimtalkSettings?: AlimtalkSettings;
  metaAccessToken?: string;
  instagramAccount?: string;
}

export interface ProfileWorkspace {
  id: string;
  profile: UserProfile;
  templateType: 'color' | 'preset';
  templateValue: string;
  socialLinks: SocialLink[];
  customLinks: CustomLink[];
  design: DesignSettings;
  createdAt?: string;
  updatedAt?: string;
}

interface AppState {
  // Authentication
  user: User | null;
  setUser: (user: User | null) => void;

  // Onboarding & Profile Data
  templateType: 'color' | 'preset';
  templateValue: string;
  socialLinks: SocialLink[];
  customLinks: CustomLink[];
  profile: UserProfile;
  profileWorkspaces: ProfileWorkspace[];
  activeProfileId: string;

  // Design Settings
  buttonStyle: 'solid' | 'glass' | 'outline';
  buttonRoundness: 'none' | 'sm' | 'md' | 'full';
  buttonShadow: 'none' | 'soft' | 'strong' | 'hard';
  buttonColor?: string;
  buttonTextColor?: string;
  buttonOpacity?: number;
  buttonTextOpacity?: number;
  fontFamily: string;
  titleFontFamily?: string;
  pageTextColor?: string;
  pageTextOpacity?: number;
  backgroundOpacity?: number;
  sticker?: string;
  stickerX?: number;
  stickerY?: number;

  // Growth & Enterprise Data
  teamMembers: TeamMember[];
  dmRules: DMAutomationRule[];
  alimtalkSettings: AlimtalkSettings;
  metaAccessToken?: string;
  instagramAccount?: string;

  // Language & Localization
  language: 'ko' | 'en';
  setLanguage: (lang: 'ko' | 'en') => void;

  // Change Tracking & History (Undo / Redo / Cancel / Save)
  isDirty: boolean;
  undoStack: AppStateSnapshot[];
  redoStack: AppStateSnapshot[];
  savedSnapshot: AppStateSnapshot | null;

  // Actions
  setTemplate: (type: 'color' | 'preset', value: string) => void;
  setDesignSettings: (settings: Partial<DesignSettings>) => void;
  setSocialLinks: (links: SocialLink[]) => void;
  addSocialLink: (link: SocialLink) => void;
  updateSocialLink: (id: string, updates: Partial<SocialLink>) => void;
  removeSocialLink: (id: string) => void;
  addCustomLink: (link: CustomLink, collectionId?: string) => void;
  updateCustomLink: (id: string, updates: Partial<CustomLink>) => void;
  removeCustomLink: (id: string) => void;
  setProfile: (profile: UserProfile) => void;
  createProfileWorkspace: (name: string, username: string) => string;
  switchProfileWorkspace: (id: string) => void;
  deleteProfileWorkspace: (id: string) => void;
  syncActiveProfileWorkspace: () => void;
  loadData: (data: Partial<AppState>) => void;
  reorderLinks: (newLinks: CustomLink[]) => void;
  moveItemRelative: (activeId: string, targetId: string, position?: 'before' | 'after') => void;
  moveItemDirection: (id: string, direction: 'up' | 'down') => void;

  // Growth Actions
  addTeamMember: (member: TeamMember) => void;
  removeTeamMember: (id: string) => void;
  addDMRule: (rule: DMAutomationRule) => void;
  updateDMRule: (id: string, updates: Partial<DMAutomationRule>) => void;
  removeDMRule: (id: string) => void;
  setAlimtalkSettings: (settings: Partial<AlimtalkSettings>) => void;
  setMetaAccessToken: (token: string) => void;
  setInstagramAccount: (account: string | null) => void;

  // Undo / Redo / Cancel / Save Actions
  undo: () => void;
  redo: () => void;
  cancelChanges: () => void;
  markSaved: () => void;

  // Analytics & Performance Metrics
  pageViews: number;
  analyticsDailyHistory: AnalyticsDailyItem[];
  analyticsLinkClicks: Record<string, number>;
  incrementPageViews: () => void;
  recordLinkClick: (linkId: string) => void;
  resetAnalytics: () => void;
  loadAnalytics: (data: {
    pageViews: number;
    daily: AnalyticsDailyItem[];
    linkClicks: Record<string, number>;
  }) => void;

  // Drag and Drop Actions
  moveItemToCollection: (itemId: string, targetCollectionId: string) => void;
  moveItemToRoot: (itemId: string) => void;
}

const getSnapshotFromState = (state: any): AppStateSnapshot => ({
  templateType: state.templateType,
  templateValue: state.templateValue,
  socialLinks: JSON.parse(JSON.stringify(state.socialLinks || [])),
  customLinks: JSON.parse(JSON.stringify(state.customLinks || [])),
  profile: JSON.parse(JSON.stringify(state.profile || {})),
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
  teamMembers: JSON.parse(JSON.stringify(state.teamMembers || [])),
  dmRules: JSON.parse(JSON.stringify(state.dmRules || [])),
  alimtalkSettings: JSON.parse(JSON.stringify(state.alimtalkSettings || {})),
  metaAccessToken: state.metaAccessToken || '',
  instagramAccount: state.instagramAccount || '',
});

const getWorkspaceFromState = (state: any, id = state.activeProfileId || 'primary'): ProfileWorkspace => ({
  id,
  profile: JSON.parse(JSON.stringify(state.profile || {})),
  templateType: state.templateType,
  templateValue: state.templateValue,
  socialLinks: JSON.parse(JSON.stringify(state.socialLinks || [])),
  customLinks: JSON.parse(JSON.stringify(state.customLinks || [])),
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
  createdAt: state.profileWorkspaces?.find((workspace: ProfileWorkspace) => workspace.id === id)?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const getStateFromWorkspace = (workspace: ProfileWorkspace) => {
  const preset = getThemeDesignPreset(workspace.templateValue || 'minimalist');
  const usePresetDefaults = (workspace.templateType || 'preset') === 'preset' && (
    !workspace.design?.buttonColor || !workspace.design?.buttonTextColor || !workspace.design?.pageTextColor
  );
  return ({
  profile: JSON.parse(JSON.stringify(workspace.profile)),
  templateType: workspace.templateType || 'preset',
  templateValue: workspace.templateValue || 'minimalist',
  socialLinks: JSON.parse(JSON.stringify(workspace.socialLinks || [])),
  customLinks: JSON.parse(JSON.stringify(workspace.customLinks || [])),
  buttonStyle: usePresetDefaults ? preset.buttonStyle : (workspace.design?.buttonStyle ?? preset.buttonStyle),
  buttonRoundness: usePresetDefaults ? preset.buttonRoundness : (workspace.design?.buttonRoundness ?? preset.buttonRoundness),
  buttonShadow: usePresetDefaults ? preset.buttonShadow : (workspace.design?.buttonShadow ?? preset.buttonShadow),
  buttonColor: usePresetDefaults ? preset.buttonColor : (workspace.design?.buttonColor || preset.buttonColor),
  buttonTextColor: usePresetDefaults ? preset.buttonTextColor : (workspace.design?.buttonTextColor || preset.buttonTextColor),
  buttonOpacity: usePresetDefaults ? preset.buttonOpacity : (workspace.design?.buttonOpacity ?? preset.buttonOpacity),
  buttonTextOpacity: usePresetDefaults ? preset.buttonTextOpacity : (workspace.design?.buttonTextOpacity ?? preset.buttonTextOpacity),
  fontFamily: usePresetDefaults ? preset.fontFamily : (workspace.design?.fontFamily || preset.fontFamily),
  titleFontFamily: usePresetDefaults ? preset.titleFontFamily : (workspace.design?.titleFontFamily ?? preset.titleFontFamily),
  pageTextColor: usePresetDefaults ? preset.pageTextColor : (workspace.design?.pageTextColor || preset.pageTextColor),
  pageTextOpacity: usePresetDefaults ? preset.pageTextOpacity : (workspace.design?.pageTextOpacity ?? preset.pageTextOpacity),
  backgroundOpacity: usePresetDefaults ? preset.backgroundOpacity : (workspace.design?.backgroundOpacity ?? preset.backgroundOpacity),
  sticker: usePresetDefaults ? preset.sticker : (workspace.design?.sticker ?? preset.sticker),
  stickerX: workspace.design?.stickerX ?? 62,
  stickerY: workspace.design?.stickerY ?? 22,
  });
};

const recursivelyUpdateLink = (links: CustomLink[], id: string, updates: Partial<CustomLink>): CustomLink[] => {
  return links.map(link => {
    if (link.id === id) {
      return { ...link, ...updates };
    }
    if (link.links && link.links.length > 0) {
      return { ...link, links: recursivelyUpdateLink(link.links, id, updates) };
    }
    return link;
  });
};

export const resetLinkThemeOverrides = (links: CustomLink[]): CustomLink[] => links.map((link) => {
  const {
    buttonColor: _buttonColor,
    buttonTextColor: _buttonTextColor,
    customStyle: _customStyle,
    ...rest
  } = link;
  const customerInfoConfig = link.customerInfoConfig
    ? (() => {
        const {
          submitButtonColor: _submitButtonColor,
          submitButtonTextColor: _submitButtonTextColor,
          ...config
        } = link.customerInfoConfig;
        return config;
      })()
    : undefined;
  return {
    ...rest,
    ...(customerInfoConfig ? { customerInfoConfig } : {}),
    ...(link.links ? { links: resetLinkThemeOverrides(link.links) } : {}),
  };
});

const recursivelyRemoveLink = (links: CustomLink[], id: string): CustomLink[] => {
  return links.filter(link => link.id !== id).map(link => {
    if (link.links && link.links.length > 0) {
      return { ...link, links: recursivelyRemoveLink(link.links, id) };
    }
    return link;
  });
};

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  templateType: 'preset',
  templateValue: 'minimalist',
  socialLinks: [],
  customLinks: [],
  profile: { name: '', username: '', bio: '', avatarUrl: '', hideWatermark: false },
  profileWorkspaces: [],
  activeProfileId: 'primary',

  buttonStyle: 'solid',
  buttonRoundness: 'full',
  buttonShadow: 'soft',
  buttonOpacity: 100,
  buttonTextOpacity: 100,
  pageTextOpacity: 100,
  backgroundOpacity: 100,
  fontFamily: 'Inter',
  titleFontFamily: '',
  sticker: '',
  stickerX: 62,
  stickerY: 22,

  teamMembers: [],
  dmRules: [],
  alimtalkSettings: {
    apiKey: '',
    apiSecret: '',
    senderPhone: '',
    templateCode: '',
    isEnabled: false
  },
  metaAccessToken: '',
  instagramAccount: '',

  // Language state & Action
  language: (typeof localStorage !== 'undefined' && localStorage.getItem('linkzip_language') as 'ko' | 'en') || 'ko',
  setLanguage: (lang) => {
    try {
      localStorage.setItem('linkzip_language', lang);
    } catch (e) {
      console.warn(e);
    }
    set({ language: lang });
  },

  // History & Change Tracking
  isDirty: false,
  undoStack: [],
  redoStack: [],
  savedSnapshot: null,

  setTemplate: (type, value) => set((state) => {
    const snap = getSnapshotFromState(state);
    const preset = getThemeDesignPreset(value);
    const { backgroundColor: _backgroundColor, ...presetDesign } = preset;
    return {
      templateType: type, 
      templateValue: value,
      ...(type === 'preset' ? {
        ...presetDesign,
        profile: { ...state.profile, titleColor: preset.pageTextColor },
        customLinks: resetLinkThemeOverrides(state.customLinks),
      } : {}),
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  setDesignSettings: (settings) => set((state) => {
    const snap = getSnapshotFromState(state);
    const resetsLinkOverrides = (Object.keys(settings) as (keyof DesignSettings)[]).some((key) => [
      'buttonStyle',
      'buttonRoundness',
      'buttonShadow',
      'buttonColor',
      'buttonTextColor',
      'buttonOpacity',
      'buttonTextOpacity',
      'fontFamily',
      'titleFontFamily',
      'pageTextColor',
      'pageTextOpacity',
    ].includes(key));
    return {
      ...state,
      ...settings,
      customLinks: resetsLinkOverrides ? resetLinkThemeOverrides(state.customLinks) : state.customLinks,
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  setSocialLinks: (links) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      socialLinks: links,
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  addSocialLink: (link) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      socialLinks: [...state.socialLinks, link],
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  updateSocialLink: (id, updates) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      socialLinks: state.socialLinks.map(s => s.id === id ? { ...s, ...updates } : s),
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  removeSocialLink: (id) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      socialLinks: state.socialLinks.filter(s => s.id !== id),
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),
  
  addCustomLink: (link, collectionId) => set((state) => {
    const snap = getSnapshotFromState(state);
    let newCustomLinks: CustomLink[];

    if (!collectionId) {
      newCustomLinks = [...state.customLinks, link];
    } else {
      newCustomLinks = state.customLinks.map(c => {
        if (c.id === collectionId) {
          return { ...c, links: [...(c.links || []), link] };
        }
        return c;
      });
    }

    return {
      customLinks: newCustomLinks,
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  updateCustomLink: (id, updates) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      customLinks: recursivelyUpdateLink(state.customLinks, id, updates),
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  removeCustomLink: (id) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      customLinks: recursivelyRemoveLink(state.customLinks, id),
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  setProfile: (profile) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      profile,
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  createProfileWorkspace: (name, username) => {
    const id = `profile-${Date.now()}`;
    set((state) => {
      const currentWorkspace = getWorkspaceFromState(state);
      const existing = state.profileWorkspaces.length > 0
        ? state.profileWorkspaces.map((workspace) => workspace.id === currentWorkspace.id ? currentWorkspace : workspace)
        : [currentWorkspace];
      const workspace: ProfileWorkspace = {
        id,
        profile: { name, username, bio: '', avatarUrl: '', hideWatermark: false, showBio: true },
        templateType: 'preset',
        templateValue: 'minimalist',
        socialLinks: [],
        customLinks: [],
        design: {
          buttonStyle: 'solid',
          buttonRoundness: 'full',
          buttonShadow: 'soft',
          buttonOpacity: 100,
          buttonTextOpacity: 100,
          pageTextOpacity: 100,
          backgroundOpacity: 100,
          fontFamily: 'Inter',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const workspaceState = getStateFromWorkspace(workspace);
      return {
        ...workspaceState,
        profileWorkspaces: [...existing, workspace],
        activeProfileId: id,
        savedSnapshot: getSnapshotFromState({ ...state, ...workspaceState }),
        undoStack: [],
        redoStack: [],
        isDirty: true,
      };
    });
    return id;
  },

  switchProfileWorkspace: (id) => set((state) => {
    if (id === state.activeProfileId) return state;
    const currentWorkspace = getWorkspaceFromState(state);
    const workspaces = state.profileWorkspaces.length > 0
      ? state.profileWorkspaces.map((workspace) => workspace.id === currentWorkspace.id ? currentWorkspace : workspace)
      : [currentWorkspace];
    const target = workspaces.find((workspace) => workspace.id === id);
    if (!target) return state;
    const workspaceState = getStateFromWorkspace(target);
    return {
      ...workspaceState,
      profileWorkspaces: workspaces,
      activeProfileId: id,
      savedSnapshot: getSnapshotFromState({ ...state, ...workspaceState }),
      undoStack: [],
      redoStack: [],
      isDirty: false,
    };
  }),

  deleteProfileWorkspace: (id) => set((state) => {
    if (state.profileWorkspaces.length <= 1) return state;
    const remaining = state.profileWorkspaces.filter((workspace) => workspace.id !== id);
    if (id !== state.activeProfileId) return { profileWorkspaces: remaining, isDirty: true };
    const target = remaining[0];
    const workspaceState = getStateFromWorkspace(target);
    return {
      ...workspaceState,
      profileWorkspaces: remaining,
      activeProfileId: target.id,
      savedSnapshot: getSnapshotFromState({ ...state, ...workspaceState }),
      undoStack: [],
      redoStack: [],
      isDirty: true,
    };
  }),

  syncActiveProfileWorkspace: () => set((state) => {
    const currentWorkspace = getWorkspaceFromState(state);
    return {
      profileWorkspaces: state.profileWorkspaces.length > 0
        ? state.profileWorkspaces.map((workspace) => workspace.id === currentWorkspace.id ? currentWorkspace : workspace)
        : [currentWorkspace],
    };
  }),

  loadData: (data) => set((state) => {
    const requestedWorkspaces = data.profileWorkspaces as ProfileWorkspace[] | undefined;
    const activeId = data.activeProfileId || requestedWorkspaces?.[0]?.id || state.activeProfileId || 'primary';
    const activeWorkspace = requestedWorkspaces?.find((workspace) => workspace.id === activeId) || requestedWorkspaces?.[0];
    const newState = { ...state, ...data, ...(activeWorkspace ? getStateFromWorkspace(activeWorkspace) : {}), activeProfileId: activeWorkspace?.id || activeId };
    const snap = getSnapshotFromState(newState);
    return {
      ...newState,
      savedSnapshot: snap,
      undoStack: [],
      redoStack: [],
      isDirty: false
    };
  }),

  reorderLinks: (newLinks) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      customLinks: newLinks,
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  addTeamMember: (member) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      teamMembers: [...state.teamMembers, member],
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  removeTeamMember: (id) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      teamMembers: state.teamMembers.filter(m => m.id !== id),
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  addDMRule: (rule) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      dmRules: [...state.dmRules, rule],
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  updateDMRule: (id, updates) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      dmRules: state.dmRules.map(r => r.id === id ? { ...r, ...updates } : r),
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  removeDMRule: (id) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      dmRules: state.dmRules.filter(r => r.id !== id),
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  setAlimtalkSettings: (settings) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      alimtalkSettings: { ...state.alimtalkSettings, ...settings },
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  setMetaAccessToken: (token) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      metaAccessToken: token,
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  setInstagramAccount: (account) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      instagramAccount: account || '',
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  undo: () => set((state) => {
    if (state.undoStack.length === 0) return state;
    const previousSnapshot = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, state.undoStack.length - 1);
    const currentSnapshot = getSnapshotFromState(state);

    return {
      ...previousSnapshot,
      undoStack: newUndoStack,
      redoStack: [currentSnapshot, ...state.redoStack],
      isDirty: true
    };
  }),

  redo: () => set((state) => {
    if (state.redoStack.length === 0) return state;
    const nextSnapshot = state.redoStack[0];
    const newRedoStack = state.redoStack.slice(1);
    const currentSnapshot = getSnapshotFromState(state);

    return {
      ...nextSnapshot,
      undoStack: [...state.undoStack, currentSnapshot],
      redoStack: newRedoStack,
      isDirty: true
    };
  }),

  cancelChanges: () => set((state) => {
    if (!state.savedSnapshot) return state;
    return {
      ...state.savedSnapshot,
      undoStack: [],
      redoStack: [],
      isDirty: false
    };
  }),

  markSaved: () => set((state) => {
    const currentSnap = getSnapshotFromState(state);
    const currentWorkspace = getWorkspaceFromState(state);
    return {
      savedSnapshot: currentSnap,
      profileWorkspaces: state.profileWorkspaces.length > 0
        ? state.profileWorkspaces.map((workspace) => workspace.id === currentWorkspace.id ? currentWorkspace : workspace)
        : [currentWorkspace],
      undoStack: [],
      redoStack: [],
      isDirty: false
    };
  }),

  moveItemToCollection: (itemId, targetCollectionId) => set((state) => {
    if (itemId === targetCollectionId) return state;

    const snap = getSnapshotFromState(state);
    let extractedItem: CustomLink | null = null;

    const removeFromTree = (list: CustomLink[]): CustomLink[] => {
      const result: CustomLink[] = [];
      for (const item of list) {
        if (item.id === itemId) {
          extractedItem = item;
          continue;
        }
        if (item.links && item.links.length > 0) {
          result.push({ ...item, links: removeFromTree(item.links) });
        } else {
          result.push(item);
        }
      }
      return result;
    };

    const newRoot = removeFromTree(state.customLinks);
    if (!extractedItem) return state;

    const itemToInsert: CustomLink = {
      ...(extractedItem as CustomLink)
    };

    const addToTarget = (list: CustomLink[]): CustomLink[] => {
      return list.map(item => {
        if (item.id === targetCollectionId && item.type === 'collection') {
          return {
            ...item,
            links: [...(item.links || []), itemToInsert]
          };
        }
        if (item.links && item.links.length > 0) {
          return { ...item, links: addToTarget(item.links) };
        }
        return item;
      });
    };

    return { 
      customLinks: addToTarget(newRoot),
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  moveItemToRoot: (itemId) => set((state) => {
    const snap = getSnapshotFromState(state);
    let extractedItem: CustomLink | null = null;

    const removeFromCollections = (list: CustomLink[]): CustomLink[] => {
      return list.map(item => {
        if (item.links && item.links.length > 0) {
          const found = item.links.find(l => l.id === itemId);
          if (found) {
            extractedItem = found;
            return { ...item, links: item.links.filter(l => l.id !== itemId) };
          }
          return { ...item, links: removeFromCollections(item.links) };
        }
        return item;
      });
    };

    const newRoot = removeFromCollections(state.customLinks);
    if (!extractedItem) return state;

    return { 
      customLinks: [...newRoot, extractedItem],
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  moveItemRelative: (activeId, targetId, position = 'before') => set((state) => {
    if (activeId === targetId) return state;

    const snap = getSnapshotFromState(state);
    let activeItem: CustomLink | null = null;

    const removeActive = (list: CustomLink[]): CustomLink[] => {
      const result: CustomLink[] = [];
      for (const item of list) {
        if (item.id === activeId) {
          activeItem = item;
          continue;
        }
        if (item.links && item.links.length > 0) {
          result.push({ ...item, links: removeActive(item.links) });
        } else {
          result.push(item);
        }
      }
      return result;
    };

    const cleanList = removeActive(state.customLinks);
    if (!activeItem) return state;

    const insertNearTarget = (list: CustomLink[]): CustomLink[] => {
      const targetIdx = list.findIndex(item => item.id === targetId);
      if (targetIdx !== -1) {
        const newList = [...list];
        const insertIndex = position === 'after' ? targetIdx + 1 : targetIdx;
        newList.splice(insertIndex, 0, activeItem!);
        return newList;
      }
      return list.map(item => {
        if (item.links && item.links.length > 0) {
          return { ...item, links: insertNearTarget(item.links) };
        }
        return item;
      });
    };

    return { 
      customLinks: insertNearTarget(cleanList),
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  moveItemDirection: (id, direction) => set((state) => {
    const list = [...state.customLinks];
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return state;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return state;

    const snap = getSnapshotFromState(state);
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    return {
      customLinks: list,
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  // Analytics Initial State & Handlers
  pageViews: 0,
  analyticsDailyHistory: [],
  analyticsLinkClicks: {},

  incrementPageViews: () => set((state) => ({ pageViews: state.pageViews + 1 })),

  recordLinkClick: (linkId: string) => set((state) => {
    const recursivelyIncrement = (links: CustomLink[]): CustomLink[] => {
      return links.map(link => {
        if (link.id === linkId) {
          return { ...link, clicks: (link.clicks || 0) + 1 };
        }
        if (link.links && link.links.length > 0) {
          return { ...link, links: recursivelyIncrement(link.links) };
        }
        return link;
      });
    };

    return {
      customLinks: recursivelyIncrement(state.customLinks),
    };
  }),

  resetAnalytics: () => set((state) => ({
    pageViews: 0,
    customLinks: applyLinkClicks(state.customLinks, {}),
    analyticsDailyHistory: [],
    analyticsLinkClicks: {},
  })),

  loadAnalytics: ({ pageViews, daily, linkClicks }) => set((state) => {
    return {
      pageViews,
      analyticsDailyHistory: daily,
      analyticsLinkClicks: linkClicks,
      customLinks: applyLinkClicks(state.customLinks, linkClicks),
    };
  }),
}));
