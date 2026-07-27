import assert from 'node:assert/strict';
import test from 'node:test';
import { getSocialUrl, normalizeSocialPlatform } from '../src/lib/social.ts';

test('normalizes social platform aliases used by the icon picker', () => {
  assert.equal(normalizeSocialPlatform('naver-blog'), 'naverblog');
  assert.equal(normalizeSocialPlatform('Naver Blog'), 'naverblog');
});

test('builds Naver Blog and Postype profile URLs from IDs', () => {
  assert.equal(getSocialUrl('naverblog', 'ssalssal-2'), 'https://blog.naver.com/ssalssal-2');
  assert.equal(getSocialUrl('postype', '@graintoon'), 'https://www.postype.com/@graintoon');
});

test('keeps a fully entered social URL unchanged', () => {
  assert.equal(getSocialUrl('postype', 'https://www.postype.com/@graintoon'), 'https://www.postype.com/@graintoon');
});
