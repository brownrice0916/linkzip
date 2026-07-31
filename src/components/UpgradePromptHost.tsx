import React, { useEffect, useState } from 'react';
import { Crown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UPGRADE_PROMPT_EVENT = 'linkzip:upgrade-prompt';

export interface UpgradePromptDetail {
  title: string;
  description: string;
  requiredPlan?: 'standard' | 'premium';
  featureLabel?: string;
}

export const requestUpgradePrompt = (detail: UpgradePromptDetail) => {
  window.dispatchEvent(new CustomEvent<UpgradePromptDetail>(UPGRADE_PROMPT_EVENT, { detail }));
};

const UpgradePromptHost: React.FC = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<UpgradePromptDetail | null>(null);

  useEffect(() => {
    const handlePrompt = (event: Event) => setPrompt((event as CustomEvent<UpgradePromptDetail>).detail);
    window.addEventListener(UPGRADE_PROMPT_EVENT, handlePrompt);
    return () => window.removeEventListener(UPGRADE_PROMPT_EVENT, handlePrompt);
  }, []);

  if (!prompt) return null;
  const planName = prompt.requiredPlan === 'premium' ? '프리미엄' : '스탠다드';

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-transparent p-4" role="presentation" onMouseDown={() => setPrompt(null)}>
      <section role="dialog" aria-modal="true" aria-labelledby="upgrade-prompt-title" className="relative w-full max-w-md overflow-hidden rounded-[28px] border-2 border-[#171714] bg-[#fffdf8] p-7 text-center shadow-[8px_8px_0_#171714] sm:p-9" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => setPrompt(null)} aria-label="닫기" className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#171714] bg-white text-[#171714] transition hover:-translate-y-0.5 hover:bg-[#f4f1e8]"><X className="h-4 w-4" /></button>
        <div className="mx-auto flex h-14 w-14 -rotate-3 items-center justify-center rounded-2xl border-2 border-[#171714] bg-[#ffcf4a] text-[#171714] shadow-[4px_4px_0_#ff5f35]"><Crown className="h-6 w-6" /></div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff5f35]">{prompt.featureLabel || 'Upgrade feature'}</p>
        <h3 id="upgrade-prompt-title" className="mt-2 text-2xl font-black tracking-[-0.04em] text-gray-950">{prompt.title}</h3>
        <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-gray-500">{prompt.description}</p>
        <div className="mt-6 rounded-2xl border-2 border-[#171714] bg-[#d9ff67] p-4 text-left shadow-[3px_3px_0_#171714]">
          <span className="text-[10px] font-black text-[#171714]">{planName} 플랜부터 이용 가능</span>
          <strong className="mt-1 block text-sm font-black text-[#171714]">필요한 기능을 잠금 해제하고 더 넓게 운영해 보세요.</strong>
        </div>
        <button type="button" onClick={() => { setPrompt(null); navigate('/admin/plan'); }} className="mt-6 h-13 w-full rounded-full border-2 border-[#171714] bg-[#171714] px-5 text-sm font-black text-white shadow-[4px_4px_0_#ff5f35] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#ff5f35]">플랜 확인하고 업그레이드하기</button>
        <button type="button" onClick={() => setPrompt(null)} className="mt-2 h-10 w-full text-xs font-black text-gray-400 transition hover:text-gray-700">지금은 괜찮아요</button>
      </section>
    </div>
  );
};

export default UpgradePromptHost;
