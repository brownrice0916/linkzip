import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SalesOrder {
  id: string;
  blockId: string;
  targetUsername: string;
  productId: string;
  productName: string;
  amount: number;
  salesType: 'digital_file' | 'product';
  buyerName: string;
  buyerContact: string;
  buyerEmail: string;
  shippingAddress: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: { seconds?: number } | null;
}

export interface DonationRecord {
  id: string;
  blockId: string;
  targetUsername: string;
  nickname: string;
  message: string;
  amount: number;
  paymentId: string;
  createdAt: { seconds?: number } | null;
}

const salesOrdersCollection = (ownerUid: string) => collection(db, 'users', ownerUid, 'sales_orders');
const donationsCollection = (ownerUid: string) => collection(db, 'users', ownerUid, 'donations');

export async function createSalesOrder(
  ownerUid: string,
  order: Omit<SalesOrder, 'id' | 'status' | 'createdAt'>,
): Promise<void> {
  await addDoc(salesOrdersCollection(ownerUid), {
    ...order,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export function subscribeToSalesOrders(
  ownerUid: string,
  onOrders: (orders: SalesOrder[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(query(salesOrdersCollection(ownerUid)), (snapshot) => {
    const orders = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as SalesOrder[];
    orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    onOrders(orders);
  }, onError);
}

export async function updateSalesOrderStatus(
  ownerUid: string,
  orderId: string,
  status: SalesOrder['status'],
): Promise<void> {
  await updateDoc(doc(db, 'users', ownerUid, 'sales_orders', orderId), { status });
}

export async function recordDonation(
  ownerUid: string,
  donation: Omit<DonationRecord, 'id' | 'createdAt'>,
): Promise<void> {
  await addDoc(donationsCollection(ownerUid), {
    ...donation,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToPublicDonations(
  ownerUid: string,
  blockId: string,
  onDonations: (donations: DonationRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const donationsQuery = query(donationsCollection(ownerUid), where('blockId', '==', blockId));
  return onSnapshot(donationsQuery, (snapshot) => {
    const donations = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as DonationRecord[];
    donations.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    onDonations(donations);
  }, onError);
}
