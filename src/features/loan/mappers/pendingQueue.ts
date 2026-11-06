import type { AdminLoanReviewSummary } from '../types';

type QueueKey = Pick<AdminLoanReviewSummary, 'applicationNumber' | 'submittedAt'>;

function time(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** So hai hồ sơ theo ngày nộp tăng dần; trùng thời điểm thì theo mã hồ sơ để thứ tự luôn ổn định. */
function compareQueue(a: QueueKey, b: QueueKey): number {
  return time(a.submittedAt) - time(b.submittedAt) || a.applicationNumber.localeCompare(b.applicationNumber);
}

/**
 * Hàng chờ thẩm định theo thứ tự nộp, cũ nhất trước. Backend trả mới nhất trước (`createdAt desc`); người thẩm định
 * xử lý hồ sơ chờ lâu trước nên bộ chuyển hàng chờ sắp lại trong mẫu đã tải.
 */
export function oldestFirst<T extends QueueKey>(items: readonly T[]): T[] {
  return [...items].sort(compareQueue);
}

/**
 * Hồ sơ kế tiếp sau vị trí của `current` trong hàng chờ đã sắp (dùng khi `current` vừa rời hàng chờ). Không còn hồ sơ
 * nào nộp muộn hơn thì lùi về hồ sơ chờ lâu nhất còn lại; hàng chờ rỗng thì `null`.
 */
export function nextInQueue<T extends QueueKey>(queue: readonly T[], current: QueueKey): T | null {
  return queue.find((item) => compareQueue(item, current) > 0) ?? queue[0] ?? null;
}
