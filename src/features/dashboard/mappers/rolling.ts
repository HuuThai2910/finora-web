/** Số ngày của bình quân trượt trên đường xu hướng (mockup dashboard.html: "Bình quân 7 ngày"). */
export const ROLLING_DAYS = 7;

export interface RollingPoint {
  bucketStart: string;
  /** Số thật của ngày đó. */
  day: number;
  /** Bình quân của ngày đó và tối đa 6 ngày liền trước có trong series. */
  average: number;
}

/**
 * Bình quân trượt 7 ngày cho các ngày từ `currentFrom` trở đi, tính trên series ngày dài gấp đôi kỳ
 * (phần kỳ trước cho đủ 6 ngày đứng trước ngày đầu kỳ).
 *
 * Số tiền theo ngày rất giật (nhiều ngày bằng 0 xen ngày lớn), vẽ thẳng thì đường cong vọt lên rồi lộn
 * xuống dưới 0. Bình quân chỉ cộng và chia trên số backend trả về, không nội suy; ngày đầu series thiếu
 * ngày đứng trước thì chia cho số ngày thật có.
 */
export function rollingAverage<T extends { bucketStart: string }>(
  points: readonly T[],
  currentFrom: string,
  pick: (point: T) => number,
): RollingPoint[] {
  const sorted = [...points].sort((a, b) => a.bucketStart.localeCompare(b.bucketStart));
  const result: RollingPoint[] = [];
  sorted.forEach((point, index) => {
    if (point.bucketStart < currentFrom) return;
    const window = sorted.slice(Math.max(0, index - (ROLLING_DAYS - 1)), index + 1);
    const total = window.reduce((sum, item) => sum + pick(item), 0);
    result.push({ bucketStart: point.bucketStart, day: pick(point), average: total / window.length });
  });
  return result;
}
