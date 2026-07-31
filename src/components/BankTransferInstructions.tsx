import React, { useState } from 'react';
import { Check, Copy, Landmark, LoaderCircle } from 'lucide-react';
import { reportBankTransferDeposit, type BankTransferInstructions as Instructions } from '../services/commerceService';

interface Props {
  orderNumber: string;
  amount: number;
  instructions: Instructions;
  buyerContact: string;
  onDone?: () => void;
}

const BankTransferInstructions: React.FC<Props> = ({ orderNumber, amount, instructions, buyerContact, onDone }) => {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState('');

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    alert('복사했습니다.');
  };

  const reportDeposit = async () => {
    if (reporting || reported) return;
    setReporting(true);
    setError('');
    try {
      await reportBankTransferDeposit(orderNumber, buyerContact);
      setReported(true);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : '입금 확인 요청을 접수하지 못했습니다.');
    } finally {
      setReporting(false);
    }
  };
  return (
    <div className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-left">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950"><Landmark className="h-5 w-5" /></span>
        <div><h3 className="text-sm font-black text-gray-950">주문이 접수되었습니다</h3><p className="mt-1 text-[11px] font-semibold leading-relaxed text-gray-600">아래 계좌로 정확한 금액을 입금해주세요. 입금 후에는 반드시 아래의 <strong className="font-black text-gray-950">‘입금했어요’</strong> 버튼을 눌러야 확인 요청이 전달됩니다.</p></div>
      </div>
      <dl className="space-y-2 rounded-2xl bg-white p-4 text-xs">
        <div className="flex justify-between gap-4"><dt className="font-bold text-gray-500">은행</dt><dd className="font-black text-gray-950">{instructions.bankName}</dd></div>
        <div className="flex items-center justify-between gap-4"><dt className="font-bold text-gray-500">계좌번호</dt><dd className="flex items-center gap-1 font-black text-gray-950">{instructions.accountNumber}<button type="button" onClick={() => void copy(instructions.accountNumber)} className="cursor-pointer rounded-lg p-1 hover:bg-gray-100" aria-label="계좌번호 복사"><Copy className="h-3.5 w-3.5" /></button></dd></div>
        <div className="flex justify-between gap-4"><dt className="font-bold text-gray-500">예금주</dt><dd className="font-black text-gray-950">{instructions.accountOwnerName}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-bold text-gray-500">입금자명</dt><dd className="font-black text-gray-950">{instructions.depositorName}</dd></div>
        <div className="flex justify-between gap-4"><dt className="font-bold text-gray-500">입금액</dt><dd className="font-black text-amber-700">{amount.toLocaleString()}원</dd></div>
        <div className="flex items-center justify-between gap-4"><dt className="font-bold text-gray-500">주문번호</dt><dd className="flex items-center gap-1 font-mono text-[10px] font-bold text-gray-700">{orderNumber}<button type="button" onClick={() => void copy(orderNumber)} className="cursor-pointer rounded-lg p-1 hover:bg-gray-100" aria-label="주문번호 복사"><Copy className="h-3.5 w-3.5" /></button></dd></div>
      </dl>
      <p className="text-[10px] font-bold text-amber-800">입금 기한: {new Date(instructions.expiresAt).toLocaleString('ko-KR')}</p>
      {reported ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-center">
          <p className="text-xs font-black text-emerald-800">입금 확인 요청이 접수되었습니다</p>
          <p className="mt-1 text-[10px] font-semibold leading-relaxed text-emerald-700">관리자가 실제 입금을 확인한 뒤 파일 다운로드 또는 플랜 이용이 활성화됩니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="rounded-xl bg-amber-100 px-3 py-2 text-center text-[10px] font-black text-amber-900">입금을 마쳤다면 아래 버튼을 꼭 눌러주세요.</p>
          <button type="button" onClick={() => void reportDeposit()} disabled={reporting} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gray-950 py-3 text-xs font-black text-white disabled:cursor-wait disabled:opacity-60">
            {reporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {reporting ? '요청 접수 중...' : '입금했어요 · 확인 요청하기'}
          </button>
        </div>
      )}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[10px] font-bold text-red-600">{error}</p>}
      {onDone && <button type="button" onClick={onDone} className="w-full cursor-pointer rounded-2xl border border-gray-200 bg-white py-3 text-xs font-black text-gray-600 transition hover:bg-gray-50">{reported ? '확인' : '나중에 확인하기'}</button>}
    </div>
  );
};

export default BankTransferInstructions;
