/*
 * Public API của feature thống kê (STATS-001): hook RTK Query, kiểu dữ liệu và các hàm dựng biểu đồ
 * dùng ở nhiều trang. Biểu đồ chỉ dùng một trang thì nằm ở feature của trang đó.
 */
export {
  useGetInvestmentStatisticsSeriesQuery,
  useGetInvestmentStatisticsSummaryQuery,
  useGetLoanStatisticsSeriesQuery,
  useGetLoanStatisticsSummaryQuery,
  useGetUserStatisticsSeriesQuery,
} from './api/statisticsApi';
export { StaleProjectionNote } from './components/StaleProjectionNote';
export { buildDebtGroupOption, debtGroupName, overdueGroups } from './mappers/debtGroupOption';
export {
  buildTradedValueOption, formatPricePercent, permilleToPercent,
} from './mappers/marketOptions';
export {
  bucketLabel, bucketTitle, formatIsoDate, lastDaysRange, lastMonthsRange, shiftDays, vnToday,
} from './mappers/period';
export { changePercent, splitPeriods, sumOf } from './mappers/series';
export type * from './types';
