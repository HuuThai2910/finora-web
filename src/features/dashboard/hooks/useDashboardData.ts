import { usePermission, type OpsFunctionCode } from '@/features/auth';
import { useSearchProofsQuery } from '@/features/blockchain';
import { useServicingCounts } from '@/features/servicing';
import {
  useGetInvestmentStatisticsSummaryQuery,
  useGetLoanStatisticsSummaryQuery,
  type CountMap,
} from '@/features/statistics';
import { useGetUserStatsQuery } from '@/features/user';
import { useGetDashboardMarketSummaryQuery } from '../api/dashboardApi';
import { reconciliationTodo } from '../mappers/reconciliationTodo';
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

/**
 * Việc cần xử lý trên trang Tổng quan.
 *
 * Số đếm lấy từ summary thống kê của Loan và Investment (một lời gọi mỗi service), lỗi thanh toán từ tóm tắt sổ lệnh,
 * xác minh danh tính chờ duyệt tay từ thống kê người dùng, bằng chứng dừng gửi từ `totalElements` của lời gọi
 * `size=1`. Dòng đối soát dùng đúng số của các tab trên trang Vận hành khoản vay (`useServicingCounts`) để số ở đây
 * khớp số trên tab đích. Mỗi dòng dẫn tới đúng hàng đợi đã lọc sẵn.
 */
export function useDashboardData() {
  const { canView } = usePermission();
  const loan = useGetLoanStatisticsSummaryQuery();
  const investment = useGetInvestmentStatisticsSummaryQuery();
  // Các số không thuộc API thống kê: nhân viên thiếu quyền Xem màn tương ứng thì không gọi (tránh 403).
  const market = useGetDashboardMarketSummaryQuery(undefined, { skip: !canView('secondary-market') });
  const servicing = useServicingCounts();
  const userStats = useGetUserStatsQuery(undefined, { skip: !canView('customer') });
  const deadProofs = useSearchProofsQuery({ status: 'DEAD_LETTER', page: 0, size: 1 }, { skip: !canView('blockchain') });

  const applications = loan.data?.applications.byStatus;
  const collections = loan.data?.collections;
  const reconcile = reconciliationTodo(servicing.tabs, servicing.summary.isError);
  const manualReview = userStats.data ? userStats.data.byEkycStatus.MANUAL_REVIEW ?? 0 : undefined;

  const todos: Array<DashboardTodo & { function: OpsFunctionCode }> = [
    { key: 'review', function: 'loan-application', icon: 'file', title: 'Hồ sơ chờ thẩm định', hint: 'Đã chấm điểm, cần quyết định duyệt', to: '/loans?status=PENDING_REVIEW', count: countIn(applications, 'PENDING_REVIEW', loan.isError) },
    { key: 'retry', function: 'loan-application', icon: 'refresh', title: 'Hồ sơ chờ chấm lại điểm', hint: 'Dịch vụ chấm điểm chưa phản hồi', to: '/loans?status=SCORING_RETRY_PENDING', count: countIn(applications, 'SCORING_RETRY_PENDING', loan.isError) },
    { key: 'draft', function: 'funding', icon: 'bars', title: 'Khoản vay chờ duyệt lên sàn', hint: 'Đã ký hợp đồng, chưa mở gọi vốn', to: '/investments/funding?tab=DRAFT', count: countIn(investment.data?.listings.byStatus, 'DRAFT', investment.isError) },
    { key: 'failed', function: 'secondary-market', icon: 'alert', title: 'Giao dịch Notes thanh toán lỗi', hint: 'Cần đối soát với ví', to: '/investments/secondary?view=trades&settlement=FAILED', count: market.isError ? null : market.data?.failedCount, alarming: true },
    { key: 'collection', function: 'collection', icon: 'clock', title: 'Hồ sơ thu hồi đang mở', hint: 'Mọi nhóm nợ quá hạn', to: '/loans/overdue', count: loan.isError ? null : collections?.openCases },
    { key: 'reschedule', function: 'reschedule', icon: 'calendar', title: 'Yêu cầu cơ cấu chờ duyệt', hint: 'Người vay xin giãn kỳ hạn', to: '/loans/operations?tab=reschedule', count: countIn(loan.data?.reschedules.byStatus, 'PENDING_REVIEW', loan.isError) },
    { key: 'reconcile', function: 'reconciliation', icon: 'list', title: 'Đối soát và sự cố chưa xử lý', hint: 'Sai lệch số liệu, sự cố giao dịch', to: reconcile.to, count: reconcile.count },
    { key: 'ekyc', function: 'customer', icon: 'idCard', title: 'Xác minh danh tính chờ duyệt tay', hint: 'Giấy tờ hoặc khuôn mặt cần người xem lại', to: '/customers/kyc?ekyc=MANUAL_REVIEW', count: userStats.isError ? null : manualReview },
    { key: 'proofs', function: 'blockchain', icon: 'alert', title: 'Bằng chứng dừng gửi', hint: 'Chưa ghi được lên sổ cái, cần gửi lại', to: '/blockchain/proofs?status=DEAD_LETTER', count: deadProofs.isError ? null : deadProofs.data?.totalElements, alarming: true },
  ];

  return {
    // Mỗi việc dẫn tới một hàng đợi: chỉ hiện việc mà tài khoản mở được hàng đợi đó.
    todos: todos.filter((todo) => canView(todo.function)),
    refetch: () => {
      void loan.refetch();
      void investment.refetch();
      if (canView('secondary-market')) void market.refetch();
      if (canView('customer')) void userStats.refetch();
      if (canView('blockchain')) void deadProofs.refetch();
    },
    isFetching: loan.isFetching || investment.isFetching || market.isFetching || userStats.isFetching || deadProofs.isFetching,
  };
}
