const CLOCK = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const DAY = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Giờ có giây: nhiều lượt gọi trong cùng một phút cần phân biệt được. */
export const formatClock = (value: string) => CLOCK.format(new Date(value));

export const formatDay = (value: string) => DAY.format(new Date(value));

/** JSON thì in thụt lề cho dễ đọc; body bị cắt hoặc không phải JSON thì giữ nguyên. */
export function prettyBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

/** Khóa ổn định cho một dòng (log không có id riêng). */
export const entryKey = (entry: { at: string; method: string; path: string; traceId: string | null }) =>
  `${entry.at}|${entry.method}|${entry.path}|${entry.traceId ?? ''}`;
