/**
 * Phép gộp thuần trên điểm series. Chỉ cộng và chia trên số backend trả về, không nội suy hay bù cột.
 */

/** Tổng một trường số trên các điểm. */
export function sumOf<T>(points: readonly T[], pick: (point: T) => number): number {
  return points.reduce((total, point) => total + pick(point), 0);
}

/**
 * Tách series ngày dài gấp đôi kỳ thành kỳ hiện tại và kỳ trước liền kề, theo đúng ngày bắt đầu cột
 * (không theo vị trí), để một cột thiếu hay thừa ở hai đầu không làm lệch phép so sánh.
 *
 * @param currentFrom ngày đầu kỳ hiện tại (YYYY-MM-DD); kỳ trước là mọi cột trước ngày này.
 * @returns `previousComplete` chỉ đúng khi kỳ trước có đủ `days` cột, để nơi gọi bỏ phần so sánh nếu thiếu.
 */
export function splitPeriods<T extends { bucketStart: string }>(points: readonly T[], currentFrom: string, days: number) {
  const current = points.filter((point) => point.bucketStart >= currentFrom);
  const previous = points.filter((point) => point.bucketStart < currentFrom).slice(-days);
  return { current, previous, previousComplete: previous.length === days };
}

/**
 * Phần trăm thay đổi so với kỳ trước. Trả `null` khi không so được một cách trung thực: kỳ trước thiếu
 * cột hoặc bằng 0 (chia cho 0 không ra con số có nghĩa).
 */
export function changePercent(current: number, previous: number, previousComplete: boolean): number | null {
  if (!previousComplete || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
