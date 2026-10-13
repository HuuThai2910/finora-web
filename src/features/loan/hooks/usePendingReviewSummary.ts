import { useGetAdminApplicationsQuery } from '../api/loanReviewApi';
import type { AdminLoanReviewSummary } from '../types';

/** Số hồ sơ chờ thẩm định tối đa backend trả trong một trang (giới hạn `size` của Loan Service). */
export const PENDING_SAMPLE_SIZE = 100;

export interface PendingReviewSummary {
  total: number;
  /** Số hồ sơ thật sự dùng để cộng tổng; nhỏ hơn `total` khi hàng chờ dài hơn một trang. */
  sampled: number;
  requestedAmount: number;
  /** PD bình quân (0..1) của các hồ sơ đã có PD; null khi chưa hồ sơ nào có. Thay hạn mức gợi ý mà AI v17 đã bỏ. */
  averagePd: number | null;
  /** Điểm đánh giá bình quân của các hồ sơ đã có điểm; null khi chưa hồ sơ nào có điểm. */
  averageScore: number | null;
  unscored: number;
  oldest: AdminLoanReviewSummary | null;
}

function average(values: (number | null | undefined)[]): number | null {
  const present = values.filter((value): value is number => value != null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}

function summarize(items: AdminLoanReviewSummary[], total: number, oldest: AdminLoanReviewSummary | null): PendingReviewSummary {
  const scores = items
    .map((item) => item.assessment?.evaluationScore)
    .filter((score): score is number => score != null);
  return {
    total,
    sampled: items.length,
    requestedAmount: items.reduce((sum, item) => sum + item.requestedAmount, 0),
    averagePd: average(items.map((item) => item.assessment?.pdProbability)),
    averageScore: average(scores),
    unscored: items.length - scores.length,
    oldest,
  };
}

/**
 * Tóm tắt hàng chờ thẩm định cho thẻ đầu trang Quản lý khoản vay.
 *
 * Backend chưa có API tổng hợp, nên cộng trên tối đa {@link PENDING_SAMPLE_SIZE} hồ sơ mới nhất
 * (UI ghi rõ phạm vi khi hàng chờ dài hơn). Riêng hồ sơ chờ lâu nhất luôn đúng: danh sách xếp mới
 * nhất trước, nên phần tử cuối cùng lấy bằng `size=1&page=total-1`.
 */
export function usePendingReviewSummary() {
  const sample = useGetAdminApplicationsQuery({ status: 'PENDING_REVIEW', page: 0, size: PENDING_SAMPLE_SIZE });
  const items = sample.data?.data ?? [];
  const total = sample.data?.totalElements ?? 0;
  const truncated = total > items.length;
  const last = useGetAdminApplicationsQuery(
    { status: 'PENDING_REVIEW', page: Math.max(0, total - 1), size: 1 },
    { skip: !truncated },
  );

  const oldest = truncated ? last.data?.data[0] ?? null : items[items.length - 1] ?? null;

  return {
    summary: sample.data ? summarize(items, total, oldest) : null,
    isLoading: sample.isLoading,
    error: sample.error,
    refetch: sample.refetch,
  };
}
