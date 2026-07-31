import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { CustomLink, CustomerInfoConfig } from '../store/useStore';
import { submitCustomerData } from '../services/customerDataService';

interface CustomerInfoVisitorCardProps {
  block: CustomLink;
  config: CustomerInfoConfig;
  ownerUid?: string;
  style?: React.CSSProperties;
  themeActionColor?: string;
  themeActionTextColor?: string;
  previewBlockId?: string;
}

export const CustomerInfoVisitorCard: React.FC<CustomerInfoVisitorCardProps> = ({
  block,
  config,
  ownerUid,
  style,
  themeActionColor,
  themeActionTextColor,
  previewBlockId,
}) => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (config.receiveEmail !== false && !email.trim()) {
      alert('이메일을 입력해주세요.');
      return;
    }
    if (config.receivePhone && !phone.trim()) {
      alert('연락처를 입력해주세요.');
      return;
    }
    if (config.receiveName && !name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      if (ownerUid) {
        await submitCustomerData(ownerUid, {
          blockId: block.id,
          email,
          phone,
          name,
          createdAt: new Date().toISOString(),
        });
      }
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting customer info:', err);
      alert(err instanceof Error ? err.message : '정보를 제출하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      data-preview-block-id={previewBlockId}
      className="w-full bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4 text-center text-gray-900 font-sans my-2 animate-in fade-in transition"
      style={style}
    >
      {submitted ? (
        <div className="py-6 space-y-2 animate-in zoom-in-95">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h4 className="text-base font-extrabold text-current">제출이 성공적으로 완료되었습니다!</h4>
          <p className="text-xs font-medium opacity-65">감사합니다. 정보가 잘 전달되었습니다.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-current">
              {config.mainText || '소식을 받아보세요'}
            </h3>
            {config.detailText && (
              <p className="text-xs font-semibold opacity-65">
                {config.detailText}
              </p>
            )}
          </div>

          <div className="space-y-2.5 max-w-sm mx-auto">
            {config.receiveEmail !== false && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-900 placeholder-gray-400 text-center focus:ring-2 focus:ring-black shadow-2xs"
              />
            )}

            {config.receivePhone && (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="전화번호를 입력하세요"
                className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-900 placeholder-gray-400 text-center focus:ring-2 focus:ring-black shadow-2xs"
              />
            )}

            {config.receiveName && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-900 placeholder-gray-400 text-center focus:ring-2 focus:ring-black shadow-2xs"
              />
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 text-white rounded-full text-xs font-black transition cursor-pointer shadow-md flex items-center justify-center gap-2 hover:opacity-90"
              style={{
                backgroundColor: config.submitButtonColor || themeActionColor || '#000000',
                color: config.submitButtonTextColor || themeActionTextColor || '#FFFFFF'
              }}
            >
              <span>{submitting ? "제출 중..." : (config.submitButtonText || "제출하기")}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
