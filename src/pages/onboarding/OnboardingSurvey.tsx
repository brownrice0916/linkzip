import React, { useMemo, useState } from 'react';
import { Building2, Check, Sparkles, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import {
  readOnboardingSurvey,
  writeOnboardingSurvey,
  type OnboardingUserType,
} from '../../domain/onboardingSurvey';

const userTypes: Array<{
  id: OnboardingUserType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    id: 'creator',
    title: '크리에이터',
    description: '팔로워를 모으고 수익화하는 데 관심 있어요',
    icon: <Sparkles className="h-7 w-7" />,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'brand',
    title: '브랜드·기업',
    description: '비즈니스를 위해 더 많은 고객을 모으고 싶어요',
    icon: <Building2 className="h-7 w-7" />,
    color: 'bg-violet-100 text-violet-600',
  },
  {
    id: 'personal',
    title: '개인',
    description: '나를 소개하는 홈페이지로 활용하고 싶어요',
    icon: <UserRound className="h-7 w-7" />,
    color: 'bg-lime-100 text-lime-700',
  },
];

const goalsByType: Record<OnboardingUserType, Array<{ title: string; description: string }>> = {
  creator: [
    { title: '🛒 광고/공동구매', description: '광고나 공동구매를 관리하고 홍보하고 싶어요' },
    { title: '🔗 제휴링크 수익화 (파트너스)', description: '쿠팡 파트너스 등 제휴링크로 수익화하고 싶어요' },
    { title: '🤝 브랜드 협업', description: '브랜드에게 광고 제안을 직접 받고 관리하고 싶어요' },
    { title: '📣 콘텐츠 확산 및 팬 소통', description: 'SNS로 팔로워를 모아 관리하고 싶어요' },
    { title: '🛍️ 나만의 상품/서비스 판매', description: '나만의 상품이나 서비스를 판매하고 싶어요' },
    { title: '😭 아직 모르겠어요', description: '조금 더 고민해보고 싶어요' },
  ],
  brand: [
    { title: '📢 브랜드 소개와 홍보', description: '브랜드와 주요 소식을 한곳에서 보여주고 싶어요' },
    { title: '🧲 잠재 고객 수집', description: '관심 고객의 연락처와 문의를 모으고 싶어요' },
    { title: '🛍️ 상품/서비스 판매', description: '상품과 서비스를 소개하고 판매하고 싶어요' },
    { title: '📅 예약·문의 자동화', description: '예약과 고객 문의를 편리하게 관리하고 싶어요' },
    { title: '🎯 캠페인·이벤트 운영', description: '프로모션 링크와 성과를 한곳에서 관리하고 싶어요' },
    { title: '😭 아직 모르겠어요', description: '조금 더 고민해보고 싶어요' },
  ],
  personal: [
    { title: '👋 나를 소개하는 프로필', description: '나를 잘 보여주는 온라인 명함을 만들고 싶어요' },
    { title: '🔗 링크 한곳에 모으기', description: '자주 쓰는 링크를 보기 좋게 정리하고 싶어요' },
    { title: '🗂️ 포트폴리오 공유', description: '작업물과 경력을 간편하게 공유하고 싶어요' },
    { title: '📝 취미·기록 공유', description: '내 취향과 일상을 다른 사람에게 보여주고 싶어요' },
    { title: '💬 지인과 소통', description: '방명록과 메시지로 방문자와 소통하고 싶어요' },
    { title: '😭 아직 모르겠어요', description: '조금 더 고민해보고 싶어요' },
  ],
};

const categories = [
  ['💡', '홈·리빙'], ['🛋️', '가구·인테리어'], ['🧺', '디지털·가전'],
  ['🍼', '육아·키즈'], ['👚', '패션'], ['💄', '뷰티'],
  ['🥗', '식품·요리'], ['🐾', '반려동물'], ['🎨', '취미·아트'],
  ['🎾', '스포츠·건강'], ['🏕️', '여행·아웃도어'], ['📖', '교육·커리어'],
] as const;

