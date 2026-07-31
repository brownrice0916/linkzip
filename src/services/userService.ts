import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isValidUsername, normalizeUsername, sanitizePublicLinks } from '../domain/profileData';
import { resolveActiveMembershipPlan, validateWorkspacesForPlan } from '../domain/membershipPlans';
import type { CustomLink, ProfileWorkspace, VerifiedAccountInfo } from '../store/useStore';

export interface ResolvedUser {
  uid: string;
  data: DocumentData;
}

const PUBLIC_PROFILE_CACHE_PREFIX = 'linkzip:public-profile:v2:';
const PUBLIC_PROFILE_CACHE_TTL = 10 * 60 * 1000;
const pendingPublicProfiles = new Map<string, Promise<ResolvedUser | null>>();

export const getCachedPublicProfile = (username: string): ResolvedUser | null => {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized) || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${PUBLIC_PROFILE_CACHE_PREFIX}${normalized}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { savedAt?: number; value?: ResolvedUser };
    if (!cached.savedAt || Date.now() - cached.savedAt > PUBLIC_PROFILE_CACHE_TTL || !cached.value?.uid) {
      sessionStorage.removeItem(`${PUBLIC_PROFILE_CACHE_PREFIX}${normalized}`);
      return null;
    }
    return cached.value;
  } catch {
    return null;
  }
};

const cachePublicProfile = (username: string, value: ResolvedUser | null) => {
  if (!value || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      `${PUBLIC_PROFILE_CACHE_PREFIX}${normalizeUsername(username)}`,
      JSON.stringify({ savedAt: Date.now(), value }),
    );
  } catch {
    // Storage can be unavailable in privacy mode. Network loading still works.
  }
};

export async function getUserByUid(uid: string): Promise<ResolvedUser | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? { uid: snapshot.id, data: snapshot.data() } : null;
}

export async function resolveUserByUsername(username: string): Promise<ResolvedUser | null> {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) return null;

  const existingRequest = pendingPublicProfiles.get(normalized);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const usernameSnapshot = await getDoc(doc(db, 'usernames', normalized));
    const indexedUid = usernameSnapshot.data()?.uid;
    if (usernameSnapshot.exists() && typeof indexedUid === 'string') {
      const publicProfileId = usernameSnapshot.data()?.publicProfileId;
      const publicSnapshot = await getDoc(doc(db, 'publicProfiles', typeof publicProfileId === 'string' ? publicProfileId : indexedUid));
      const resolved = publicSnapshot.exists() && publicSnapshot.data()?.planPaused !== true
        ? { uid: indexedUid, data: publicSnapshot.data() }
        : null;
      cachePublicProfile(normalized, resolved);
      return resolved;
    }
    return null;
  })();

  pendingPublicProfiles.set(normalized, request);
  try {
    return await request;
  } finally {
    pendingPublicProfiles.delete(normalized);
  }
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

const removeLegacyAccountIdentifiers = (workspace: ProfileWorkspace): ProfileWorkspace => {
  const cleanLinks = (links: CustomLink[]): CustomLink[] => links.map((link) => {
    const donationConfig = link.donationConfig ? {...link.donationConfig} : undefined;
    if (donationConfig) delete donationConfig.idNumber;
    return {
      ...link,
      ...(donationConfig ? {donationConfig} : {}),
      ...(link.links ? {links: cleanLinks(link.links)} : {}),
    };
  });
  const verifiedAccount = workspace.profile.verifiedAccount
    ? {...workspace.profile.verifiedAccount} as VerifiedAccountInfo & {idNumber?: string}
    : undefined;
  if (verifiedAccount) delete verifiedAccount.idNumber;
  return {
    ...workspace,
    profile: {
      ...workspace.profile,
      ...(verifiedAccount ? {verifiedAccount} : {}),
    },
    customLinks: cleanLinks(workspace.customLinks),
  };
};

export async function saveUserProfilesData(
  uid: string,
  workspaces: ProfileWorkspace[],
  activeProfileId: string,
  globalData: DocumentData = {},
): Promise<void> {
  if (workspaces.length === 0) throw new Error('저장할 프로필이 없습니다.');

  const normalizedWorkspaces = workspaces.map((workspace) => {
    const sanitizedWorkspace = removeLegacyAccountIdentifiers(workspace);
    return {
      ...sanitizedWorkspace,
      profile: {
        ...sanitizedWorkspace.profile,
        username: normalizeUsername(sanitizedWorkspace.profile.username),
      },
    };
  });
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
    const activePlan = resolveActiveMembershipPlan(
      currentUser.data()?.membershipPlan,
      currentUser.data()?.membershipPeriodEndsAt,
      Date.now(),
      currentUser.data()?.membershipGrant,
    );
    const previousWorkspaces = Array.isArray(currentUser.data()?.profileWorkspaces)
      ? currentUser.data()?.profileWorkspaces as ProfileWorkspace[]
      : [];
    const entitlementError = validateWorkspacesForPlan(normalizedWorkspaces, activePlan, previousWorkspaces);
    if (entitlementError) throw new Error(entitlementError);
    const previousUsernames = previousWorkspaces
      .map((workspace) => normalizeUsername(workspace.profile?.username || ''))
      .filter(Boolean);
    const allUsernames = Array.from(new Set([...usernames, ...previousUsernames]));
    const usernameSnapshots = await Promise.all(
      allUsernames.map((username) => transaction.get(doc(db, 'usernames', username))),
    );
    const publicProfileSnapshots = await Promise.all(
      normalizedWorkspaces.map((workspace) => transaction.get(doc(db, 'publicProfiles', `${uid}_${workspace.id}`))),
    );
    const legacyPublicProfile = await transaction.get(doc(db, 'publicProfiles', uid));

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

    normalizedWorkspaces.forEach((workspace, workspaceIndex) => {
      const publicProfileId = `${uid}_${workspace.id}`;
      const existingPublicProfile = publicProfileSnapshots[workspaceIndex]?.data();
      transaction.set(doc(db, 'usernames', workspace.profile.username), {
        uid,
        profileId: workspace.id,
        publicProfileId,
        updatedAt: new Date().toISOString(),
      });
      // planPaused and forceWatermark are plan enforcement the server owns: the
      // rules reject them outright on create and only allow an update that
      // leaves them untouched. This write is not a merge, so carry the stored
      // values through rather than restating them from the local plan — a new
      // profile gets them from the publicProfiles create trigger instead.
      const planEnforcement = existingPublicProfile
        ? {
          ...(existingPublicProfile.planPaused === true ? {planPaused: true} : {}),
          ...(existingPublicProfile.forceWatermark === true ? {forceWatermark: true} : {}),
        }
        : {};
      transaction.set(
        doc(db, 'publicProfiles', publicProfileId),
        {
          ...toPublicProfile(workspaceToDocumentData(workspace), workspace.profile.username, uid),
          ...planEnforcement,
          membershipPlan: activePlan,
        },
      );
    });

    // Migrate the original single-profile document only after its workspace
    // replacement is part of the same successful transaction. Once migrated,
    // later saves merely verify that the legacy document remains absent.
    if (legacyPublicProfile.exists()) {
      transaction.delete(doc(db, 'publicProfiles', uid));
    }

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
