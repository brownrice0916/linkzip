import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  Handshake,
  ImagePlus,
  Link2,
  Loader2,
  Megaphone,
  MessageCircle,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  WandSparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore, type CustomLink, type UserProfile } from '../../store/useStore';
import { saveUserData } from '../../services/userService';
import { uploadPublicImage } from '../../services/storageService';
import { isValidUsername, normalizeUsername } from '../../domain/profileData';
import LinkZipLogo from '../../components/brand/LinkZipLogo';
import { getThemeWallpaperStyle, themeDesignPresets } from '../../domain/themePresets';
import {
  clearOnboardingSurvey,
  readOnboardingSurvey,
  writeOnboardingSurvey,
  type OnboardingUserType,
} from '../../domain/onboardingSurvey';

type DraftLink = { id: string; title: string; url: string };

const userTypeOptions: Array<{
  id: OnboardingUserType;
  title: string;
  description: string;
  icon: typeof UserRound;
  accent: string;
}> = [
  { id: 'personal', title: '개인', description: '내 소개와 자주 공유하는 링크를 한곳에 모아요.', icon: UserRound, accent: 'bg-lime-100 text-lime-700' },
  { id: 'creator', title: '크리에이터', description: '콘텐츠와 SNS, 협업 문의 링크를 한곳에 모아요.', icon: Sparkles, accent: 'bg-orange-100 text-orange-700' },
  { id: 'brand', title: '브랜드·비즈니스', description: '상품과 서비스, 예약·문의 링크를 한곳에서 관리해요.', icon: Building2, accent: 'bg-[#ffcf4a] text-[#171714]' },
];

const goalsByType: Record<OnboardingUserType, Array<{ id: string; icon: typeof UserRound; title: string; description: string }>> = {
  personal: [
    { id: 'profile', icon: UserRound, title: '온라인 프로필', description: '나를 한눈에 소개하고 싶어요' },
    { id: 'links', icon: Link2, title: '링크 모음', description: '자주 쓰는 링크를 정리하고 싶어요' },
    { id: 'portfolio', icon: BriefcaseBusiness, title: '포트폴리오', description: '작업물과 경력을 보여주고 싶어요' },
    { id: 'community', icon: MessageCircle, title: '소통 공간', description: '방명록과 메시지로 소통하고 싶어요' },
  ],
  creator: [
    { id: 'content', icon: Megaphone, title: '콘텐츠 확산', description: '모든 채널과 콘텐츠를 연결하고 싶어요' },
    { id: 'partnership', icon: Handshake, title: '브랜드 협업', description: '광고와 협업 문의를 받고 싶어요' },
    { id: 'monetize', icon: CircleDollarSign, title: '수익화', description: '제휴 링크와 후원으로 수익화하고 싶어요' },
    { id: 'sell', icon: ShoppingBag, title: '상품·서비스 판매', description: '내 상품과 서비스를 판매하고 싶어요' },
  ],
  brand: [
    { id: 'brand', icon: Megaphone, title: '브랜드 알리기', description: '브랜드와 새로운 소식을 소개해요.' },
    { id: 'leads', icon: Users, title: '고객 연락처 모으기', description: '관심 있는 고객의 연락처를 받아요.' },
    { id: 'booking', icon: CalendarDays, title: '예약·문의 받기', description: '상담과 예약 신청을 간편하게 받아요.' },
    { id: 'commerce', icon: ShoppingCart, title: '상품 판매하기', description: '상품과 서비스를 소개하고 판매해요.' },
  ],
};

