import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import type { CollectedCustomerData } from '../store/useStore';

export async function submitCustomerData(
  ownerUid: string,
  data: Omit<CollectedCustomerData, 'id'>,
): Promise<void> {
  const callable = httpsCallable<
    { ownerUid: string; data: Omit<CollectedCustomerData, 'id'> },
    { submitted: boolean }
  >(getFunctions(app, 'asia-northeast3'), 'submitCustomerData');
  await callable({ ownerUid, data });
}

export async function listCustomerData(ownerUid: string): Promise<CollectedCustomerData[]> {
  void ownerUid;
  const callable = httpsCallable<undefined, { records: CollectedCustomerData[] }>(
    getFunctions(app, 'asia-northeast3'),
    'listCustomerData',
  );
  return (await callable()).data.records;
}

export async function removeCustomerData(ownerUid: string, id: string): Promise<void> {
  void ownerUid;
  const callable = httpsCallable<{ id: string }, { removed: boolean }>(
    getFunctions(app, 'asia-northeast3'),
    'removeCustomerData',
  );
  await callable({ id });
}
