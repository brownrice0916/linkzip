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
  ChevronDown,
} from "lucide-react";
import { listCustomerData, removeCustomerData } from "../../services/customerDataService";
import { subscribeToGuestbook } from "../../services/guestbookService";
import {
  subscribeToSalesOrders,
  manageBankTransferOrder,
  listBankTransferOrders,
  updateSalesOrderFulfillment,
  updateSalesOrderStatus,
  type SalesOrder,
  type BankTransferOrderSummary,
} from "../../services/commerceService";
import {
  deleteAnonymousMessage,
  markAnonymousMessageRead,
  subscribeToAnonymousMessages,
  type AnonymousMessage,
} from "../../services/anonymousMessageService";
import clsx from "clsx";
import { entitlementsForPlan } from "../../domain/membershipPlans";
import { requestUpgradePrompt } from "../UpgradePromptHost";

export const GrowthEditor: React.FC = () => {
  const { user, profile, customLinks, language, membershipPlan } = useStore();
  const planEntitlements = entitlementsForPlan(membershipPlan);
  const tr = (ko: string, en: string) => language === 'ko' ? ko : en;

  const [collectedData, setCollectedData] = useState<CollectedCustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [anonymousMessages, setAnonymousMessages] = useState<AnonymousMessage[]>([]);
  const [messagesExpanded, setMessagesExpanded] = useState(false);
  const [guestbookEntryCount, setGuestbookEntryCount] = useState(0);
  const [guestbookCountLoading, setGuestbookCountLoading] = useState(true);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [salesExpanded, setSalesExpanded] = useState(false);
  const [buyersExpanded, setBuyersExpanded] = useState(false);
  const [bankTransferOrders, setBankTransferOrders] = useState<BankTransferOrderSummary[]>([]);

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

  useEffect(() => {
    if (!user?.uid) {
      setBankTransferOrders([]);
      return;
    }
    let active = true;
    const refresh = () => void listBankTransferOrders().then((orders) => {
      if (active) setBankTransferOrders(orders);
    }).catch((error) => {
      console.error('Error fetching bank transfer orders:', error);
    });
    refresh();
    const intervalId = window.setInterval(refresh, 30_000);
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [user?.uid, profile.username]);

  useEffect(() => {
    const targetUsername = profile.username?.trim();
    if (!targetUsername) {
      setGuestbookEntryCount(0);
      setGuestbookCountLoading(false);
      return;
    }

    setGuestbookCountLoading(true);
    return subscribeToGuestbook(
      targetUsername,
      (entries) => {
        setGuestbookEntryCount(entries.length);
        setGuestbookCountLoading(false);
      },
      (error) => {
        console.error('Error fetching guestbook entry count:', error);
        setGuestbookEntryCount(0);
        setGuestbookCountLoading(false);
      },
    );
  }, [profile.username]);

  useEffect(() => {
    if (!user?.uid) {
      setSalesOrders([]);
      return;
    }
    return subscribeToSalesOrders(user.uid, setSalesOrders, (error) => {
      console.error('Error fetching sales orders:', error);
      setSalesOrders([]);
    });
  }, [user?.uid]);

  // Counts based on customLinks
  const customerInfoBlocksCount = customLinks.filter(l => l.type === 'customer_info').length;
  const fileBlocksCount = customLinks.filter(l => l.type === 'file').length;
  const donationBlocksCount = customLinks.filter(l => l.type === 'donation').length;
  const anonymousMessageBlocksCount = customLinks.filter(l => l.type === 'anonymous_message').length;
  const profileMessages = anonymousMessages.filter((message) => message.targetUsername === profile.username);
  const unreadMessagesCount = profileMessages.filter((message) => !message.isRead).length;
  const profileSalesOrders = salesOrders.filter((order) => order.targetUsername === profile.username);
  const paidSalesOrders = profileSalesOrders.filter((order) => order.status === 'paid');
  const pendingSalesOrders = profileSalesOrders.filter((order) => order.status === 'pending');
  const cancelledSalesOrders = profileSalesOrders.filter((order) => order.status === 'cancelled');
  const depositReportedOrderNumbers = new Set(
    bankTransferOrders
      .filter((order) => order.kind === 'sales' && order.status === 'DEPOSIT_REPORTED')
      .map((order) => order.orderNumber),
  );
  const totalPaidSales = paidSalesOrders.reduce((sum, order) => sum + order.amount, 0);
  const estimatedPlatformFee = Math.floor(totalPaidSales * planEntitlements.salesFeePercent / 100);
  const estimatedSettlement = totalPaidSales - estimatedPlatformFee;

  const salesByProduct = Array.from(profileSalesOrders.reduce((summary, order) => {
    const key = `${order.blockId}:${order.productId}`;
    const current = summary.get(key) || {
      key,
      productName: order.productName,
      paidAmount: 0,
      buyerKeys: new Set<string>(),
      pendingCount: 0,
    };
    if (order.status === 'paid') {
      current.paidAmount += order.amount;
      current.buyerKeys.add(order.buyerEmail || order.buyerContact || order.buyerName || order.id);
    }
    if (order.status === 'pending') current.pendingCount += 1;
    summary.set(key, current);
    return summary;
  }, new Map<string, { key: string; productName: string; paidAmount: number; buyerKeys: Set<string>; pendingCount: number }>()).values());

  const handleOrderStatus = async (order: SalesOrder, status: SalesOrder['status']) => {
    if (!user?.uid) return;
    if (status === 'paid' && !window.confirm(tr('실제 입금 내역과 입금자명을 확인하셨나요? 입금 확인을 누르면 판매가 완료 처리됩니다.', 'Have you verified the deposit and depositor name? Confirming marks this sale as completed.'))) return;
    try {
      if (order.paymentProvider === 'bank_transfer') {
        await manageBankTransferOrder(order.orderNumber, status === 'paid' ? 'confirm' : 'cancel');
        setBankTransferOrders(await listBankTransferOrders());
      } else {
        await updateSalesOrderStatus(user.uid, order.id, status);
      }
    } catch (error) {
      console.error('Error updating sales order:', error);
      alert(tr('구매 상태를 변경하지 못했습니다.', 'Unable to update the order status.'));
    }
  };

  const handleCancelOrder = async (order: SalesOrder) => {
    if (!window.confirm(tr('이 주문을 정말 취소하시겠습니까? 취소 후에도 구매자 내역은 보관됩니다.', 'Cancel this order? The buyer record will be kept.'))) return;
    await handleOrderStatus(order, 'cancelled');
  };

  const handleRestoreOrder = async (order: SalesOrder) => {
    if (!user?.uid || !window.confirm(tr('이 주문을 입금 대기 상태로 되돌리시겠습니까? 다시 입금 확인을 해야 판매가 확정됩니다.', 'Restore this order to pending payment? It must be confirmed again before the sale is completed.'))) return;
    try {
      if (order.paymentProvider === 'bank_transfer') {
        await manageBankTransferOrder(order.orderNumber, 'restore');
        setBankTransferOrders(await listBankTransferOrders());
      } else {
        await updateSalesOrderStatus(user.uid, order.id, 'pending');
      }
    } catch (error) {
      console.error('Error restoring sales order:', error);
      alert(error instanceof Error ? error.message : tr('주문을 되돌리지 못했습니다.', 'Unable to restore the order.'));
    }
  };

  const handleDonationTransfer = async (order: BankTransferOrderSummary, action: 'confirm' | 'cancel') => {
    try {
      await manageBankTransferOrder(order.orderNumber, action);
      setBankTransferOrders(await listBankTransferOrders());
    } catch (error) {
      alert(error instanceof Error ? error.message : '후원 입금 상태를 변경하지 못했습니다.');
    }
  };

  const handleShippingUpdate = async (order: SalesOrder, nextStatus: SalesOrder['fulfillmentStatus']) => {
    if (!user?.uid) return;
    let carrier = order.carrier || '';
    let trackingNumber = order.trackingNumber || '';
    if (nextStatus === 'shipping') {
      carrier = window.prompt(tr('택배사를 입력해주세요.', 'Enter the carrier.'), carrier || 'CJ대한통운')?.trim() || '';
      if (!carrier) return;
      trackingNumber = window.prompt(tr('송장번호를 입력해주세요.', 'Enter the tracking number.'), trackingNumber)?.trim() || '';
      if (!trackingNumber) return;
    }
    try {
      await updateSalesOrderFulfillment(user.uid, order.id, { fulfillmentStatus: nextStatus, carrier, trackingNumber });
    } catch (error) {
      console.error('Error updating shipping information:', error);
      alert(tr('배송 정보를 변경하지 못했습니다.', 'Unable to update shipping information.'));
    }
  };

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
    if (!planEntitlements.canExportCustomerData) {
      requestUpgradePrompt({
        featureLabel: 'CSV export',
        title: '고객 데이터를 엑셀로 내려받아 보세요',
        description: '고객 데이터 CSV 내보내기는 스탠다드 플랜부터 이용할 수 있습니다. 수집한 고객 정보를 내려받아 마케팅과 고객 관리에 활용해 보세요.',
      });
      return;
    }
    if (collectedData.length === 0) {
      alert('수집된 고객 정보가 없습니다.');
      return;
    }
    const headers = ['ID', '이메일', '연락처', '이름', '수집일시'];
    const rows = collectedData.slice(0, planEntitlements.maxCustomerRecords).map(d => [
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

  const visibleCollectedData = collectedData.slice(0, planEntitlements.maxCustomerRecords);
  const filteredData = visibleCollectedData.filter(d =>
    (d.email && d.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.name && d.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.phone && d.phone.includes(searchQuery))
  );

  return (
    <div className="max-w-4xl animate-fade-in space-y-4 pb-20 font-sans sm:space-y-6">

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs sm:rounded-3xl">
        <button type="button" onClick={() => void toggleMessages()} className="flex w-full cursor-pointer items-center justify-between gap-2 bg-gray-950 px-4 py-3.5 text-left text-white transition hover:bg-black sm:px-6 sm:py-4" aria-expanded={messagesExpanded}>
          <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/40 bg-[#ff5f35]"><MessageCircle className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-extrabold">{tr('익명 메시지함', 'Anonymous inbox')}</span><span className="block text-[10px] font-bold text-gray-400">{tr(`메시지 블록 ${anonymousMessageBlocksCount}개 · 받은 메시지 ${profileMessages.length}개`, `${anonymousMessageBlocksCount} blocks · ${profileMessages.length} messages`)}</span></span></span>
          <span className="flex items-center gap-3">{unreadMessagesCount > 0 && <span className="rounded-full bg-[#ff5f35] px-2.5 py-1 text-[10px] font-black">{tr(`새 메시지 ${unreadMessagesCount}`, `${unreadMessagesCount} new`)}</span>}<ChevronDown className={clsx('h-4 w-4 transition-transform', messagesExpanded && 'rotate-180')} /></span>
        </button>
        {messagesExpanded && (
          <div className="space-y-3 p-3 sm:p-5">
            {profileMessages.length === 0 ? <div className="rounded-2xl bg-gray-50 px-4 py-10 text-center"><MessageCircle className="mx-auto mb-2 h-7 w-7 text-gray-300" /><p className="text-xs font-bold text-gray-400">{tr('아직 받은 익명 메시지가 없습니다.', 'No anonymous messages yet.')}</p></div> : profileMessages.map((message) => (
              <article key={message.id} className="group rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-[#ff5f35] hover:shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[10px] font-black text-[#ff5f35]"><span className="h-2 w-2 rounded-full bg-[#ff5f35]" />{tr('익명', 'Anonymous')}</span><span className="flex items-center gap-2"><time className="text-[10px] font-semibold text-gray-400">{formatMessageDate(message)}</time><button type="button" onClick={() => void handleDeleteAnonymousMessage(message.id)} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-gray-300 transition hover:bg-red-50 hover:text-red-500" aria-label={tr('메시지 삭제', 'Delete message')}><Trash2 className="h-3.5 w-3.5" /></button></span></div>
                <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-gray-800">{message.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      
      {/* 1. Customer Information Card (Matching Screenshot 2) */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs sm:rounded-3xl">
        
        {/* Card Header Bar */}
        <div className="flex items-center justify-between gap-3 bg-black px-4 py-3.5 text-white sm:px-6 sm:py-4">
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
        <div className="space-y-3 p-3 text-xs font-bold text-gray-800 sm:space-y-5 sm:p-6 sm:text-sm">
          
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
              <div className="w-8 h-8 rounded-xl bg-[#ff5f35] text-[#171714] flex items-center justify-center">
                <Contact className="w-4 h-4" />
              </div>
              <span className="text-gray-900">{tr('고객 정보 수집', 'Customer information')}</span>
            </div>
            <span className={clsx("font-extrabold", collectedData.length > 0 ? "text-[#ff5f35]" : "text-gray-400")}>
              {tr(`${collectedData.length}개`, `${collectedData.length} items`)}
            </span>
          </div>

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-gray-900">{tr('방명록 작성 수', 'Guestbook entries')}</span>
            </div>
            <span className={clsx("font-extrabold", guestbookEntryCount > 0 ? "text-amber-600" : "text-gray-400")}>
              {guestbookCountLoading ? '—' : tr(`${guestbookEntryCount}개`, `${guestbookEntryCount} entries`)}
            </span>
          </div>

        </div>
      </div>

      {/* 2. Sales Performance Card (Matching Screenshot 2) */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs sm:rounded-3xl">
        
        {/* Card Header Bar */}
        <div className="flex items-center justify-between gap-3 bg-black px-4 py-3.5 text-white sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight">{tr('판매 실적', 'Sales performance')}</h2>
            <span className="text-gray-400 font-bold">|</span>
            <span className="text-xs font-bold text-gray-300">{tr(`확정 판매: ${totalPaidSales.toLocaleString()}원`, `Paid sales: KRW ${totalPaidSales.toLocaleString()}`)}</span>
          </div>

          <button
            onClick={() => setSalesExpanded((current) => !current)}
            className="text-xs font-bold text-gray-200 hover:text-white underline underline-offset-4 cursor-pointer transition"
          >
            {salesExpanded ? tr('접기', 'Close') : tr('자세히 보기', 'View details')}
          </button>
        </div>

        {/* List Body */}
        <div className="space-y-3 p-3 text-xs font-bold text-gray-800 sm:space-y-5 sm:p-6 sm:text-sm">
          
          <button type="button" onClick={() => setSalesExpanded((current) => !current)} className="flex w-full cursor-pointer items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-gray-900">{tr('판매', 'Sales')}</span>
            </div>
            <span className={clsx("font-extrabold", totalPaidSales > 0 ? "text-emerald-600" : "text-gray-400")}>{totalPaidSales.toLocaleString()}KRW</span>
          </button>

          {salesExpanded && (
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="grid grid-cols-3 gap-2 rounded-2xl border-2 border-black bg-[#f7f3ea] p-3 shadow-[3px_3px_0_#171714]">
                <div><p className="text-[9px] font-black text-gray-500">확정 판매액</p><p className="mt-1 text-xs font-black text-gray-950">{totalPaidSales.toLocaleString()}원</p></div>
                <div><p className="text-[9px] font-black text-gray-500">LinkZip 수수료 {planEntitlements.salesFeePercent}%</p><p className="mt-1 text-xs font-black text-[#ff5b39]">-{estimatedPlatformFee.toLocaleString()}원</p></div>
                <div><p className="text-[9px] font-black text-gray-500">예상 정산액</p><p className="mt-1 text-xs font-black text-emerald-700">{estimatedSettlement.toLocaleString()}원</p></div>
                <p className="col-span-3 border-t border-black/10 pt-2 text-[9px] font-bold leading-relaxed text-gray-500">PG 결제 수수료는 별도이며, 계좌이체 주문은 판매자가 등록한 계좌로 직접 입금됩니다.</p>
              </div>
              {salesByProduct.length === 0 && <p className="py-4 text-center text-xs font-bold text-gray-400">{tr('아직 구매 신청이 없습니다.', 'No purchase requests yet.')}</p>}
              {salesByProduct.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-xs">
                  <div className="min-w-0"><p className="truncate text-xs font-black text-gray-900">{item.productName}</p><p className="mt-0.5 text-[10px] font-bold text-gray-400">{tr(`구매자 ${item.buyerKeys.size}명${item.pendingCount ? ` · 입금 확인 대기 ${item.pendingCount}건` : ''}`, `${item.buyerKeys.size} buyers${item.pendingCount ? ` · ${item.pendingCount} pending` : ''}`)}</p></div>
                  <strong className="shrink-0 text-xs font-black text-gray-900">{item.paidAmount.toLocaleString()}원</strong>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <span className="text-gray-900">{tr('후원', 'Donation')}</span>
            </div>
            <span className="text-gray-400 font-extrabold">0KRW</span>
          </div>
          {bankTransferOrders.filter((order) => order.kind === 'donation' && (order.status === 'WAITING_DEPOSIT' || order.status === 'DEPOSIT_REPORTED')).map((order) => (
            <div key={order.orderNumber} className={`mx-2 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${order.status === 'DEPOSIT_REPORTED' ? 'border-emerald-200 bg-emerald-50' : 'border-pink-200 bg-pink-50'}`}>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><p className="truncate text-xs font-black text-gray-900">{order.nickname || '익명 후원자'} · {order.amount.toLocaleString()}원</p>{order.status === 'DEPOSIT_REPORTED' && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black text-white">후원자 확인 요청</span>}</div><p className="mt-0.5 text-[10px] font-bold text-gray-500">입금자 {order.depositorName} · {order.buyerContact}</p></div>
              <div className="flex gap-1.5"><button type="button" onClick={() => void handleDonationTransfer(order, 'confirm')} className="cursor-pointer rounded-lg bg-black px-2.5 py-1.5 text-[10px] font-black text-white">입금 확인</button><button type="button" onClick={() => void handleDonationTransfer(order, 'cancel')} className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-gray-500">취소</button></div>
            </div>
          ))}

        </div>
      </div>

      {/* 3. Product buyers and order management */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 bg-black px-4 py-3.5 text-white sm:items-center sm:px-6 sm:py-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="shrink-0 text-sm font-extrabold tracking-tight sm:text-base">{tr('상품 구매자', 'Product buyers')}</h2>
            <span className="hidden font-bold text-gray-400 sm:inline">|</span>
            <span className="basis-full truncate text-[10px] font-bold text-gray-300 sm:basis-auto sm:text-xs">
              {tr(`구매 완료 ${paidSalesOrders.length}건 · 입금 대기 ${pendingSalesOrders.length}건 · 취소 ${cancelledSalesOrders.length}건`, `${paidSalesOrders.length} completed · ${pendingSalesOrders.length} pending · ${cancelledSalesOrders.length} cancelled`)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBuyersExpanded((current) => !current)}
            className="shrink-0 cursor-pointer text-xs font-bold text-gray-200 underline underline-offset-4 transition hover:text-white"
          >
            {buyersExpanded ? tr('접기', 'Close') : tr('내역 보기', 'View orders')}
          </button>
        </div>

        <div className="space-y-3 p-3 text-xs font-bold text-gray-800 sm:space-y-4 sm:p-6 sm:text-sm">
          <button
            type="button"
            onClick={() => setBuyersExpanded((current) => !current)}
            className="flex w-full cursor-pointer items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-gray-50"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-gray-900">{tr('상품 구매 내역', 'Product order history')}</span>
            </span>
            <span className={clsx('font-extrabold', profileSalesOrders.length > 0 ? 'text-emerald-600' : 'text-gray-400')}>
              {tr(`${profileSalesOrders.length}건`, `${profileSalesOrders.length} orders`)}
            </span>
          </button>

          {buyersExpanded && (
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              {profileSalesOrders.length === 0 && (
                <p className="py-6 text-center text-xs font-bold text-gray-400">{tr('아직 상품 구매 내역이 없습니다.', 'No product orders yet.')}</p>
              )}

              {pendingSalesOrders.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-500">{tr('입금 확인 대기', 'Pending payment confirmation')}</p>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] font-bold leading-relaxed text-amber-900">
                    {tr('실제 입금 내역과 입금자명을 확인한 뒤 반드시 ‘입금 확인’을 눌러주세요. 누르기 전에는 판매 완료 및 파일 전달 처리가 진행되지 않습니다.', 'After verifying the deposit and depositor name, be sure to click “Mark paid.” The sale and file delivery remain pending until then.')}
                  </div>
                  {pendingSalesOrders.map((order) => {
                    const reported = depositReportedOrderNumbers.has(order.orderNumber);
                    return (
                      <article key={order.id} className={clsx('rounded-xl border px-3 py-3', reported ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-xs font-black text-gray-900">{order.buyerName || tr('이름 미입력', 'No name')} · {order.productName}</p>
                              {reported && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black text-white">{tr('구매자 확인 요청', 'Buyer reported deposit')}</span>}
                            </div>
                            <p className="mt-0.5 font-mono text-[10px] text-gray-500">{order.orderNumber || order.id}</p>
                            <p className="mt-1 text-[10px] font-bold text-gray-600">{order.amount.toLocaleString()}원{order.depositorName ? ` · 입금자 ${order.depositorName}` : ''}</p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-gray-600">
                              {order.buyerContact && <a href={`tel:${order.buyerContact}`} className="hover:text-black hover:underline">{order.buyerContact}</a>}
                              {order.buyerEmail && <a href={`mailto:${order.buyerEmail}`} className="break-all hover:text-black hover:underline">{order.buyerEmail}</a>}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <button type="button" onClick={() => void handleOrderStatus(order, 'paid')} className="cursor-pointer rounded-lg bg-black px-2.5 py-1.5 text-[10px] font-black text-white hover:bg-gray-800">{tr('입금 확인', 'Mark paid')}</button>
                            <button type="button" onClick={() => void handleCancelOrder(order)} className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-gray-500 hover:text-red-500">{tr('취소', 'Cancel')}</button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {paidSalesOrders.length > 0 && (
                <div className={clsx('space-y-2', pendingSalesOrders.length > 0 && 'border-t border-gray-200 pt-4')}>
                  <p className="text-[10px] font-black text-gray-500">{tr('구매 완료', 'Completed orders')}</p>
                  {paidSalesOrders.map((order) => (
                    <article key={`buyer-${order.id}`} className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-gray-900">{order.buyerName || tr('이름 미입력', 'No name')} · {order.productName}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-gray-400">{order.orderNumber || order.id}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">{order.amount.toLocaleString()}원</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-gray-600">
                        {order.buyerContact && <a href={`tel:${order.buyerContact}`} className="hover:text-black hover:underline">{order.buyerContact}</a>}
                        {order.buyerEmail && <a href={`mailto:${order.buyerEmail}`} className="break-all hover:text-black hover:underline">{order.buyerEmail}</a>}
                      </div>
                      {order.salesType === 'product' && order.shippingAddress && (
                        <div className="mt-2 rounded-lg bg-gray-50 px-2.5 py-2">
                          <p className="break-words text-[10px] font-semibold text-gray-600">{order.postalCode ? `[${order.postalCode}] ` : ''}{order.shippingAddress}</p>
                          {order.trackingNumber && <p className="mt-1 text-[10px] font-black text-blue-700">{order.carrier} · {order.trackingNumber}</p>}
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-gray-600">
                              {order.fulfillmentStatus === 'delivered' ? tr('배송 완료', 'Delivered') : order.fulfillmentStatus === 'shipping' ? tr('배송 중', 'Shipping') : tr('상품 준비 중', 'Preparing')}
                            </span>
                            <span className="flex gap-1.5">
                              <button type="button" onClick={() => void handleShippingUpdate(order, 'shipping')} className="cursor-pointer rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-black text-white hover:bg-blue-700">{tr(order.trackingNumber ? '송장 수정' : '배송 시작', order.trackingNumber ? 'Edit tracking' : 'Start shipping')}</button>
                              <button type="button" onClick={() => void handleShippingUpdate(order, 'delivered')} className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-gray-600 hover:bg-gray-50">{tr('배송 완료', 'Delivered')}</button>
                            </span>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {cancelledSalesOrders.length > 0 && (
                <div className={clsx('space-y-2', (pendingSalesOrders.length > 0 || paidSalesOrders.length > 0) && 'border-t border-gray-200 pt-4')}>
                  <p className="text-[10px] font-black text-gray-500">{tr('취소된 주문', 'Cancelled orders')}</p>
                  {cancelledSalesOrders.map((order) => (
                    <article key={`cancelled-${order.id}`} className="rounded-xl border border-gray-200 bg-gray-100 px-3 py-3 text-gray-500">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-gray-700">{order.buyerName || tr('이름 미입력', 'No name')} · {order.productName}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-gray-400">{order.orderNumber || order.id}</p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-gray-500">{tr('취소됨', 'Cancelled')}</span>
                          <button
                            type="button"
                            onClick={() => void handleRestoreOrder(order)}
                            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[10px] font-black text-gray-700 transition hover:border-black hover:text-black"
                          >
                            {tr('입금 대기로 되돌리기', 'Restore to pending')}
                          </button>
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-bold">{order.amount.toLocaleString()}원</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold">
                        {order.buyerContact && <a href={`tel:${order.buyerContact}`} className="hover:text-black hover:underline">{order.buyerContact}</a>}
                        {order.buyerEmail && <a href={`mailto:${order.buyerEmail}`} className="break-all hover:text-black hover:underline">{order.buyerEmail}</a>}
                      </div>
                      {order.salesType === 'product' && order.shippingAddress && (
                        <p className="mt-2 break-words rounded-lg bg-white px-2.5 py-2 text-[10px] font-semibold text-gray-500">
                          {order.postalCode ? `[${order.postalCode}] ` : ''}{order.shippingAddress}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 4. Ad Revenue Card (Matching Screenshot 2) */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs sm:rounded-3xl">
        
        {/* Card Header Bar */}
        <div className="flex items-center justify-between gap-3 bg-black px-4 py-3.5 text-white sm:px-6 sm:py-4">
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
        <div className="space-y-3 p-3 text-xs font-bold text-gray-800 sm:space-y-5 sm:p-6 sm:text-sm">
          
          <div className="flex items-center justify-between hover:bg-gray-50 p-2.5 rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#ff5f35] text-[#171714] flex items-center justify-center">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 font-sans backdrop-blur-xs sm:p-4">
          <div className="relative my-auto w-full max-w-2xl space-y-4 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 sm:space-y-6 sm:rounded-3xl sm:p-8">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#ffcf4a] text-[#171714] flex items-center justify-center font-bold">
                  <Contact className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">수집된 고객 정보 목록</h3>
                  <p className="text-xs text-gray-500 font-medium">{visibleCollectedData.length} / {planEntitlements.maxCustomerRecords.toLocaleString()}개 사용 중</p>
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
                <span>{planEntitlements.canExportCustomerData ? 'CSV 엑셀 다운로드' : '스탠다드에서 다운로드'}</span>
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
