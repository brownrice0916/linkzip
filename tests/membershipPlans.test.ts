import test from 'node:test';
import assert from 'node:assert/strict';
import { MEMBERSHIP_PLANS, normalizeMembershipPlan } from '../src/domain/membershipPlans.ts';

test('defines Basic, Standard, and Premium in ascending price order', () => {
  assert.deepEqual(MEMBERSHIP_PLANS.map((plan) => plan.id), ['basic', 'standard', 'premium']);
  assert.deepEqual(MEMBERSHIP_PLANS.map((plan) => plan.monthlyPrice), [990, 3900, 9900]);
});

test('falls back unknown or legacy memberships to Basic', () => {
  assert.equal(normalizeMembershipPlan('premium'), 'premium');
  assert.equal(normalizeMembershipPlan('standard'), 'standard');
  assert.equal(normalizeMembershipPlan('free'), 'basic');
  assert.equal(normalizeMembershipPlan(undefined), 'basic');
});
