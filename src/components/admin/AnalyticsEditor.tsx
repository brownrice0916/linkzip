import React, { useEffect, useState } from 'react';
import { useStore, type CustomLink } from '../../store/useStore';
import { 
  BarChart3, 
  Eye, 
  MousePointerClick, 
  Award, 
  Filter, 
  ArrowUpDown, 
  Link2, 
  Heart, 
  FileText, 
  Globe, 
  Megaphone, 
  Users, 
  ShoppingBag,
  Sparkles,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import { requestUpgradePrompt } from '../UpgradePromptHost';
import { subscribeToAnalytics } from '../../services/analyticsService';
import {
  filterAnalyticsByDateRange,
  filterAnalyticsByPeriod,
  sumAnalytics,
  sumLinkClicks,
  toLocalDateKey,
  type AnalyticsPeriod,
} from '../../domain/analytics';
import { entitlementsForPlan } from '../../domain/membershipPlans';

type AnalyticsRangeMode = AnalyticsPeriod | 'date' | 'range';

const PERIOD_OPTIONS: Array<{ value: AnalyticsRangeMode; label: string; description: string }> = [
  { value: 'day', label: '일간', description: '오늘' },
  { value: 'week', label: '주간', description: '최근 7일' },
  { value: 'month', label: '월간', description: '최근 30일' },
  { value: 'date', label: '날짜 지정', description: '선택 날짜' },
  { value: 'range', label: '기간 지정', description: '선택 기간' },
];

const createDateKey = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return toLocalDateKey(date);
};

const formatDateLabel = (dateKey: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(`${dateKey}T00:00:00`));

const formatCompactDateLabel = (dateKey: string, includeYear = true) => {
  const [year, month, day] = dateKey.split('-');
  return includeYear ? `${year}.${month}.${day}` : `${month}.${day}`;
};