const Progress = ({ step }: { step: number }) => (
  <div className="mx-auto flex w-72 max-w-[65vw] gap-2" aria-label={`${step}단계 / 3단계`}>
    {[1, 2, 3].map((item) => (
      <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? 'bg-[#ff5a1f]' : 'bg-gray-200'}`} />
    ))}
  </div>
);

const OnboardingSurvey = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const saved = readOnboardingSurvey();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<OnboardingUserType>(saved?.userType || 'creator');
  const [goals, setGoals] = useState<string[]>(saved?.goals || []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(saved?.categories || []);
  const [showConfirm, setShowConfirm] = useState(false);

  const displayName = useMemo(() => {
    const name = user?.displayName?.trim() || user?.email?.split('@')[0] || '회원';
    return name.length > 18 ? `${name.slice(0, 18)}…` : name;
  }, [user]);

  const toggleLimited = (value: string, selected: string[], setter: (next: string[]) => void) => {
    if (selected.includes(value)) {
      setter(selected.filter((item) => item !== value));
      return;
    }
    if (selected.length < 3) setter([...selected, value]);
  };

  const toggleGoal = (title: string) => {
    if (title.includes('아직 모르겠어요')) {
      setGoals(goals.includes(title) ? [] : [title]);
      return;
    }
    toggleLimited(title, goals.filter((item) => !item.includes('아직 모르겠어요')), setGoals);
  };

  const goToStep = (nextStep: number) => {
    writeOnboardingSurvey({ userType, goals, categories: selectedCategories });
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finish = (skipCategories = false) => {
    writeOnboardingSurvey({
      userType,
      goals,
      categories: skipCategories ? [] : selectedCategories,
      completedAt: new Date().toISOString(),
    });
    navigate('/onboarding/layout');
  };

  return (
    <main className="min-h-[100dvh] bg-white text-[#272727]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-5 pb-6 pt-8 sm:px-8 sm:pt-10">
        <Progress step={step} />

        {step === 1 && (
          <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col pt-14 sm:pt-20">
            <header className="mb-10 text-center sm:text-left">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{displayName}님을 소개해주세요</h1>
              <p className="mt-3 text-base text-gray-500 sm:text-lg">프로필 설정에 도움이 되는 가이드를 제공해드려요</p>
            </header>
            <div className="space-y-4">
              {userTypes.map((item) => {
                const selected = userType === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => { setUserType(item.id); setGoals([]); }}
                    className={`group flex w-full items-center gap-5 rounded-2xl border-2 p-5 text-left transition-all sm:p-6 ${selected ? 'border-[#ff7a4a] bg-[#fff7f3] shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
                  >
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${item.color}`}>{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-lg font-extrabold">{item.title}</strong>
                      <span className="mt-1 block text-sm text-gray-500 sm:text-base">{item.description}</span>
                    </span>
                    {selected && <Check className="h-6 w-6 shrink-0 text-[#ff5a1f]" />}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => goToStep(2)} className="mt-auto w-full rounded-2xl bg-[#ff5a1f] px-6 py-4 text-lg font-extrabold text-white shadow-sm transition hover:bg-[#ed4b12] sm:mt-12">다음</button>
          </section>
        )}

        {step === 2 && (
          <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col pt-12 sm:pt-16">
            <header className="mb-8 text-center">
              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">{userTypes.find((item) => item.id === userType)?.title}시네요!<br />어떻게 활용하고 싶으신가요?</h1>
              <p className="mt-4 text-base text-gray-500 sm:text-lg">가장 중요한 목표를 최대 3개까지 알려주세요</p>
            </header>
            <div className="space-y-3">
              {goalsByType[userType].map((item) => {
                const selected = goals.includes(item.title);
                return (
                  <button type="button" key={item.title} onClick={() => toggleGoal(item.title)} className={`flex w-full items-center justify-between rounded-2xl border-2 p-5 text-left transition ${selected ? 'border-[#ff7a4a] bg-[#fff7f3]' : 'border-gray-200 hover:border-gray-300'}`}>
                    <span><strong className="block text-base font-extrabold sm:text-lg">{item.title}</strong><span className="mt-1 block text-sm text-gray-500 sm:text-base">{item.description}</span></span>
                    {selected && <Check className="ml-4 h-6 w-6 shrink-0 text-[#ff5a1f]" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-auto grid grid-cols-[minmax(92px,0.28fr)_1fr] gap-3 pt-8">
              <button type="button" onClick={() => goToStep(1)} className="rounded-2xl bg-gray-100 px-4 py-4 font-bold hover:bg-gray-200">이전</button>
              <button type="button" disabled={goals.length === 0} onClick={() => goToStep(3)} className="rounded-2xl bg-[#ff5a1f] px-5 py-4 text-lg font-extrabold text-white transition hover:bg-[#ed4b12] disabled:cursor-not-allowed disabled:bg-[#fff0e9] disabled:text-[#ffb49a]">다음</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col pt-12 sm:pt-16">
            <header className="mb-8 text-center">
              <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">나와 딱 맞는<br />카테고리를 선택해주세요</h1>
              <p className="mt-4 text-base text-gray-500 sm:text-lg">최대 3개까지 선택할 수 있습니다.</p>
            </header>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {categories.map(([emoji, label]) => {
                const selected = selectedCategories.includes(label);
                return (
                  <button type="button" key={label} onClick={() => toggleLimited(label, selectedCategories, setSelectedCategories)} className={`relative flex min-h-32 flex-col items-center justify-center rounded-2xl border-2 p-4 transition sm:min-h-40 ${selected ? 'border-[#ff7a4a] bg-[#fff7f3] shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
                    <span className="text-5xl" aria-hidden>{emoji}</span>
                    <strong className="mt-4 text-base sm:text-lg">{label}</strong>
                    {selected && <span className="absolute right-3 top-3 rounded-full bg-[#ff5a1f] p-1 text-white"><Check className="h-4 w-4" /></span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-auto grid grid-cols-[minmax(92px,0.28fr)_1fr] gap-3 pt-8">
              <button type="button" onClick={() => goToStep(2)} className="rounded-2xl bg-gray-100 px-4 py-4 font-bold hover:bg-gray-200">이전</button>
              <button type="button" disabled={selectedCategories.length === 0} onClick={() => setShowConfirm(true)} className="rounded-2xl bg-[#ff5a1f] px-5 py-4 text-lg font-extrabold text-white transition hover:bg-[#ed4b12] disabled:cursor-not-allowed disabled:bg-[#fff0e9] disabled:text-[#ffb49a]">완료</button>
            </div>
            <button type="button" onClick={() => finish(true)} className="mx-auto mt-4 px-5 py-2 text-sm font-medium text-gray-500 underline-offset-4 hover:text-gray-900 hover:underline">건너뛰기</button>
          </section>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="category-confirm-title">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <button type="button" onClick={() => setShowConfirm(false)} className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900" aria-label="닫기"><X className="h-5 w-5" /></button>
            <div className="px-7 pb-7 pt-12 text-center sm:px-10">
              <h2 id="category-confirm-title" className="text-2xl font-black">선택한 카테고리는 <span className="text-[#ff5a1f]">{selectedCategories.length}개</span>입니다</h2>
              <p className="mt-3 text-gray-500">이용 중 언제라도 변경할 수 있어요</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                {selectedCategories.map((label, index) => {
                  const emoji = categories.find((item) => item[1] === label)?.[0];
                  const colors = ['bg-orange-50 border-orange-200', 'bg-pink-50 border-pink-200', 'bg-cyan-50 border-cyan-200'];
                  return <span key={label} className={`rounded-full border px-4 py-2 font-bold ${colors[index % colors.length]}`}>{emoji} {label}</span>;
                })}
              </div>
            </div>
            <div className="grid grid-cols-[0.7fr_1.3fr] gap-3 border-t border-gray-100 p-5">
              <button type="button" onClick={() => setShowConfirm(false)} className="rounded-2xl bg-gray-100 px-4 py-4 font-bold hover:bg-gray-200">다시 선택</button>
              <button type="button" onClick={() => finish(false)} className="rounded-2xl bg-[#ff5a1f] px-4 py-4 font-extrabold text-white hover:bg-[#ed4b12]">LinkZip 시작하기</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default OnboardingSurvey;
