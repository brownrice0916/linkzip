import React from 'react';
import type { ComponentType } from 'react';
import { 
  Link2, 
  Globe, 
  BookOpen, 
  FileText, 
  Music, 
  Heart, 
  ShoppingBag, 
  Star, 
  Mail, 
  Phone, 
  MapPin, 
  Compass, 
  Coffee, 
  MessageCircle, 
  CheckCircle, 
  Zap, 
  Smile, 
  Code, 
  Camera, 
  Tv, 
  Headphones, 
  Feather, 
  Gift, 
  Bookmark, 
  Shield, 
  Flame, 
  Sparkles, 
  Laptop, 
  Video, 
  Send, 
  Share2, 
  ExternalLink,
  Podcast,
  Gamepad2,
  Store,
  Briefcase,
  Tag,
  Paperclip
} from 'lucide-react';

import {
  FaFacebook,
  FaLinkedin,
  FaYoutube,
  FaInstagram,
  FaTiktok,
  FaGithub,
  FaDiscord,
  FaSpotify,
  FaPinterest
} from 'react-icons/fa';

import {
  SiNaver,
  SiThreads,
  SiKakaotalk,
  SiNotion,
  SiMedium,
  SiSubstack,
  SiX
} from 'react-icons/si';

export type IconComponent = ComponentType<{ className?: string }>;

export interface IconItem {
  id: string;
  name: string;
  icon: IconComponent;
  category?: 'sns' | 'general';
  tags?: string[];
}