export const AnalyticsEditor: React.FC = () => {
  const {
    user,
    pageViews,
    socialLinks,
    customLinks,
    analyticsDailyHistory,
    analyticsLinkClicks,
    loadAnalytics,
    membershipPlan,
  } = useStore();
  const planEntitlements = entitlementsForPlan(membershipPlan);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'clicks' | 'ctr' | 'title'>('clicks');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsRangeMode>('week');
  const [selectedDate, setSelectedDate] = useState(() => createDateKey());
  const [rangeStart, setRangeStart] = useState(() => createDateKey(-6));
  const [rangeEnd, setRangeEnd] = useState(() => createDateKey());
  const [isCustomPeriodOpen, setIsCustomPeriodOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToAnalytics(user.uid, loadAnalytics, (error) => {
      console.error('Failed to subscribe to analytics:', error);
    });
  }, [user?.uid, loadAnalytics]);

  // Helper to extract flattened list of all links (including inside collections)
  const getAllLinks = (linksList: CustomLink[]): CustomLink[] => {
    let result: CustomLink[] = [];
    linksList.forEach((link) => {
      if (link.type === 'collection' && link.links) {
        result = [...result, ...getAllLinks(link.links)];
      } else {
        result.push(link);
      }
    });
    return result;
  };

  const socialAnalyticsLinks: CustomLink[] = socialLinks.map((link) => ({
    id: `social-${link.id || link.platform}`,
    type: 'sns',
    title: link.platform,
    url: link.url,
    clicks: analyticsLinkClicks[`social-${link.id || link.platform}`] || 0,
  }));
  const flatLinks = [...getAllLinks(customLinks), ...socialAnalyticsLinks];

  // Period summary is based on daily source data so views, clicks and CTR use the same range.
  const earliestAvailableDate = planEntitlements.analyticsDays === null
    ? null
    : createDateKey(-(planEntitlements.analyticsDays - 1));
  const availableHistory = earliestAvailableDate
    ? analyticsDailyHistory.filter((item) => item.date >= earliestAvailableDate)
    : analyticsDailyHistory;
  const periodHistory = analyticsPeriod === 'date'
    ? filterAnalyticsByDateRange(availableHistory, selectedDate, selectedDate)
    : analyticsPeriod === 'range'
      ? filterAnalyticsByDateRange(availableHistory, rangeStart, rangeEnd)
      : filterAnalyticsByPeriod(availableHistory, analyticsPeriod);
  const periodSummary = sumAnalytics(periodHistory);
  const periodLinkClicks = sumLinkClicks(periodHistory);
  const periodLinks = flatLinks.map((link) => ({
    ...link,
    clicks: periodLinkClicks[link.id] || 0,
  }));
  const periodLabel = analyticsPeriod === 'date'
    ? formatDateLabel(selectedDate)
    : analyticsPeriod === 'range'
      ? `${formatDateLabel(rangeStart <= rangeEnd ? rangeStart : rangeEnd)} ~ ${formatDateLabel(rangeStart <= rangeEnd ? rangeEnd : rangeStart)}`
      : PERIOD_OPTIONS.find((option) => option.value === analyticsPeriod)?.description || '최근 7일';
  const periodControlLabel = analyticsPeriod === 'date'
    ? formatCompactDateLabel(selectedDate)
    : analyticsPeriod === 'range'
      ? `${formatCompactDateLabel(rangeStart <= rangeEnd ? rangeStart : rangeEnd)} – ${formatCompactDateLabel(rangeStart <= rangeEnd ? rangeEnd : rangeStart, false)}`
      : '기간 선택';
  const totalClicks = periodSummary.clicks;
  const periodPageViews = periodSummary.views;

  // Overall Click-Through Rate (CTR)
  const overallCtr = periodPageViews > 0 ? ((totalClicks / periodPageViews) * 100).toFixed(1) : '0.0';

  // Top Performing Link
  const topLinkCandidate = [...periodLinks].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0];
  const topLink = (topLinkCandidate?.clicks || 0) > 0 ? topLinkCandidate : undefined;

  // Maximum daily views for bar chart scaling
  const maxDailyViews = Math.max(...periodHistory.map((d) => d.views), 1);

  // Filtered and Sorted links list
  const filteredLinks = periodLinks.filter((link) => {
    if (selectedTypeFilter === 'all') return true;
    if (selectedTypeFilter === 'link') return !link.type || link.type === 'link';
    return link.type === selectedTypeFilter;
  });

  const sortedLinks = [...filteredLinks].sort((a, b) => {
    const clicksA = a.clicks || 0;
    const clicksB = b.clicks || 0;
    const ctrA = periodPageViews > 0 ? (clicksA / periodPageViews) * 100 : 0;
    const ctrB = periodPageViews > 0 ? (clicksB / periodPageViews) * 100 : 0;

    if (sortBy === 'clicks') return clicksB - clicksA;
    if (sortBy === 'ctr') return ctrB - ctrA;
    return a.title.localeCompare(b.title);
  });

  // Icon getter for link types
  const getBlockIcon = (type?: string) => {
    switch (type) {
      case 'donation': return <Heart className="w-4 h-4 text-pink-500" />;
      case 'file': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'sns': return <Globe className="w-4 h-4 text-emerald-500" />;
      case 'notice': return <Megaphone className="w-4 h-4 text-amber-500" />;
      case 'customer_info': return <Users className="w-4 h-4 text-slate-600" />;
      case 'sales': return <ShoppingBag className="w-4 h-4 text-orange-500" />;
      default: return <Link2 className="w-4 h-4 text-gray-700" />;
    }
  };

  const getTypeNameLabel = (type?: string) => {
    switch (type) {
      case 'donation': return '후원하기';
      case 'file': return '파일 공유';
      case 'sns': return 'SNS 아이콘';
      case 'notice': return '공지사항';
      case 'customer_info': return '고객 정보';
      case 'sales': return '상품 판매';
      default: return '일반 링크';
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-20 font-sans sm:space-y-8 sm:pb-16">
      
      <div className="flex flex-col gap-3 sm:gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-gray-950">페이지 성과</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black text-gray-800"><Sparkles className="h-3 w-3" />실시간 집계</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-gray-500">{periodLabel}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex w-full rounded-xl bg-gray-100 p-1 sm:w-auto" aria-label="빠른 통계 조회 기간">
            {PERIOD_OPTIONS.slice(0, planEntitlements.analyticsDays === 7 ? 2 : 3).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setAnalyticsPeriod(option.value);
                  setIsCustomPeriodOpen(false);
                }}
                aria-pressed={analyticsPeriod === option.value}
                className={clsx(
                  'min-w-0 flex-1 rounded-lg px-2 py-2 text-xs font-black transition sm:min-w-14 sm:flex-none sm:px-3',
                  analyticsPeriod === option.value
                    ? 'bg-white text-gray-950 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 sm:w-auto">
            {isCustomPeriodOpen && <button type="button" aria-label="기간 선택 닫기" onClick={() => setIsCustomPeriodOpen(false)} className="fixed inset-0 z-20 cursor-default" />}
            <button
              type="button"
              onClick={() => {
                if (planEntitlements.analyticsDays === 7) {
                  requestUpgradePrompt({
                    featureLabel: 'Detailed analytics',
                    title: '더 긴 기간의 통계를 확인해 보세요',
                    description: '현재 베이직 플랜에서는 최근 7일 통계를 확인할 수 있습니다. 스탠다드는 최근 90일, 프리미엄은 전체 기간을 직접 지정해 분석할 수 있어요.',
                  });
                  return;
                }
                setIsCustomPeriodOpen((open) => !open);
              }}
              aria-expanded={isCustomPeriodOpen}
              className={clsx(
                'relative z-30 flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-black transition sm:h-10 sm:w-auto sm:max-w-[220px] sm:justify-start',
                analyticsPeriod === 'date' || analyticsPeriod === 'range'
                  ? 'border-gray-950 bg-gray-950 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
              )}
            >
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{periodControlLabel}</span>
              <ChevronDown className={clsx('h-3.5 w-3.5 shrink-0 transition', isCustomPeriodOpen && 'rotate-180')} />
            </button>

            {isCustomPeriodOpen && (
              <div className="fixed inset-x-3 top-1/2 z-30 max-h-[calc(100dvh-1.5rem)] w-auto -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_18px_55px_rgba(15,23,42,0.18)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[320px] sm:translate-y-0 sm:p-4">
                <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
                  <button type="button" onClick={() => setAnalyticsPeriod('date')} className={clsx('flex-1 rounded-lg py-2 text-xs font-black transition', analyticsPeriod === 'date' ? 'bg-white text-black shadow-sm' : 'text-gray-500')}>날짜 지정</button>
                  <button type="button" onClick={() => setAnalyticsPeriod('range')} className={clsx('flex-1 rounded-lg py-2 text-xs font-black transition', analyticsPeriod === 'range' ? 'bg-white text-black shadow-sm' : 'text-gray-500')}>기간 지정</button>
                </div>

                {analyticsPeriod === 'range' ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="min-w-0 space-y-1.5 text-[11px] font-black text-gray-500">시작일<input type="date" value={rangeStart} max={createDateKey()} onChange={(event) => setRangeStart(event.target.value || createDateKey(-6))} className="block h-12 w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 text-base font-bold text-gray-900 outline-none focus:border-black sm:h-11 sm:text-xs" /></label>
                    <label className="min-w-0 space-y-1.5 text-[11px] font-black text-gray-500">종료일<input type="date" value={rangeEnd} max={createDateKey()} onChange={(event) => setRangeEnd(event.target.value || createDateKey())} className="block h-12 w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 text-base font-bold text-gray-900 outline-none focus:border-black sm:h-11 sm:text-xs" /></label>
                  </div>
                ) : analyticsPeriod === 'date' ? (
                  <label className="min-w-0 space-y-1.5 text-[11px] font-black text-gray-500">조회 날짜<input type="date" value={selectedDate} max={createDateKey()} onChange={(event) => setSelectedDate(event.target.value || createDateKey())} className="block h-12 w-full min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-3 text-base font-bold text-gray-900 outline-none focus:border-black sm:h-11 sm:text-xs" /></label>
                ) : (
                  <p className="rounded-xl bg-gray-50 px-4 py-5 text-center text-xs font-bold text-gray-500">날짜 한 개 또는 조회 기간을 선택해 주세요.</p>
                )}

                <button type="button" onClick={() => setIsCustomPeriodOpen(false)} disabled={analyticsPeriod !== 'date' && analyticsPeriod !== 'range'} className="mt-4 h-11 w-full rounded-xl bg-gray-950 text-xs font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">적용</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        
        {/* 1. Total Page Views */}
        <div className="group relative space-y-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition hover:border-gray-300 sm:rounded-3xl sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500">페이지 조회수</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {periodPageViews.toLocaleString()} <span className="text-xs font-bold text-gray-400">회</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-gray-500">
              <span>{periodLabel} 실제 조회 데이터</span>
            </div>
          </div>
        </div>

        {/* 2. Total Link Clicks */}
        <div className="group relative space-y-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition hover:border-gray-300 sm:rounded-3xl sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500">링크 클릭수</span>
            <div className="w-9 h-9 rounded-2xl bg-gray-100 text-gray-900 flex items-center justify-center font-bold">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {totalClicks.toLocaleString()} <span className="text-xs font-bold text-gray-400">회</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-gray-500">
              <span>{periodLabel} 실제 클릭 데이터</span>
            </div>
          </div>
        </div>

        {/* 3. Average Click-Through Rate (CTR) */}
        <div className="group relative space-y-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition hover:border-gray-400 sm:rounded-3xl sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500">평균 클릭률 (CTR)</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight flex items-baseline gap-1">
              {overallCtr}%
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-600">
              <span>{periodLabel} 클릭 ÷ 조회</span>
            </div>
          </div>
        </div>

        {/* 4. Top Performing Block */}
        <div className="group relative space-y-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition hover:border-gray-300 sm:rounded-3xl sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500">최고 인기 블록</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-base font-black text-gray-900 truncate">
              {topLink?.title || '등록된 블록 없음'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-gray-500">
              <span className="text-gray-950 font-extrabold">{topLink?.clicks || 0}회 클릭</span>
              <span>• CTR {pageViews > 0 ? (((topLink?.clicks || 0) / pageViews) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* 7-Day Traffic Visual Chart */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:space-y-5 sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between sm:pb-4">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-950" />
              <span>{periodLabel} 트래픽 및 클릭 추이</span>
            </h3>
            <p className="text-xs text-gray-500">일별 조회수 대비 실제 클릭수 비교 차트</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold sm:text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-200"></span>
              <span className="text-gray-600">조회수 (Views)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-950"></span>
              <span className="text-gray-900 font-extrabold">클릭수 (Clicks)</span>
            </div>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div className="flex h-44 items-end justify-between gap-1.5 border-b border-gray-100 px-0.5 pb-4 pt-4 sm:h-48 sm:gap-3 sm:px-2 sm:pt-6">
          {periodHistory.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
              아직 집계된 트래픽이 없습니다.
            </div>
          ) : periodHistory.map((item) => {
            const viewsHeightPercent = Math.round((item.views / maxDailyViews) * 100);
            const clicksHeightPercent = Math.round((item.clicks / maxDailyViews) * 100);
            const dailyCtr = item.views > 0 ? ((item.clicks / item.views) * 100).toFixed(0) : 0;

            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                
                {/* Tooltip on hover */}
                <div className="absolute -top-12 bg-black text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-md whitespace-nowrap">
                  <div>{item.date}</div>
                  <div className="text-gray-300">조회: {item.views} | 클릭: {item.clicks} ({dailyCtr}%)</div>
                </div>

                {/* Bars Pair */}
                <div className="w-full flex items-end justify-center gap-1 h-36">
                  {/* Views Bar */}
                  <div 
                    className="w-1/3 bg-gray-200 rounded-t-lg transition-all group-hover:bg-gray-300"
                    style={{ height: `${viewsHeightPercent}%` }}
                    title={`조회수: ${item.views}`}
                  />
                  {/* Clicks Bar */}
                  <div 
                    className="w-1/3 rounded-t-lg bg-gray-950 shadow-xs transition-all group-hover:bg-black"
                    style={{ height: `${clicksHeightPercent}%` }}
                    title={`클릭수: ${item.clicks}`}
                  />
                </div>

                {/* Day Label */}
                <span className="text-[11px] font-bold text-gray-500 group-hover:text-black transition">
                  {item.date.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Link-by-Link Detailed Breakdown List */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:space-y-5 sm:rounded-3xl sm:p-6">
        
        {/* Table Filter & Sorting Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:gap-4 sm:pb-4">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-gray-950" />
              <span>링크별 클릭수 & 클릭률 (CTR) 상세 분석</span>
            </h3>
            <p className="text-xs text-gray-500">{periodLabel} 기준 개별 블록 및 링크의 성과입니다.</p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            {/* Filter by Type */}
            <div className="flex h-10 min-w-0 items-center gap-1 rounded-xl bg-gray-100 px-2 text-[11px] font-bold sm:h-auto sm:gap-1.5 sm:rounded-2xl sm:p-1 sm:text-xs">
              <Filter className="h-3.5 w-3.5 shrink-0 text-gray-500 sm:ml-2" />
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="min-w-0 w-full cursor-pointer border-none bg-transparent py-0 pl-0 pr-4 text-[11px] font-bold text-gray-800 focus:ring-0 sm:w-auto sm:pr-4 sm:text-xs"
              >
                <option value="all">전체 블록</option>
                <option value="link">일반 링크</option>
                <option value="donation">후원하기</option>
                <option value="sales">상품 판매</option>
                <option value="notice">공지사항</option>
                <option value="file">파일 공유</option>
                <option value="sns">SNS</option>
                <option value="customer_info">고객 정보</option>
              </select>
            </div>

            {/* Sort by */}
            <div className="flex h-10 min-w-0 items-center gap-1 rounded-xl bg-gray-100 px-2 text-[11px] font-bold sm:h-auto sm:gap-1.5 sm:rounded-2xl sm:p-1 sm:text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-gray-500 sm:ml-2" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="min-w-0 w-full cursor-pointer border-none bg-transparent py-0 pl-0 pr-4 text-[11px] font-bold text-gray-800 focus:ring-0 sm:w-auto sm:pr-4 sm:text-xs"
              >
                <option value="clicks">클릭수 높은 순</option>
                <option value="ctr">클릭률 (CTR) 높은 순</option>
                <option value="title">이름순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Links List Cards */}
        {sortedLinks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-xs font-bold text-gray-400">조건에 맞는 블록이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedLinks.map((link, idx) => {
              const linkClicks = link.clicks || 0;
              const linkCtr = periodPageViews > 0 ? ((linkClicks / periodPageViews) * 100).toFixed(1) : '0.0';
              const ctrNum = parseFloat(linkCtr);

              return (
                <div
                  key={link.id}
                  className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs transition-all hover:border-gray-400 hover:bg-gray-50 sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    
                    {/* Rank & Link Title */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={clsx(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                        idx === 0 ? "bg-amber-400 text-white" : idx === 1 ? "bg-gray-300 text-gray-800" : idx === 2 ? "bg-amber-700 text-white" : "bg-gray-100 text-gray-600"
                      )}>
                        {idx + 1}
                      </span>

                      <div className="p-2 rounded-xl bg-gray-100 shrink-0">
                        {getBlockIcon(link.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-xs text-gray-900 truncate">
                            {link.title || '제목 없음'}
                          </h4>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md shrink-0">
                            {getTypeNameLabel(link.type)}
                          </span>
                        </div>
                        {link.url && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{link.url}</p>
                        )}
                      </div>
                    </div>

                    {/* Stats: Clicks & CTR % */}
                    <div className="grid w-full shrink-0 grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-left sm:flex sm:w-auto sm:items-center sm:gap-6 sm:border-0 sm:pt-0 sm:text-right">
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">클릭수</div>
                        <div className="text-sm font-black text-gray-900">{linkClicks.toLocaleString()} 회</div>
                      </div>

                      <div className="w-20 text-right">
                        <div className="text-xs text-gray-500 font-semibold">클릭률 (CTR)</div>
                        <div className={clsx(
                          "text-sm font-black",
                          ctrNum > 15 ? "text-gray-950" : ctrNum > 5 ? "text-slate-700" : "text-gray-600"
                        )}>
                          {linkCtr}%
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Progress Bar representation of CTR */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all duration-500",
                          ctrNum > 15 
                            ? "bg-gray-950"
                            : ctrNum > 5 
                            ? "bg-gray-700"
                            : "bg-gray-400"
                        )}
                        style={{ width: `${Math.min(ctrNum * 3, 100)}%` }}
                      />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
