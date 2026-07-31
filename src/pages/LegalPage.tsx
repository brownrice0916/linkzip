import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BusinessFooter from '../components/BusinessFooter';
import LinkZipLogo from '../components/brand/LinkZipLogo';
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
      { title: '1. 수집하는 개인정보', body: ['회사는 Google·카카오·네이버 로그인 시 외부 계정 식별자, 이름 또는 닉네임, 이메일, 프로필 사진을 수집할 수 있습니다. 서비스 이용 중 프로필·링크 내용, 접속 일시, IP 주소, 기기·브라우저 정보, 방문·클릭 기록, 문의·방명록·오류 제보 내용이 생성될 수 있습니다.', '결제·배송 시 구매자명, 연락처, 이메일, 배송지, 주문·결제 내역을 수집할 수 있으며, 정산 기능 이용 시 예금주, 은행, 계좌번호와 계좌 검증 결과를 수집할 수 있습니다. 구독·고객정보 수집 블록에서는 이용자가 직접 입력한 이름, 이메일, 전화번호 및 수신 동의 정보를 수집합니다.'] },
      { title: '2. 이용 목적', body: ['개인정보는 회원 식별, 서비스 제공, 결제·주문·배송, 후원·정산 관리, 고객 문의·분쟁 대응, 부정이용 방지 및 서비스 개선을 위해 이용합니다.'] },
      { title: '3. 보유기간 및 파기', body: ['계정·프로필 정보는 회원 탈퇴 시까지, 오류 제보와 고객 문의는 처리 완료 후 3년, 접속 기록은 부정 이용 방지를 위해 최대 3개월 보관한 뒤 복구하기 어려운 방법으로 파기합니다.', '전자상거래법 등 관계 법령에 따라 계약·청약철회·대금결제 및 재화 공급 기록은 5년, 소비자 불만·분쟁 처리 기록은 3년, 표시·광고 기록은 6개월 보관할 수 있습니다. 법정 보관 자료는 일반 서비스 데이터와 분리해 해당 목적에만 이용합니다.'] },
      { title: '4. 처리위탁 및 국외 이전', body: ['회사는 서비스 운영을 위해 Google Firebase·Google Cloud(인증, 데이터베이스, 파일 저장, 서버 운영), 토스페이먼츠(결제 처리), 카카오·네이버·Meta(소셜 로그인 또는 연동)를 이용합니다. 서비스 제공 과정에서 암호화된 통신을 통해 해당 사업자의 국내외 데이터센터로 정보가 이전·처리될 수 있으며, 처리 항목과 기간은 각 기능 제공 및 법정 보관기간 동안입니다.', '회사는 수탁자를 계약과 관련 법령에 따라 관리·감독하며, 수탁자 또는 처리 내용이 바뀌면 이 방침을 통해 공개합니다. 이용자는 해당 기능을 사용하지 않거나 회원 탈퇴를 통해 이전을 거부할 수 있으나 관련 기능 이용이 제한될 수 있습니다.'] },
      { title: '5. 제3자 제공', body: ['회사는 법령상 근거가 있거나 이용자가 사전에 동의한 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다. 프로필 운영자가 고객정보 수집 또는 판매 기능을 사용하는 경우 해당 운영자가 별도의 개인정보처리자 또는 판매자로서 수집 목적과 조건을 고지해야 합니다.'] },
      { title: '6. 쿠키·자동 수집 및 분석', body: ['로그인 유지, 보안, 언어·편집 상태 저장을 위해 브라우저 저장소와 쿠키를 사용할 수 있습니다. 공개 프로필의 방문 및 링크 클릭 횟수가 통계로 기록될 수 있으며, 이용자는 브라우저 설정에서 쿠키 또는 저장소를 삭제할 수 있습니다.'] },
      { title: '7. 광고성 정보 수신', body: ['이메일·메시지 수신은 별도의 동의를 받은 경우에만 이용하며, 수신자는 각 메시지의 안내 또는 고객센터를 통해 언제든 동의를 철회할 수 있습니다. 동의하지 않아도 핵심 서비스 이용에는 영향을 주지 않습니다.'] },
      { title: '8. 이용자 권리·개인정보 보호책임자', body: [`이용자는 개인정보 열람·정정·삭제·처리정지와 동의 철회를 요청할 수 있습니다. 설정의 회원 탈퇴 기능 또는 고객센터를 이용할 수 있으며, 법정 보관 의무가 있는 정보는 보관기간 종료 후 파기됩니다. 보호책임자는 ${BUSINESS_INFO.representative}이며, ${BUSINESS_INFO.customerServiceEmail} 또는 ${BUSINESS_INFO.customerServicePhone}으로 문의할 수 있습니다.`] },
      { title: '9. 안전성 확보조치 및 변경 고지', body: ['회사는 접근권한 통제, 전송·저장 구간 보호, 비밀정보 분리 보관, 로그 점검 등 합리적인 보호조치를 적용합니다. 이 방침의 중요한 내용이 변경되면 시행일 전에 서비스 화면을 통해 알립니다.'] },
    ],
  },
  '/refund-policy': {
    title: '환불·취소 정책',
    sections: [
      { title: '1. 일반 원칙', body: ['구매자는 관련 법령과 각 상품·서비스 판매 화면에 고지된 조건에 따라 청약철회, 취소 또는 환불을 요청할 수 있습니다.'] },
      { title: '2. 실물 상품', body: ['일반적으로 상품을 공급받은 날로부터 7일 이내에 청약철회를 요청할 수 있습니다. 구매자의 사용·훼손으로 가치가 현저히 감소한 경우 등 법령이 정한 사유가 있으면 제한될 수 있습니다.'] },
      { title: '3. 디지털 파일·콘텐츠', body: ['다운로드나 열람이 시작되지 않은 경우 관련 법령에 따라 청약철회를 요청할 수 있습니다. 즉시 제공이 시작된 콘텐츠는 사전 동의가 있는 경우 청약철회가 제한될 수 있습니다.'] },
      { title: '4. LinkZip 플랜 이용권', body: ['월간·연간 플랜은 결제 시 선택한 기간 동안 제공되는 기간제 이용권이며 현재 자동 갱신되지 않습니다. 환불 가능 여부와 금액은 서비스 사용 개시 여부, 사용 기간, 제공된 혜택과 관련 법령 및 결제 시 고지된 조건을 기준으로 처리됩니다.'] },
      { title: '5. 후원 및 신청 방법', body: [`후원 결제의 취소는 프로필 운영자의 조건과 결제수단별 정책을 따릅니다. 오결제·중복결제는 주문번호와 함께 ${BUSINESS_INFO.customerServiceEmail} 또는 ${BUSINESS_INFO.customerServicePhone}으로 문의해 주세요. 환불 승인 후 실제 입금까지는 금융사 사정에 따라 영업일이 소요될 수 있습니다.`] },
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
          <Link to="/" className="inline-flex items-center"><LinkZipLogo markClassName="h-9 w-9" textClassName="text-lg" /></Link>
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
