import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Link2, 
  Megaphone, 
  BookOpen,
  ClipboardList,
  ShoppingBag, 
  Heart, 
  CalendarCheck, 
  Download,
  FileDown,
  MessageSquareText,
  BadgeDollarSign,
  MapPinned,
  Lock
} from 'lucide-react';
import { FaInstagram } from 'react-icons/fa';
import { useStore } from '../../store/useStore';
import { entitlementsForPlan, workspaceUsage } from '../../domain/membershipPlans';
import { requestUpgradePrompt } from '../UpgradePromptHost';
import { STOREFRONT_AVAILABLE } from '../../config/featureFlags';

interface AddBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (blockType: string) => void;
}

interface AddBlockOption {
  id: string;
  label: string;
  desc: string;
  icon?: React.ComponentType<{ className?: string }>;
  customIcon?: React.ReactNode;
  bgColor: string;
  iconColor?: string;
  disabled?: boolean;
  locked?: boolean;
}

export const AddBlockModal: React.FC<AddBlockModalProps> = ({
  isOpen,
  onClose,
  onSelectBlock
}) => {
  const language = useStore((state) => state.language);
  const membershipPlan = useStore((state) => state.membershipPlan);
  const customLinks = useStore((state) => state.customLinks);
  const tr = (ko: string, en: string) => language === 'ko' ? ko : en;
  const entitlements = entitlementsForPlan(membershipPlan);
  const usage = workspaceUsage({ customLinks });

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  if (!isOpen) return null;

  const categories: Array<{ title: string; blocks: AddBlockOption[] }> = [
    {
      title: tr('링크와 위치', 'Links & location'),
      blocks: [
        { 
          id: 'link', 
          label: tr('단일 링크', 'Link'),
          desc: tr('URL 링크를 하나 추가합니다.', 'Add a single URL link.'),
          icon: Link2, 
          bgColor: 'bg-emerald-500', 
          iconColor: 'text-white' 
        },
        { 
          id: 'sns', 
          label: tr('소셜 미디어', 'Social media'),
          desc: tr('보유한 소셜 채널을 아이콘으로 묶어 표시합니다.', 'Display your social channels as icons.'),
          customIcon: <FaInstagram className="w-6 h-6 text-white" />, 
          bgColor: 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600' 
        },
        {
          id: 'map', label: tr('거주지', 'Location'),
          desc: tr('한글 장소명이나 주소를 검색해 지도를 표시합니다.', 'Search a place or address and display a map.'),
          icon: MapPinned, bgColor: 'bg-sky-600', iconColor: 'text-white'
        },
      ]
    },
    {
      title: tr('콘텐츠와 일정', 'Content & schedule'),
      blocks: [
        {
          id: 'notice', label: tr('공지사항', 'Notice'),
          desc: tr('일정, 이벤트 등의 소식을 눈에 띄게 게시합니다.', 'Highlight schedules, events, and updates.'),
          icon: Megaphone, bgColor: 'bg-amber-500', iconColor: 'text-white'
        },
        {
          id: 'file', label: tr('파일 공유', 'File sharing'),
          desc: tr('최대 5MB · 파일당 하루 20회까지 내려받을 수 있습니다.', 'Up to 5MB · 20 downloads per file each day.'),
          icon: FileDown, bgColor: 'bg-cyan-600', iconColor: 'text-white',
          locked: usage.sharedFileBlocks >= entitlements.maxSharedFileBlocks,
        },
        {
          id: 'reservation', label: tr('캘린더', 'Calendar'),
          desc: tr('달력에 일정과 예약 정보를 표시합니다.', 'Publish a calendar with schedule information.'),
          icon: CalendarCheck, bgColor: 'bg-emerald-600', iconColor: 'text-white'
        },
      ]
    },
    {
      title: tr('소통과 고객', 'Community & audience'),
      blocks: [
        {
          id: 'guestbook', 
          label: tr('방명록', 'Guestbook'),
          desc: tr('방문자가 응원 메시지나 댓글을 남길 수 있습니다.', 'Let visitors leave messages and comments.'),
          icon: BookOpen,
          bgColor: 'bg-rose-500', 
          iconColor: 'text-white' 
        },
        {
          id: 'anonymous_message',
          label: tr('익명 메시지 보내기', 'Anonymous messages'),
          desc: tr('방문자가 이름 없이 비공개 메시지를 보냅니다.', 'Let visitors send you private anonymous messages.'),
          icon: MessageSquareText,
          bgColor: 'bg-[#ff5f35]',
          iconColor: 'text-white'
        },
        {
          id: 'store',
          label: tr('스토어', 'Store'),
          desc: tr('내 스토어로 이동하는 링크 블록을 추가합니다.', 'Add a link block that opens your store.'),
          icon: ShoppingBag,
          bgColor: 'bg-[#171714]',
          iconColor: 'text-white',
          disabled: !STOREFRONT_AVAILABLE,
        },
        { 
          id: 'customer_info', 
          label: tr('고객 정보 수집', 'Customer information'),
          desc: tr('방문자의 이메일이나 연락처를 수집합니다.', 'Collect visitor email addresses or contact details.'),
          icon: ClipboardList,
          bgColor: 'bg-blue-500', 
          iconColor: 'text-white',
          locked: !entitlements.canUseCustomerForms,
        },
      ]
    },
    {
      title: tr('판매와 후원', 'Sales & support'),
      blocks: [
        { 
          id: 'digital_file_sales',
          label: tr('디지털 파일 판매', 'Digital file sales'),
          desc: tr('전자책, 이미지, 문서 등의 디지털 파일을 판매합니다.', 'Sell ebooks, images, documents, and other digital files.'),
          icon: Download,
          bgColor: 'bg-blue-600',
          iconColor: 'text-white'
        },
        {
          id: 'product_sales',
          label: tr('실물 상품 판매', 'Physical product sales'),
          desc: tr('배송이 필요한 실물 상품을 등록하고 판매합니다.', 'List and sell physical products that require delivery.'),
          icon: ShoppingBag, 
          bgColor: 'bg-indigo-500', 
          iconColor: 'text-white' 
        },
        {
          id: 'affiliate_product',
          label: tr('어필리에이트 상품', 'Affiliate product'),
          desc: tr('상품 이미지, 제휴 링크와 가격을 등록합니다.', 'Add a product image, affiliate link, and price.'),
          icon: BadgeDollarSign,
          bgColor: 'bg-[#ffcf4a] text-[#171714]',
          iconColor: 'text-white',
          disabled: true
        },
        { 
          id: 'donation', 
          label: tr('후원', 'Donation'),
          desc: tr('후원금과 응원 메시지를 받습니다.', 'Receive donations and messages of support.'),
          icon: Heart, 
          bgColor: 'bg-red-500', 
          iconColor: 'text-white' 
        },
      ]
    }
  ];

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/60 p-4 font-sans backdrop-blur-xs max-sm:items-stretch max-sm:p-0">
      <div className="relative my-auto flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 max-sm:my-0 max-sm:max-h-none max-sm:h-[100dvh] max-sm:rounded-none max-sm:border-0">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{tr('블록 추가', 'Add a block')}</h2>
            <p className="text-xs text-gray-500 font-medium">{tr('추가할 블록 유형을 선택하세요.', 'Choose a block type to add.')}</p>
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
                  const locked = b.locked || (entitlements.maxBlocksPerProfile !== null && usage.blocks >= entitlements.maxBlocksPerProfile);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      disabled={b.disabled}
                      onClick={() => {
                        if (b.disabled) return;
                        if (locked) {
                          onClose();
                          requestUpgradePrompt({
                            featureLabel: b.label,
                            title: `${b.label} 사용 한도를 늘려보세요`,
                            description: b.id === 'customer_info'
                              ? tr('고객 정보 수집 블록은 스탠다드 플랜부터 이용할 수 있습니다.', 'Customer forms are available from the Standard plan.')
                              : tr('현재 플랜의 블록 사용 한도에 도달했습니다. 업그레이드하면 더 많은 파일 공유 블록과 넉넉한 용량을 사용할 수 있어요.', 'You reached this plan limit. Upgrade for more file blocks and storage.'),
                          });
                          return;
                        }
                        onSelectBlock(b.id);
                        onClose();
                      }}
                      className={`p-4 rounded-2xl border text-left flex items-center gap-4 group bg-white transition-all ${b.disabled ? 'cursor-not-allowed border-gray-100 opacity-45' : locked ? 'cursor-pointer border-amber-200 bg-amber-50/40 hover:border-amber-400' : 'cursor-pointer border-gray-200 hover:border-black hover:shadow-md'}`}
                    >
                      {/* Left Block Icon Badge */}
                      <div className={`w-12 h-12 rounded-2xl ${b.bgColor} flex items-center justify-center shrink-0 shadow-2xs transition-transform ${b.disabled ? '' : 'group-hover:scale-105'}`}>
                          {locked ? <Lock className="h-5 w-5 text-white" /> : b.customIcon ? (
                          b.customIcon
                        ) : IconComp ? (
                          <IconComp className={`w-6 h-6 ${b.iconColor}`} />
                        ) : null}
                      </div>

                      {/* Right Block Name & Description */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="flex items-center gap-2 text-xs font-black text-gray-900 group-hover:text-black">
                          <span className="truncate">{b.label}</span>
                          {b.disabled && <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[9px] font-black text-gray-600">{tr('준비 중', 'Coming soon')}</span>}
                          {locked && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">{tr('업그레이드', 'Upgrade')}</span>}
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
    </div>,
    document.body,
  );
};
