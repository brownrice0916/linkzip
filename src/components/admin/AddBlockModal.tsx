import React from 'react';
import { 
  X, 
  Link2, 
  Folder, 
  Type, 
  Image as ImageIcon, 
  MoveVertical, 
  Music, 
  MapPin, 
  Download, 
  MessageCircle, 
  Calendar, 
  CreditCard, 
  Phone, 
  Megaphone, 
  Search, 
  PenTool, 
  ShoppingBag, 
  Globe, 
  Heart, 
  CalendarCheck, 
  Tv, 
  Users,
  Store
} from 'lucide-react';
import { FaInstagram, FaYoutube } from 'react-icons/fa';

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
      title: 'contents',
      blocks: [
        { id: 'link', label: 'Link', desc: 'Highlighting a single URL', icon: Link2, bgColor: 'bg-emerald-500', iconColor: 'text-white' },
        { id: 'group_link', label: 'Group link', desc: 'Arranging multiple URLs', icon: Folder, bgColor: 'bg-emerald-500', iconColor: 'text-white' },
        { id: 'sns', label: 'SNS', desc: 'Link Social Media', customIcon: <FaInstagram className="w-6 h-6 text-white" />, bgColor: 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600' },
        { id: 'video', label: 'Video', desc: 'Integration with Video Platforms', customIcon: <FaYoutube className="w-6 h-6 text-white" />, bgColor: 'bg-red-600' },
        { id: 'text', label: 'Text', desc: 'Content Writing', icon: Type, bgColor: 'bg-gray-200', iconColor: 'text-gray-900' },
        { id: 'gallery', label: 'Gallery', desc: 'Image Layout', icon: ImageIcon, bgColor: 'bg-blue-500', iconColor: 'text-white' },
        { id: 'space', label: 'Space', desc: 'Adjustable Spacing Between Blocks', icon: MoveVertical, bgColor: 'bg-gray-500', iconColor: 'text-white' },
        { id: 'music', label: 'Music', desc: 'Integration with Music Platforms', icon: Music, bgColor: 'bg-purple-500', iconColor: 'text-white' },
        { id: 'map', label: 'Map', desc: 'Address-Based Map View', icon: MapPin, bgColor: 'bg-orange-500', iconColor: 'text-white' },
        { id: 'file', label: 'File sharing', desc: 'PDF and file upload', icon: Download, bgColor: 'bg-cyan-500', iconColor: 'text-white' },
      ]
    },
    {
      title: 'Communication',
      blocks: [
        { id: 'customer_inquiry', label: 'Customer inquiry', desc: 'Receive Customer Inquiries', icon: MessageCircle, bgColor: 'bg-yellow-400', iconColor: 'text-gray-900' },
        { id: 'appointments', label: 'Appointments', desc: 'Calendar, event notifications', icon: Calendar, bgColor: 'bg-blue-600', iconColor: 'text-white' },
        { id: 'customer_info', label: 'Customer info', desc: 'Collect Email and Mobile Numbers', icon: CreditCard, bgColor: 'bg-purple-600', iconColor: 'text-white' },
        { id: 'contact', label: 'Contact', desc: 'Contact Sharing', icon: Phone, bgColor: 'bg-stone-300', iconColor: 'text-gray-900' },
        { id: 'notice', label: 'notice', desc: 'Highlight Key News', icon: Megaphone, bgColor: 'bg-amber-400', iconColor: 'text-gray-900' },
        { id: 'search', label: '검색', desc: '페이지 내부 검색', icon: Search, bgColor: 'bg-gray-200', iconColor: 'text-gray-500' },
        { id: 'guestbook', label: 'Guestbook', desc: 'Customer communication', icon: PenTool, bgColor: 'bg-orange-400', iconColor: 'text-white' },
      ]
    },
    {
      title: 'Earnings',
      blocks: [
        { id: 'sales', label: 'Sales', desc: 'File, Course, Talent, and Product', icon: ShoppingBag, bgColor: 'bg-black', iconColor: 'text-white' },
        { id: 'global_sales', label: 'Global sales', desc: 'Support for USD & JPY', icon: Globe, bgColor: 'bg-black', iconColor: 'text-white' },
        { id: 'donation', label: 'Donation', desc: 'Donations & Fundraising', icon: Heart, bgColor: 'bg-pink-500', iconColor: 'text-white' },
        { id: 'booking', label: 'booking', desc: 'Time, Consultation', icon: CalendarCheck, bgColor: 'bg-emerald-600', iconColor: 'text-white' },
        { id: 'advertisement', label: 'Advertisement', desc: 'Banner Monetization', icon: Tv, bgColor: 'bg-indigo-600', iconColor: 'text-white' },
        { id: 'membership', label: 'Membership', desc: 'Monthly subscription', icon: Users, bgColor: 'bg-amber-500', iconColor: 'text-white' },
      ]
    },
    {
      title: 'External integration',
      blocks: [
        { id: 'naver_store', label: 'Naver Smart Store', desc: 'Naver Store integration', icon: Store, bgColor: 'bg-emerald-600', iconColor: 'text-white' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 my-auto">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Add a block</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-4">
              <h3 className="text-sm font-bold text-gray-500 lowercase tracking-wide">
                {cat.title}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {cat.blocks.map((b) => {
                  const IconComp = b.icon;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        onSelectBlock(b.id);
                        onClose();
                      }}
                      className="p-4 rounded-2xl border border-gray-200 hover:border-black hover:shadow-md transition-all text-left flex items-center gap-3.5 group cursor-pointer bg-white"
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
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="text-xs font-black text-gray-900 group-hover:text-black truncate">
                          {b.label}
                        </h4>
                        <p className="text-[10px] font-semibold text-gray-400 leading-tight line-clamp-2">
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
