import React, { useMemo, useState } from 'react';
import { Check, Share2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { readOnboardingSurvey, writeOnboardingSurvey } from '../../domain/onboardingSurvey';

type LayoutPreset = 'simple-list' | 'spotlight' | 'showcase' | 'storefront';

const layouts: Array<{ id: LayoutPreset; name: string; description: string }> = [
  { id: 'simple-list', name: '심플 리스트형', description: '링크만 넣으면 바로 완성, 빠른 시작을 위한 구성' },
  { id: 'spotlight', name: '핫딜 강조형', description: '오늘의 특가·추천 콘텐츠를 배너로 시선 집중' },
  { id: 'showcase', name: '쇼케이스형', description: '상품 하나하나를 집중 조명하여 매력을 강조' },
  { id: 'storefront', name: '스토어형', description: '다양한 상품을 한눈에 보여주어 선택과 구매 유도' },
];

const MockProduct = ({ compact = false }: { compact?: boolean }) => (
  <div className={`overflow-hidden rounded-xl bg-white shadow-sm ${compact ? '' : 'border border-white'}`}>
    <div className={`${compact ? 'h-14' : 'h-24'} bg-gray-200`} />
    <div className={`${compact ? 'p-2' : 'p-3'} text-center`}>
      <div className="mx-auto h-2.5 w-4/5 rounded bg-gray-300" />
      {!compact && <><div className="mx-auto mt-2 h-2 w-3/5 rounded bg-gray-200" /><div className="mt-2 text-[9px] font-black text-[#ff5a1f]">판매가 <span className="text-gray-700">정가</span></div></>}
    </div>
  </div>
);

const LayoutCanvas = ({ preset, large = false }: { preset: LayoutPreset; large?: boolean }) => {
  const rowCount = large ? 5 : 4;
  return (
    <div className={`overflow-hidden rounded-[26px] bg-[#fff0e4] p-4 ${large ? 'min-h-[68vh]' : 'h-80'}`}>
      <div className="mb-4 text-center text-[10px] font-black text-gray-600">텍스트를 입력해주세요</div>
      {preset === 'simple-list' && (
        <div className="space-y-2">{Array.from({ length: rowCount }).map((_, index) => <div key={index} className="flex items-center gap-3 rounded-xl bg-white p-2 shadow-sm"><div className="h-11 w-11 rounded-lg bg-gray-200" /><div className="h-2.5 flex-1 rounded bg-gray-300" /></div>)}</div>
      )}
      {preset === 'spotlight' && (
        <div><div className={`${large ? 'h-52' : 'h-32'} rounded-xl bg-gray-200`} /><div className="mb-4 rounded-b-xl bg-white p-3"><div className="mx-auto h-2.5 w-2/3 rounded bg-gray-300" /></div><div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="flex items-center gap-3 rounded-xl bg-white p-2"><div className="h-10 w-10 rounded-lg bg-gray-200" /><div className="h-2.5 flex-1 rounded bg-gray-300" /></div>)}</div></div>
      )}
      {preset === 'showcase' && (
        <div><div className="grid grid-cols-2 gap-2">{Array.from({ length: large ? 6 : 4 }).map((_, index) => <MockProduct key={index} />)}</div><div className="my-4 text-center text-[10px] font-black text-gray-600">텍스트를 입력해주세요</div><div className="flex items-center gap-3 rounded-xl bg-white p-2"><div className="h-10 w-10 rounded-lg bg-gray-200" /><div className="h-2.5 flex-1 rounded bg-gray-300" /></div></div>
      )}
      {preset === 'storefront' && (
        <div><div className="grid grid-cols-3 gap-2">{Array.from({ length: large ? 9 : 6 }).map((_, index) => <MockProduct key={index} compact />)}</div><div className="my-4 text-center text-[10px] font-black text-gray-600">텍스트를 입력해주세요</div><div className="grid grid-cols-2 gap-2"><MockProduct /><MockProduct /></div></div>
      )}
    </div>
  );
};

