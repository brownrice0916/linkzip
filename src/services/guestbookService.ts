import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface GuestbookEntry {
  id: string;
  targetUsername: string;
  targetOwnerUid: string;
  authorName: string;
  authorUid: string | null;
  content: string;
  isSecret: boolean;
  likes: number;
  isHidden: boolean;
  hasEditPassword: boolean;
  editChallengeId?: string;
  createdAt: { seconds?: number } | null;
  updatedAt?: { seconds?: number } | null;
}

export interface GuestbookReply {
  id: string;
  entryId: string;
  targetUsername: string;
  authorUid: string | null;
  authorPhotoUrl: string | null;
  authorName: string;
  content: string;
  createdAt: { seconds?: number } | null;
}

export interface GuestbookEntryDraft {
  targetUsername: string;
  targetOwnerUid: string;
  authorName: string;
  authorUid: string | null;
  content: string;
  isSecret: boolean;
  likes: number;
}

export interface GuestbookEntryChanges {
  authorName: string;
  content: string;
  isSecret: boolean;
}

async function hashGuestbookPassword(entryId: string, password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${entryId}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function subscribeToGuestbook(
  targetUsername: string,
  onEntries: (entries: GuestbookEntry[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const entriesQuery = query(
    collection(db, 'guestbooks'),
    where('targetUsername', '==', targetUsername),
  );

  return onSnapshot(entriesQuery, (snapshot) => {
    const entries = snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        targetUsername: data.targetUsername || targetUsername,
        targetOwnerUid: data.targetOwnerUid || '',
        authorName: data.authorName || '익명',
        authorUid: data.authorUid || null,
        content: data.content || '',
        isSecret: Boolean(data.isSecret),
        likes: Number(data.likes || 0),
        isHidden: Boolean(data.isHidden),
        hasEditPassword: Boolean(data.hasEditPassword),
        editChallengeId: data.editChallengeId,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      } satisfies GuestbookEntry;
    });
    entries.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    onEntries(entries);
  }, onError);
}

export async function addGuestbookEntry(entry: GuestbookEntryDraft, editPassword?: string): Promise<string> {
  const entryRef = doc(collection(db, 'guestbooks'));
  const hasEditPassword = !entry.authorUid && Boolean(editPassword);
  const batch = writeBatch(db);

  batch.set(entryRef, {
    ...entry,
    isHidden: false,
    hasEditPassword,
    createdAt: serverTimestamp(),
  });

  if (hasEditPassword && editPassword) {
    batch.set(doc(db, 'guestbookSecrets', entryRef.id), {
      targetUsername: entry.targetUsername,
      passwordHash: await hashGuestbookPassword(entryRef.id, editPassword),
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return entryRef.id;
}

export async function updateGuestbookEntryAsUser(entryId: string, changes: GuestbookEntryChanges): Promise<void> {
  await updateDoc(doc(db, 'guestbooks', entryId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function updateGuestbookEntryWithPassword(
  entryId: string,
  targetUsername: string,
  password: string,
  changes: GuestbookEntryChanges,
): Promise<void> {
  const challengeRef = doc(collection(db, 'guestbookEditChallenges'));
  const batch = writeBatch(db);
  batch.set(challengeRef, {
    entryId,
    targetUsername,
    passwordHash: await hashGuestbookPassword(entryId, password),
    ...changes,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, 'guestbooks', entryId), {
    ...changes,
    editChallengeId: challengeRef.id,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function setGuestbookEntryHidden(entryId: string, isHidden: boolean): Promise<void> {
  await updateDoc(doc(db, 'guestbooks', entryId), {
    isHidden,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGuestbookEntry(entryId: string, replyIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'guestbooks', entryId));
  batch.delete(doc(db, 'guestbookSecrets', entryId));
  replyIds.forEach((replyId) => batch.delete(doc(db, 'guestbookReplies', replyId)));
  await batch.commit();
}

export function subscribeToGuestbookReplies(
  targetUsername: string,
  onReplies: (replies: GuestbookReply[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const repliesQuery = query(
    collection(db, 'guestbookReplies'),
    where('targetUsername', '==', targetUsername),
  );

  return onSnapshot(repliesQuery, (snapshot) => {
    const replies = snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        entryId: data.entryId,
        targetUsername: data.targetUsername,
        authorUid: data.authorUid || null,
        authorPhotoUrl: data.authorPhotoUrl || null,
        authorName: data.authorName || '익명',
        content: data.content || '',
        createdAt: data.createdAt || null,
      } satisfies GuestbookReply;
    });
    replies.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    onReplies(replies);
  }, onError);
}

export async function addGuestbookReply(
  reply: Omit<GuestbookReply, 'id' | 'createdAt'>,
): Promise<void> {
  await addDoc(collection(db, 'guestbookReplies'), {
    ...reply,
    createdAt: serverTimestamp(),
  });
}

export async function deleteGuestbookReply(replyId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'guestbookReplies', replyId));
  await batch.commit();
}
