import React, { useEffect, useState } from 'react';
import { LoaderCircle, Search } from 'lucide-react';

interface GiphyItem {
  id: string;
  title: string;
  images: {
    fixed_width_small?: { webp?: string; url?: string };
    fixed_width?: { webp?: string; url?: string };
    downsized_medium?: { url?: string };
  };
}

interface GiphyPickerProps {
  kind: 'stickers' | 'gifs';
  onSelect: (url: string) => void;
}

export const GiphyPicker: React.FC<GiphyPickerProps> = ({ kind, onSelect }) => {
  const apiKey = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<GiphyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (search = '') => {
    if (!apiKey) return;
    setLoading(true);
    setError('');
    try {
      const endpoint = search.trim() ? 'search' : 'trending';
      const params = new URLSearchParams({ api_key: apiKey, limit: '20', rating: 'g', lang: 'ko' });
      if (search.trim()) params.set('q', search.trim());
      const response = await fetch(`https://api.giphy.com/v1/${kind}/${endpoint}?${params.toString()}`);
      if (!response.ok) throw new Error(`GIPHY ${response.status}`);
      const payload = await response.json() as { data?: GiphyItem[] };
      setItems(payload.data || []);
    } catch (cause) {
      console.error('Unable to load GIPHY media', cause);
      setError('GIF를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [kind, apiKey]);

  if (!apiKey) {
    return <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-xs font-semibold leading-relaxed text-gray-500">GIF 검색을 사용하려면 배포 환경에 <code className="rounded bg-white px-1.5 py-0.5 text-gray-800">VITE_GIPHY_API_KEY</code>를 등록해 주세요.</div>;
  }

  return <div className="space-y-3">
    <form onSubmit={(event) => { event.preventDefault(); void load(query); }} className="flex gap-2">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 focus-within:border-black"><Search className="h-4 w-4 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={kind === 'stickers' ? '스티커 검색' : '움짤 검색'} className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm font-semibold outline-none" /></label>
      <button type="submit" className="rounded-2xl bg-black px-4 text-xs font-black text-white transition hover:bg-gray-800">검색</button>
    </form>
    {loading ? <div className="flex h-32 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-gray-400" /></div> : error ? <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{error}</p> : <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
      {items.map((item) => {
        const url = kind === 'stickers'
          ? item.images.fixed_width?.webp || item.images.fixed_width_small?.webp || item.images.fixed_width?.url
          : item.images.downsized_medium?.url || item.images.fixed_width?.webp || item.images.fixed_width?.url;
        if (!url) return null;
        return <button key={item.id} type="button" onClick={() => onSelect(url)} className="aspect-square overflow-hidden rounded-xl border border-gray-200 bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0] transition hover:-translate-y-0.5 hover:border-black hover:shadow-md" title={item.title}><img src={url} alt={item.title || 'GIPHY 이미지'} className="h-full w-full object-contain" loading="lazy" /></button>;
      })}
    </div>}
    <p className="text-right text-[10px] font-black tracking-wide text-gray-500">POWERED BY GIPHY</p>
  </div>;
};
