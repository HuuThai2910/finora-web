import { EMPTY, formatNumber, formatPercent, parseDecimal } from '@/utils';

/** Tiền từ chuỗi decimal của backend, không kèm đơn vị. */
export function formatMoney(value: string | null | undefined): string {
  return formatNumber(parseDecimal(value));
}

const PRICE = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Giá theo % dư nợ, luôn một chữ số lẻ để cột giá thẳng hàng: "97.0" → "97,0%". */
export function formatPrice(value: string | null | undefined): string {
  const numeric = parseDecimal(value);
  return numeric == null ? EMPTY : `${PRICE.format(numeric)}%`;
}

/** Lãi suất năm đã ở dạng phần trăm ("15.0000" = 15%/năm). */
export function formatAnnualRate(value: string | null | undefined): string {
  const numeric = parseDecimal(value);
  return numeric == null ? EMPTY : `${formatPercent(numeric)}/năm`;
}
