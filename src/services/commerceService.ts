import {
  collection,
  onSnapshot,
  query,
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
  paymentProvider?: 'toss';
  paymentMethod?: string;
  paidAt?: string | null;
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

export interface TossDonationOrder {
  orderNumber: string;
  amount: number;
  orderName: string;
}

export interface TossDonationConfirmation {
  orderNumber: string;
  amount: number;
  nickname: string;
  targetUsername: string;
}

const salesOrdersCollection = (ownerUid: string) => collection(db, 'users', ownerUid, 'sales_orders');
const donationsCollection = (ownerUid: string) => collection(db, 'users', ownerUid, 'donations');

export async function createSalesOrder(
  ownerUid: string,
  order: Omit<SalesOrder, 'id' | 'orderNumber' | 'buyerContactNormalized' | 'status' | 'fulfillmentStatus' | 'carrier' | 'trackingNumber' | 'createdAt'>,
): Promise<{ id: string; orderNumber: string; amount: number; orderName: string }> {
  const endpoint = import.meta.env.VITE_TOSS_ORDER_CREATE_URL
    || 'https://asia-northeast3-profilelinks-d81ec.cloudfunctions.net/createTossSalesOrder';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerUid, ...order }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.message === 'string' ? payload.message : '결제 주문을 만들지 못했습니다.');
  return {
    id: String(payload.id || ''),
    orderNumber: String(payload.orderNumber || ''),
    amount: Number(payload.amount || 0),
    orderName: String(payload.orderName || order.productName),
  };
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

export interface TossPaymentConfirmation {
  orderNumber: string;
  productName: string;
  amount: number;
  method: string;
  approvedAt: string | null;
  targetUsername: string;
}

export async function confirmTossSalesPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<TossPaymentConfirmation> {
  const endpoint = import.meta.env.VITE_TOSS_CONFIRM_URL
    || 'https://asia-northeast3-profilelinks-d81ec.cloudfunctions.net/confirmTossSalesPayment';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.message === 'string' ? payload.message : '결제를 승인하지 못했습니다.');
  return payload as TossPaymentConfirmation;
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

export async function createDonationPaymentOrder(
  ownerUid: string,
  donation: Pick<DonationRecord, 'blockId' | 'targetUsername' | 'nickname' | 'message' | 'amount'>,
): Promise<TossDonationOrder> {
  const endpoint = import.meta.env.VITE_TOSS_DONATION_CREATE_URL
    || 'https://asia-northeast3-profilelinks-d81ec.cloudfunctions.net/createTossDonationOrder';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerUid, ...donation }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.message === 'string' ? payload.message : '후원 결제 정보를 만들지 못했습니다.');
  return payload as TossDonationOrder;
}

export async function confirmTossDonationPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
): Promise<TossDonationConfirmation> {
  const endpoint = import.meta.env.VITE_TOSS_CONFIRM_URL
    || 'https://asia-northeast3-profilelinks-d81ec.cloudfunctions.net/confirmTossSalesPayment';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.message === 'string' ? payload.message : '후원 결제를 승인하지 못했습니다.');
  return payload as TossDonationConfirmation;
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
