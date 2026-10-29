import { usePermission } from '@/features/auth';
import { useGetLoanStatisticsSummaryQuery } from '@/features/statistics';
import { useOrderIncidentsQuery } from '../api/investmentIncidentApi';
import {
  useDisbursementIncidentsQuery, useRepaymentIncidentsQuery, useWithdrawalIncidentsQuery,
} from '../api/paymentIncidentApi';
import { useQuarantinedEventsQuery, useRepairSagasQuery, useStaleLoansQuery } from '../api/servicingApi';
import { COLLECTION_STAGES, type ServicingTab } from '../constant';
import type { CollectionStage } from '../types';

/** Chỉ cần `totalElements`, nên mỗi lời gọi đếm lấy một dòng. */
const COUNT = { page: 0, size: 1 } as const;

export interface StageCount {
  stage: CollectionStage;
  label: string;
  range: string;
  debtGroup: number;
  count: number;
}

/**
 * Số việc trên từng tab, số hồ sơ thu hồi đang mở theo mức độ và danh mục dư nợ theo nhóm nợ.
 *
 * Thu hồi, cơ cấu, sai lệch đối soát và nhóm nợ lấy từ summary thống kê của Loan (một lời gọi, đếm ở DB).
 * Khoản cần đối soát, sự kiện trả nợ chờ ghép và năm hàng đợi sự cố giao dịch (gồm lệnh rút tiền chờ đối soát, R4)
 * chưa có trong summary nên vẫn đọc `totalElements` của lời gọi `size=1`. Summary cung cấp cùng id tag với các hàng
 * đợi, nên tự làm mới sau mutation hoặc khi bấm "Làm mới". Số sự cố chỉ hiện khi đọc được cả năm hàng đợi, để không
 * báo thiếu khi một service lỗi.
 */
export function useServicingCounts() {
  const { canView } = usePermission();
  // Summary thống kê cần quyền Xem "Tổng quan & thống kê"; các hàng đợi cần quyền Xem chức năng của mình. Thiếu quyền thì
  // không gọi (tránh 403) và số trên tab để trống.
  const summary = useGetLoanStatisticsSummaryQuery(undefined, { skip: !canView('dashboard') });
  const noReconciliation = !canView('reconciliation');
  const stale = useStaleLoansQuery(COUNT, { skip: noReconciliation });
  const quarantine = useQuarantinedEventsQuery(COUNT, { skip: noReconciliation });
  const repaymentIncidents = useRepaymentIncidentsQuery(COUNT, { skip: noReconciliation });
  const disbursementIncidents = useDisbursementIncidentsQuery(COUNT, { skip: noReconciliation });
  const repairSagas = useRepairSagasQuery(COUNT, { skip: noReconciliation });
  const orderIncidents = useOrderIncidentsQuery(COUNT, { skip: noReconciliation });
  const withdrawalIncidents = useWithdrawalIncidentsQuery(COUNT, { skip: !canView('withdrawal') });
  const data = summary.data;

  // Backend trả đủ mọi mức thu hồi (kể cả 0); khóa thiếu vẫn coi là 0 để an toàn khi enum đổi.
  const stages: StageCount[] | undefined = data
    ? COLLECTION_STAGES.map((item) => ({
      stage: item.stage,
      label: item.label,
      range: item.range,
      debtGroup: item.debtGroup,
      count: data.collections.openByStage[item.stage] ?? 0,
    }))
    : undefined;

  const incidents = data ? data.reconciliationIncidents.byStatus.OPEN ?? 0 : undefined;
  const reconciliation = stale.data && incidents != null ? stale.data.totalElements + incidents : undefined;
  // Chỉ cộng các hàng đợi tài khoản xem được; số chỉ hiện khi đọc được hết các hàng đợi đó.
  const incidentCounts = [
    ...(noReconciliation ? [] : [repaymentIncidents, disbursementIncidents, repairSagas, orderIncidents]),
    ...(canView('withdrawal') ? [withdrawalIncidents] : []),
  ].map((query) => query.data?.totalElements);
  const transactionIncidents = incidentCounts.length > 0 && incidentCounts.every((count) => count != null)
    ? incidentCounts.reduce<number>((sum, count) => sum + (count ?? 0), 0)
    : undefined;

  const tabs: Record<ServicingTab, number | undefined> = {
    collection: data?.collections.openCases,
    reschedule: data ? data.reschedules.byStatus.PENDING_REVIEW ?? 0 : undefined,
    reconciliation,
    quarantine: quarantine.data?.totalElements,
    incidents: transactionIncidents,
  };

  return {
    tabs,
    stages,
    openCases: data?.collections.openCases,
    summary,
    /** Lúc tải xong số liệu gần nhất, hiện ở đầu trang như "Cập nhật 08:30, 06/10/2026". */
    updatedAt: summary.fulfilledTimeStamp,
    isFetching: summary.isFetching,
  };
}
