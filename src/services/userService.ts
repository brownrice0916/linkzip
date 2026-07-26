import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isValidUsername, normalizeUsername, sanitizePublicLinks } from '../domain/profileData';

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
    const publicSnapshot = await getDoc(doc(db, 'publicProfiles', indexedUid));
    return publicSnapshot.exists()
      ? { uid: publicSnapshot.id, data: publicSnapshot.data() }
      : null;
  }
  return null;
}

const toPublicProfile = (data: DocumentData, username: string) => {
  const profile = { ...(data.profile || {}), username };
  delete profile.verifiedAccount;
  if (!profile.showEmail) delete profile.email;
  delete profile.phone;

  return {
    username,
    profile,
    template: data.template || { type: 'preset', value: 'minimalist' },
    design: data.design || {},
    socialLinks: data.socialLinks || [],
    customLinks: sanitizePublicLinks(data.customLinks || []),
    updatedAt: new Date().toISOString(),
  };
};

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
    transaction.set(publicProfileRef, toPublicProfile(data, normalized));
    transaction.set(userRef, {
      ...data,
      username: normalized,
      profile: data.profile ? { ...data.profile, username: normalized } : undefined,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });
}

export async function deleteUserData(uid: string, username?: string): Promise<void> {
  const normalized = normalizeUsername(username || '');
  await Promise.all([
    deleteDoc(doc(db, 'users', uid)),
    deleteDoc(doc(db, 'publicProfiles', uid)),
    normalized ? deleteDoc(doc(db, 'usernames', normalized)) : Promise.resolve(),
  ]);
}
