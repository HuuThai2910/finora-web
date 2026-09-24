/**
 * Định dạng riêng của sàn gọi vốn.
 *
 * Những gì dùng chung toàn project nằm ở `@/utils`; ở đây chỉ còn phần đặc thù: backend
 * của Investment trả tiền và lãi suất dạng **chuỗi** decimal, nên mỗi hàm phải parse
 * trước khi định dạng.
 */
import {
  EMPTY,
  formatDate as formatDateBase,
  formatDateTime as formatDateTimeBase,
  formatNumber,
  formatPercent as formatPercentBase,
  parseDecimal,
} from '@/utils';

export { parseDecimal };

/** Ngày giờ — giữ export ở đây để màn hình không phải import từ hai nơi. */
export const formatDateTime = formatDateTimeBase;

/** Chỉ ngày, dùng cho hạn gọi vốn trên bảng. */
export const formatDate = formatDateBase;

/** Phần trăm khi giá trị đã ở dạng phần trăm (fundedPercent, sharePercent). */
export const formatPercent = formatPercentBase;

/** Số tiền: nhận cả chuỗi decimal của backend lẫn number đã tính ở client. */
export function formatMoney(value: string | number | null | undefined): string {
  const numeric = typeof value === 'number' ? value : parseDecimal(value);
  return formatNumber(numeric);
}

/** Backend lưu lãi suất dạng tỷ lệ (0.1500 = 15%/năm). */
export function formatRate(value: string | null | undefined): string {
  const numeric = parseDecimal(value);
  if (numeric == null) return EMPTY;
  return `${formatPercentBase(numeric * 100)}/năm`;
}

export function formatMonths(value: number | null | undefined): string {
  if (value == null) return EMPTY;
  return `${value} tháng`;
}

/**
 * Số Note mà một khoản vay sẽ được xé nhỏ thành.
 *
 * Chỉ dùng để hiển thị cho người quản trị hình dung quy mô; con số chính thức do backend
 * chốt tại thời điểm cam kết, frontend không tự tính lại để ra quyết định.
 */
export function estimateNoteCount(
  targetAmount: string,
  noteDenomination: string,
): number | null {
  const target = parseDecimal(targetAmount);
  const denomination = parseDecimal(noteDenomination);
  if (target == null || denomination == null || denomination <= 0) return null;
  return Math.round(target / denomination);
}

/** Nhãn phương thức trả nợ; giá trị lạ từ backend hiện nguyên văn thay vì làm vỡ giao diện. */
const REPAYMENT_LABEL: Record<string, string> = {
  DECLINING_BALANCE: 'Dư nợ giảm dần',
  REDUCING_BALANCE: 'Dư nợ giảm dần',
  EQUAL_INSTALLMENT: 'Trả đều hàng kỳ',
  ANNUITY: 'Trả đều hàng kỳ',
  FLAT: 'Lãi phẳng',
  BULLET: 'Trả gốc cuối kỳ',
};

export function repaymentLabel(value: string | null | undefined): string {
  if (!value) return EMPTY;
  return REPAYMENT_LABEL[value.toUpperCase()] ?? value;
}
