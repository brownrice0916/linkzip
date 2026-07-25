import { create } from 'zustand';

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

export interface CustomLink {
  id: string;
  type?: 'link' | 'collection' | 'donation';
  title: string;
  url?: string;
  layout?: 'list' | 'grid';
  links?: CustomLink[]; // For collections
  isVisible?: boolean;
  icon?: string; // image thumbnail URL
  thumbnailType?: 'image' | 'icon' | 'none'; // thumbnail mode
  iconName?: string; // selected icon key e.g. 'link', 'globe', 'instagram', etc.
  donationConfig?: DonationConfig;
}

export interface UserProfile {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  email?: string;
  showEmail?: boolean;
  showBio?: boolean;
  profileLayout?: 'classic' | 'hero' | 'banner' | 'cutout' | 'shape';
  titleStyle?: 'text' | 'logo';
  logoUrl?: string;
  titleColor?: string;
  bannerUrl?: string;
  hideWatermark?: boolean;
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
  fontFamily: string;
  titleFontFamily?: string;
  pageTextColor?: string;
  sticker?: string;
  teamMembers?: TeamMember[];
  dmRules?: DMAutomationRule[];
  alimtalkSettings?: AlimtalkSettings;
  metaAccessToken?: string;
  instagramAccount?: string;
}

interface AppState {
  // Authentication
  user: any | null;
  setUser: (user: any | null) => void;

  // Onboarding & Profile Data
  templateType: 'color' | 'preset';
  templateValue: string;
  socialLinks: SocialLink[];
  customLinks: CustomLink[];
  profile: UserProfile;

  // Design Settings
  buttonStyle: 'solid' | 'glass' | 'outline';
  buttonRoundness: 'none' | 'sm' | 'md' | 'full';
  buttonShadow: 'none' | 'soft' | 'strong' | 'hard';
  buttonColor?: string;
  buttonTextColor?: string;
  fontFamily: string;
  titleFontFamily?: string;
  pageTextColor?: string;
  sticker?: string;

  // Growth & Enterprise Data
  teamMembers: TeamMember[];
  dmRules: DMAutomationRule[];
  alimtalkSettings: AlimtalkSettings;
  metaAccessToken?: string;
  instagramAccount?: string;

  // Change Tracking & History (Undo / Redo / Cancel / Save)
  isDirty: boolean;
  undoStack: AppStateSnapshot[];
  redoStack: AppStateSnapshot[];
  savedSnapshot: AppStateSnapshot | null;

  // Actions
  setTemplate: (type: 'color' | 'preset', value: string) => void;
  setDesignSettings: (settings: Partial<AppState>) => void;
  setSocialLinks: (links: SocialLink[]) => void;
  addSocialLink: (link: SocialLink) => void;
  updateSocialLink: (id: string, updates: Partial<SocialLink>) => void;
  removeSocialLink: (id: string) => void;
  addCustomLink: (link: CustomLink, collectionId?: string) => void;
  updateCustomLink: (id: string, updates: Partial<CustomLink>) => void;
  removeCustomLink: (id: string) => void;
  setProfile: (profile: UserProfile) => void;
  loadData: (data: Partial<AppState>) => void;
  reorderLinks: (newLinks: CustomLink[]) => void;

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

  // Drag and Drop Actions
  moveItemToCollection: (itemId: string, targetCollectionId: string) => void;
  moveItemToRoot: (itemId: string) => void;
  moveItemRelative: (activeId: string, targetId: string) => void;
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
  fontFamily: state.fontFamily,
  titleFontFamily: state.titleFontFamily,
  pageTextColor: state.pageTextColor,
  sticker: state.sticker,
  teamMembers: JSON.parse(JSON.stringify(state.teamMembers || [])),
  dmRules: JSON.parse(JSON.stringify(state.dmRules || [])),
  alimtalkSettings: JSON.parse(JSON.stringify(state.alimtalkSettings || {})),
  metaAccessToken: state.metaAccessToken || '',
  instagramAccount: state.instagramAccount || '',
});

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

const recursivelyRemoveLink = (links: CustomLink[], id: string): CustomLink[] => {
  return links.filter(link => link.id !== id).map(link => {
    if (link.links && link.links.length > 0) {
      return { ...link, links: recursivelyRemoveLink(link.links, id) };
    }
    return link;
  });
};

const themeFontMap: Record<string, string> = {
  'minimalist': 'Inter',
  'neon-dark': 'Space Grotesk',
  'soft-gradient': 'Outfit',
  'air': 'DM Sans',
  'blocks': 'Syne',
  'bloom': 'Lora',
  'sunbloom': 'Albert Sans',
  'neo-pop': 'Bricolage Grotesque',
  'neo-sunshine': 'Black Han Sans',
  'neo-cyber': 'Space Mono',
  'neo-mint': 'Pretendard',
  'groove': 'Epilogue',
  'lake': 'IBM Plex Sans',
  'nourish': 'Bitter',
};

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  templateType: 'preset',
  templateValue: 'minimalist',
  socialLinks: [],
  customLinks: [],
  profile: { name: '', username: '', bio: '', avatarUrl: '', hideWatermark: false },

  buttonStyle: 'solid',
  buttonRoundness: 'full',
  buttonShadow: 'soft',
  fontFamily: 'Inter',
  titleFontFamily: '',
  sticker: '',

  teamMembers: [],
  dmRules: [
    {
      id: 'rule-1',
      keyword: '링크',
      responseMessage: '안녕하세요! 요청하신 대표 링크 모음집 URL입니다: https://linkzip.kr/preview',
      targetLinkUrl: 'https://linkzip.kr/preview',
      isActive: true
    }
  ],
  alimtalkSettings: {
    apiKey: '',
    apiSecret: '',
    senderPhone: '',
    templateCode: '',
    isEnabled: false
  },
  metaAccessToken: '',
  instagramAccount: '',

  // History & Change Tracking
  isDirty: false,
  undoStack: [],
  redoStack: [],
  savedSnapshot: null,

  setTemplate: (type, value) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      templateType: type, 
      templateValue: value,
      buttonColor: '',
      buttonTextColor: '',
      pageTextColor: '',
      fontFamily: themeFontMap[value] || state.fontFamily,
      titleFontFamily: '',
      profile: { ...state.profile, titleColor: '' },
      undoStack: [...state.undoStack, snap],
      redoStack: [],
      isDirty: true
    };
  }),

  setDesignSettings: (settings) => set((state) => {
    const snap = getSnapshotFromState(state);
    return {
      ...state,
      ...settings,
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

  loadData: (data) => set((state) => {
    const newState = { ...state, ...data };
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
    return {
      savedSnapshot: currentSnap,
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
      ...(extractedItem as CustomLink),
      type: 'link'
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

  moveItemRelative: (activeId, targetId) => set((state) => {
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
        newList.splice(targetIdx, 0, activeItem!);
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
}));
