import { create } from 'zustand';

export interface SocialLink {
  platform: string;
  id: string;
}

export interface CustomLink {
  id: string;
  type?: 'link' | 'collection';
  title: string;
  url?: string;
  layout?: 'list' | 'grid';
  links?: CustomLink[]; // For collections
  isVisible?: boolean;
}

export interface UserProfile {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  profileLayout?: 'classic' | 'hero' | 'banner' | 'cutout' | 'shape';
  titleStyle?: 'text' | 'logo';
  logoUrl?: string;
  titleColor?: string;
  bannerUrl?: string;
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
  buttonColor?: string;
  buttonTextColor?: string;
  fontFamily: string;
  pageTextColor?: string;
  sticker?: string;

  // Actions
  setTemplate: (type: 'color' | 'preset', value: string) => void;
  setDesignSettings: (settings: Partial<AppState>) => void;
  setSocialLinks: (links: SocialLink[]) => void;
  addCustomLink: (link: CustomLink, collectionId?: string) => void;
  updateCustomLink: (id: string, updates: Partial<CustomLink>) => void;
  removeCustomLink: (id: string) => void;
  setProfile: (profile: UserProfile) => void;
  loadData: (data: Partial<AppState>) => void;
  reorderLinks: (newLinks: CustomLink[]) => void;

  // Drag and Drop Actions
  moveItemToCollection: (itemId: string, targetCollectionId: string) => void;
  moveItemToRoot: (itemId: string) => void;
  moveItemRelative: (activeId: string, targetId: string) => void;
}

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

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  templateType: 'preset',
  templateValue: 'minimalist',
  socialLinks: [],
  customLinks: [],
  profile: { name: '', username: '', bio: '', avatarUrl: '' },

  buttonStyle: 'solid',
  buttonRoundness: 'md',
  fontFamily: 'sans',
  sticker: '',

  setTemplate: (type, value) => set((state) => ({ 
    templateType: type, 
    templateValue: value,
    buttonColor: '',
    buttonTextColor: '',
    pageTextColor: '',
    profile: { ...state.profile, titleColor: '' }
  })),
  setDesignSettings: (settings) => set((state) => ({ ...state, ...settings })),
  setSocialLinks: (links) => set({ socialLinks: links }),
  
  addCustomLink: (link, collectionId) => set((state) => {
    if (!collectionId) {
      return { customLinks: [...state.customLinks, link] };
    }
    return {
      customLinks: state.customLinks.map(c => {
        if (c.id === collectionId) {
          return { ...c, links: [...(c.links || []), link] };
        }
        return c;
      })
    };
  }),

  updateCustomLink: (id, updates) => set((state) => ({
    customLinks: recursivelyUpdateLink(state.customLinks, id, updates)
  })),

  removeCustomLink: (id) => set((state) => ({
    customLinks: recursivelyRemoveLink(state.customLinks, id)
  })),

  setProfile: (profile) => set({ profile }),
  loadData: (data) => set((state) => ({ ...state, ...data })),
  reorderLinks: (newLinks) => set({ customLinks: newLinks }),

  moveItemToCollection: (itemId, targetCollectionId) => set((state) => {
    if (itemId === targetCollectionId) return state;

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

    // Convert to standard link if moving into a collection
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

    return { customLinks: addToTarget(newRoot) };
  }),

  moveItemToRoot: (itemId) => set((state) => {
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

    return { customLinks: [...newRoot, extractedItem] };
  }),

  moveItemRelative: (activeId, targetId) => set((state) => {
    if (activeId === targetId) return state;

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

    return { customLinks: insertNearTarget(cleanList) };
  }),
}));
