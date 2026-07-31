import assert from 'node:assert/strict';
import test from 'node:test';
import { getProfileStorefrontProducts, getStorefrontProducts } from '../src/domain/storefront.ts';
import type { CustomLink, UserProfile } from '../src/store/useStore.ts';

test('visible sales blocks are flattened into storefront products', () => {
  const links: CustomLink[] = [
    { id: 'regular', type: 'link', title: '소개', url: 'example.com' },
    {
      id: 'digital', type: 'sales', title: '자료',
      salesConfig: { salesType: 'digital_file', mainText: '자료', image: 'cover.png', description: '', products: [
        { id: 'ebook', name: '전자책', price: 12000 },
        { id: 'template', name: '템플릿', price: 9000 },
      ] },
    },
    {
      id: 'hidden', type: 'sales', title: '숨김', isVisible: false,
      salesConfig: { salesType: 'product', mainText: '숨김', description: '', products: [{ id: 'x', name: '숨김', price: 1 }] },
    },
  ];

  const result = getStorefrontProducts(links);
  assert.deepEqual(result.map(({ key, salesType, image }) => ({ key, salesType, image })), [
    { key: 'digital:ebook', salesType: 'digital_file', image: 'cover.png' },
    { key: 'digital:template', salesType: 'digital_file', image: 'cover.png' },
  ]);
});

test('sales type defaults to physical product for legacy blocks', () => {
  const result = getStorefrontProducts([{
    id: 'legacy', type: 'sales', title: '상품',
    salesConfig: { mainText: '상품', description: '', products: [{ id: 'one', name: '상품', price: 1000 }] },
  }]);
  assert.equal(result[0]?.salesType, 'product');
});

test('an enabled standalone shop does not reuse products from sales blocks', () => {
  const profile: UserProfile = {
    name: '샵 주인', username: 'owner', bio: '', avatarUrl: '',
    storefront: {
      enabled: true,
      name: '독립 샵',
      products: [{ id: 'shop-item', name: '샵 상품', price: 5000, imageUrl: 'shop.png' }],
    },
  };
  const links: CustomLink[] = [{
    id: 'physical-block', type: 'sales', title: '기존 실물 판매',
    salesConfig: { salesType: 'product', mainText: '기존 실물 판매', description: '', products: [{ id: 'old', name: '기존 상품', price: 1000 }] },
  }];

  const result = getProfileStorefrontProducts(profile, links);
  assert.deepEqual(result.map((item) => item.product.name), ['샵 상품']);
  assert.equal(result[0]?.image, 'shop.png');
});

test('standalone shop keeps the selected digital product type', () => {
  const profile: UserProfile = {
    name: '개인 크리에이터', username: 'creator', bio: '', avatarUrl: '',
    storefront: {
      enabled: true,
      sellerType: 'individual_creator',
      products: [{ id: 'pdf', name: 'PDF', price: 1000, productType: 'digital_file' }],
    },
  };

  const [item] = getProfileStorefrontProducts(profile, []);
  assert.equal(item?.salesType, 'digital_file');
});

test('profile sales blocks stay separate when no standalone shop exists', () => {
  const profile: UserProfile = { name: '프로필 주인', username: 'owner', bio: '', avatarUrl: '' };
  const links: CustomLink[] = [{
    id: 'physical-block', type: 'sales', title: '프로필 실물 판매',
    salesConfig: { salesType: 'product', mainText: '프로필 실물 판매', description: '', products: [{ id: 'old', name: '프로필 상품', price: 1000 }] },
  }];

  assert.deepEqual(getProfileStorefrontProducts(profile, links), []);
});
