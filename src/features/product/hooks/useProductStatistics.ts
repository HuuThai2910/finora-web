import { useMemo } from 'react';
import {
  lastMonthsRange,
  useGetLoanStatisticsSeriesQuery,
  useGetLoanStatisticsSummaryQuery,
} from '@/features/statistics';

/** Số tháng của biểu đồ hồ sơ nộp và giải ngân, theo mockup ("6 tháng", tháng này tính đến hôm nay). */
export const PRODUCT_CHART_MONTHS = 6;

/**
 * Thống kê theo sản phẩm cho trang Sản phẩm vay và ngăn chi tiết: summary (`portfolio.byProduct`) và series
 * cột tháng có `productPoints`. Trang và ngăn gọi cùng tham số nên RTK Query chỉ tải một lần.
 */
export function useProductStatistics() {
  const summary = useGetLoanStatisticsSummaryQuery();
  const series = useGetLoanStatisticsSeriesQuery(lastMonthsRange(PRODUCT_CHART_MONTHS));
  const products = summary.data?.portfolio.byProduct;
  // Tên sản phẩm lấy từ summary (series chỉ có productId); giữ tham chiếu ổn định cho option biểu đồ.
  const names = useMemo(
    () => new Map((products ?? []).map((item) => [item.productId, item.productName])),
    [products],
  );
  return { summary, series, names };
}
