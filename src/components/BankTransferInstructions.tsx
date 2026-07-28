import React from 'react';
import { Check, Copy, Landmark } from 'lucide-react';
import type { BankTransferInstructions as Instructions } from '../services/commerceService';

interface Props {
  orderNumber: string;
  amount: number;
  instructions: Instructions;
  onDone?: () => void;
}

const BankTransferInstructions: React.FC<Props> = ({ orderNumber, amount, instructions, onDone }) => {
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    alert('복사했습니다.');
  };
  return (
    <div className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-left">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950"><Landmark className="h-5 w-5" /></span>
        <div><h3 className="text-sm font-black text-gray-950">주문이 접수되었습니다</h3><p className="mt-1 text-[11px] font-semibold leading-relaxed text-gray-600">아래 계좌로 정확한 금액을 입금해주세요. 관리자 확인 후 주문 상태가 자동으로 변경됩니다.</p></div>
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
      {onDone && <button type="button" onClick={onDone} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gray-950 py-3 text-xs font-black text-white"><Check className="h-4 w-4" />확인</button>}
    </div>
  );
};

export default BankTransferInstructions;
