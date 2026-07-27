import test from 'node:test';
import assert from 'node:assert/strict';
import { MEMBERSHIP_PLANS, normalizeMembershipPlan } from '../src/domain/membershipPlans.ts';

test('defines Basic, Standard, and Premium in ascending price order', () => {
  assert.deepEqual(MEMBERSHIP_PLANS.map((plan) => plan.id), ['basic', 'standard', 'premium']);
  assert.deepEqual(MEMBERSHIP_PLANS.map((plan) => plan.monthlyPrice), [0, 3900, 9900]);
  assert.deepEqual(MEMBERSHIP_PLANS.map((plan) => plan.salesFeePercent), [8, 5, 0]);
  assert.ok(MEMBERSHIP_PLANS.find((plan) => plan.id === 'standard')?.featuresKo.includes('데이터 다운로드'));
  assert.ok(MEMBERSHIP_PLANS.find((plan) => plan.id === 'standard')?.featuresKo.includes('LinkZip 로고 삭제'));
  assert.ok(MEMBERSHIP_PLANS.find((plan) => plan.id === 'premium')?.featuresKo.includes('LinkZip 로고 삭제'));
});

test('falls back unknown or legacy memberships to Basic', () => {
  assert.equal(normalizeMembershipPlan('premium'), 'premium');
  assert.equal(normalizeMembershipPlan('standard'), 'standard');
  assert.equal(normalizeMembershipPlan('free'), 'basic');
  assert.equal(normalizeMembershipPlan(undefined), 'basic');
});
