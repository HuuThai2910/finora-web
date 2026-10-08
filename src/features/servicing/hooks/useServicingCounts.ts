import { useGetLoanStatisticsSummaryQuery } from '@/features/statistics';
import { useQuarantinedEventsQuery, useStaleLoansQuery } from '../api/servicingApi';
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
 * Khoản cần đối soát và sự kiện trả nợ chờ ghép chưa có trong summary nên vẫn đọc `totalElements` của lời gọi
 * `size=1`. Summary cung cấp cùng id tag với các hàng đợi, nên tự làm mới sau mutation hoặc khi bấm "Làm mới".
 */
export function useServicingCounts() {
  const summary = useGetLoanStatisticsSummaryQuery();
  const stale = useStaleLoansQuery(COUNT);
  const quarantine = useQuarantinedEventsQuery(COUNT);
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

  const tabs: Record<ServicingTab, number | undefined> = {
    collection: data?.collections.openCases,
    reschedule: data ? data.reschedules.byStatus.PENDING_REVIEW ?? 0 : undefined,
    reconciliation,
    quarantine: quarantine.data?.totalElements,
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
