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
  const summary = useGetLoanStatisticsSummaryQuery();
  const stale = useStaleLoansQuery(COUNT);
  const quarantine = useQuarantinedEventsQuery(COUNT);
  const repaymentIncidents = useRepaymentIncidentsQuery(COUNT);
  const disbursementIncidents = useDisbursementIncidentsQuery(COUNT);
  const repairSagas = useRepairSagasQuery(COUNT);
  const orderIncidents = useOrderIncidentsQuery(COUNT);
  const withdrawalIncidents = useWithdrawalIncidentsQuery(COUNT);
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
  const transactionIncidents = repaymentIncidents.data && disbursementIncidents.data && repairSagas.data
    && orderIncidents.data && withdrawalIncidents.data
    ? repaymentIncidents.data.totalElements + disbursementIncidents.data.totalElements + repairSagas.data.totalElements
      + orderIncidents.data.totalElements + withdrawalIncidents.data.totalElements
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
