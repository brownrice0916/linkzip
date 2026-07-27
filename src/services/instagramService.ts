import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import type { DMAutomationRule } from '../store/useStore';

const functions = getFunctions(app, 'asia-northeast3');

export interface InstagramConnectionStatus {
  connected: boolean;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  tokenExpiresAt?: string | null;
  rules?: DMAutomationRule[];
}

export async function startInstagramConnection(): Promise<void> {
  const callable = httpsCallable<undefined, { authorizationUrl: string }>(
    functions,
    'startInstagramOAuth',
  );
  const result = await callable();
  if (!result.data.authorizationUrl.startsWith('https://www.instagram.com/')) {
    throw new Error('안전하지 않은 인스타그램 로그인 주소입니다.');
  }
  window.location.assign(result.data.authorizationUrl);
}

export async function getInstagramConnection(): Promise<InstagramConnectionStatus> {
  const callable = httpsCallable<undefined, InstagramConnectionStatus>(
    functions,
    'getInstagramConnectionStatus',
  );
  return (await callable()).data;
}

export async function disconnectInstagramConnection(): Promise<void> {
  const callable = httpsCallable<undefined, { disconnected: boolean }>(
    functions,
    'disconnectInstagram',
  );
  await callable();
}

export async function saveInstagramRules(rules: DMAutomationRule[]): Promise<void> {
  const callable = httpsCallable<
    { rules: DMAutomationRule[] },
    { saved: boolean; count: number }
  >(functions, 'saveInstagramAutomationRules');
  await callable({ rules });
}
