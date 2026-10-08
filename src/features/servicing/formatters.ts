import { EMPTY, formatNumber } from '@/utils';

/** Tiền kèm "đ" như mockup (không dùng ký hiệu ₫ của Intl). */
export function money(value: number | null | undefined): string {
  const text = formatNumber(value);
  return text === EMPTY ? EMPTY : `${text} đ`;
}

/** Ngày yyyy-MM-dd theo giờ máy, dùng cho thuộc tính `min` của ô chọn ngày. */
export function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
