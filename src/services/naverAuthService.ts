import { signInWithCustomToken, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';

const NAVER_COMPLETE_PATH = '/auth/naver/complete';

export function startNaverLogin(): void {
  const returnTo = `${window.location.origin}${NAVER_COMPLETE_PATH}`;
  // Keep the OAuth start and callback on the same canonical host so the state
  // cookie is available after the provider redirects back.
  const authOrigin = 'https://linkzip.kr';
  // Replace the current document instead of adding another browser-history
  // entry. This keeps mobile OAuth in one navigation chain and prevents the
  // stale landing page from resurfacing like a second tab after login.
  window.location.replace(`${authOrigin}/auth/naver/start?returnTo=${encodeURIComponent(returnTo)}`);
}

export async function finishNaverLogin(hash: string): Promise<void> {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('custom_token');
  const error = params.get('error');
  window.history.replaceState(null, '', NAVER_COMPLETE_PATH);

  if (error || !token) {
    throw new Error(error === 'authorization_cancelled'
      ? '네이버 로그인이 취소되었습니다.'
      : '네이버 로그인 정보를 확인하지 못했습니다. 다시 시도해주세요.');
  }

  const credential = await signInWithCustomToken(auth, token);
  const tokenResult = await credential.user.getIdTokenResult();
  const naverDisplayName = typeof tokenResult.claims.naverDisplayName === 'string'
    ? tokenResult.claims.naverDisplayName.trim()
    : '';

  if (naverDisplayName && credential.user.displayName !== naverDisplayName) {
    await updateProfile(credential.user, { displayName: naverDisplayName });
  }
}
