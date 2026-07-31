import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Package, ShoppingBag } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getProfileStorefrontProducts, type StorefrontProduct } from '../domain/storefront';
import { getCachedPublicProfile, resolveUserByUsername, type ResolvedUser } from '../services/userService';
import type { CustomLink, UserProfile } from '../store/useStore';
import { SalesVisitorModal } from '../components/SalesVisitorModal';

type StoreData = {
  uid: string;
  profile: UserProfile;
  customLinks: CustomLink[];
};

const toStoreData = (resolved: ResolvedUser): StoreData => ({
  uid: resolved.uid,
  profile: resolved.data.profile || { name: '', username: '', bio: '', avatarUrl: '' },
  customLinks: resolved.data.customLinks || [],
});

const normalizeExternalUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const normalizeStoreAccent = (value?: string) => !value || value.toLowerCase() === '#ceff4f'
  ? '#374151'
  : value;
const normalizeStoreBackground = (value?: string) => !value || value.toLowerCase() === '#f7f3ea'
  ? '#f5f5f3'
  : value;

const PublicStore = () => {
  const { username = '' } = useParams<{ username: string }>();
  const cached = username ? getCachedPublicProfile(username) : null;
  const [data, setData] = useState<StoreData | null>(() => cached ? toStoreData(cached) : null);
  const [loading, setLoading] = useState(!cached);
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(() => cached ? username : null);
  const [filter, setFilter] = useState<'all' | 'digital_file' | 'product'>('all');
  const [selected, setSelected] = useState<StorefrontProduct | null>(null);

  useEffect(() => {
    let active = true;
    const currentCached = username ? getCachedPublicProfile(username) : null;
    if (currentCached) {
      setData(toStoreData(currentCached));
      setResolvedUsername(username);
      setLoading(false);
    } else {
      setLoading(true);
    }
    void resolveUserByUsername(username).then((resolved) => {
      if (!active) return;
      setData(resolved ? toStoreData(resolved) : null);
      setResolvedUsername(username);
    }).catch((error) => {
      console.error('Store profile fetch failed:', error);
      if (active) {
        setData(null);
        setResolvedUsername(username);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [username]);

  const products = useMemo(
    () => data ? getProfileStorefrontProducts(data.profile, data.customLinks) : [],
    [data],
  );
  const visibleProducts = filter === 'all' ? products : products.filter((item) => item.salesType === filter);

  useEffect(() => {
    if (!data) return;
    const storeName = data.profile.storefront?.name?.trim()
      || `${data.profile.name?.trim() || username}의 스토어`;
    document.title = `${storeName} | LinkZip`;
  }, [data, username]);

  if (loading || resolvedUsername !== username) return null;
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] p-6 text-center font-bold">스토어를 찾을 수 없습니다.</div>;

  const storefront = data.profile.storefront;
  if (storefront?.enabled === false) return <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] p-6 text-center font-bold">현재 공개 중인 스토어가 없습니다.</div>;
  const profileName = data.profile.name?.trim() || username;
  const creator = storefront?.name?.trim() || `${profileName}의 스토어`;
  const accentColor = normalizeStoreAccent(storefront?.accentColor);
  const backgroundColor = normalizeStoreBackground(storefront?.backgroundColor);
  const cardStyle = storefront?.cardStyle || 'bold';
  return (
    <main className="min-h-screen text-[#171714]" style={{ backgroundColor }}>
      <header className="sticky top-0 z-20 border-b-2 border-black/10 backdrop-blur-xl" style={{ backgroundColor: `${backgroundColor}f2` }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to={`/${username}`} className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-black transition hover:bg-black/5">
            <ArrowLeft className="h-4 w-4" /> {profileName}
          </Link>
          <nav className="flex rounded-full border-2 border-black bg-white p-1 text-sm font-black shadow-[3px_3px_0_#171714]" aria-label="프로필 메뉴">
            <Link to={`/${username}`} className="cursor-pointer rounded-full px-4 py-2 hover:bg-black/5">링크</Link>
            <span className="rounded-full bg-black px-4 py-2 text-white">스토어</span>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <div className="flex flex-col gap-6 border-b-2 border-black pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-5 flex items-center gap-3">
              {storefront?.thumbnailUrl ? <img src={storefront.thumbnailUrl} alt="" className="h-20 w-20 rounded-3xl border-2 border-black object-cover sm:h-24 sm:w-24" /> : data.profile.avatarUrl ? <img src={data.profile.avatarUrl} alt="" className="h-14 w-14 rounded-2xl border-2 border-black object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#374151] text-white"><ShoppingBag className="h-6 w-6" /></div>}
              <span className="rounded-full bg-[#171714] px-3 py-1 text-xs font-black text-white">LINKZIP STORE</span>
            </div>
            <h1 className="text-4xl font-black tracking-[-0.05em] sm:text-6xl">{creator}</h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-black/60">{storefront?.description || '디지털 콘텐츠부터 실물 상품까지 한곳에서 둘러보고 주문할 수 있어요.'}</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {([['all', '전체'], ['digital_file', '디지털'], ['product', '실물 상품']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`shrink-0 cursor-pointer rounded-full border-2 border-black px-4 py-2 text-xs font-black transition-colors ${
                  filter === value
                    ? 'bg-black text-white shadow-[2px_2px_0_rgba(0,0,0,0.18)]'
                    : 'bg-white text-black hover:bg-black hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {storefront?.announcement && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border-2 border-black bg-white px-4 py-3 text-sm font-bold shadow-[3px_3px_0_#171714]">
            <span aria-hidden="true" className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#6b7280]" />
            <p>{storefront.announcement}</p>
          </div>
        )}

        {visibleProducts.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border-2 border-dashed border-black/25 bg-white/50 px-6 py-20 text-center">
            <Package className="mx-auto h-9 w-9 text-black/35" />
            <p className="mt-4 text-lg font-black">아직 등록된 상품이 없어요</p>
            <p className="mt-1 text-sm font-semibold text-black/50">새 상품이 올라오면 이곳에서 바로 확인할 수 있습니다.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {visibleProducts.map((item, index) => {
              const price = item.product.discountPrice ?? item.product.price;
              const soldOut = item.product.stock === 0;
              const externalUrl = normalizeExternalUrl(item.externalPurchaseUrl || '');
              return (
                <button key={item.key} type="button" disabled={soldOut} onClick={() => externalUrl ? window.open(externalUrl, '_blank', 'noopener,noreferrer') : setSelected(item)} className={`group cursor-pointer overflow-hidden rounded-[1.5rem] bg-white text-left transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-[2rem] ${cardStyle === 'bold' ? 'border-2 border-black shadow-[4px_4px_0_#171714]' : cardStyle === 'outlined' ? 'border-2 border-black' : 'border border-black/10 shadow-[0_12px_35px_rgba(15,23,42,0.10)]'}`}>
                  <div className="relative aspect-square overflow-hidden bg-[#ece8df]">
                    {item.image ? <img src={item.image} alt="" loading={index < 4 ? 'eager' : 'lazy'} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center" style={{ background: `radial-gradient(circle at top left, ${accentColor}35, transparent 58%), linear-gradient(135deg,#f8f8f6,#e5e7eb)` }}><ShoppingBag className="h-10 w-10" /></div>}
                    <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-black bg-white px-2 py-1 text-[10px] font-black">{item.salesType === 'digital_file' ? <Download className="h-3 w-3" /> : <Package className="h-3 w-3" />}{item.salesType === 'digital_file' ? '디지털' : '배송 상품'}</span>
                    {soldOut && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-black text-white">품절</span>}
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="line-clamp-2 min-h-10 text-sm font-black leading-5 sm:text-base">{item.product.name}</p>
                    <div className="mt-3 flex flex-wrap items-baseline gap-2">
                      <strong className="text-base font-black sm:text-lg">{price.toLocaleString()}원</strong>
                      {item.product.discountPrice != null && item.product.discountPrice < item.product.price && <span className="text-xs font-bold text-black/35 line-through">{item.product.price.toLocaleString()}원</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {(storefront?.sellerName || storefront?.contactEmail || storefront?.contactPhone || storefront?.shippingPolicy) && (
          <section className="mt-12 rounded-[2rem] border-2 border-black/15 bg-white/70 p-5 sm:p-7" aria-labelledby="store-information-title">
            <h2 id="store-information-title" className="text-xl font-black">판매자·배송 안내</h2>
            <div className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-black text-black/40">판매자</p>
                <p className="mt-1 font-bold">{storefront.sellerName || profileName}{storefront.representativeName ? ` · 대표 ${storefront.representativeName}` : ''}</p>
              </div>
              <div>
                <p className="text-xs font-black text-black/40">문의</p>
                <p className="mt-1 break-all font-bold">{[storefront.contactEmail, storefront.contactPhone].filter(Boolean).join(' · ') || '상품 문의를 이용해 주세요.'}</p>
              </div>
              {storefront.businessRegistrationNumber && <div><p className="text-xs font-black text-black/40">사업자등록번호</p><p className="mt-1 font-bold">{storefront.businessRegistrationNumber}</p></div>}
              {storefront.mailOrderRegistrationNumber || storefront.mailOrderExemptionReason ? <div><p className="text-xs font-black text-black/40">통신판매업</p><p className="mt-1 font-bold">{storefront.mailOrderRegistrationNumber || storefront.mailOrderExemptionReason}</p></div> : null}
              {storefront.businessAddress && <div className="sm:col-span-2"><p className="text-xs font-black text-black/40">사업장 소재지</p><p className="mt-1 font-bold">{storefront.businessAddress}</p></div>}
              {storefront.shippingPolicy && <div className="sm:col-span-2"><p className="text-xs font-black text-black/40">배송·교환 안내</p><p className="mt-1 whitespace-pre-line font-semibold leading-6 text-black/65">{storefront.shippingPolicy}</p></div>}
            </div>
          </section>
        )}
      </section>

      {selected && <SalesVisitorModal isOpen onClose={() => setSelected(null)} block={selected.block} profile={data.profile} ownerUid={data.uid} initialProductId={selected.product.id} />}
    </main>
  );
};

export default PublicStore;
