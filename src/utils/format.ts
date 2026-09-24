/**
 * Định dạng hiển thị dùng chung toàn project.
 *
 * Chỉ chứa những gì thật sự giống nhau giữa các feature. Hàm nào một màn hình cần hành vi
 * riêng thì giữ tại feature đó — gom bằng mọi giá sẽ đẻ ra tham số cờ và khiến mỗi lần
 * sửa lại phải kiểm tra mọi nơi gọi.
 */

const VI = 'vi-VN';

/** Giá trị thiếu hiển thị bằng gạch ngang, không phải chuỗi rỗng hay số 0. */
export const EMPTY = '—';

/**
 * Số tiền dạng thuần số, không kèm ký hiệu tiền tệ.
 *
 * Nơi gọi tự thêm "đ" vào sau, để bảng có thể đặt đơn vị ở tiêu đề cột thay vì lặp lại
 * trên từng dòng.
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return new Intl.NumberFormat(VI, { maximumFractionDigits: 0 }).format(value);
}

/** Số tiền kèm ký hiệu tiền tệ, dùng cho chỗ đứng một mình không có đơn vị đi kèm. */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return new Intl.NumberFormat(VI, { style: 'currency', currency: 'VND' }).format(value);
}

/** Ngày giờ ngắn, ví dụ 25/9/26 23:36. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY;
  return new Intl.DateTimeFormat(VI, { dateStyle: 'short', timeStyle: 'short' })
    .format(new Date(value));
}

/** Chỉ ngày, không giờ. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY;
  return new Intl.DateTimeFormat(VI, { dateStyle: 'short' }).format(new Date(value));
}

/**
 * Phần trăm đã ở dạng phần trăm (15 → "15%").
 *
 * Backend trả lãi suất dạng tỷ lệ (0.15), nên nơi gọi phải nhân 100 trước — cố ý không
 * nhận cờ chuyển đổi, để không đọc nhầm đơn vị tại chỗ gọi.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EMPTY;
  return `${new Intl.NumberFormat(VI, { maximumFractionDigits: 2 }).format(value)}%`;
}

/**
 * Chuỗi decimal của backend sang number.
 *
 * Tiền và lãi suất được truyền dạng chuỗi để không mất chính xác khi qua JSON; đây là
 * ranh giới duy nhất đổi sang number, và chỉ phục vụ hiển thị.
 */
export function parseDecimal(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
