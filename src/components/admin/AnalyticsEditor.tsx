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
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { subscribeToAnalytics } from '../../services/analyticsService';

export const AnalyticsEditor: React.FC = () => {
  const {
    user,
    pageViews,
    socialLinks,
    customLinks,
    analyticsDailyHistory,
    analyticsLinkClicks,
    loadAnalytics,
  } = useStore();
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'clicks' | 'ctr' | 'title'>('clicks');

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

  // Total Clicks calculation across all links
  const totalClicks = flatLinks.reduce((acc, link) => acc + (link.clicks || 0), 0);

  // Overall Click-Through Rate (CTR)
  const overallCtr = pageViews > 0 ? ((totalClicks / pageViews) * 100).toFixed(1) : '0.0';

  // Top Performing Link
  const topLinkCandidate = [...flatLinks].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0];
  const topLink = (topLinkCandidate?.clicks || 0) > 0 ? topLinkCandidate : undefined;

  // Maximum daily views for bar chart scaling
  const maxDailyViews = Math.max(...analyticsDailyHistory.map((d) => d.views), 1);

  // Filtered and Sorted links list
  const filteredLinks = flatLinks.filter((link) => {
    if (selectedTypeFilter === 'all') return true;
    if (selectedTypeFilter === 'link') return !link.type || link.type === 'link';
    return link.type === selectedTypeFilter;
  });

  const sortedLinks = [...filteredLinks].sort((a, b) => {
    const clicksA = a.clicks || 0;
    const clicksB = b.clicks || 0;
    const ctrA = pageViews > 0 ? (clicksA / pageViews) * 100 : 0;
    const ctrB = pageViews > 0 ? (clicksB / pageViews) * 100 : 0;

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
      case 'customer_info': return <Users className="w-4 h-4 text-purple-500" />;
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
    <div className="space-y-8 animate-fade-in pb-16 font-sans">
      
      {/* Compact realtime information */}
      <div className="flex items-center gap-3 bg-gray-50 text-gray-900 p-4 rounded-2xl border border-gray-200">
        <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-purple-600" /></div>
        <div><p className="text-xs font-black">실시간 성과 데이터</p><p className="text-[11px] text-gray-500 mt-0.5">프로필 조회수, 링크 클릭수, 클릭률을 실제 집계 데이터로 보여줍니다.</p></div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Total Page Views */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-3 relative overflow-hidden group hover:border-gray-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500">페이지 총 조회수</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {pageViews.toLocaleString()} <span className="text-xs font-bold text-gray-400">회</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-gray-500">
              <span>실제 누적 조회 데이터</span>
            </div>
          </div>
        </div>

        {/* 2. Total Link Clicks */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-3 relative overflow-hidden group hover:border-gray-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500">총 링크 클릭수</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {totalClicks.toLocaleString()} <span className="text-xs font-bold text-gray-400">회</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-gray-500">
              <span>실시간 클릭 집계</span>
            </div>
          </div>
        </div>

        {/* 3. Average Click-Through Rate (CTR) */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-3 relative overflow-hidden group hover:border-purple-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-500">평균 클릭률 (CTR)</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight flex items-baseline gap-1">
              {overallCtr}%
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-600">
              <span>🎯 (총 클릭 / 조회수 비율)</span>
            </div>
          </div>
        </div>

        {/* 4. Top Performing Block */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-3 relative overflow-hidden group hover:border-gray-300 transition">
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
              <span className="text-purple-600 font-extrabold">{topLink?.clicks || 0}회 클릭</span>
              <span>• CTR {pageViews > 0 ? (((topLink?.clicks || 0) / pageViews) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* 7-Day Traffic Visual Chart */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span>주간 트래픽 및 클릭 추이 (최근 7일)</span>
            </h3>
            <p className="text-xs text-gray-500">일별 조회수 대비 실제 클릭수 비교 차트</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-200"></span>
              <span className="text-gray-600">조회수 (Views)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-600"></span>
              <span className="text-gray-900 font-extrabold">클릭수 (Clicks)</span>
            </div>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-gray-100 pb-4">
          {analyticsDailyHistory.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
              아직 집계된 트래픽이 없습니다.
            </div>
          ) : analyticsDailyHistory.map((item) => {
            const viewsHeightPercent = Math.round((item.views / maxDailyViews) * 100);
            const clicksHeightPercent = Math.round((item.clicks / maxDailyViews) * 100);
            const dailyCtr = item.views > 0 ? ((item.clicks / item.views) * 100).toFixed(0) : 0;

            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                
                {/* Tooltip on hover */}
                <div className="absolute -top-12 bg-black text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-md whitespace-nowrap">
                  <div>{item.date}</div>
                  <div className="text-purple-300">조회: {item.views} | 클릭: {item.clicks} ({dailyCtr}%)</div>
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
                    className="w-1/3 bg-gradient-to-t from-purple-700 to-indigo-500 rounded-t-lg transition-all shadow-xs group-hover:from-purple-800 group-hover:to-indigo-600"
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
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-5">
        
        {/* Table Filter & Sorting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-purple-600" />
              <span>링크별 클릭수 & 클릭률 (CTR) 상세 분석</span>
            </h3>
            <p className="text-xs text-gray-500">개별 블록 및 링크의 성과 지표 목록입니다.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by Type */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl text-xs font-bold">
              <Filter className="w-3.5 h-3.5 ml-2 text-gray-500" />
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-gray-800 focus:ring-0 cursor-pointer pr-4"
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
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl text-xs font-bold">
              <ArrowUpDown className="w-3.5 h-3.5 ml-2 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-xs font-bold text-gray-800 focus:ring-0 cursor-pointer pr-4"
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
              const linkCtr = pageViews > 0 ? ((linkClicks / pageViews) * 100).toFixed(1) : '0.0';
              const ctrNum = parseFloat(linkCtr);

              return (
                <div
                  key={link.id}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-purple-300 transition-all bg-white hover:bg-purple-50/20 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    
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
                    <div className="flex items-center gap-6 shrink-0 text-right">
                      <div>
                        <div className="text-xs text-gray-500 font-semibold">클릭수</div>
                        <div className="text-sm font-black text-gray-900">{linkClicks.toLocaleString()} 회</div>
                      </div>

                      <div className="w-20 text-right">
                        <div className="text-xs text-gray-500 font-semibold">클릭률 (CTR)</div>
                        <div className={clsx(
                          "text-sm font-black",
                          ctrNum > 15 ? "text-purple-600" : ctrNum > 5 ? "text-blue-600" : "text-gray-700"
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
                            ? "bg-gradient-to-r from-purple-600 to-indigo-500" 
                            : ctrNum > 5 
                            ? "bg-gradient-to-r from-blue-500 to-indigo-400" 
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
