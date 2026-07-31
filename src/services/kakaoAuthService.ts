import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../lib/firebase';

const KAKAO_COMPLETE_PATH = '/auth/kakao/complete';

export function startKakaoLogin(): void {
  const returnTo = `${window.location.origin}${KAKAO_COMPLETE_PATH}`;
  // OAuth cookies must be created on the same canonical host used by the
  // registered callback. Starting on www would otherwise scope the cookie to
  // www while Kakao returns to the apex domain.
  const authOrigin = 'https://linkzip.kr';
  // Keep the provider round trip in the current navigation chain on mobile.
  window.location.replace(`${authOrigin}/auth/kakao/start?returnTo=${encodeURIComponent(returnTo)}`);
}

export async function finishKakaoLogin(hash: string): Promise<void> {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('custom_token');
  const error = params.get('error');
  window.history.replaceState(null, '', KAKAO_COMPLETE_PATH);

  if (error || !token) {
    throw new Error(error === 'authorization_cancelled'
      ? '카카오 로그인이 취소되었습니다.'
      : '카카오 로그인 정보를 확인하지 못했습니다. 다시 시도해주세요.');
  }

  await signInWithCustomToken(auth, token);
}