const LayoutRecommendation = () => {
  const navigate = useNavigate();
  const survey = readOnboardingSurvey();
  const [preview, setPreview] = useState<LayoutPreset | null>(survey?.layoutPreset || null);

  const recommendationTitle = useMemo(() => {
    const goals = survey?.goals.join(' ') || '';
    if (goals.includes('상품') || goals.includes('판매')) return '상품 판매에 잘 맞는 템플릿을 추천해요';
    if (goals.includes('제휴') || goals.includes('광고')) return '파트너스 운영에 잘 맞는 템플릿을 추천해요';
    if (goals.includes('포트폴리오')) return '작업물을 돋보이게 할 템플릿을 추천해요';
    return '선택한 목표에 잘 맞는 템플릿을 추천해요';
  }, [survey?.goals]);

  const applyLayout = (preset: LayoutPreset) => {
    if (survey) writeOnboardingSurvey({ ...survey, layoutPreset: preset });
    navigate('/onboarding/template');
  };

  return (
    <main className="min-h-[100dvh] bg-white text-[#272727]">
      <div className="mx-auto w-full max-w-5xl px-5 pb-12 pt-10 sm:px-8">
        <header className="mb-10">
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">템플릿으로 페이지를<br />빠르게 만드세요</h1>
          <p className="mt-10 text-lg font-extrabold sm:text-xl">{recommendationTitle}</p>
        </header>
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
          {layouts.map((layout) => (
            <button type="button" key={layout.id} onClick={() => setPreview(layout.id)} className="text-left transition hover:-translate-y-1">
              <LayoutCanvas preset={layout.id} />
              <h2 className="mt-4 text-xl font-black">{layout.name}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-500 sm:text-base">{layout.description}</p>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => navigate('/onboarding/survey')} className="mt-10 rounded-xl bg-gray-100 px-5 py-3 font-bold hover:bg-gray-200">이전</button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/40 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="layout-preview-title">
          <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="relative min-h-0 flex-1 overflow-y-auto bg-[#fff0e4]">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 px-5 py-4 backdrop-blur">
                <button type="button" className="rounded-full border border-gray-200 bg-white p-3"><Share2 className="h-5 w-5" /></button>
                <strong className="text-lg">LinkZip</strong>
                <button type="button" onClick={() => setPreview(null)} className="rounded-full border border-gray-200 bg-white p-3 transition hover:bg-gray-100" aria-label="미리보기 닫기"><X className="h-5 w-5" /></button>
              </div>
              <div className="mx-auto max-w-xl px-5 pb-36 pt-8">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#ff5a1f] text-xl font-black text-white">LINKZIP</div>
                <h2 className="mt-4 text-center text-2xl font-black">나만의 링크집</h2>
                <p className="mb-8 mt-3 text-center font-bold text-gray-600">선택한 템플릿 미리보기</p>
                <LayoutCanvas preset={preview} large />
              </div>
            </div>
            <div className="shrink-0 bg-gray-900 p-4 text-white sm:p-5">
              <div className="mb-3 flex items-center justify-between"><strong id="layout-preview-title">{layouts.find((item) => item.id === preview)?.name}</strong><span className="text-xs text-gray-300">미리보기 내용은 예시입니다.</span></div>
              <div className="grid grid-cols-[0.7fr_1.3fr] gap-3">
                <button type="button" onClick={() => setPreview(null)} className="rounded-xl bg-white px-4 py-3 font-bold text-gray-900 hover:bg-gray-100">다시 선택</button>
                <button type="button" onClick={() => applyLayout(preview)} className="flex items-center justify-center gap-2 rounded-xl bg-[#ff5a1f] px-4 py-3 font-extrabold hover:bg-[#ed4b12]"><Check className="h-5 w-5" />이 템플릿으로 적용하기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default LayoutRecommendation;
