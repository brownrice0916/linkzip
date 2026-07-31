import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';
import type { DMAutomationRule } from '../store/useStore';

const functions = getFunctions(app, 'asia-northeast3');

export interface InstagramConnectionStatus {
  connected: boolean;
  planLocked?: boolean;
  plan?: 'basic' | 'standard' | 'premium';
  monthlyUsage?: number;
  monthlyLimit?: number | null;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  tokenExpiresAt?: string | null;
  rules?: DMAutomationRule[];
  grantedScopes?: string[];
  subscribedFields?: string[];
  missingScopes?: string[];
  missingWebhookFields?: string[];
  diagnosticError?: string;
}

export interface InstagramMediaItem {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  permalink: string;
  timestamp: string;
}

export async function startInstagramConnection(): Promise<void> {
  const callable = httpsCallable<{ returnOrigin: string }, { authorizationUrl: string }>(
    functions,
    'startInstagramOAuth',
  );
  // Instagram always redirects to the production callback -- the Meta console
  // pins that URI -- so the callback needs to be told where to send the browser
  // once it is done. Anything but linkzip.kr or a loopback address is ignored
  // server-side.
  const result = await callable({ returnOrigin: window.location.origin });
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

export async function listInstagramMedia(): Promise<InstagramMediaItem[]> {
  const callable = httpsCallable<undefined, { media: InstagramMediaItem[] }>(
    functions,
    'listInstagramMedia',
  );
  return (await callable()).data.media;
}
