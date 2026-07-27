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
  postalCode: string;
  orderNumber: string;
  buyerContactNormalized: string;
  status: 'pending' | 'paid' | 'cancelled';
  fulfillmentStatus: 'payment_pending' | 'preparing' | 'shipping' | 'delivered';
  carrier: string;
  trackingNumber: string;
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
  order: Omit<SalesOrder, 'id' | 'orderNumber' | 'buyerContactNormalized' | 'status' | 'fulfillmentStatus' | 'carrier' | 'trackingNumber' | 'createdAt'>,
): Promise<{ id: string; orderNumber: string }> {
  const orderNumber = createOrderNumber();
  const result = await addDoc(salesOrdersCollection(ownerUid), {
    ...order,
    orderNumber,
    buyerContactNormalized: normalizePhone(order.buyerContact),
    status: 'pending',
    fulfillmentStatus: 'payment_pending',
    carrier: '',
    trackingNumber: '',
    createdAt: serverTimestamp(),
  });
  return { id: result.id, orderNumber };
}

export interface PublicOrderLookupResult {
  orderNumber: string;
  productName: string;
  amount: number;
  status: SalesOrder['status'];
  fulfillmentStatus: SalesOrder['fulfillmentStatus'];
  carrier: string;
  trackingNumber: string;
  createdAt: string | null;
}

const normalizePhone = (value: string) => value.replace(/\D/g, '');

const createOrderNumber = () => {
  const today = new Date();
  const date = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(6, '0').slice(-6);
  return `LZ-${date}-${random}`;
};

export async function lookupSalesOrders(ownerUid: string, lookupValue: string): Promise<PublicOrderLookupResult[]> {
  const endpoint = import.meta.env.VITE_ORDER_LOOKUP_URL
    || 'https://asia-northeast3-profilelinks-d81ec.cloudfunctions.net/lookupSalesOrder';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerUid, lookupValue: lookupValue.trim() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.message === 'string' ? payload.message : '주문 정보를 조회하지 못했습니다.');
  return Array.isArray(payload?.orders) ? payload.orders : [];
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
  await updateDoc(doc(db, 'users', ownerUid, 'sales_orders', orderId), {
    status,
    ...(status === 'paid' ? { fulfillmentStatus: 'preparing' } : {}),
  });
}

export async function updateSalesOrderFulfillment(
  ownerUid: string,
  orderId: string,
  updates: Pick<SalesOrder, 'fulfillmentStatus' | 'carrier' | 'trackingNumber'>,
): Promise<void> {
  await updateDoc(doc(db, 'users', ownerUid, 'sales_orders', orderId), updates);
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
