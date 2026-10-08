import type { StatisticsBucket, StatisticsRange } from '../types';

/**
 * Tính khoảng ngày gửi cho API series và nhãn cột.
 *
 * Backend cắt cột theo giờ Việt Nam (STATS-001 §2.1), nên "hôm nay" cũng phải lấy theo giờ Việt Nam,
 * không theo múi giờ máy người xem. Ngày được xử lý như chuỗi YYYY-MM-DD (tính bằng UTC thuần) để không
 * lệch một ngày khi đổi múi giờ.
 */

const VN_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function vnToday(): string {
  return VN_DATE.format(new Date());
}

function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Cộng/trừ số ngày trên chuỗi YYYY-MM-DD. */
export function shiftDays(iso: string, days: number): string {
  const { y, m, d } = parseIso(iso);
  return toIso(new Date(Date.UTC(y, m - 1, d + days)));
}

/** Ngày đầu tháng, lùi `monthsBack` tháng so với tháng chứa `iso`. */
export function startOfMonthBack(iso: string, monthsBack: number): string {
  const { y, m } = parseIso(iso);
  return toIso(new Date(Date.UTC(y, m - 1 - monthsBack, 1)));
}

/** `days` ngày gần nhất tính cả hôm nay. Với WEEK/MONTH backend tự nới `from` về đầu cột. */
export function lastDaysRange(days: number, bucket: StatisticsBucket = 'DAY'): StatisticsRange {
  const to = vnToday();
  return { from: shiftDays(to, -(days - 1)), to, bucket };
}

/** `months` tháng gần nhất theo cột tháng, tháng này tính đến hôm nay. */
export function lastMonthsRange(months: number): StatisticsRange {
  const to = vnToday();
  return { from: startOfMonthBack(to, months - 1), to, bucket: 'MONTH' };
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Nhãn trục: "03/10" cho cột ngày và tuần, "Th10" cho cột tháng. */
export function bucketLabel(bucketStart: string, bucket: StatisticsBucket): string {
  const { m, d } = parseIso(bucketStart);
  return bucket === 'MONTH' ? `Th${m}` : `${pad(d)}/${pad(m)}`;
}

/** Tiêu đề tooltip và bảng số liệu: "Ngày 03/10/2026", "Tuần từ 28/09/2026", "Tháng 10/2026". */
export function bucketTitle(bucketStart: string, bucket: StatisticsBucket): string {
  const { y, m, d } = parseIso(bucketStart);
  if (bucket === 'MONTH') return `Tháng ${m}/${y}`;
  const day = `${pad(d)}/${pad(m)}/${y}`;
  return bucket === 'WEEK' ? `Tuần từ ${day}` : `Ngày ${day}`;
}

/** "28/09/2026" từ YYYY-MM-DD. */
export function formatIsoDate(iso: string): string {
  const { y, m, d } = parseIso(iso);
  return `${pad(d)}/${pad(m)}/${y}`;
}
