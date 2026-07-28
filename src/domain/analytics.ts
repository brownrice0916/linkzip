const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export type AnalyticsPeriod = 'day' | 'week' | 'month';

type DailyAnalyticsItem = {
  date: string;
  views: number;
  clicks: number;
};

export const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const filterAnalyticsByPeriod = <T extends DailyAnalyticsItem>(
  items: T[],
  period: AnalyticsPeriod,
  now = new Date(),
) => {
  const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (days - 1));
  const startKey = toLocalDateKey(start);
  const endKey = toLocalDateKey(now);

  return items.filter((item) => item.date >= startKey && item.date <= endKey);
};

export const sumAnalytics = (items: DailyAnalyticsItem[]) =>
  items.reduce(
    (total, item) => ({
      views: total.views + Number(item.views || 0),
      clicks: total.clicks + Number(item.clicks || 0),
    }),
    { views: 0, clicks: 0 },
  );

export const shouldRecordAnalytics = (
  hostname = typeof window !== 'undefined' ? window.location.hostname : '',
) => !LOCAL_HOSTNAMES.has(hostname.toLowerCase());
