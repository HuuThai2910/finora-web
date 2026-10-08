import { EMPTY, formatNumber, formatPercent, parseDecimal } from '@/utils';

/** Tiền từ chuỗi decimal của backend, không kèm đơn vị. */
export function formatMoney(value: string | null | undefined): string {
  return formatNumber(parseDecimal(value));
}

/** Tiền kèm đơn vị "đ"; thiếu giá trị thì chỉ một gạch nối. */
export function formatMoneyVnd(value: string | null | undefined): string {
  const text = formatMoney(value);
  return text === EMPTY ? EMPTY : `${text} đ`;
}

const PRICE = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Giá theo % dư nợ, luôn một chữ số lẻ để cột giá thẳng hàng: "97.0" thành "97,0%". */
export function formatPrice(value: string | number | null | undefined): string {
  const numeric = typeof value === 'number' ? value : parseDecimal(value);
  return numeric == null || !Number.isFinite(numeric) ? EMPTY : `${PRICE.format(numeric)}%`;
}

/** Lãi suất năm đã ở dạng phần trăm ("15.0000" = 15%). */
export function formatRate(value: string | null | undefined): string {
  return formatPercent(parseDecimal(value));
}

/** Lãi suất kèm đơn vị thời gian, dùng ở chỗ không có tiêu đề cột. */
export function formatAnnualRate(value: string | null | undefined): string {
  const text = formatRate(value);
  return text === EMPTY ? EMPTY : `${text}/năm`;
}
