import { create } from 'zustand';

export interface SocialLink {
  platform: string;
  id: string;
}

export interface CustomLink {
  id: string;
  title: string;
  url: string;
}

export interface UserProfile {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
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

  // Actions
  setTemplate: (type: 'color' | 'preset', value: string) => void;
  setSocialLinks: (links: SocialLink[]) => void;
  addCustomLink: (link: CustomLink) => void;
  updateCustomLink: (id: string, updates: Partial<CustomLink>) => void;
  removeCustomLink: (id: string) => void;
  setProfile: (profile: UserProfile) => void;
  loadData: (data: Partial<AppState>) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  templateType: 'preset',
  templateValue: 'minimalist',
  socialLinks: [],
  customLinks: [],
  profile: { name: '', username: '', bio: '', avatarUrl: '' },

  setTemplate: (type, value) => set({ templateType: type, templateValue: value }),
  setSocialLinks: (links) => set({ socialLinks: links }),
  addCustomLink: (link) => set((state) => ({ customLinks: [...state.customLinks, link] })),
  updateCustomLink: (id, updates) => set((state) => ({
    customLinks: state.customLinks.map((link) => link.id === id ? { ...link, ...updates } : link)
  })),
  removeCustomLink: (id) => set((state) => ({
    customLinks: state.customLinks.filter((link) => link.id !== id)
  })),
  setProfile: (profile) => set({ profile }),
  loadData: (data) => set((state) => ({ ...state, ...data })),
}));
