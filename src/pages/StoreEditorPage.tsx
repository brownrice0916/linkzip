import { useState } from 'react';
import { ArrowLeft, Check, ExternalLink, ImagePlus, PackagePlus, Save, ShoppingBag, Trash2, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadPublicImage } from '../services/storageService';
import { saveUserProfilesData } from '../services/userService';
import { useStore, type StorefrontProductItem, type StorefrontSettings } from '../store/useStore';
import { ProfitAccountModal } from '../components/admin/ProfitAccountModal';

const LEGACY_ACCENT = '#ceff4f';
const LEGACY_BACKGROUND = '#f7f3ea';
const FALLBACK_ACCENT = '#374151';
const FALLBACK_BACKGROUND = '#f5f5f3';

const normalizeStoreAccent = (value?: string) => !value || value.toLowerCase() === LEGACY_ACCENT
  ? FALLBACK_ACCENT
  : value;
const normalizeStoreBackground = (value?: string) => !value || value.toLowerCase() === LEGACY_BACKGROUND
  ? FALLBACK_BACKGROUND
  : value;

const StoreEditorPage = () => {
  const state = useStore();
  const navigate = useNavigate();
  const current = state.profile.storefront;
  const [draft, setDraft] = useState<StorefrontSettings>(() => ({
    enabled: current?.enabled ?? true,
    showOnProfile: current?.showOnProfile !== false,
    name: current?.name || `${state.profile.name || state.profile.username}의 스토어`,
    description: current?.description || '좋아하는 상품과 직접 만든 것을 한곳에서 소개해요.',
    announcement: current?.announcement || '',
    sellerName: current?.sellerName || state.profile.name || '',
    representativeName: current?.representativeName || '',
    businessRegistrationNumber: current?.businessRegistrationNumber || '',
    businessAddress: current?.businessAddress || '',
    mailOrderRegistrationNumber: current?.mailOrderRegistrationNumber || '',
    mailOrderExemptionReason: current?.mailOrderExemptionReason || '',
    contactEmail: current?.contactEmail || state.profile.email || state.user?.email || '',
    contactPhone: current?.contactPhone || '',
    shippingPolicy: current?.shippingPolicy || '배송과 교환·환불 일정은 상품 상세 안내를 확인해 주세요.',
    thumbnailUrl: current?.thumbnailUrl || '',
    accentColor: normalizeStoreAccent(current?.accentColor),
    backgroundColor: normalizeStoreBackground(current?.backgroundColor),
    cardStyle: current?.cardStyle || 'soft',
    sellerType: current?.sellerType,
    checkoutAvailability: 'internal',
    products: current?.products || [],
  }));
  const [uploading, setUploading] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const products = draft.products || [];

  const persist = async (next: StorefrontSettings, showToast = true) => {
    if (!state.user?.uid) return;
    const invalidProduct = next.enabled === false ? undefined : (next.products || []).find((product) => (
      !Number.isSafeInteger(product.price) || product.price < 100
    ));
    if (invalidProduct) {
      window.alert(`'${invalidProduct.name || '상품'}'의 가격을 100원 이상으로 입력해 주세요.`);
      return;
    }
    setSaving(true);
    const securedNext = {
      ...next,
      checkoutAvailability: 'internal' as const,
    };
    state.setProfile({ ...state.profile, storefront: securedNext });
    state.syncActiveProfileWorkspace();
    const latest = useStore.getState();
    try {
      await saveUserProfilesData(latest.user!.uid, latest.profileWorkspaces, latest.activeProfileId, {
        teamMembers: latest.teamMembers,
        dmRules: latest.dmRules,
        alimtalkSettings: latest.alimtalkSettings,
        instagramAccount: latest.instagramAccount,
        pageViews: latest.pageViews,
      });
      latest.markSaved();
      if (showToast) {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1800);
      }
    } catch (error) {
      console.error('Store settings save failed:', error);
      const code = typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : '';
      window.alert(code === 'permission-denied'
        ? '스토어를 저장하지 못했어요. 계정의 저장 권한을 확인한 뒤 다시 시도해 주세요.'
        : '스토어를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const uploadThumbnail = async (file?: File) => {
    if (!file || !state.user?.uid) return;
    if (!file.type.startsWith('image/')) {
      window.alert('이미지 파일만 선택해 주세요.');
      return;
    }
    setUploading(true);
    try {
      const thumbnailUrl = await uploadPublicImage(
        `profiles/${state.user.uid}/storefront/${state.activeProfileId}`,
        file,
      );
      setDraft((value) => ({ ...value, thumbnailUrl }));
    } catch (error) {
      console.error('Store thumbnail upload failed:', error);
      window.alert('대표 이미지를 업로드하지 못했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const updateProduct = (id: string, updates: Partial<StorefrontProductItem>) => {
    setDraft((value) => ({
      ...value,
      products: (value.products || []).map((product) => product.id === id ? { ...product, ...updates } : product),
    }));
  };

  const addProduct = () => {
    const product: StorefrontProductItem = {
      id: `store-product-${Date.now()}`,
      name: '새 상품',
      price: 100,
      description: '',
      productType: 'product',
      shippingFee: 3000,
    };
    setDraft((value) => ({ ...value, products: [...(value.products || []), product] }));
  };

  const uploadProductImage = async (productId: string, file?: File) => {
    if (!file || !state.user?.uid) return;
    if (!file.type.startsWith('image/')) {
      window.alert('이미지 파일만 선택해 주세요.');
      return;
    }
    setUploadingProductId(productId);
    try {
      const imageUrl = await uploadPublicImage(
        `profiles/${state.user.uid}/storefront/${state.activeProfileId}/products/${productId}`,
        file,
      );
      updateProduct(productId, { imageUrl });
    } catch (error) {
      console.error('Store product image upload failed:', error);
      window.alert('상품 이미지를 업로드하지 못했습니다.');
    } finally {
      setUploadingProductId(null);
    }
  };

  const removeStore = async () => {
    if (!window.confirm('샵만 홈에서 숨길까요?\n등록한 상품은 삭제되지 않습니다.')) return;
    await persist({ ...draft, enabled: false }, false);
    navigate('/admin');
  };

  return (
    <main className="min-h-screen bg-[#f2f3f5] text-[#171714]">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-8">
          <button type="button" onClick={() => navigate('/admin')} className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-black transition hover:bg-black/5"><ArrowLeft className="h-5 w-5" /> 내 링크집</button>
          <div className="flex items-center gap-2">
            {current?.enabled && <button type="button" onClick={() => window.open(`/${state.profile.username}/shop`, '_blank', 'noopener,noreferrer')} className="hidden cursor-pointer items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-black transition hover:bg-gray-100 sm:flex"><ExternalLink className="h-4 w-4" /> 공개 샵</button>}
            <button type="button" disabled={saving || uploading || !draft.name.trim()} onClick={() => void persist(draft)} className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-black bg-black px-5 py-2.5 text-sm font-black text-white shadow-[3px_3px_0_#cfd3d8] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" /> {saving ? '저장 중' : current ? '저장' : '스토어 만들기'}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-8">
            <span className="rounded-full bg-[#171714] px-3 py-1 text-[11px] font-black text-white">LINKZIP SHOP</span>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-5xl">내 샵 꾸미기</h1>
            <p className="mt-2 text-sm font-semibold text-black/50">링크집과 별개로 샵의 이름, 이미지와 분위기를 정할 수 있어요.</p>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-black/10 bg-[#f3f4f6] p-4 text-xs font-semibold leading-5">
              <strong className="block text-sm text-black">베타 기간에는 누구나 판매 기능을 사용할 수 있어요.</strong>
              <span className="mt-1 block text-black/60">사업자 심사 없이 시작할 수 있습니다. 다만 반복적으로 판매하는 경우 사업자등록·통신판매 신고·세금 등 본인에게 적용되는 의무를 직접 확인해 주세요.</span>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-3xl border-2 border-black bg-gray-100 p-4 shadow-[3px_3px_0_#cfd3d8] transition hover:-translate-y-0.5">
              <span>
                <span className="block text-sm font-black">스토어 공개</span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-black/50">끄면 상품은 그대로 보관되고 방문자에게만 숨겨져요.</span>
              </span>
              <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} className="peer sr-only" />
              <span aria-hidden="true" className="relative h-8 w-14 shrink-0 rounded-full border-2 border-black bg-gray-200 transition peer-checked:bg-black after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-6" />
            </label>

            <div>
              <p className="mb-2 text-xs font-black">대표 이미지</p>
              <div className="flex items-center gap-3">
                <label className="group relative flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-black/25 bg-[#f5f3ed] transition hover:border-black">
                  {draft.thumbnailUrl ? <img src={draft.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-black/35" />}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-black text-white opacity-0 transition group-hover:opacity-100">{uploading ? '업로드 중' : '이미지 선택'}</span>
                  <input type="file" accept="image/*" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void uploadThumbnail(file); }} className="sr-only" />
                </label>
                <div>
                  <p className="text-sm font-black">샵을 한눈에 보여주는 이미지</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-black/45">정사각형이나 세로형 이미지를 권장해요. 상품 사진이나 브랜드 이미지를 올려보세요.</p>
                  {draft.thumbnailUrl && <button type="button" onClick={() => setDraft((value) => ({ ...value, thumbnailUrl: '' }))} className="mt-2 cursor-pointer text-xs font-black text-gray-600 underline underline-offset-4 hover:text-black">이미지 삭제</button>}
                </div>
              </div>
            </div>

            <label className="block text-xs font-black">샵 이름<input value={draft.name} maxLength={40} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-2 w-full rounded-2xl border-2 border-black/10 px-4 py-3.5 text-base font-black outline-none transition focus:border-black" placeholder="예: 싸리의 작은 상점" /></label>
            <label className="block text-xs font-black">샵 소개<textarea value={draft.description} maxLength={140} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-2 min-h-28 w-full resize-none rounded-2xl border-2 border-black/10 px-4 py-3.5 text-sm font-semibold leading-6 outline-none transition focus:border-black" placeholder="어떤 상품을 판매하는 샵인지 알려주세요." /></label>
            <label className="block text-xs font-black">스토어 공지<input value={draft.announcement || ''} maxLength={80} onChange={(event) => setDraft({ ...draft, announcement: event.target.value })} className="mt-2 w-full rounded-2xl border-2 border-black/10 px-4 py-3.5 text-sm font-bold outline-none transition focus:border-black" placeholder="예: 오후 2시 이전 주문은 당일 발송해요" /></label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 border-black/10 p-4 transition hover:border-black/30">
              <span>
                <span className="block text-sm font-black">프로필에 스토어 버튼 표시</span>
                <span className="mt-1 block text-xs font-semibold leading-5 text-black/45">프로필 상단의 버튼을 누르면 독립 스토어로 이동해요.</span>
              </span>
              <input
                type="checkbox"
                checked={draft.showOnProfile !== false}
                onChange={(event) => setDraft({ ...draft, showOnProfile: event.target.checked })}
                className="peer sr-only"
              />
              <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full border-2 border-black bg-gray-200 transition peer-checked:bg-black after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
            </label>

            <div className="rounded-3xl border-2 border-black/10 bg-[#faf9f5] p-4 sm:p-5">
              <div className="mb-4"><p className="text-sm font-black">판매자·배송 안내</p><p className="mt-1 text-xs font-semibold text-black/45">구매자가 주문 전에 확인할 기본 정보를 적어주세요.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-black">판매자명<input value={draft.sellerName || ''} maxLength={40} onChange={(event) => setDraft({ ...draft, sellerName: event.target.value })} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm font-semibold outline-none focus:border-black" placeholder="이름 또는 상호명" /></label>
                <label className="text-xs font-black">대표자명<input value={draft.representativeName || ''} onChange={(event) => setDraft({ ...draft, representativeName: event.target.value })} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm font-semibold outline-none focus:border-black" /></label>
                <label className="text-xs font-black">문의 이메일<input type="email" value={draft.contactEmail || ''} onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm font-semibold outline-none focus:border-black" placeholder="hello@example.com" /></label>
                <label className="text-xs font-black">문의 연락처<input inputMode="tel" value={draft.contactPhone || ''} maxLength={20} onChange={(event) => setDraft({ ...draft, contactPhone: event.target.value })} className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm font-semibold outline-none focus:border-black" placeholder="선택 입력" /></label>
                <label className="text-xs font-black sm:col-span-2">배송·교환 안내<textarea value={draft.shippingPolicy || ''} maxLength={300} onChange={(event) => setDraft({ ...draft, shippingPolicy: event.target.value })} className="mt-2 min-h-24 w-full resize-none rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm font-semibold leading-6 outline-none focus:border-black" /></label>
              </div>
              <button type="button" onClick={() => setAccountOpen(true)} className="mt-4 flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 border-black bg-white px-4 py-3 text-left transition hover:bg-gray-100">
                <span className="flex items-center gap-3"><WalletCards className="h-5 w-5" /><span><strong className="block text-sm">입금 계좌</strong><span className="mt-0.5 block text-[11px] font-semibold text-black/45">{state.profile.verifiedAccount?.accountConnected ? `${state.profile.verifiedAccount.bankName} · 등록됨` : '계좌이체 판매를 이용하려면 등록해 주세요.'}</span></span></span>
                <span className="text-xs font-black">{state.profile.verifiedAccount?.accountConnected ? '변경' : '등록'}</span>
              </button>
            </div>

            <div>
              <p className="mb-3 text-xs font-black">샵 색상</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-black/10 p-3 text-xs font-black"><input type="color" value={draft.accentColor} onChange={(event) => setDraft({ ...draft, accentColor: event.target.value })} className="h-10 w-10 cursor-pointer rounded-xl border-0 bg-transparent" /> 포인트 색상</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-black/10 p-3 text-xs font-black"><input type="color" value={draft.backgroundColor} onChange={(event) => setDraft({ ...draft, backgroundColor: event.target.value })} className="h-10 w-10 cursor-pointer rounded-xl border-0 bg-transparent" /> 배경 색상</label>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-black">상품 카드</p>
              <div className="grid grid-cols-3 gap-2">
                {([['soft', '부드럽게'], ['outlined', '깔끔한 선'], ['bold', '또렷하게']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setDraft({ ...draft, cardStyle: value })} className={`cursor-pointer rounded-2xl border-2 px-2 py-4 text-xs font-black transition ${draft.cardStyle === value ? 'border-black bg-black text-white' : 'border-black/10 bg-white hover:border-black/35'}`}>{label}</button>)}
              </div>
            </div>

            <div className="border-t-2 border-black/10 pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div><p className="text-base font-black">샵 상품 {products.length}개</p><p className="mt-1 text-xs font-semibold text-black/45">기존 실물 상품 판매 블록과 별도로 관리됩니다.</p></div>
                <button type="button" onClick={addProduct} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-black px-4 py-2.5 text-xs font-black text-white"><PackagePlus className="h-4 w-4" /> 상품 추가</button>
              </div>
              {products.length === 0 ? <div className="rounded-2xl border-2 border-dashed border-black/15 px-4 py-10 text-center text-xs font-bold text-black/35">샵에 진열할 상품을 추가해 보세요.</div> : <div className="space-y-3">
                {products.map((product) => <article key={product.id} className="grid gap-3 rounded-2xl border-2 border-black/10 p-3 sm:grid-cols-[88px_1fr_auto]">
                  <label className="group relative flex h-[88px] w-[88px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-[#f5f3ed]">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-black/30" />}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-[10px] font-black text-white opacity-0 transition group-hover:opacity-100">{uploadingProductId === product.id ? '업로드 중' : '이미지'}</span>
                    <input type="file" accept="image/*" disabled={uploadingProductId === product.id} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void uploadProductImage(product.id, file); }} className="sr-only" />
                  </label>
                  <div className="grid min-w-0 gap-2 sm:grid-cols-[1fr_130px_130px]">
                    <input value={product.name} maxLength={60} onChange={(event) => updateProduct(product.id, { name: event.target.value })} className="min-w-0 rounded-xl border border-black/10 px-3 py-2.5 text-sm font-black outline-none focus:border-black" placeholder="상품 이름" />
                    <label className={`flex items-center rounded-xl border px-3 focus-within:border-black ${product.price < 100 ? 'border-red-400 bg-red-50' : 'border-black/10'}`}><input type="number" min="100" step="100" value={product.price} onChange={(event) => updateProduct(product.id, { price: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} className="min-w-0 flex-1 bg-transparent py-2.5 text-right text-sm font-black outline-none" aria-label={`${product.name} 가격, 최소 100원`} /><span className="ml-1 text-xs font-bold text-black/40">원</span></label>
                    <label className="flex items-center rounded-xl border border-black/10 px-3 focus-within:border-black"><span className="mr-2 shrink-0 text-[10px] font-bold text-black/40">배송비</span><input type="number" min="0" value={product.shippingFee ?? 3000} onChange={(event) => updateProduct(product.id, { shippingFee: Math.max(0, Number(event.target.value) || 0) })} className="min-w-0 flex-1 py-2.5 text-right text-sm font-black outline-none" /><span className="ml-1 text-xs font-bold text-black/40">원</span></label>
                    <input value={product.description || ''} maxLength={120} onChange={(event) => updateProduct(product.id, { description: event.target.value })} className="min-w-0 rounded-xl border border-black/10 px-3 py-2.5 text-xs font-semibold outline-none focus:border-black sm:col-span-3" placeholder="상품 설명" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:col-start-2 sm:col-span-2" aria-label="상품 유형">
                    {([['digital_file', '디지털 상품'], ['product', '실물 상품']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => updateProduct(product.id, { productType: value, shippingFee: value === 'digital_file' ? 0 : (product.shippingFee || 3000) })} className={`cursor-pointer rounded-xl border-2 px-3 py-2.5 text-xs font-black ${product.productType === value || (!product.productType && value === 'product') ? 'border-black bg-black text-white' : 'border-black/10 bg-white'}`}>{label}</button>)}
                  </div>
                  <label className="text-[10px] font-black sm:col-start-2 sm:col-span-2">외부 구매 링크
                    <input value={product.externalPurchaseUrl || ''} onChange={(event) => updateProduct(product.id, { externalPurchaseUrl: event.target.value })} className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs font-semibold outline-none focus:border-black" placeholder="예: smartstore.naver.com/myshop/products/123" />
                    <span className="mt-1 block font-semibold text-black/35">선택 입력이에요. 입력하면 LinkZip 주문 대신 이 주소로 이동합니다.</span>
                  </label>
                  <button type="button" onClick={() => setDraft((value) => ({ ...value, products: (value.products || []).filter((item) => item.id !== product.id) }))} className="flex h-10 w-10 cursor-pointer items-center justify-center justify-self-end rounded-full text-black/30 transition hover:bg-red-50 hover:text-red-500" aria-label={`${product.name} 삭제`}><Trash2 className="h-4 w-4" /></button>
                </article>)}
              </div>}
            </div>
          </div>

          {current?.enabled && <button type="button" onClick={() => void removeStore()} className="mt-10 flex cursor-pointer items-center gap-2 text-xs font-black text-red-500"><Trash2 className="h-4 w-4" /> 샵 숨기기</button>}
        </section>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-xs font-black text-black/45">미리보기</p>
          <div className="overflow-hidden rounded-[2.5rem] border-[7px] border-[#d9dde4] shadow-[0_22px_50px_rgba(15,23,42,0.15)]" style={{ backgroundColor: draft.backgroundColor }}>
            <div className="min-h-[650px] p-5">
              <div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[0.18em]">LINKZIP SHOP</span><ShoppingBag className="h-5 w-5" /></div>
              <div className="mt-10">
                {draft.thumbnailUrl ? <img src={draft.thumbnailUrl} alt="" className="h-36 w-full rounded-3xl object-cover" /> : <div className="flex h-36 items-center justify-center rounded-3xl" style={{ backgroundColor: draft.accentColor }}><ShoppingBag className="h-12 w-12" /></div>}
                <h2 className="mt-6 text-3xl font-black tracking-[-0.05em]">{draft.name || '내 샵 이름'}</h2>
                <p className="mt-2 text-sm font-semibold leading-5 text-black/55">{draft.description || '샵 소개를 입력해 주세요.'}</p>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {(products.length > 0 ? products.slice(0, 4) : [null, null, null, null]).map((product, index) => <div key={product?.id || index} className={`${draft.cardStyle === 'bold' ? 'border-2 border-black shadow-[3px_3px_0_#171714]' : draft.cardStyle === 'outlined' ? 'border-2 border-black' : 'border border-black/5 shadow-sm'} overflow-hidden rounded-2xl bg-white`}><div className="aspect-square bg-black/5">{product?.imageUrl && <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />}</div><div className="p-3">{product ? <><p className="truncate text-[11px] font-black">{product.name}</p><p className="mt-1 text-[10px] font-black" style={{ color: draft.accentColor }}>{product.price.toLocaleString()}원</p></> : <><div className="h-2 w-3/4 rounded-full bg-black/15" /><div className="mt-2 h-2 w-1/2 rounded-full" style={{ backgroundColor: draft.accentColor }} /></>}</div></div>)}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {saved && <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-black text-white shadow-xl"><Check className="h-4 w-4 text-white" /> 샵 설정을 저장했어요</div>}
      <ProfitAccountModal
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        initialData={state.profile.verifiedAccount}
        onDisconnect={() => {
          const nextProfile = { ...state.profile };
          delete nextProfile.verifiedAccount;
          state.setProfile(nextProfile);
        }}
        onSave={(accountData) => state.setProfile({ ...state.profile, verifiedAccount: accountData })}
      />
    </main>
  );
};

export default StoreEditorPage;
