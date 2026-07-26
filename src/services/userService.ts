import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isValidUsername, normalizeUsername, sanitizePublicLinks } from '../domain/profileData';
import type { ProfileWorkspace } from '../store/useStore';

export interface ResolvedUser {
  uid: string;
  data: DocumentData;
}

export async function getUserByUid(uid: string): Promise<ResolvedUser | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? { uid: snapshot.id, data: snapshot.data() } : null;
}

export async function resolveUserByUsername(username: string): Promise<ResolvedUser | null> {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) return null;

  const usernameSnapshot = await getDoc(doc(db, 'usernames', normalized));
  const indexedUid = usernameSnapshot.data()?.uid;
  if (usernameSnapshot.exists() && typeof indexedUid === 'string') {
    const publicProfileId = usernameSnapshot.data()?.publicProfileId;
    const publicSnapshot = await getDoc(doc(db, 'publicProfiles', typeof publicProfileId === 'string' ? publicProfileId : indexedUid));
    return publicSnapshot.exists()
      ? { uid: indexedUid, data: publicSnapshot.data() }
      : null;
  }
  return null;
}

const toPublicProfile = (data: DocumentData, username: string, ownerUid: string) => {
  const profile = { ...(data.profile || {}), username };
  delete profile.verifiedAccount;
  if (!profile.showEmail) delete profile.email;
  delete profile.phone;

  return {
    ownerUid,
    username,
    profile,
    template: data.template || { type: 'preset', value: 'minimalist' },
    design: data.design || {},
    socialLinks: data.socialLinks || [],
    customLinks: sanitizePublicLinks(data.customLinks || []),
    updatedAt: new Date().toISOString(),
  };
};

const workspaceToDocumentData = (workspace: ProfileWorkspace) => ({
  profile: workspace.profile,
  template: { type: workspace.templateType, value: workspace.templateValue },
  design: workspace.design,
  socialLinks: workspace.socialLinks,
  customLinks: workspace.customLinks,
});

