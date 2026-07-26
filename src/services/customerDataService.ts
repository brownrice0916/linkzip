import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CollectedCustomerData } from '../store/useStore';

const customerCollection = (ownerUid: string) =>
  collection(db, 'users', ownerUid, 'collected_customer_data');

export async function submitCustomerData(
  ownerUid: string,
  data: Omit<CollectedCustomerData, 'id'>,
): Promise<void> {
  await addDoc(customerCollection(ownerUid), data);
}

export async function listCustomerData(ownerUid: string): Promise<CollectedCustomerData[]> {
  const snapshot = await getDocs(customerCollection(ownerUid));
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as CollectedCustomerData[];
}

export async function removeCustomerData(ownerUid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', ownerUid, 'collected_customer_data', id));
}
