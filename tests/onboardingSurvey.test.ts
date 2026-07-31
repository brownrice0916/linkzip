import assert from 'node:assert/strict';
import test from 'node:test';
import { getOnboardingSurveyStorageKey, isOnboardingComplete } from '../src/domain/onboardingSurvey.ts';

test('scopes onboarding drafts to the authenticated user', () => {
  assert.equal(getOnboardingSurveyStorageKey('user-a'), 'linkzip_onboarding_survey:user-a');
  assert.notEqual(getOnboardingSurveyStorageKey('user-a'), getOnboardingSurveyStorageKey('user-b'));
});

test('routes accounts without a completed profile to onboarding', () => {
  assert.equal(isOnboardingComplete(null), false);
  assert.equal(isOnboardingComplete({}), false);
  assert.equal(isOnboardingComplete({ profile: { name: 'New user', username: '' } }), false);
});

test('recognizes the explicit onboarding completion flag', () => {
  assert.equal(isOnboardingComplete({ onboardingCompleted: true }), true);
});

test('keeps legacy profiles with usernames out of onboarding', () => {
  assert.equal(isOnboardingComplete({ profile: { username: 'legacy-user' } }), true);
  assert.equal(isOnboardingComplete({ username: 'legacy-user' }), true);
});
