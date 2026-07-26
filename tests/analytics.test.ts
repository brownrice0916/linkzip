import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRecordAnalytics } from '../src/domain/analytics.ts';

test('does not record analytics on local development hosts', () => {
  assert.equal(shouldRecordAnalytics('localhost'), false);
  assert.equal(shouldRecordAnalytics('127.0.0.1'), false);
  assert.equal(shouldRecordAnalytics('::1'), false);
  assert.equal(shouldRecordAnalytics('[::1]'), false);
});

test('records analytics on production hosts', () => {
  assert.equal(shouldRecordAnalytics('linkzip.kr'), true);
  assert.equal(shouldRecordAnalytics('www.linkzip.kr'), true);
});
