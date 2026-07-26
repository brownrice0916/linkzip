import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  setDoc,
  type Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AnalyticsDailyItem } from '../store/useStore';
import { shouldRecordAnalytics } from '../domain/analytics';

const localDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export async function recordPageView(ownerUid: string): Promise<void> {
  if (!shouldRecordAnalytics()) return;
  const date = localDateKey();
  await Promise.all([
    setDoc(doc(db, 'analytics', ownerUid), { pageViews: increment(1) }, { merge: true }),
    setDoc(doc(db, 'analytics', ownerUid, 'daily', date), {
      date,
      views: increment(1),
      clicks: increment(0),
    }, { merge: true }),
  ]);
}

export async function recordPublicLinkClick(ownerUid: string, linkId: string): Promise<void> {
  if (!shouldRecordAnalytics()) return;
  const date = localDateKey();
  await Promise.all([
    setDoc(doc(db, 'analytics', ownerUid, 'links', linkId), {
      linkId,
      clicks: increment(1),
      updatedAt: new Date().toISOString(),
    }, { merge: true }),
    setDoc(doc(db, 'analytics', ownerUid, 'daily', date), {
      date,
      views: increment(0),
      clicks: increment(1),
    }, { merge: true }),
  ]);
}

export async function getAnalytics(ownerUid: string): Promise<{
  pageViews: number;
  daily: AnalyticsDailyItem[];
  linkClicks: Record<string, number>;
}> {
  const [userSnapshot, dailySnapshot, linksSnapshot] = await Promise.all([
    getDoc(doc(db, 'analytics', ownerUid)),
    getDocs(collection(db, 'analytics', ownerUid, 'daily')),
    getDocs(collection(db, 'analytics', ownerUid, 'links')),
  ]);

  const daily = dailySnapshot.docs
    .map((item) => item.data() as AnalyticsDailyItem)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);
  const linkClicks = Object.fromEntries(
    linksSnapshot.docs.map((item) => [item.id, Number(item.data().clicks || 0)]),
  );

  return {
    pageViews: Number(userSnapshot.data()?.pageViews || 0),
    daily,
    linkClicks,
  };
}

export function subscribeToAnalytics(
  ownerUid: string,
  onAnalytics: (analytics: {
    pageViews: number;
    daily: AnalyticsDailyItem[];
    linkClicks: Record<string, number>;
  }) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let pageViews = 0;
  let daily: AnalyticsDailyItem[] = [];
  let linkClicks: Record<string, number> = {};

  const emit = () => onAnalytics({ pageViews, daily, linkClicks });
  const handleError = (error: Error) => onError?.(error);

  const unsubscribers = [
    onSnapshot(doc(db, 'analytics', ownerUid), (snapshot) => {
      pageViews = Number(snapshot.data()?.pageViews || 0);
      emit();
    }, handleError),
    onSnapshot(collection(db, 'analytics', ownerUid, 'daily'), (snapshot) => {
      daily = snapshot.docs
        .map((item) => item.data() as AnalyticsDailyItem)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7);
      emit();
    }, handleError),
    onSnapshot(collection(db, 'analytics', ownerUid, 'links'), (snapshot) => {
      linkClicks = Object.fromEntries(
        snapshot.docs.map((item) => [item.id, Number(item.data().clicks || 0)]),
      );
      emit();
    }, handleError),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

export async function resetAnalyticsData(ownerUid: string): Promise<void> {
  const [dailySnapshot, linksSnapshot] = await Promise.all([
    getDocs(collection(db, 'analytics', ownerUid, 'daily')),
    getDocs(collection(db, 'analytics', ownerUid, 'links')),
  ]);
  const batch = writeBatch(db);
  batch.set(doc(db, 'analytics', ownerUid), { pageViews: 0 }, { merge: true });
  dailySnapshot.docs.forEach((item) => batch.delete(item.ref));
  linksSnapshot.docs.forEach((item) => batch.delete(item.ref));
  await batch.commit();
}
