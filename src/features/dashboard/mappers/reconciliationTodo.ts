import type { CountResult } from '../types';

/** Ba tab của trang Vận hành khoản vay thuộc chức năng "Đối soát & sự cố", theo thứ tự trên trang. */
const RECONCILIATION_TABS = ['reconciliation', 'quarantine', 'incidents'] as const;

type ReconciliationTab = (typeof RECONCILIATION_TABS)[number];

/**
 * Dòng "Đối soát và sự cố" của Việc cần xử lý: cộng đúng số trên ba tab (khớp số người dùng thấy khi bấm sang) và
 * dẫn tới tab đầu tiên còn việc; không còn việc thì về tab Đối soát. Số chỉ có khi đọc được cả ba tab; summary thống
 * kê lỗi thì coi như không biết (hiện "-").
 */
export function reconciliationTodo(
  tabs: Record<ReconciliationTab, number | undefined>,
  summaryError: boolean,
): { count: CountResult; to: string } {
  const firstOpen = RECONCILIATION_TABS.find((tab) => (tabs[tab] ?? 0) > 0) ?? 'reconciliation';
  const to = `/loans/operations?tab=${firstOpen}`;
  if (summaryError) return { count: null, to };
  const counts = RECONCILIATION_TABS.map((tab) => tabs[tab]);
  if (counts.some((count) => count === undefined)) return { count: undefined, to };
  return { count: counts.reduce<number>((sum, count) => sum + (count ?? 0), 0), to };
}
