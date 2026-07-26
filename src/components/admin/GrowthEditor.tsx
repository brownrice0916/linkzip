import React, { useState, useEffect } from "react";
import { useStore, type CollectedCustomerData } from "../../store/useStore";
import { 
  MessageCircle, 
  Calendar, 
  Download, 
  Contact, 
  Bell, 
  ShoppingBag, 
  Heart, 
  Users, 
  Tv, 
  ChevronRight, 
  X, 
  FileText, 
  Search, 
  Trash2,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { listCustomerData, removeCustomerData } from "../../services/customerDataService";
import {
  deleteAnonymousMessage,
  markAnonymousMessageRead,
  subscribeToAnonymousMessages,
  type AnonymousMessage,
} from "../../services/anonymousMessageService";
import clsx from "clsx";

export const GrowthEditor: React.FC = () => {
  const { user, profile, customLinks, language } = useStore();
  const tr = (ko: string, en: string) => language === 'ko' ? ko : en;

  const [collectedData, setCollectedData] = useState<CollectedCustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [anonymousMessages, setAnonymousMessages] = useState<AnonymousMessage[]>([]);
  const [messagesExpanded, setMessagesExpanded] = useState(false);

  // Fetch collected customer data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setCollectedData(await listCustomerData(user.uid));
      } catch (err) {
        console.error('Error fetching collected customer data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) {
      setAnonymousMessages([]);
      return;
    }
    return subscribeToAnonymousMessages(user.uid, setAnonymousMessages, (error) => {
      console.error('Error fetching anonymous messages:', error);
    });
  }, [user?.uid]);

  // Counts based on customLinks
  const customerInfoBlocksCount = customLinks.filter(l => l.type === 'customer_info').length;
  const fileBlocksCount = customLinks.filter(l => l.type === 'file').length;
  const donationBlocksCount = customLinks.filter(l => l.type === 'donation').length;
  const anonymousMessageBlocksCount = customLinks.filter(l => l.type === 'anonymous_message').length;
  const profileMessages = anonymousMessages.filter((message) => message.targetUsername === profile.username);
  const unreadMessagesCount = profileMessages.filter((message) => !message.isRead).length;

  const toggleMessages = async () => {
    const nextExpanded = !messagesExpanded;
    setMessagesExpanded(nextExpanded);
    if (!nextExpanded || !user?.uid || unreadMessagesCount === 0) return;
    const unread = profileMessages.filter((message) => !message.isRead);
    setAnonymousMessages((current) => current.map((message) => ({ ...message, isRead: true })));
    await Promise.all(unread.map((message) => markAnonymousMessageRead(user.uid, message.id))).catch((error) => {
      console.error('Error marking anonymous messages as read:', error);
    });
  };

  const handleDeleteAnonymousMessage = async (id: string) => {
    if (!user?.uid || !window.confirm(tr('이 메시지를 삭제하시겠습니까?', 'Delete this message?'))) return;
    try {
      await deleteAnonymousMessage(user.uid, id);
    } catch (error) {
      console.error('Error deleting anonymous message:', error);
    }
  };

  const formatMessageDate = (message: AnonymousMessage) => {
    if (!message.createdAt?.seconds) return tr('방금 전', 'Just now');
    return new Date(message.createdAt.seconds * 1000).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US');
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('이 수집 항목을 삭제하시겠습니까?')) return;
    try {
      if (user?.uid) {
        await removeCustomerData(user.uid, id);
      }
      setCollectedData(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting collected data:', err);
    }
  };

  const handleExportCSV = () => {
    if (collectedData.length === 0) {
      alert('수집된 고객 정보가 없습니다.');
      return;
    }
    const headers = ['ID', '이메일', '연락처', '이름', '수집일시'];
    const rows = collectedData.map(d => [
      d.id,
      d.email || '',
      d.phone || '',
      d.name || '',
      d.createdAt || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_info_${profile.username || 'data'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = collectedData.filter(d => 
    (d.email && d.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.name && d.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.phone && d.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6 font-sans max-w-4xl animate-fade-in pb-20">

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs">
        <button type="button" onClick={() => void toggleMessages()} className="flex w-full cursor-pointer items-center justify-between bg-gray-950 px-6 py-4 text-left text-white transition hover:bg-black" aria-expanded={messagesExpanded}>
          <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500"><MessageCircle className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-extrabold">{tr('익명 메시지함', 'Anonymous inbox')}</span><span className="block text-[10px] font-bold text-gray-400">{tr(`메시지 블록 ${anonymousMessageBlocksCount}개 · 받은 메시지 ${profileMessages.length}개`, `${anonymousMessageBlocksCount} blocks · ${profileMessages.length} messages`)}</span></span></span>
          <span className="flex items-center gap-3">{unreadMessagesCount > 0 && <span className="rounded-full bg-violet-500 px-2.5 py-1 text-[10px] font-black">{tr(`새 메시지 ${unreadMessagesCount}`, `${unreadMessagesCount} new`)}</span>}<ChevronDown className={clsx('h-4 w-4 transition-transform', messagesExpanded && 'rotate-180')} /></span>
        </button>
        {messagesExpanded && (
          <div className="space-y-3 p-5">
            {profileMessages.length === 0 ? <div className="rounded-2xl bg-gray-50 px-4 py-10 text-center"><MessageCircle className="mx-auto mb-2 h-7 w-7 text-gray-300" /><p className="text-xs font-bold text-gray-400">{tr('아직 받은 익명 메시지가 없습니다.', 'No anonymous messages yet.')}</p></div> : profileMessages.map((message) => (
              <article key={message.id} className="group rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-violet-200 hover:shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[10px] font-black text-violet-600"><span className="h-2 w-2 rounded-full bg-violet-500" />{tr('익명', 'Anonymous')}</span><span className="flex items-center gap-2"><time className="text-[10px] font-semibold text-gray-400">{formatMessageDate(message)}</time><button type="button" onClick={() => void handleDeleteAnonymousMessage(message.id)} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-gray-300 transition hover:bg-red-50 hover:text-red-500" aria-label={tr('메시지 삭제', 'Delete message')}><Trash2 className="h-3.5 w-3.5" /></button></span></div>
                <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-gray-800">{message.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      
      {/* 1. Customer Information Card (Matching Screenshot 2) */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
        
        {/* Card Header Bar */}
        <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">{tr('고객 정보', 'Customer information')}</h2>
            <span className="text-gray-400 font-bold">|</span>
            <span className="text-xs font-bold text-gray-300">{tr(`총 ${collectedData.length}개`, `${collectedData.length} items`)}</span>
          </div>

          <button
            onClick={() => setIsDetailsModalOpen(true)}
            className="text-xs font-bold text-gray-200 hover:text-white underline underline-offset-4 cursor-pointer transition"
          >
            {tr('자세히 보기', 'View details')}
          </button>
        </div>

        {/* List Body */}
        <div className="p-6 space-y-5 text-gray-800 font-bold text-xs sm:text-sm">
          
          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500 text-white flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <span className="text-gray-900">{tr('파일 공유', 'File sharing')}</span>
            </div>
            <span className="text-gray-400 font-extrabold">{tr(`${fileBlocksCount}개`, `${fileBlocksCount} items`)}</span>
          </div>

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <Contact className="w-4 h-4" />
              </div>
              <span className="text-gray-900">{tr('고객 정보 수집', 'Customer information')}</span>
            </div>
            <span className={clsx("font-extrabold", collectedData.length > 0 ? "text-purple-600" : "text-gray-400")}>
              {tr(`${collectedData.length}개`, `${collectedData.length} items`)}
            </span>
          </div>

        </div>
      </div>

      {/* 2. Sales Performance Card (Matching Screenshot 2) */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
        
        {/* Card Header Bar */}
        <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">{tr('판매 실적', 'Sales performance')}</h2>
            <span className="text-gray-400 font-bold">|</span>
            <span className="text-xs font-bold text-gray-300">{tr('예상 금액: 0원', 'Expected amount: KRW 0')}</span>
          </div>

          <button
            onClick={() => alert('수익 및 매출 내역 상세 페이지 준비 중입니다.')}
            className="text-xs font-bold text-gray-200 hover:text-white underline underline-offset-4 cursor-pointer transition"
          >
            {tr('자세히 보기', 'View details')}
          </button>
        </div>

        {/* List Body */}
        <div className="p-6 space-y-5 text-gray-800 font-bold text-xs sm:text-sm">
          
          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-gray-900">{tr('판매', 'Sales')}</span>
            </div>
            <span className="text-gray-400 font-extrabold">0KRW</span>
          </div>

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-gray-900">{tr('후원', 'Donation')}</span>
            </div>
            <span className="text-gray-400 font-extrabold">0KRW</span>
          </div>

        </div>
      </div>

      {/* 3. Ad Revenue Card (Matching Screenshot 2) */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
        
        {/* Card Header Bar */}
        <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">{tr('광고 수익', 'Ad revenue')}</h2>
            <span className="text-gray-400 font-bold">|</span>
            <span className="text-xs font-bold text-gray-300">{tr('예상 금액: 0원', 'Expected amount: KRW 0')}</span>
          </div>

          <button
            onClick={() => alert('광고 수익 내역 페이지 준비 중입니다.')}
            className="text-xs font-bold text-gray-200 hover:text-white underline underline-offset-4 cursor-pointer transition"
          >
            {tr('자세히 보기', 'View details')}
          </button>
        </div>

        {/* List Body */}
        <div className="p-6 space-y-5 text-gray-800 font-bold text-xs sm:text-sm">
          
          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <Tv className="w-4 h-4" />
              </div>
              <span className="text-gray-900">{tr('광고', 'Advertisement')}</span>
            </div>
            <span className="text-gray-400 font-extrabold">0KRW</span>
          </div>

        </div>
      </div>

      {/* View Details Customer Data Modal */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 border border-gray-200 my-auto p-6 sm:p-8 space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <Contact className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">수집된 고객 정보 목록</h3>
                  <p className="text-xs text-gray-500 font-medium">총 {collectedData.length}개의 수집 데이터가 있습니다.</p>
                </div>
              </div>

              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Export Controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이메일, 연락처, 이름 검색..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-black placeholder-gray-400"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
              </div>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>CSV 엑셀 다운로드</span>
              </button>
            </div>

            {/* Data Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              {filteredData.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 font-semibold">
                  수집된 고객 정보가 없습니다.
                </div>
              ) : (
                <table className="w-full text-left text-xs font-semibold text-gray-800">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="p-3">이메일</th>
                      <th className="p-3">연락처</th>
                      <th className="p-3">이름</th>
                      <th className="p-3">수집일시</th>
                      <th className="p-3 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredData.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900">{d.email || '-'}</td>
                        <td className="p-3 text-gray-600">{d.phone || '-'}</td>
                        <td className="p-3 text-gray-600">{d.name || '-'}</td>
                        <td className="p-3 text-gray-400 text-[11px]">{d.createdAt || '-'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteItem(d.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition rounded-md"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default GrowthEditor;