export async function saveUserProfilesData(
  uid: string,
  workspaces: ProfileWorkspace[],
  activeProfileId: string,
  globalData: DocumentData = {},
): Promise<void> {
  if (workspaces.length === 0) throw new Error('저장할 프로필이 없습니다.');

  const normalizedWorkspaces = workspaces.map((workspace) => ({
    ...workspace,
    profile: { ...workspace.profile, username: normalizeUsername(workspace.profile.username) },
  }));
  const usernames = normalizedWorkspaces.map((workspace) => workspace.profile.username);
  if (usernames.some((username) => !isValidUsername(username))) {
    throw new Error('사용자명은 3~30자의 문자, 숫자, 마침표, 밑줄, 하이픈만 사용할 수 있습니다.');
  }
  if (new Set(usernames).size !== usernames.length) {
    throw new Error('프로필마다 서로 다른 사용자명을 사용해 주세요.');
  }

  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (transaction) => {
    const currentUser = await transaction.get(userRef);
    const previousWorkspaces = Array.isArray(currentUser.data()?.profileWorkspaces)
      ? currentUser.data()?.profileWorkspaces as ProfileWorkspace[]
      : [];
    const previousUsernames = previousWorkspaces
      .map((workspace) => normalizeUsername(workspace.profile?.username || ''))
      .filter(Boolean);
    const allUsernames = Array.from(new Set([...usernames, ...previousUsernames]));
    const usernameSnapshots = await Promise.all(
      allUsernames.map((username) => transaction.get(doc(db, 'usernames', username))),
    );

    usernames.forEach((username) => {
      const index = allUsernames.indexOf(username);
      const owner = usernameSnapshots[index]?.data();
      if (usernameSnapshots[index]?.exists() && (owner?.uid !== uid || (owner?.profileId && !normalizedWorkspaces.some((workspace) => workspace.id === owner.profileId && workspace.profile.username === username)))) {
        throw new Error(`이미 사용 중인 사용자명입니다: ${username}`);
      }
    });

    previousUsernames.forEach((username) => {
      if (usernames.includes(username)) return;
      const index = allUsernames.indexOf(username);
      if (usernameSnapshots[index]?.data()?.uid === uid) transaction.delete(doc(db, 'usernames', username));
    });

    previousWorkspaces.forEach((workspace) => {
      if (!normalizedWorkspaces.some((current) => current.id === workspace.id)) {
        transaction.delete(doc(db, 'publicProfiles', `${uid}_${workspace.id}`));
      }
    });

    normalizedWorkspaces.forEach((workspace) => {
      const publicProfileId = `${uid}_${workspace.id}`;
      transaction.set(doc(db, 'usernames', workspace.profile.username), {
        uid,
        profileId: workspace.id,
        publicProfileId,
        updatedAt: new Date().toISOString(),
      });
      transaction.set(
        doc(db, 'publicProfiles', publicProfileId),
        toPublicProfile(workspaceToDocumentData(workspace), workspace.profile.username, uid),
      );
    });

    transaction.delete(doc(db, 'publicProfiles', uid));

    const activeWorkspace = normalizedWorkspaces.find((workspace) => workspace.id === activeProfileId) || normalizedWorkspaces[0];
    const activeData = workspaceToDocumentData(activeWorkspace);
    transaction.set(userRef, {
      ...globalData,
      ...activeData,
      username: activeWorkspace.profile.username,
      profileWorkspaces: normalizedWorkspaces,
      activeProfileId: activeWorkspace.id,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });
}

export async function saveUserData(
  uid: string,
  username: string,
  data: DocumentData,
): Promise<void> {
  const normalized = normalizeUsername(username || uid);
  if (!isValidUsername(normalized)) {
    throw new Error('사용자명은 3~30자의 문자, 숫자, 마침표, 밑줄, 하이픈만 사용할 수 있습니다.');
  }

  const userRef = doc(db, 'users', uid);
  const usernameRef = doc(db, 'usernames', normalized);
  const publicProfileRef = doc(db, 'publicProfiles', uid);

  await runTransaction(db, async (transaction) => {
    const [currentUser, usernameOwner] = await Promise.all([
      transaction.get(userRef),
      transaction.get(usernameRef),
    ]);

    const ownerUid = usernameOwner.data()?.uid;
    if (usernameOwner.exists() && ownerUid !== uid) {
      throw new Error('이미 사용 중인 사용자명입니다.');
    }

    const previousUsername = normalizeUsername(currentUser.data()?.username || '');
    if (previousUsername && previousUsername !== normalized) {
      const previousUsernameRef = doc(db, 'usernames', previousUsername);
      const previousUsernameOwner = await transaction.get(previousUsernameRef);
      if (previousUsernameOwner.data()?.uid === uid) {
        transaction.delete(previousUsernameRef);
      }
    }

    transaction.set(usernameRef, { uid, updatedAt: new Date().toISOString() });
    transaction.set(publicProfileRef, toPublicProfile(data, normalized, uid));
    transaction.set(userRef, {
      ...data,
      username: normalized,
      profile: data.profile ? { ...data.profile, username: normalized } : undefined,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });
}

export async function deleteUserData(uid: string, username?: string): Promise<void> {
  const userSnapshot = await getDoc(doc(db, 'users', uid));
  const workspaces = Array.isArray(userSnapshot.data()?.profileWorkspaces)
    ? userSnapshot.data()?.profileWorkspaces as ProfileWorkspace[]
    : [];
  const usernames = Array.from(new Set([
    normalizeUsername(username || ''),
    ...workspaces.map((workspace) => normalizeUsername(workspace.profile?.username || '')),
  ].filter(Boolean)));
  await Promise.all([
    deleteDoc(doc(db, 'users', uid)),
    deleteDoc(doc(db, 'publicProfiles', uid)),
    ...usernames.map((profileUsername) => deleteDoc(doc(db, 'usernames', profileUsername))),
    ...workspaces.map((workspace) => deleteDoc(doc(db, 'publicProfiles', `${uid}_${workspace.id}`))),
  ]);
}
