import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAnalyticsByPeriod,
  shouldRecordAnalytics,
  sumAnalytics,
} from '../src/domain/analytics.ts';

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

const history = [
  { date: '2026-06-28', views: 10, clicks: 1 },
  { date: '2026-07-20', views: 20, clicks: 2 },
  { date: '2026-07-22', views: 30, clicks: 3 },
  { date: '2026-07-28', views: 40, clicks: 4 },
];

test('filters daily, weekly and monthly analytics ranges', () => {
  const now = new Date(2026, 6, 28, 12, 0, 0);

  assert.deepEqual(filterAnalyticsByPeriod(history, 'day', now).map((item) => item.date), ['2026-07-28']);
  assert.deepEqual(filterAnalyticsByPeriod(history, 'week', now).map((item) => item.date), ['2026-07-22', '2026-07-28']);
  assert.deepEqual(filterAnalyticsByPeriod(history, 'month', now).map((item) => item.date), ['2026-07-20', '2026-07-22', '2026-07-28']);
});

test('sums views and clicks from the selected analytics range', () => {
  assert.deepEqual(sumAnalytics(history.slice(1)), { views: 90, clicks: 9 });
});
