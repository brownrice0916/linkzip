import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Link2 } from 'lucide-react';
import BusinessFooter from '../components/BusinessFooter';
import { BUSINESS_INFO } from '../constants/businessInfo';

type Section = { title: string; body: string[] };
type LegalDocument = { title: string; sections: Section[] };

const documents: Record<string, LegalDocument> = {
  '/terms': {
    title: '이용약관',
    sections: [
      { title: '제1조(목적)', body: ['이 약관은 링크집(이하 “회사”)이 제공하는 프로필 페이지, 링크 관리, 방명록, 메시지, 후원 및 상품 거래 지원 서비스의 이용과 관련한 권리·의무를 정함을 목적으로 합니다.'] },
      { title: '제2조(계정과 서비스 이용)', body: ['이용자는 정확한 정보를 제공하고 계정의 보안을 유지할 책임이 있습니다. 법령을 위반하거나 타인의 권리를 침해하는 콘텐츠, 스팸, 사기 및 서비스 운영 방해 행위는 금지됩니다.'] },
      { title: '제3조(상품·후원·통신판매중개)', body: ['프로필 운영자가 자신의 페이지에서 상품, 파일, 서비스 또는 후원 메뉴를 제공하는 경우 각 거래의 판매자와 거래조건은 결제 화면에서 확인할 수 있어야 합니다. 회사가 통신판매중개자로서 거래를 지원하는 경우 거래의 당사자는 프로필 운영자와 구매자입니다.'] },
      { title: '제4조(결제와 취소)', body: ['결제는 토스페이먼츠 등 외부 결제사를 통해 처리될 수 있습니다. 취소·환불은 관련 법령, 결제수단별 정책과 각 거래에 고지된 조건을 따릅니다.'] },
      { title: '제5조(문의 및 준거법)', body: [`문의는 ${BUSINESS_INFO.customerServiceEmail} 또는 ${BUSINESS_INFO.customerServicePhone}으로 접수할 수 있습니다. 이 약관은 대한민국 법령을 준거법으로 합니다.`] },
    ],
  },
  '/privacy': {
    title: '개인정보처리방침',
    sections: [
      { title: '1. 수집하는 개인정보', body: ['회사는 회원가입·로그인 시 이름, 이메일, 프로필 사진, 외부 계정 식별자를 수집할 수 있습니다. 서비스 이용 중 프로필·링크 내용, 접속·클릭 기록, 문의·방명록 내용이 생성될 수 있습니다.', '결제·배송 시 구매자명, 연락처, 이메일, 배송지, 주문·결제 내역을 수집할 수 있으며, 정산 기능 이용 시 사업자·본인확인 정보와 정산 계좌정보를 수집할 수 있습니다.'] },
      { title: '2. 이용 목적', body: ['개인정보는 회원 식별, 서비스 제공, 결제·주문·배송, 후원·정산 관리, 고객 문의·분쟁 대응, 부정이용 방지 및 서비스 개선을 위해 이용합니다.'] },
      { title: '3. 보유 및 파기', body: ['회원 탈퇴 또는 처리 목적 달성 시 파기하되, 관련 법령이 보존을 요구하는 자료는 해당 기간 분리 보관한 후 파기합니다.'] },
      { title: '4. 제3자 제공·처리위탁', body: ['회사는 인증, 클라우드 저장, 결제 기능을 위해 Google Firebase, 토스페이먼츠 등 외부 서비스를 이용할 수 있습니다. 법령상 근거가 있거나 이용자 동의가 있는 경우를 제외하고 목적 외로 제공하지 않습니다.'] },
      { title: '5. 이용자 권리·개인정보 보호책임자', body: [`이용자는 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다. 보호책임자는 ${BUSINESS_INFO.representative}이며, ${BUSINESS_INFO.customerServiceEmail} 또는 ${BUSINESS_INFO.customerServicePhone}으로 문의할 수 있습니다.`] },
    ],
  },
  '/refund-policy': {
    title: '환불·취소 정책',
    sections: [
      { title: '1. 일반 원칙', body: ['구매자는 관련 법령과 각 상품·서비스 판매 화면에 고지된 조건에 따라 청약철회, 취소 또는 환불을 요청할 수 있습니다.'] },
      { title: '2. 실물 상품', body: ['일반적으로 상품을 공급받은 날로부터 7일 이내에 청약철회를 요청할 수 있습니다. 구매자의 사용·훼손으로 가치가 현저히 감소한 경우 등 법령이 정한 사유가 있으면 제한될 수 있습니다.'] },
      { title: '3. 디지털 파일·콘텐츠', body: ['다운로드나 열람이 시작되지 않은 경우 관련 법령에 따라 청약철회를 요청할 수 있습니다. 즉시 제공이 시작된 콘텐츠는 사전 동의가 있는 경우 청약철회가 제한될 수 있습니다.'] },
      { title: '4. 후원 및 신청 방법', body: [`후원 결제의 취소는 프로필 운영자의 조건과 결제수단별 정책을 따릅니다. 오결제·중복결제는 주문번호와 함께 ${BUSINESS_INFO.customerServiceEmail} 또는 ${BUSINESS_INFO.customerServicePhone}으로 문의해 주세요. 환불 승인 후 실제 입금까지는 금융사 사정에 따라 영업일이 소요될 수 있습니다.`] },
    ],
  },
};

const LegalPage: React.FC = () => {
  const { pathname } = useLocation();
  const document = documents[pathname] || documents['/terms'];

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-gray-950">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link to="/" className="inline-flex items-center gap-2 font-black"><Link2 className="h-5 w-5" />LinkZip</Link>
          <button type="button" onClick={() => window.history.back()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-100 hover:text-black"><ArrowLeft className="h-4 w-4" />뒤로</button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        <article className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{document.title}</h1>
          <p className="mt-3 text-sm font-semibold text-gray-500">시행일: 2026년 7월 27일</p>
          <div className="mt-10 space-y-9">
            {document.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-black">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm font-medium leading-7 text-gray-600">
                  {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <BusinessFooter />
    </div>
  );
};

export default LegalPage;
