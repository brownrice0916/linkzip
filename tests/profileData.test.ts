import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLinkClicks, isValidUsername, normalizeUsername, sanitizePublicLinks } from '../src/domain/profileData.ts';

test('normalizes public usernames consistently', () => {
  assert.equal(normalizeUsername('  @CreatorName '), 'creatorname');
  assert.equal(isValidUsername('creator_name'), true);
  assert.equal(isValidUsername('bad/name'), false);
});

test('removes identity numbers from nested public donation blocks', () => {
  const links = sanitizePublicLinks([{
    id: 'collection',
    type: 'collection',
    title: 'group',
    links: [{
      id: 'donation',
      type: 'donation',
      title: 'support',
      donationConfig: {
        mainText: 'support',
        minAmount: 1000,
        buttonText: 'donate',
        idNumber: 'secret',
      },
    }],
  }]);

  assert.equal(links[0].links?.[0].donationConfig?.idNumber, undefined);
});

test('keeps legacy affiliate product images on public profiles', () => {
  const [product] = sanitizePublicLinks([{
    id: 'affiliate',
    type: 'affiliate_product',
    title: 'product',
    url: 'https://example.com/product',
    icon: 'https://example.com/product.jpg',
    affiliateProductConfig: {
      affiliateUrl: 'https://example.com/product',
      currency: 'KRW',
    },
  }]);

  assert.equal(product.affiliateProductConfig?.imageUrl, 'https://example.com/product.jpg');
  assert.equal(product.icon, 'https://example.com/product.jpg');
});

test('applies server click totals recursively without mutating input', () => {
  const source = [{
    id: 'collection',
    type: 'collection' as const,
    title: 'group',
    links: [{ id: 'child', title: 'child', clicks: 1 }],
  }];
  const result = applyLinkClicks(source, { child: 9 });

  assert.equal(result[0].links?.[0].clicks, 9);
  assert.equal(source[0].links?.[0].clicks, 1);
});
