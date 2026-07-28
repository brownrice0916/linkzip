import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../lib/firebase';

interface AccountVerificationRequest {
  bankName: string;
  accountNumber: string;
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
    const message = error instanceof Error ? error.message : '';
    throw new Error(message.replace(/^Firebase:\s*/i, '') || '계좌 인증에 실패했습니다.');
  }
}
