import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';

export async function deleteMyAccount(): Promise<void> {
  const callable = httpsCallable<undefined, { deleted: boolean }>(
    getFunctions(app, 'asia-northeast3'),
    'deleteMyAccount',
  );
  await callable();
}
