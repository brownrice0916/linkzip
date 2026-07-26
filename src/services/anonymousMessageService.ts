import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface AnonymousMessage {
  id: string;
  blockId: string;
  targetUsername: string;
  content: string;
  isRead: boolean;
  createdAt: { seconds?: number } | null;
}

const messagesCollection = (ownerUid: string) =>
  collection(db, 'users', ownerUid, 'anonymous_messages');

export async function sendAnonymousMessage(
  ownerUid: string,
  blockId: string,
  targetUsername: string,
  content: string,
): Promise<void> {
  await addDoc(messagesCollection(ownerUid), {
    blockId,
    targetUsername,
    content: content.trim(),
    isRead: false,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToAnonymousMessages(
  ownerUid: string,
  onMessages: (messages: AnonymousMessage[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(query(messagesCollection(ownerUid)), (snapshot) => {
    const messages = snapshot.docs.map((item) => ({
      id: item.id,
      blockId: item.data().blockId || '',
      targetUsername: item.data().targetUsername || '',
      content: item.data().content || '',
      isRead: Boolean(item.data().isRead),
      createdAt: item.data().createdAt || null,
    } satisfies AnonymousMessage));
    messages.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    onMessages(messages);
  }, onError);
}

export async function markAnonymousMessageRead(ownerUid: string, id: string): Promise<void> {
  await updateDoc(doc(db, 'users', ownerUid, 'anonymous_messages', id), { isRead: true });
}

export async function deleteAnonymousMessage(ownerUid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', ownerUid, 'anonymous_messages', id));
}
