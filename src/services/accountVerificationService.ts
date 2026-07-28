import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';

interface AccountVerificationRequest {
  bankName: string;
  accountNumber: string;
  holderName: string;
  identityNumber: string;
}

export async function verifyBankAccount(request: AccountVerificationRequest): Promise<string> {
  const functions = getFunctions(app, 'asia-northeast3');
  const callable = httpsCallable<AccountVerificationRequest, { holderName: string }>(
    functions,
    'verifyTossBankAccount',
  );

  try {
    const result = await callable(request);
    if (!result.data.holderName) throw new Error('예금주 정보를 확인할 수 없습니다.');
    return result.data.holderName;
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string };
    const code = firebaseError?.code || '';
    const rawMessage = firebaseError?.message || '';

    if (code === 'functions/unauthenticated') {
      throw new Error('로그인 상태를 확인한 뒤 다시 시도해주세요.');
    }
    if (code === 'functions/not-found' || code === 'functions/internal') {
      throw new Error('계좌 인증 서버 기능이 아직 배포되지 않았습니다. 관리자에게 문의해주세요.');
    }
    if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') {
      throw new Error('계좌 인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }

    const message = rawMessage
      .replace(/^Firebase:\s*/i, '')
      .replace(/^Error:\s*/i, '')
      .replace(/^\[functions\/[^\]]+\]\s*/i, '')
      .trim();
    throw new Error(message && message.toLowerCase() !== 'internal'
      ? message
      : '계좌 인증에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}
