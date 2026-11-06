/**
 * Lượt gọi chạy nền: không làm hiện thanh tải toàn trang và được đánh dấu bằng header `X-Finora-Background` để Nhật ký
 * hoạt động mặc định ẩn đi (Gateway ghi cờ `background`).
 *
 * - `POLLED_ENDPOINTS`: endpoint có tự làm mới định kỳ; chỉ lượt refetch (polling) là chạy nền, lần tải đầu và lần đổi
 *   bộ lọc vẫn hiện thanh tải.
 * - `ALWAYS_BACKGROUND_ENDPOINTS`: endpoint riêng của chuông thông báo trên header, không phải nội dung trang.
 */
export const BACKGROUND_HEADER = 'X-Finora-Background';

const POLLED_ENDPOINTS = new Set<string>(['searchActivityLogs']);

const ALWAYS_BACKGROUND_ENDPOINTS = new Set<string>([
  'getBellNotifications',
  'getBellUnreadCount',
  'getBellLoanSummary',
  'getBellInvestmentSummary',
  'getBellUserStats',
]);

/** `forced` là lượt refetch (polling, làm mới sau thao tác, bấm Làm mới) chứ không phải lần tải đầu của tham số đó. */
export function isBackgroundRequest(endpoint: string | undefined, forced: boolean | undefined): boolean {
  if (!endpoint) return false;
  return ALWAYS_BACKGROUND_ENDPOINTS.has(endpoint) || (Boolean(forced) && POLLED_ENDPOINTS.has(endpoint));
}
