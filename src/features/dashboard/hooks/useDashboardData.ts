import { usePermission, type OpsFunctionCode } from '@/features/auth';
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
  const { canView } = usePermission();
  const loan = useGetLoanStatisticsSummaryQuery();
  const investment = useGetInvestmentStatisticsSummaryQuery();
  // Hai số này không thuộc API thống kê: nhân viên thiếu quyền Xem màn tương ứng thì không gọi (tránh 403).
  const market = useGetDashboardMarketSummaryQuery(undefined, { skip: !canView('secondary-market') });
  const quarantine = useCountPendingQuarantineQuery(undefined, { skip: !canView('reconciliation') });

  const applications = loan.data?.applications.byStatus;
  const collections = loan.data?.collections;

  const todos: Array<DashboardTodo & { function: OpsFunctionCode }> = [
    { key: 'review', function: 'loan-application', icon: 'file', title: 'Hồ sơ chờ thẩm định', hint: 'Đã chấm điểm, cần quyết định duyệt', to: '/loans?status=PENDING_REVIEW', count: countIn(applications, 'PENDING_REVIEW', loan.isError) },
    { key: 'retry', function: 'loan-application', icon: 'refresh', title: 'Hồ sơ chờ chấm lại điểm', hint: 'Dịch vụ chấm điểm chưa phản hồi', to: '/loans', count: countIn(applications, 'SCORING_RETRY_PENDING', loan.isError) },
    { key: 'draft', function: 'funding', icon: 'bars', title: 'Khoản vay chờ duyệt lên sàn', hint: 'Đã ký hợp đồng, chưa mở gọi vốn', to: '/investments/funding?tab=DRAFT', count: countIn(investment.data?.listings.byStatus, 'DRAFT', investment.isError) },
    { key: 'failed', function: 'secondary-market', icon: 'alert', title: 'Giao dịch Notes thanh toán lỗi', hint: 'Cần đối soát với ví', to: '/investments/secondary', count: market.isError ? null : market.data?.failedCount, alarming: true },
    { key: 'collection', function: 'collection', icon: 'clock', title: 'Hồ sơ thu hồi đang mở', hint: 'Mọi nhóm nợ quá hạn', to: '/loans/overdue', count: loan.isError ? null : collections?.openCases },
    { key: 'reschedule', function: 'reschedule', icon: 'calendar', title: 'Yêu cầu cơ cấu chờ duyệt', hint: 'Người vay xin giãn kỳ hạn', to: '/loans/operations', count: countIn(loan.data?.reschedules.byStatus, 'PENDING_REVIEW', loan.isError) },
    {
      key: 'reconcile',
      function: 'reconciliation',
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
    // Mỗi việc dẫn tới một hàng đợi: chỉ hiện việc mà tài khoản mở được hàng đợi đó.
    todos: todos.filter((todo) => canView(todo.function)),
    refetch: () => {
      void loan.refetch();
      void investment.refetch();
      if (canView('secondary-market')) void market.refetch();
      if (canView('reconciliation')) void quarantine.refetch();
    },
    isFetching: loan.isFetching || investment.isFetching || market.isFetching,
  };
}
