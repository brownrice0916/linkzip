import React from 'react';
import { 
  X, 
  Link2, 
  Folder, 
  Megaphone, 
  PenTool, 
  CreditCard, 
  ShoppingBag, 
  Heart, 
  CalendarCheck, 
  Phone
} from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';

interface AddBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (blockType: string) => void;
}

export const AddBlockModal: React.FC<AddBlockModalProps> = ({
  isOpen,
  onClose,
  onSelectBlock
}) => {
  if (!isOpen) return null;

  const categories = [
    {
      title: '1. 기본 브랜딩 & 링크 연결 (가장 기본!)',
      blocks: [
        { 
          id: 'sns', 
          label: 'SNS (소셜 미디어)', 
          desc: 'YouTube, 인스타그램, 틱톡, X(트위터), 치지직/아프리카TV 등 보유한 채널들을 아이콘으로 예쁘게 묶어 노출시킵니다.', 
          customIcon: <FaInstagram className="w-6 h-6 text-white" />, 
          bgColor: 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600' 
        },
        { 
          id: 'link', 
          label: 'Link / Group link (링크 & 그룹 링크)', 
          desc: '협찬/공구 진행 링크, 내 최신 블로그 글, 포트폴리오 사이트 등을 모아서 보여줄 때 필수입니다.', 
          icon: Link2, 
          bgColor: 'bg-emerald-500', 
          iconColor: 'text-white' 
        },
      ]
    },
    {
      title: '2. 팬 소통 & 반응 유도',
      blocks: [
        { 
          id: 'notice', 
          label: 'notice (공지사항)', 
          desc: '팬미팅 일정, 공구 오픈 일정, 휴방 공지, 이벤트를 눈에 띄게 게시할 때 유용합니다.', 
          icon: Megaphone, 
          bgColor: 'bg-amber-400', 
          iconColor: 'text-gray-900' 
        },
        { 
          id: 'guestbook', 
          label: 'Guestbook (방명록)', 
          desc: '팬들이 자유롭게 응원 메시지나 댓글을 남길 수 있는 소통 공간입니다.', 
          icon: PenTool, 
          bgColor: 'bg-orange-400', 
          iconColor: 'text-white' 
        },
        { 
          id: 'customer_info', 
          label: 'Customer info (고객 정보 수집)', 
          desc: '공구 알림 신청, 팬레터/이벤트 신청, 뉴스레터 구독 등 팬들의 이메일이나 연락처를 모을 때 씁니다.', 
          icon: CreditCard, 
          bgColor: 'bg-purple-600', 
          iconColor: 'text-white' 
        },
      ]
    },
    {
      title: '3. 수익화 & 비즈니스 (공구, 협찬, 자체제작)',
      blocks: [
        { 
          id: 'sales', 
          label: 'Sales (판매)', 
          desc: '디지털 상품(노션 템플릿, 전자책, 프리셋 등) 및 실물/공구 굿즈 제품 판매', 
          icon: ShoppingBag, 
          bgColor: 'bg-black', 
          iconColor: 'text-white' 
        },
        { 
          id: 'donation', 
          label: 'Donation (후원)', 
          desc: '트위치/아프리카 후원처럼 팬들에게 직접 응원 후원금을 받습니다.', 
          icon: Heart, 
          bgColor: 'bg-pink-500', 
          iconColor: 'text-white' 
        },
        { 
          id: 'booking', 
          label: 'booking (예약)', 
          desc: '1:1 상담, 피드백, 멘토링, 팬사인회/팬미팅 시간을 예약받을 때 사용합니다.', 
          icon: CalendarCheck, 
          bgColor: 'bg-emerald-600', 
          iconColor: 'text-white' 
        },
        { 
          id: 'contact', 
          label: 'Contact (연락처)', 
          desc: '브랜드/광고주가 섭외 및 비즈니스 문의를 손쉽게 할 수 있도록 비즈니스 이메일이나 담당자 연락처를 남겨둡니다.', 
          icon: Phone, 
          bgColor: 'bg-stone-500', 
          iconColor: 'text-white' 
        },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 my-auto">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Add a block</h2>
            <p className="text-xs text-gray-500 font-medium">원하는 블록 유형을 선택하여 링크지프에 추가해보세요.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-white">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-4">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
                {cat.title}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cat.blocks.map((b) => {
                  const IconComp = b.icon;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        onSelectBlock(b.id);
                        onClose();
                      }}
                      className="p-4 rounded-2xl border border-gray-200 hover:border-black hover:shadow-md transition-all text-left flex items-center gap-4 group cursor-pointer bg-white"
                    >
                      {/* Left Block Icon Badge */}
                      <div className={`w-12 h-12 rounded-2xl ${b.bgColor} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                        {b.customIcon ? (
                          b.customIcon
                        ) : IconComp ? (
                          <IconComp className={`w-6 h-6 ${b.iconColor}`} />
                        ) : null}
                      </div>

                      {/* Right Block Name & Description */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs font-black text-gray-900 group-hover:text-black truncate">
                          {b.label}
                        </h4>
                        <p className="text-[11px] font-semibold text-gray-500 leading-relaxed line-clamp-2">
                          {b.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
