import {
  useGetInvestmentStatisticsSummaryQuery,
  useGetLoanStatisticsSummaryQuery,
  type CountMap,
} from '@/features/statistics';
import { useCountPendingQuarantineQuery, useGetDashboardMarketSummaryQuery } from '../api/dashboardApi';
import type { CountResult, DashboardTodo } from '../types';

/**
 * Đọc một trạng thái từ bản đồ đếm của summary: `null` khi lỗi (UI hiện "-"), `undefined` khi đang tải.
 * Summary có thể bỏ khóa bằng 0, nên đã có dữ liệu mà thiếu khóa nghĩa là 0.
 */
function countIn(map: CountMap | undefined, key: string, isError: boolean): CountResult {
  if (isError) return null;
  if (!map) return undefined;
  return map[key] ?? 0;
}

/** Cộng hai số đếm; một bên lỗi thì cả tổng coi như không biết. */
function sumCounts(a: CountResult, b: CountResult): CountResult {
  if (a === null || b === null) return null;
  if (a === undefined || b === undefined) return undefined;
  return a + b;
}

/**
 * Việc cần xử lý trên trang Tổng quan.
 *
 * Số đếm lấy từ summary thống kê của Loan và Investment (một lời gọi mỗi service thay cho mỗi ô một lời
 * gọi `size=1`), lỗi thanh toán từ tóm tắt sổ lệnh. Riêng sự kiện trả nợ chờ ghép chưa có trong summary.
 */
export function useDashboardData() {
  const loan = useGetLoanStatisticsSummaryQuery();
  const investment = useGetInvestmentStatisticsSummaryQuery();
  const market = useGetDashboardMarketSummaryQuery();
  const quarantine = useCountPendingQuarantineQuery();

  const applications = loan.data?.applications.byStatus;
  const collections = loan.data?.collections;

  const todos: DashboardTodo[] = [
    { key: 'review', icon: 'file', title: 'Hồ sơ chờ thẩm định', hint: 'Đã chấm điểm, cần quyết định duyệt', to: '/loans?status=PENDING_REVIEW', count: countIn(applications, 'PENDING_REVIEW', loan.isError) },
    { key: 'retry', icon: 'refresh', title: 'Hồ sơ chờ chấm lại điểm', hint: 'Dịch vụ chấm điểm chưa phản hồi', to: '/loans', count: countIn(applications, 'SCORING_RETRY_PENDING', loan.isError) },
    { key: 'draft', icon: 'bars', title: 'Khoản vay chờ duyệt lên sàn', hint: 'Đã ký hợp đồng, chưa mở gọi vốn', to: '/investments/funding?tab=DRAFT', count: countIn(investment.data?.listings.byStatus, 'DRAFT', investment.isError) },
    { key: 'failed', icon: 'alert', title: 'Giao dịch Notes thanh toán lỗi', hint: 'Cần đối soát với ví', to: '/investments/secondary', count: market.isError ? null : market.data?.failedCount, alarming: true },
    { key: 'collection', icon: 'clock', title: 'Hồ sơ thu hồi đang mở', hint: 'Mọi nhóm nợ quá hạn', to: '/loans/overdue', count: loan.isError ? null : collections?.openCases },
    { key: 'reschedule', icon: 'calendar', title: 'Yêu cầu cơ cấu chờ duyệt', hint: 'Người vay xin giãn kỳ hạn', to: '/loans/operations', count: countIn(loan.data?.reschedules.byStatus, 'PENDING_REVIEW', loan.isError) },
    {
      key: 'reconcile',
      icon: 'list',
      title: 'Sai lệch đối soát chưa xử lý',
      hint: 'Sự kiện trả nợ chờ ghép và sai lệch số liệu',
      to: '/reconciliation',
      count: sumCounts(
        quarantine.isError ? null : quarantine.data,
        countIn(loan.data?.reconciliationIncidents.byStatus, 'OPEN', loan.isError),
      ),
    },
  ];

  return {
    todos,
    refetch: () => [loan, investment, market, quarantine].forEach((query) => void query.refetch()),
    isFetching: loan.isFetching || investment.isFetching || market.isFetching,
  };
}
