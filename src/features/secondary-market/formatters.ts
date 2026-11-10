import { EMPTY, formatNumber, formatPercent, parseDecimal } from '@/utils';

/** Tiền kèm đơn vị "đ" từ chuỗi decimal của backend; thiếu giá trị thì một gạch nối. */
export function formatMoneyVnd(value: string | null | undefined): string {
  const text = formatNumber(parseDecimal(value));
  return text === EMPTY ? EMPTY : `${text} đ`;
}

const MILLIONS = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** Tiền gọn theo triệu cho dòng phụ của bảng: "239,5 tr". */
export function formatMillions(value: string | null | undefined): string {
  const numeric = parseDecimal(value);
  return numeric == null ? EMPTY : `${MILLIONS.format(numeric / 1_000_000)} tr`;
}

const PRICE = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Giá theo % dư nợ, luôn một chữ số lẻ để cột giá thẳng hàng: "97.0" thành "97,0%". */
export function formatPrice(value: string | number | null | undefined): string {
  const numeric = typeof value === 'number' ? value : parseDecimal(value);
  return numeric == null || !Number.isFinite(numeric) ? EMPTY : `${PRICE.format(numeric)}%`;
}

/** Lãi suất năm đã ở dạng phần trăm ("15.0000" = 15%), kèm đơn vị thời gian. */
export function formatAnnualRate(value: string | null | undefined): string {
  const text = formatPercent(parseDecimal(value));
  return text === EMPTY ? EMPTY : `${text}/năm`;
}
