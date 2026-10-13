import { useMemo } from 'react';
import {
  shiftDays,
  splitPeriods,
  useGetInvestmentStatisticsSeriesQuery,
  useGetInvestmentStatisticsSummaryQuery,
  useGetLoanStatisticsSeriesQuery,
  useGetLoanStatisticsSummaryQuery,
  useGetUserStatisticsSeriesQuery,
  lastMonthsRange,
  vnToday,
  type StatisticsRange,
} from '@/features/statistics';
import type { PeriodDays } from '../types';

/** Số tháng của biểu đồ dư nợ quá hạn theo nhóm nợ (mockup: "6 tháng gần nhất"). */
export const OVERDUE_CHART_MONTHS = 6;

/**
 * Số liệu theo kỳ của trang Tổng quan (7/30/90 ngày).
 *
 * - Kỳ so sánh: series ngày dài gấp đôi kỳ, tách thành kỳ này và kỳ trước liền kề để tính chênh lệch
 *   (vốn gọi được, phí chợ Notes, tài khoản mới). Phần kỳ trước còn cho đủ 6 ngày đứng trước ngày đầu kỳ
 *   để tính bình quân 7 ngày của đường xu hướng (vốn gọi được, giải ngân, phí).
 * - Biểu đồ: series của đúng kỳ này, cột ngày với 7/30 ngày và cột tuần với 90 ngày (đỡ dày như mockup).
 *   Kỳ 30 ngày trùng tham số với trang Gọi vốn và Chợ Notes nên dùng chung cache.
 *
 * Tham số là chuỗi ngày theo giờ Việt Nam; RTK Query so khóa cache theo giá trị nên tính lại mỗi lần
 * render không gây gọi lại.
 */
export function useDashboardStatistics(period: PeriodDays) {
  const today = vnToday();
  const currentFrom = shiftDays(today, -(period - 1));
  const compareRange: StatisticsRange = { from: shiftDays(today, -(2 * period - 1)), to: today, bucket: 'DAY' };
  const chartRange: StatisticsRange = { from: currentFrom, to: today, bucket: period <= 30 ? 'DAY' : 'WEEK' };

  const loanSummary = useGetLoanStatisticsSummaryQuery();
  const investmentSummary = useGetInvestmentStatisticsSummaryQuery();
  const investmentCompare = useGetInvestmentStatisticsSeriesQuery(compareRange);
  const investmentChart = useGetInvestmentStatisticsSeriesQuery(chartRange);
  const loanCompare = useGetLoanStatisticsSeriesQuery(compareRange);
  const loanChart = useGetLoanStatisticsSeriesQuery(chartRange);
  // Biểu đồ nợ quá hạn: số cuối mỗi tháng của 6 tháng gần nhất, không đổi theo kỳ 7/30/90.
  const loanMonths = useGetLoanStatisticsSeriesQuery(lastMonthsRange(OVERDUE_CHART_MONTHS));
  const userCompare = useGetUserStatisticsSeriesQuery(compareRange);
  const userChart = useGetUserStatisticsSeriesQuery(chartRange);

  // Giữ tham chiếu ổn định giữa các lần render để biểu đồ xu hướng không vẽ lại khi query khác đổi trạng thái.
  const investmentPoints = investmentCompare.currentData?.points;
  const investmentPeriods = useMemo(
    () => (investmentPoints ? splitPeriods(investmentPoints, currentFrom, period) : undefined),
    [investmentPoints, currentFrom, period],
  );
  const loanPoints = loanCompare.currentData?.points;
  const loanPeriods = useMemo(
    () => (loanPoints ? splitPeriods(loanPoints, currentFrom, period) : undefined),
    [loanPoints, currentFrom, period],
  );
  const userPoints = userCompare.currentData?.points;
  const userPeriods = useMemo(
    () => (userPoints ? splitPeriods(userPoints, currentFrom, period) : undefined),
    [userPoints, currentFrom, period],
  );

  return {
    period,
    currentFrom,
    chartBucket: chartRange.bucket,
    loanSummary,
    investmentSummary,
    investmentCompare,
    investmentPeriods,
    investmentChart,
    loanCompare,
    loanPeriods,
    loanChart,
    loanMonths,
    userCompare,
    userPeriods,
    userChart,
    refetch: () => [loanSummary, investmentSummary, investmentCompare, investmentChart, loanCompare, loanChart, loanMonths, userCompare, userChart]
      .forEach((query) => void query.refetch()),
    isFetching: [loanSummary, investmentSummary, investmentCompare, loanCompare, loanChart].some((query) => query.isFetching),
  };
}

export type DashboardStatistics = ReturnType<typeof useDashboardStatistics>;