const themeCopy: Record<string, { name: string; description: string }> = {
  minimalist: { name: '쿨', description: '어떤 콘텐츠에도 자연스럽게 어울리는 깔끔한 스타일' },
  'neon-dark': { name: '네온', description: '선명한 색과 대비로 콘텐츠를 돋보이게 하는 스타일' },
  'soft-gradient': { name: '소프트 그라데이션', description: '부드러운 색감이 돋보이는 친근한 스타일' },
  air: { name: '에어', description: '넉넉한 여백과 맑은 색감의 가벼운 스타일' },
  blocks: { name: '블록', description: '선명한 격자와 색상으로 시선을 끄는 스타일' },
  bloom: { name: '블룸', description: '장밋빛 색감이 풍성하게 번지는 감성적인 스타일' },
  sunbloom: { name: '선블룸', description: '따뜻한 햇살을 닮은 밝고 생기 있는 스타일' },
  'neo-pop': { name: '네오 팝', description: '대담한 색과 그림자가 돋보이는 팝 스타일' },
  'neo-sunshine': { name: '네오 선샤인', description: '강한 햇빛처럼 경쾌하고 활기찬 스타일' },
  'neo-cyber': { name: '네오 사이버', description: '네온 그리드와 어두운 배경의 미래적인 스타일' },
  'neo-mint': { name: '네오 민트', description: '산뜻한 민트와 굵은 선을 조합한 스타일' },
  groove: { name: '그루브', description: '강렬한 색이 리듬감 있게 이어지는 스타일' },
  lake: { name: '레이크', description: '깊고 차분한 푸른빛의 안정적인 스타일' },
  nourish: { name: '너리시', description: '짙은 초록과 크림색이 어우러진 자연스러운 스타일' },
};

const hexToRgba = (hex: string, opacity: number) => {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return hex;
  const number = Number.parseInt(value, 16);
  return `rgba(${number >> 16}, ${(number >> 8) & 255}, ${number & 255}, ${opacity / 100})`;
};

const onboardingThemeIds = ['minimalist', 'neon-dark', 'soft-gradient', 'air', 'blocks', 'bloom'] as const;

const themeOptions = Object.entries(themeDesignPresets)
  .filter(([id]) => onboardingThemeIds.includes(id as (typeof onboardingThemeIds)[number]))
  .map(([id, design]) => {
  const radius = design.buttonRoundness === 'full' ? 999 : design.buttonRoundness === 'md' ? 16 : design.buttonRoundness === 'sm' ? 8 : 0;
  const shadow = design.buttonShadow === 'hard'
    ? `4px 4px 0 ${design.pageTextColor}`
    : design.buttonShadow === 'strong'
      ? '0 8px 20px rgba(0,0,0,.22)'
      : design.buttonShadow === 'soft'
        ? '0 4px 12px rgba(0,0,0,.12)'
        : 'none';
  return {
    id,
    ...(themeCopy[id] || { name: id, description: '링크집에 바로 적용할 수 있는 테마' }),
    wallpaper: getThemeWallpaperStyle(id),
    text: design.pageTextColor,
    card: design.buttonStyle === 'outline' ? 'transparent' : hexToRgba(design.buttonColor, design.buttonOpacity),
    cardText: design.buttonTextColor,
    cardBorder: design.buttonStyle === 'outline' ? `2px solid ${design.buttonColor}` : '1px solid rgba(255,255,255,.24)',
    radius,
    shadow,
  };
  });

const stepLabels = ['유형', '사용 목적', '프로필', '테마', '링크'];

const makeLink = (): DraftLink => ({ id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: '', url: '' });

const normalizeLinkUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^(?:https?:\/\/|\/)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const isNaverPlaceholderName = (value?: string | null) => /^네이버[\s_-]*사용자$/i.test(value?.trim() || '');

