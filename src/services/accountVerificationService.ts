interface AccountVerificationRequest {
  bankName: string;
  accountNumber: string;
  identityNumber: string;
}

export async function verifyBankAccount(request: AccountVerificationRequest): Promise<string> {
  const endpoint = import.meta.env.VITE_ACCOUNT_VERIFICATION_ENDPOINT;
  if (!endpoint) {
    throw new Error('계좌 인증 서버가 설정되지 않았습니다.');
  }
  const endpointUrl = new URL(endpoint);
  if (endpointUrl.protocol !== 'https:' && endpointUrl.hostname !== 'localhost') {
    throw new Error('계좌 인증 서버는 HTTPS를 사용해야 합니다.');
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error('계좌 인증에 실패했습니다.');

  const data = await response.json() as { holderName?: string };
  if (!data.holderName) throw new Error('예금주 정보를 확인할 수 없습니다.');
  return data.holderName;
}
