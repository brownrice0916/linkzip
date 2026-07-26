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
      links: [{ id: 'nested', title: '내부 링크', type: 'link', buttonTextColor: '#00ff00', customStyle: { fontSize: 18 } }],
    },
  ]);

  assert.equal(links[0].buttonColor, undefined);
  assert.equal(links[0].customStyle, undefined);
  assert.equal(links[0].links?.[0].buttonTextColor, undefined);
  assert.equal(links[0].links?.[0].customStyle, undefined);
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
  useStore.getState().addCustomLink({ id: 'second-link', title: '두 번째 링크', type: 'link' });
  useStore.getState().syncActiveProfileWorkspace();

  useStore.getState().switchProfileWorkspace('primary');
  assert.equal(useStore.getState().profile.username, 'first-profile');
  assert.deepEqual(useStore.getState().customLinks.map((link) => link.id), ['first-link']);

  useStore.getState().switchProfileWorkspace(secondId);
  assert.equal(useStore.getState().profile.username, 'second-profile');
  assert.deepEqual(useStore.getState().customLinks.map((link) => link.id), ['second-link']);
});