// Custom SVG Icons for Korean Platforms
const NaverIcon: IconComponent = ({ className = "w-5 h-5" }) => (
  React.createElement('svg', { className, viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('path', { d: "M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" })
  )
);

const PostypeIcon: IconComponent = ({ className = "w-5 h-5" }) => (
  React.createElement('svg', { className, viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('path', { d: "M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3ZM11 16H8V8H13.5C14.8807 8 16 9.11929 16 10.5C16 11.8807 14.8807 13 13.5 13H11V16ZM11 10.5H13.5C13.7761 10.5 14 10.7239 14 11C14 11.2761 13.7761 11.5 13.5 11.5H11V10.5Z" })
  )
);

const BrunchIcon: IconComponent = ({ className = "w-5 h-5" }) => (
  React.createElement('svg', { className, viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('path', { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z" })
  )
);

const TistoryIcon: IconComponent = ({ className = "w-5 h-5" }) => (
  React.createElement('svg', { className, viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('circle', { cx: "6", cy: "6", r: "3" }),
    React.createElement('circle', { cx: "12", cy: "6", r: "3" }),
    React.createElement('circle', { cx: "18", cy: "6", r: "3" }),
    React.createElement('circle', { cx: "12", cy: "12", r: "3" }),
    React.createElement('circle', { cx: "12", cy: "18", r: "3" })
  )
);

export const iconRegistry: Record<string, IconComponent> = {
  // SNS & Platforms
  naver: NaverIcon,
  postype: PostypeIcon,
  naverblog: NaverIcon,
  tistory: TistoryIcon,
  brunch: BrunchIcon,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  youtube: FaYoutube,
  instagram: FaInstagram,
  twitter: SiX,
  tiktok: FaTiktok,
  threads: SiThreads,
  kakao: SiKakaotalk,
  github: FaGithub,
  discord: FaDiscord,
  notion: SiNotion,
  spotify: FaSpotify,
  pinterest: FaPinterest,
  medium: SiMedium,
  substack: SiSubstack,

  // General Icons
  link: Link2,
  globe: Globe,
  book: BookOpen,
  file: FileText,
  music: Music,
  heart: Heart,
  shopping: ShoppingBag,
  star: Star,
  mail: Mail,
  phone: Phone,
  mappin: MapPin,
  compass: Compass,
  coffee: Coffee,
  message: MessageCircle,
  check: CheckCircle,
  zap: Zap,
  smile: Smile,
  code: Code,
  camera: Camera,
  tv: Tv,
  headphones: Headphones,
  feather: Feather,
  gift: Gift,
  bookmark: Bookmark,
  shield: Shield,
  flame: Flame,
  sparkles: Sparkles,
  laptop: Laptop,
  video: Video,
  send: Send,
  share: Share2,
  external: ExternalLink,
  podcast: Podcast,
  gamepad: Gamepad2,
  store: Store,
  briefcase: Briefcase,
  tag: Tag,
  paperclip: Paperclip
};

export const availableIcons: IconItem[] = [
  // SNS & Brand Icons
  { id: 'naver', name: '네이버', icon: NaverIcon, category: 'sns', tags: ['naver', '네이버', 'blog', 'cafe'] },
  { id: 'postype', name: '포스타입', icon: PostypeIcon, category: 'sns', tags: ['postype', '포스타입', 'post'] },
  { id: 'youtube', name: 'YouTube', icon: FaYoutube, category: 'sns', tags: ['youtube', '유튜브', 'video'] },
  { id: 'instagram', name: 'Instagram', icon: FaInstagram, category: 'sns', tags: ['instagram', '인스타그램', 'photo'] },
  { id: 'facebook', name: 'Facebook', icon: FaFacebook, category: 'sns', tags: ['facebook', '페이스북', 'social'] },
  { id: 'linkedin', name: 'LinkedIn', icon: FaLinkedin, category: 'sns', tags: ['linkedin', '링크드인', 'career', 'job'] },
  { id: 'twitter', name: 'X (Twitter)', icon: SiX, category: 'sns', tags: ['twitter', 'x', '트위터', 'tweet'] },
  { id: 'tiktok', name: 'TikTok', icon: FaTiktok, category: 'sns', tags: ['tiktok', '틱톡', 'video'] },
  { id: 'threads', name: 'Threads', icon: SiThreads, category: 'sns', tags: ['threads', '쓰레드', 'text'] },
  { id: 'kakao', name: '카카오톡', icon: SiKakaotalk, category: 'sns', tags: ['kakao', '카카오톡', 'chat'] },
  { id: 'tistory', name: '티스토리', icon: TistoryIcon, category: 'sns', tags: ['tistory', '티스토리', 'blog'] },
  { id: 'brunch', name: '브런치', icon: BrunchIcon, category: 'sns', tags: ['brunch', '브런치', 'story'] },
  { id: 'github', name: 'GitHub', icon: FaGithub, category: 'sns', tags: ['github', '깃허브', 'code', 'dev'] },
  { id: 'discord', name: 'Discord', icon: FaDiscord, category: 'sns', tags: ['discord', '디스코드', 'chat'] },
  { id: 'notion', name: 'Notion', icon: SiNotion, category: 'sns', tags: ['notion', '노션', 'page'] },
  { id: 'spotify', name: 'Spotify', icon: FaSpotify, category: 'sns', tags: ['spotify', '스포티파이', 'music'] },
  { id: 'pinterest', name: 'Pinterest', icon: FaPinterest, category: 'sns', tags: ['pinterest', '핀터레스트', 'photo'] },
  { id: 'medium', name: 'Medium', icon: SiMedium, category: 'sns', tags: ['medium', '미디엄', 'article'] },
  { id: 'substack', name: 'Substack', icon: SiSubstack, category: 'sns', tags: ['substack', '섭스택', 'newsletter'] },

  // General Icons
  { id: 'link', name: 'Link', icon: Link2, category: 'general', tags: ['chain', 'url', 'web'] },
  { id: 'globe', name: 'Website', icon: Globe, category: 'general', tags: ['internet', 'world', 'site'] },
  { id: 'book', name: 'Book', icon: BookOpen, category: 'general', tags: ['read', 'story', 'posttype'] },
  { id: 'file', name: 'Blog', icon: FileText, category: 'general', tags: ['article', 'text', 'post'] },
  { id: 'music', name: 'Music', icon: Music, category: 'general', tags: ['audio', 'song'] },
  { id: 'heart', name: 'Heart', icon: Heart, category: 'general', tags: ['like', 'love', 'sponsor'] },
  { id: 'shopping', name: 'Shop', icon: ShoppingBag, category: 'general', tags: ['store', 'buy'] },
  { id: 'star', name: 'Star', icon: Star, category: 'general', tags: ['favorite', 'review'] },
  { id: 'mail', name: 'Email', icon: Mail, category: 'general', tags: ['contact', 'letter'] },
  { id: 'phone', name: 'Phone', icon: Phone, category: 'general', tags: ['call', 'contact'] },
  { id: 'mappin', name: 'Location', icon: MapPin, category: 'general', tags: ['place', 'map'] },
  { id: 'compass', name: 'Compass', icon: Compass, category: 'general', tags: ['explore', 'guide'] },
  { id: 'coffee', name: 'Coffee', icon: Coffee, category: 'general', tags: ['buy me a coffee', 'donation'] },
  { id: 'message', name: 'Chat', icon: MessageCircle, category: 'general', tags: ['talk', 'message'] },
  { id: 'check', name: 'Check', icon: CheckCircle, category: 'general', tags: ['done', 'verify'] },
  { id: 'zap', name: 'Zap', icon: Zap, category: 'general', tags: ['fast', 'flash'] },
  { id: 'smile', name: 'Smile', icon: Smile, category: 'general', tags: ['happy', 'face'] },
  { id: 'code', name: 'Code', icon: Code, category: 'general', tags: ['dev', 'developer'] },
  { id: 'camera', name: 'Camera', icon: Camera, category: 'general', tags: ['photo', 'picture'] },
  { id: 'tv', name: 'TV', icon: Tv, category: 'general', tags: ['stream', 'video'] },
  { id: 'headphones', name: 'Podcast', icon: Headphones, category: 'general', tags: ['audio', 'listen'] },
  { id: 'feather', name: 'Writing', icon: Feather, category: 'general', tags: ['story', 'pen'] },
  { id: 'gift', name: 'Gift', icon: Gift, category: 'general', tags: ['present', 'free'] },
  { id: 'bookmark', name: 'Bookmark', icon: Bookmark, category: 'general', tags: ['save', 'mark'] },
  { id: 'shield', name: 'Shield', icon: Shield, category: 'general', tags: ['secure', 'safe'] },
  { id: 'flame', name: 'Popular', icon: Flame, category: 'general', tags: ['hot', 'fire'] },
  { id: 'sparkles', name: 'Sparkles', icon: Sparkles, category: 'general', tags: ['new', 'special'] },
  { id: 'laptop', name: 'Laptop', icon: Laptop, category: 'general', tags: ['work', 'computer'] },
  { id: 'video', name: 'Video', icon: Video, category: 'general', tags: ['movie', 'stream'] },
  { id: 'send', name: 'Send', icon: Send, category: 'general', tags: ['telegram', 'message'] },
  { id: 'share', name: 'Share', icon: Share2, category: 'general', tags: ['share', 'social'] },
  { id: 'external', name: 'External', icon: ExternalLink, category: 'general', tags: ['open', 'link'] },
  { id: 'podcast', name: 'Radio', icon: Podcast, category: 'general', tags: ['audio', 'broadcast'] },
  { id: 'gamepad', name: 'Gaming', icon: Gamepad2, category: 'general', tags: ['game', 'play'] },
  { id: 'store', name: 'Store', icon: Store, category: 'general', tags: ['market', 'shop'] },
  { id: 'briefcase', name: 'Portfolio', icon: Briefcase, category: 'general', tags: ['work', 'job'] },
  { id: 'tag', name: 'Tag', icon: Tag, category: 'general', tags: ['label', 'category'] },
  { id: 'paperclip', name: 'Attachment', icon: Paperclip, category: 'general', tags: ['file', 'clip'] },
];

export const getLinkIcon = (iconId?: string): IconComponent => {
  if (!iconId || !iconRegistry[iconId]) {
    return Link2;
  }
  return iconRegistry[iconId];
};
