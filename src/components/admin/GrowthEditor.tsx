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
  ExternalLink
} from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import clsx from "clsx";

export const GrowthEditor: React.FC = () => {
  const { user, profile, customLinks } = useStore();

  const [collectedData, setCollectedData] = useState<CollectedCustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch collected customer data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'collected_customer_data'));
        const list: CollectedCustomerData[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({
            id: docSnap.id,
            ...docSnap.data()
          } as CollectedCustomerData);
        });
        setCollectedData(list);
      } catch (err) {
        console.error('Error fetching collected customer data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Counts based on customLinks
  const customerInfoBlocksCount = customLinks.filter(l => l.type === 'customer_info').length;
  const fileBlocksCount = customLinks.filter(l => l.type === 'file').length;
  const donationBlocksCount = customLinks.filter(l => l.type === 'donation').length;

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('이 수집 항목을 삭제하시겠습니까?')) return;
    try {
      if (user?.uid) {
        await deleteDoc(doc(db, 'users', user.uid, 'collected_customer_data', id));
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
      
      {/* 1. Customer Information Card (Matching Screenshot 2) */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
        
        {/* Card Header Bar */}
        <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">Customer Information</h2>
            <span className="text-gray-400 font-bold">|</span>
            <span className="text-xs font-bold text-gray-300">Total {collectedData.length} items</span>
          </div>

          <button
            onClick={() => setIsDetailsModalOpen(true)}
            className="text-xs font-bold text-gray-200 hover:text-white underline underline-offset-4 cursor-pointer transition"
          >
            View Details
          </button>
        </div>

        {/* List Body */}
        <div className="p-6 space-y-5 text-gray-800 font-bold text-xs sm:text-sm">
          
          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-lime-500 text-white flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-gray-900">Customer inquiry</span>
            </div>
            <span className="text-gray-400 font-extrabold">0 items</span>
          </div>

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-gray-900">Appointments</span>
            </div>
            <span className="text-gray-400 font-extrabold">0 items</span>
          </div>

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500 text-white flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <span className="text-gray-900">File sharing</span>
            </div>
            <span className="text-gray-400 font-extrabold">{fileBlocksCount} items</span>
          </div>

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <Contact className="w-4 h-4" />
              </div>
              <span className="text-gray-900">Customer info</span>
            </div>
            <span className={clsx("font-extrabold", collectedData.length > 0 ? "text-purple-600" : "text-gray-400")}>
              {collectedData.length} items
            </span>
          </div>

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-gray-900">Subscription</span>
            </div>
            <span className="text-gray-400 font-extrabold">0 items</span>
          </div>

        </div>
      </div>

      {/* 2. Sales Performance Card (Matching Screenshot 2) */}
      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
        
        {/* Card Header Bar */}
        <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">Sales Performance</h2>
            <span className="text-gray-400 font-bold">|</span>
            <span className="text-xs font-bold text-gray-300">Expected amount: 0KRW</span>
          </div>

          <button
            onClick={() => alert('수익 및 매출 내역 상세 페이지 준비 중입니다.')}
            className="text-xs font-bold text-gray-200 hover:text-white underline underline-offset-4 cursor-pointer transition"
          >
            View Details
          </button>
        </div>

        {/* List Body */}
        <div className="p-6 space-y-5 text-gray-800 font-bold text-xs sm:text-sm">
          
          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-gray-900">sell</span>
            </div>
            <span className="text-gray-400 font-extrabold">0KRW</span>
          </div>

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-gray-900">Donation</span>
            </div>
            <span className="text-gray-400 font-extrabold">0KRW</span>
          </div>

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-gray-900">booking</span>
            </div>
            <span className="text-gray-400 font-extrabold">0KRW</span>
          </div>

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-gray-900">Membership</span>
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
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">Ad Revenue</h2>
            <span className="text-gray-400 font-bold">|</span>
            <span className="text-xs font-bold text-gray-300">Expected amount: 0KRW</span>
          </div>

          <button
            onClick={() => alert('광고 수익 내역 페이지 준비 중입니다.')}
            className="text-xs font-bold text-gray-200 hover:text-white underline underline-offset-4 cursor-pointer transition"
          >
            View Details
          </button>
        </div>

        {/* List Body */}
        <div className="p-6 space-y-5 text-gray-800 font-bold text-xs sm:text-sm">
          
          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                <Tv className="w-4 h-4" />
              </div>
              <span className="text-gray-900">Advertisement</span>
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
