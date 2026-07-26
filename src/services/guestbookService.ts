import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface GuestbookEntry {
  id: string;
  authorName: string;
  content: string;
  isSecret: boolean;
  likes: number;
  createdAt: { seconds?: number } | null;
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
    const entries = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as GuestbookEntry[];
    entries.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    onEntries(entries);
  }, onError);
}

export async function addGuestbookEntry(
  entry: Omit<GuestbookEntry, 'id' | 'createdAt'> & { targetUsername: string },
): Promise<void> {
  await addDoc(collection(db, 'guestbooks'), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}