const OnboardingFlow = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const storedProfile = useStore((state) => state.profile);
  const storedTheme = useStore((state) => state.templateValue);
  const storedLinks = useStore((state) => state.customLinks);
  const socialLinks = useStore((state) => state.socialLinks);
  const loadData = useStore((state) => state.loadData);
  const savedSurvey = readOnboardingSurvey(user?.uid);

  const suggestedUsername = useMemo(() => {
    const fromEmail = user?.email?.split('@')[0] || user?.displayName || '';
    return normalizeUsername(fromEmail.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}._-]/gu, '')).slice(0, 30);
  }, [user]);
  const initialDisplayName = storedProfile.name && !isNaverPlaceholderName(storedProfile.name)
    ? storedProfile.name
    : user?.displayName || storedProfile.name || '';

  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<OnboardingUserType>(savedSurvey?.userType || 'personal');
  const [goals, setGoals] = useState<string[]>(savedSurvey?.goals || []);
  const [profile, setProfile] = useState<UserProfile>({
    ...storedProfile,
    name: initialDisplayName,
    username: storedProfile.username || suggestedUsername,
    bio: storedProfile.bio || '',
    avatarUrl: storedProfile.avatarUrl || user?.photoURL || '',
  });
  const [theme, setTheme] = useState(
    onboardingThemeIds.includes(storedTheme as (typeof onboardingThemeIds)[number]) ? storedTheme : 'minimalist',
  );
  const [links, setLinks] = useState<DraftLink[]>(
    storedLinks.length > 0
      ? storedLinks.filter((link) => !link.type || link.type === 'link').slice(0, 6).map(({ id, title, url }) => ({ id, title, url: url || '' }))
      : [makeLink()],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const selectedTheme = themeOptions.find((item) => item.id === theme) || themeOptions[0];
  const displayLinks = links.filter((link) => link.title.trim() || link.url.trim()).slice(0, 3);

  const canContinue = (() => {
    if (step === 1) return Boolean(userType);
    if (step === 2) return goals.length > 0;
    if (step === 3) return Boolean(profile.name.trim()) && isValidUsername(profile.username);
    if (step === 4) return Boolean(theme);
    return links.every((link) => (!link.title.trim() && !link.url.trim()) || (Boolean(link.title.trim()) && Boolean(link.url.trim())));
  })();

  const next = () => {
    setError('');
    if (!canContinue) {
      setError(step === 3 ? '표시 이름과 올바른 링크집 주소를 입력해 주세요.' : '필수 항목을 확인해 주세요.');
      return;
    }
    writeOnboardingSurvey(user?.uid, { userType, goals, categories: [], completedAt: undefined });
    setStep((current) => Math.min(5, current + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setError('');
    setStep((current) => Math.max(1, current - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleGoal = (goalId: string) => {
    setGoals((current) => current.includes(goalId)
      ? current.filter((item) => item !== goalId)
      : current.length < 3 ? [...current, goalId] : current);
  };

  const updateLink = (id: string, updates: Partial<DraftLink>) => {
    setLinks((current) => current.map((link) => link.id === id ? { ...link, ...updates } : link));
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;
    setIsUploading(true);
    setError('');
    try {
      const avatarUrl = await uploadPublicImage(`avatars/${user.uid}`, file);
      setProfile((current) => ({ ...current, avatarUrl }));
    } catch (uploadError) {
      console.error('Avatar upload failed', uploadError);
      setError('프로필 이미지 업로드에 실패했습니다. 다른 이미지를 선택해 주세요.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const finish = async () => {
    if (!user?.uid || !canContinue) return;
    setIsSaving(true);
    setError('');
    const completedProfile = { ...profile, username: normalizeUsername(profile.username), showBio: true };
    const completedLinks: CustomLink[] = links
      .filter((link) => link.title.trim() && link.url.trim())
      .map((link) => ({ ...link, title: link.title.trim(), url: normalizeLinkUrl(link.url), isVisible: true, thumbnailType: 'icon', iconName: 'link' }));
    const survey = { userType, goals, categories: [], completedAt: new Date().toISOString() };

    try {
      await saveUserData(user.uid, completedProfile.username, {
        profile: completedProfile,
        template: { type: 'preset', value: theme },
        socialLinks,
        customLinks: completedLinks,
        onboardingSurvey: survey,
        onboardingCompleted: true,
      });
      loadData({
        profile: completedProfile,
        templateType: 'preset',
        templateValue: theme,
        socialLinks,
        customLinks: completedLinks,
      });
      clearOnboardingSurvey(user.uid);
      navigate('/admin/content', { replace: true });
    } catch (saveError) {
      console.error('Onboarding save failed', saveError);
      setError(saveError instanceof Error ? saveError.message : '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#f6f6f2] text-[#171717]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f6f6f2]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <LinkZipLogo markClassName="h-10 w-10 rotate-[-3deg]" />
          <div className="hidden items-center gap-2 sm:flex">
            {stepLabels.map((label, index) => <div key={label} className="flex items-center gap-2"><span className={clsx('flex h-7 w-7 items-center justify-center rounded-full text-xs font-black', index + 1 <= step ? 'bg-black text-white' : 'bg-white text-gray-400')}>{index + 1 < step ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className={clsx('text-xs font-bold', index + 1 === step ? 'text-black' : 'text-gray-400')}>{label}</span>{index < stepLabels.length - 1 && <span className="mx-1 h-px w-5 bg-gray-300" />}</div>)}
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-gray-500 shadow-sm sm:hidden">{step} / 5</span>
        </div>
        <div className="h-1 bg-gray-200"><div className="h-full bg-black transition-all duration-500" style={{ width: `${step * 20}%` }} /></div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:py-12">
        <section className="min-w-0 rounded-[32px] bg-white p-6 shadow-[0_18px_60px_rgba(0,0,0,.06)] sm:p-10 lg:p-12">
          {step === 1 && <div><span className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Step 1 · 유형 선택</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">링크집을 어떻게<br />활용할 예정인가요?</h1><p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-gray-500 sm:text-base">용도에 맞는 기능과 구성을 추천해 드릴게요. 선택한 내용은 나중에도 바꿀 수 있어요.</p><div className="mt-9 grid gap-4 md:grid-cols-3">{userTypeOptions.map((option) => { const Icon = option.icon; const selected = userType === option.id; return <button type="button" key={option.id} onClick={() => { setUserType(option.id); setGoals([]); }} className={clsx('relative rounded-3xl border-2 p-5 text-left transition hover:-translate-y-1 hover:shadow-lg', selected ? 'border-black bg-[#fafaf7]' : 'border-gray-100 bg-white')}><span className={clsx('flex h-12 w-12 items-center justify-center rounded-2xl', option.accent)}><Icon className="h-6 w-6" /></span><h2 className="mt-6 text-lg font-black">{option.title}</h2><p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">{option.description}</p>{selected && <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-black text-white"><Check className="h-4 w-4" /></span>}</button>; })}</div></div>}

          {step === 2 && <div><span className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Step 2 · 사용 목적</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">링크집으로 무엇을<br />하고 싶나요?</h1><p className="mt-4 text-sm font-medium text-gray-500 sm:text-base">필요한 항목을 최대 3개까지 골라 주세요. <strong className="text-black">{goals.length}개 선택됨</strong></p><div className="mt-9 grid gap-3 sm:grid-cols-2">{goalsByType[userType].map((goal) => { const selected = goals.includes(goal.id); const GoalIcon = goal.icon; return <button type="button" key={goal.id} onClick={() => toggleGoal(goal.id)} className={clsx('group flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-sm', selected ? 'border-black bg-[#fafaf7]' : 'border-gray-100')}><span className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors', selected ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200')}><GoalIcon className="h-5 w-5" strokeWidth={2} /></span><span className="min-w-0 flex-1"><strong className="block text-sm font-black sm:text-base">{goal.title}</strong><span className="mt-1 block text-xs font-medium leading-relaxed text-gray-500 sm:text-sm">{goal.description}</span></span><span className={clsx('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', selected ? 'border-black bg-black text-white' : 'border-gray-300')}>{selected && <Check className="h-3 w-3" />}</span></button>; })}</div></div>}

          {step === 3 && <div><span className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Step 3 · 프로필</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">내 프로필을<br />만들어 볼까요?</h1><div className="mt-9 grid gap-7 sm:grid-cols-[150px_1fr]"><div><label className="group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-[32px] border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-black">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="프로필 미리보기" className="h-full w-full object-cover" /> : <UserRound className="h-12 w-12 text-gray-300" />}<span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"><ImagePlus className="h-7 w-7" /></span><input type="file" accept="image/*" onChange={uploadAvatar} disabled={isUploading} className="absolute inset-0 cursor-pointer opacity-0" /></label><p className="mt-3 text-center text-xs font-bold text-gray-400">{isUploading ? '업로드 중…' : '프로필 사진'}</p></div><div className="space-y-5"><label className="block text-sm font-black">표시 이름<input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} placeholder="예: 김링크" className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-black" /></label><label className="block text-sm font-black">링크집 주소<div className="mt-2 flex overflow-hidden rounded-2xl border border-gray-200 focus-within:border-black"><span className="flex items-center bg-gray-50 px-4 text-xs font-bold text-gray-400">{window.location.host}/</span><input value={profile.username} onChange={(event) => setProfile((current) => ({ ...current, username: normalizeUsername(event.target.value.replace(/\s/g, '-')) }))} placeholder="my-name" className="min-w-0 flex-1 px-3 py-3.5 text-sm font-black outline-none" /></div><span className={clsx('mt-1.5 block text-xs font-medium', profile.username && !isValidUsername(profile.username) ? 'text-red-500' : 'text-gray-400')}>영문 소문자, 숫자, 마침표, 밑줄, 하이픈을 사용해 3~30자로 입력해 주세요.</span></label><label className="block text-sm font-black">한 줄 소개<textarea value={profile.bio} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value.slice(0, 120) }))} rows={3} placeholder="어떤 사람인지 한 줄로 소개해 주세요." className="mt-2 w-full resize-none rounded-2xl border border-gray-200 px-4 py-3.5 text-sm font-medium outline-none transition focus:border-black" /><span className="mt-1 block text-right text-xs font-bold text-gray-400">{profile.bio.length}/120</span></label></div></div></div>}

          {step === 4 && <div><span className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Step 4 · 테마</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">내 취향에 맞는 테마를<br />골라 보세요.</h1><p className="mt-4 text-sm font-medium text-gray-500 sm:text-base">입력한 내용은 그대로 유지되고 디자인만 변경돼요. <strong className="text-black">총 {themeOptions.length}개</strong></p><div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{themeOptions.map((option) => { const selected = theme === option.id; return <button type="button" key={option.id} onClick={() => setTheme(option.id)} className={clsx('flex h-full min-w-0 flex-col rounded-3xl border-2 p-2 text-left transition hover:-translate-y-1 hover:shadow-lg', selected ? 'border-black bg-[#fafaf7]' : 'border-gray-100 bg-white')}><div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] p-4" style={{ ...option.wallpaper, color: option.text }}><div className="mx-auto h-10 w-10 rounded-full border-2 border-white/40 bg-white/45" /><div className="mx-auto mt-2.5 h-2 w-16 rounded-full bg-current opacity-45" /><div className="mt-4 space-y-2">{[1, 2].map((item) => <div key={item} className="flex h-9 items-center justify-center px-3 text-[9px] font-black" style={{ background: option.card, color: option.cardText, border: option.cardBorder, borderRadius: option.radius, boxShadow: option.shadow }}>나의 링크 {item}</div>)}</div>{selected && <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black text-white shadow-md"><Check className="h-4 w-4" /></span>}</div><div className="flex flex-1 flex-col px-2 pb-2 pt-4"><strong className="block text-sm font-black text-gray-950">{option.name}</strong><span className="mt-1 block text-xs font-medium leading-relaxed text-gray-500">{option.description}</span></div></button>; })}</div></div>}

          {step === 5 && <div><span className="text-xs font-black uppercase tracking-[.2em] text-orange-500">Step 5 · 링크</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">첫 번째 링크를<br />추가해 주세요.</h1><p className="mt-4 text-sm font-medium text-gray-500 sm:text-base">웹사이트나 SNS, 포트폴리오 등 가장 먼저 보여 주고 싶은 링크를 입력해 주세요. <strong className="text-gray-700">https:// 없이 입력해도 돼요.</strong></p><div className="mt-9 space-y-3">{links.map((link, index) => <div key={link.id} className="grid gap-3 rounded-3xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-[44px_1fr_1.25fr_40px] sm:items-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black shadow-sm">{index + 1}</span><input value={link.title} onChange={(event) => updateLink(link.id, { title: event.target.value })} placeholder="링크 제목" aria-label={`${index + 1}번째 링크 제목`} className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-bold outline-none focus:border-black" /><input value={link.url} onChange={(event) => updateLink(link.id, { url: event.target.value })} placeholder="예: example.com" aria-label={`${index + 1}번째 링크 주소`} className="rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-medium outline-none focus:border-black" /><button type="button" onClick={() => setLinks((current) => current.length === 1 ? [{ ...current[0], title: '', url: '' }] : current.filter((item) => item.id !== link.id))} className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500" aria-label={`${index + 1}번째 링크 삭제`}><Trash2 className="h-4 w-4" /></button></div>)}{links.length < 6 && <button type="button" onClick={() => setLinks((current) => [...current, makeLink()])} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm font-black text-gray-500 transition hover:border-black hover:text-black"><Plus className="h-4 w-4" />링크 추가</button>}</div><div className="mt-8 rounded-3xl bg-[#fff5ec] p-5"><div className="flex gap-3"><WandSparkles className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" /><div><strong className="text-sm font-black">이제 준비가 끝났어요!</strong><p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">링크집을 만든 뒤 바로 꾸미고 수정할 수 있어요. 입력한 내용은 언제든 변경할 수 있습니다.</p></div></div></div></div>}

          {error && <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
          <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6"><button type="button" onClick={back} disabled={step === 1 || isSaving} className="flex items-center gap-2 rounded-2xl px-5 py-3.5 text-base font-black text-gray-500 transition hover:bg-gray-100 hover:text-black disabled:invisible"><ArrowLeft className="h-5 w-5" />이전</button>{step < 5 ? <button type="button" onClick={next} disabled={!canContinue} className="flex min-w-[180px] items-center justify-center gap-3 rounded-[20px] bg-black px-9 py-5 text-base font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 sm:min-w-[210px] sm:px-10 sm:text-lg">다음<ArrowRight className="h-5 w-5" /></button> : <button type="button" onClick={finish} disabled={!canContinue || isSaving} className="flex min-w-[180px] items-center justify-center gap-3 rounded-[20px] bg-black px-9 py-5 text-base font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-300 sm:min-w-[210px] sm:px-10 sm:text-lg">{isSaving ? <><Loader2 className="h-5 w-5 animate-spin" />만드는 중</> : <><Sparkles className="h-5 w-5" />링크집 만들기</>}</button>}</div>
        </section>

        <aside className="hidden lg:block"><div className="sticky top-32"><p className="mb-4 text-center text-xs font-black uppercase tracking-[.18em] text-gray-400">Live preview</p><div className="mx-auto w-[320px] rounded-[44px] bg-[#171717] p-2.5 shadow-[0_24px_70px_rgba(0,0,0,.22)]"><div className="min-h-[640px] overflow-hidden rounded-[35px] p-6" style={{ ...selectedTheme.wallpaper, color: selectedTheme.text }}><div className="mt-8 text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white/50 bg-white/40 shadow-lg">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-10 w-10 opacity-50" />}</div><h2 className="mt-4 text-xl font-black">{profile.name || '나의 이름'}</h2><p className="mx-auto mt-2 max-w-[240px] text-xs font-semibold leading-relaxed opacity-70">{profile.bio || '나를 한 줄로 소개해 보세요.'}</p></div><div className="mt-8 space-y-3">{displayLinks.length > 0 ? displayLinks.map((link) => <div key={link.id} className="flex min-h-14 items-center justify-center px-4 text-center text-sm font-black" style={{ background: selectedTheme.card, color: selectedTheme.cardText, border: selectedTheme.cardBorder, borderRadius: selectedTheme.radius, boxShadow: selectedTheme.shadow }}>{link.title || '새 링크'}</div>) : [1, 2, 3].map((item) => <div key={item} className="flex min-h-14 items-center justify-center px-4 text-xs font-bold" style={{ background: selectedTheme.card, color: selectedTheme.cardText, border: selectedTheme.cardBorder, borderRadius: selectedTheme.radius, boxShadow: selectedTheme.shadow }}>나의 링크 {item}</div>)}</div><div className="mt-10 text-center text-[10px] font-black opacity-40">LINKZIP</div></div></div><p className="mt-5 text-center text-xs font-bold text-gray-400">입력하는 내용이 실시간으로 반영돼요.</p></div></aside>
      </div>
    </main>
  );
};

export default OnboardingFlow;
