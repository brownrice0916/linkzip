import test from 'node:test';
import assert from 'node:assert/strict';
import { useStore } from '../src/store/useStore.ts';

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
