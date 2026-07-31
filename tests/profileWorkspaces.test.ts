import test from 'node:test';
import assert from 'node:assert/strict';
import { resetLinkThemeOverrides, useStore } from '../src/store/useStore.ts';

test('resets link overrides recursively when applying a theme', () => {
  const links = resetLinkThemeOverrides([
    {
      id: 'collection',
      title: '컬렉션',
      type: 'collection',
      buttonColor: '#ff0000',
      customStyle: { borderRadius: 12, opacity: 50 },
      links: [
        { id: 'nested', title: '내부 링크', type: 'link', buttonTextColor: '#00ff00', customStyle: { fontSize: 18 } },
        { id: 'form', title: '정보 수집', type: 'customer_info', customerInfoConfig: { mainText: '소식 받기', submitButtonText: '제출하기', submitButtonColor: '#ff0000', submitButtonTextColor: '#ffffff' } },
      ],
    },
  ]);

  assert.equal(links[0].buttonColor, undefined);
  assert.equal(links[0].customStyle, undefined);
  assert.equal(links[0].links?.[0].buttonTextColor, undefined);
  assert.equal(links[0].links?.[0].customStyle, undefined);
  assert.equal(Object.hasOwn(links[0], 'buttonColor'), false);
  assert.equal(Object.hasOwn(links[0], 'customStyle'), false);
  assert.equal(Object.hasOwn(links[0].links?.[0] || {}, 'buttonTextColor'), false);
  assert.equal(Object.hasOwn(links[0].links?.[0] || {}, 'customStyle'), false);
  assert.equal(links[0].links?.[1].customerInfoConfig?.submitButtonText, '제출하기');
  assert.equal(Object.hasOwn(links[0].links?.[1].customerInfoConfig || {}, 'submitButtonColor'), false);
  assert.equal(Object.hasOwn(links[0].links?.[1].customerInfoConfig || {}, 'submitButtonTextColor'), false);
});

test('applies global button design over individual link overrides', () => {
  useStore.setState({
    customLinks: [{ id: 'custom-link', title: '커스텀 링크', type: 'link', buttonColor: '#ff0000', customStyle: { opacity: 40 } }],
    undoStack: [],
    redoStack: [],
  });

  useStore.getState().setDesignSettings({ buttonColor: '#0000ff', buttonOpacity: 75 });

  assert.equal(useStore.getState().buttonColor, '#0000ff');
  assert.equal(useStore.getState().buttonOpacity, 75);
  assert.equal(useStore.getState().customLinks[0].buttonColor, undefined);
  assert.equal(useStore.getState().customLinks[0].customStyle, undefined);
});

test('keeps profile content isolated when switching workspaces', () => {
  useStore.setState({
    membershipPlan: 'standard',
    profile: { name: '첫 프로필', username: 'first-profile', bio: '', avatarUrl: '' },
    profileWorkspaces: [],
    activeProfileId: 'primary',
    customLinks: [{ id: 'first-link', title: '첫 링크', type: 'link' }],
    socialLinks: [],
    isDirty: false,
    undoStack: [],
    redoStack: [],
  });

  const secondId = useStore.getState().createProfileWorkspace('두 번째', 'second-profile');
  assert.ok(secondId);
  useStore.getState().addCustomLink({ id: 'second-link', title: '두 번째 링크', type: 'link' });
  useStore.getState().syncActiveProfileWorkspace();

  useStore.getState().switchProfileWorkspace('primary');
  assert.equal(useStore.getState().profile.username, 'first-profile');
  assert.deepEqual(useStore.getState().customLinks.map((link) => link.id), ['first-link']);

  useStore.getState().switchProfileWorkspace(secondId);
  assert.equal(useStore.getState().profile.username, 'second-profile');
  assert.deepEqual(useStore.getState().customLinks.map((link) => link.id), ['second-link']);
});

test('adds new root blocks to the bottom of the list', () => {
  useStore.setState({
    customLinks: [{ id: 'first-link', title: '첫 링크', type: 'link' }],
    isDirty: false,
    undoStack: [],
    redoStack: [],
  });

  useStore.getState().addCustomLink({ id: 'second-link', title: '두 번째 링크', type: 'link' });

  assert.deepEqual(useStore.getState().customLinks.map((link) => link.id), ['first-link', 'second-link']);
});

test('blocks profile creation at the current plan limit inside the store', () => {
  useStore.setState({
    membershipPlan: 'standard',
    profile: { name: '프로필 1', username: 'profile-1', bio: '', avatarUrl: '' },
    profileWorkspaces: Array.from({ length: 3 }, (_, index) => ({
      id: index === 0 ? 'primary' : `profile-${index + 1}`,
      profile: { name: `프로필 ${index + 1}`, username: `profile-${index + 1}`, bio: '', avatarUrl: '' },
      templateType: 'preset' as const,
      templateValue: 'minimalist',
      socialLinks: [],
      customLinks: [],
      design: { buttonStyle: 'solid' as const, buttonRoundness: 'full' as const, buttonShadow: 'soft' as const, fontFamily: 'Inter' },
    })),
    activeProfileId: 'primary',
    customLinks: [],
    socialLinks: [],
    isDirty: false,
    undoStack: [],
    redoStack: [],
  });

  const createdId = useStore.getState().createProfileWorkspace('프로필 4', 'profile-4');

  assert.equal(createdId, null);
  assert.equal(useStore.getState().profileWorkspaces.length, 3);
});
