import { usePermission } from '@/features/auth';
import { useGetAdminApplicationsQuery } from '@/features/loan';
import { useOrderIncidentsQuery } from '../api/investmentIncidentApi';
import {
  useDisbursementIncidentsQuery, useRepaymentIncidentsQuery, useWithdrawalIncidentsQuery,
} from '../api/paymentIncidentApi';
import { useQuarantinedEventsQuery } from '../api/servicingApi';

/** Chỉ cần `totalElements`, nên mỗi lời gọi đếm lấy một dòng. */
const COUNT = { page: 0, size: 1 } as const;

export interface SystemIncidentCounts {
  /** Sự kiện trả nợ chờ ghép (không gắn được hồ sơ). */
  quarantine: number | undefined;
  /** Hồ sơ có khoản vay đang sai lệch số liệu, số liệu cũ hoặc saga giải ngân chờ vận hành (Loan). */
  loans: number | undefined;
  /** Giao dịch trả nợ chưa ghi xong vào hệ thống lõi (Payment). */
  repayments: number | undefined;
  /** Lệnh giải ngân chưa có kết quả chuyển tiền (Payment). */
  disbursements: number | undefined;
  /** Lệnh góp vốn chưa khớp với ví (Investment). */
  orders: number | undefined;
  /** Lệnh rút tiền chờ đối soát (Payment); chỉ đếm khi xem được "Rút tiền". */
  withdrawals: number | undefined;
  /**
   * Tổng việc thuộc "Đối soát & sự cố" (không gồm rút tiền, thuộc quyền riêng): chỉ có khi đọc được mọi nhóm, để không
   * báo thiếu khi một service lỗi; `null` khi có nhóm lỗi.
   */
  reconciliationTotal: number | null | undefined;
  isError: boolean;
  refetch: () => void;
}

/**
 * Số việc của trang Sự cố hệ thống, cũng là số trên dòng "Đối soát và sự cố" của Tổng quan. Mỗi nhóm một lời gọi
 * `size=1` tới service sở hữu dữ liệu; thiếu quyền Xem thì không gọi (tránh 403) và số để trống.
 */
export function useSystemIncidentCounts(): SystemIncidentCounts {
  const { canView } = usePermission();
  const skip = !canView('reconciliation');
  const quarantine = useQuarantinedEventsQuery(COUNT, { skip });
  const loans = useGetAdminApplicationsQuery({ ...COUNT, servicing: 'INCIDENT' }, { skip });
  const repayments = useRepaymentIncidentsQuery(COUNT, { skip });
  const disbursements = useDisbursementIncidentsQuery(COUNT, { skip });
  const orders = useOrderIncidentsQuery(COUNT, { skip });
  const withdrawals = useWithdrawalIncidentsQuery(COUNT, { skip: !canView('withdrawal') });
  const reconciliationQueries = [quarantine, loans, repayments, disbursements, orders];
  const isError = reconciliationQueries.some((query) => query.isError);
  const counts = reconciliationQueries.map((query) => query.data?.totalElements);

  return {
    quarantine: quarantine.data?.totalElements,
    loans: loans.data?.totalElements,
    repayments: repayments.data?.totalElements,
    disbursements: disbursements.data?.totalElements,
    orders: orders.data?.totalElements,
    withdrawals: withdrawals.data?.totalElements,
    reconciliationTotal: isError
      ? null
      : counts.every((count) => count != null) ? counts.reduce<number>((sum, count) => sum + (count ?? 0), 0) : undefined,
    isError,
    refetch: () => {
      if (!skip) reconciliationQueries.forEach((query) => { void query.refetch(); });
      if (canView('withdrawal')) void withdrawals.refetch();
    },
  };
}
