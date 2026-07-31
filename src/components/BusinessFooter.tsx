import React from 'react';
import { BUSINESS_INFO } from '../constants/businessInfo';

interface BusinessFooterProps {
  compact?: boolean;
  dark?: boolean;
  showBusinessDetails?: boolean;
}

const BusinessFooter: React.FC<BusinessFooterProps> = ({
  compact = false,
  dark = false,
  showBusinessDetails = true,
}) => {
  const linkClass = compact
    ? 'inline-flex min-h-11 min-w-11 items-center justify-center text-current opacity-75 transition hover:opacity-100 hover:underline'
    : dark
      ? 'text-gray-300 transition hover:text-white hover:underline'
      : 'text-gray-600 transition hover:text-gray-950 hover:underline';

  return (
    <footer className={compact ? 'w-full px-3 pb-5 pt-6 text-center' : `relative z-10 border-t px-6 py-8 text-center ${dark ? 'border-white/10' : 'border-black/10'}`}>
      <nav aria-label="법적 고지" className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-semibold ${compact ? 'text-[9px]' : 'text-xs'}`}>
        <a href="/terms" target="_blank" rel="noopener noreferrer" className={linkClass}>이용약관</a>
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>개인정보처리방침</a>
        <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className={linkClass}>환불·취소 정책</a>
      </nav>
      {showBusinessDetails && (
        <div className={`mx-auto mt-3 flex max-w-4xl flex-wrap items-center justify-center gap-x-2 gap-y-1 leading-relaxed ${compact ? 'text-[8px] text-current opacity-65' : 'text-xs text-gray-500'}`}>
          <span>상호: {BUSINESS_INFO.businessName}</span><span aria-hidden="true">·</span>
          <span>대표자: {BUSINESS_INFO.representative}</span><span aria-hidden="true">·</span>
          <span>사업자등록번호: {BUSINESS_INFO.registrationNumber}</span><span aria-hidden="true">·</span>
          <span>통신판매업 신고: {BUSINESS_INFO.mailOrderNumber}</span>
          <span className="basis-full h-0" aria-hidden="true" />
          <span>사업장 주소: {BUSINESS_INFO.address}</span><span aria-hidden="true">·</span>
          <a href={`tel:${BUSINESS_INFO.customerServicePhone.replace(/-/g, '')}`} className={linkClass}>고객센터: {BUSINESS_INFO.customerServicePhone}</a><span aria-hidden="true">·</span>
          <a href={`mailto:${BUSINESS_INFO.customerServiceEmail}`} className={linkClass}>{BUSINESS_INFO.customerServiceEmail}</a>
        </div>
      )}
      <p className={`mt-3 ${compact ? 'text-[8px] text-current opacity-50' : dark ? 'text-[11px] text-gray-600' : 'text-[11px] text-gray-400'}`}>
        © 2026 {BUSINESS_INFO.serviceName}. All rights reserved.
      </p>
    </footer>
  );
};

export default BusinessFooter;
