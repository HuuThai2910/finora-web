import {
  bucketLabel,
  bucketTitle,
  formatPricePercent,
  permilleToPercent,
  type InvestmentSeriesPoint,
} from '@/features/statistics';
import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, chartNumber, tooltipHtml, type TooltipRow } from '@/lib/charts/theme';

/** Cửa sổ trượt của giá bình quân (ngày, tính cả ngày đang xét). */
export const ROLLING_DAYS = 7;

export interface RollingPriceRow {
  bucketStart: string;
  /** Giá bình quân 7 ngày đến hết ngày này, % dư nợ gốc; `null` khi cả cửa sổ không có lần khớp. */
  rolling: number | null;
  /** Giá bình quân trong ngày (không tính nợ xấu); `null` khi ngày không khớp. */
  daily: number | null;
  /** Số Note khớp trong ngày, không tính nợ xấu. */
  quantity: number;
}

export interface RollingPriceSummary {
  rows: RollingPriceRow[];
  /** Bình quân 7 ngày gần nhất. */
  last7: number | null;
  /** Bình quân các ngày còn lại của kỳ (trước 7 ngày gần nhất). */
  earlier: number | null;
  /** Bình quân cả kỳ. */
  all: number | null;
}

/** Lượng và giá của một cột, chỉ tính lần khớp không thuộc khoản nợ xấu. */
function performing(point: InvestmentSeriesPoint): { quantity: number; permille: number } | null {
  const quantity = point.performingQuantity ?? 0;
  const permille = point.performingAveragePricePermille;
  return permille == null || quantity <= 0 ? null : { quantity, permille };
}

/**
 * Bình quân gia quyền theo số Note: Σ(giá × số Note) / Σ số Note, đổi sang % dư nợ gốc.
 * Giá mỗi cột đã là bình quân theo số Note của cột đó, nên nhân lại với số Note cho đúng trọng số.
 */
function weightedPrice(points: readonly InvestmentSeriesPoint[]): number | null {
  let weighted = 0;
  let quantity = 0;
  for (const point of points) {
    const value = performing(point);
    if (!value) continue;
    weighted += value.permille * value.quantity;
    quantity += value.quantity;
  }
  return quantity > 0 ? permilleToPercent(weighted / quantity) : null;
}

/**
 * Backend thêm các trường "performing" sau (2026-10-08). Khi thiếu thì không tính được giá bỏ nợ xấu,
 * nơi gọi hiển thị thông báo thay vì vẽ số sai.
 */
export function hasPerformingPrice(points: readonly InvestmentSeriesPoint[]): boolean {
  return points.length > 0 && points.every((point) => point.performingQuantity !== undefined);
}

/**
 * Giá khớp bình quân trượt 7 ngày, không tính nợ xấu (mockup secondary-market.html).
 *
 * @param points series ngày, phải có thêm `ROLLING_DAYS - 1` ngày trước kỳ để cửa sổ của ngày đầu kỳ đủ 7 ngày.
 * @param days số ngày của kỳ hiển thị (các cột cuối của `points`).
 */
export function summarizeRollingPrice(points: readonly InvestmentSeriesPoint[], days: number): RollingPriceSummary {
  const start = Math.max(0, points.length - days);
  const period = points.slice(start);
  const rows = period.map((point, index) => {
    const at = start + index;
    const value = performing(point);
    return {
      bucketStart: point.bucketStart,
      rolling: weightedPrice(points.slice(Math.max(0, at - ROLLING_DAYS + 1), at + 1)),
      daily: value ? permilleToPercent(value.permille) : null,
      quantity: value?.quantity ?? 0,
    };
  });
  return {
    rows,
    last7: weightedPrice(period.slice(-ROLLING_DAYS)),
    earlier: weightedPrice(period.slice(0, -ROLLING_DAYS)),
    all: weightedPrice(period),
  };
}

/** Bước vạch trục y "tròn" theo độ rộng khoảng giá, để trục ôm sát giá mà vẫn chia đều. */
function niceStep(span: number): number {
  if (span <= 6) return 1;
  if (span <= 12) return 2;
  if (span <= 30) return 5;
  return 10;
}

/**
 * Đường giá bình quân trượt 7 ngày: nét mảnh, cong nhẹ, trục y ôm sát giá và luôn chứa vạch đứt ngang giá
 * 100%. Ngày cả cửa sổ không có lần khớp thì nối qua (giá trượt không đổi nghĩa khi thiếu một ngày).
 * Tooltip kèm giá trong ngày và số Note khớp. Hàm thuần.
 */
export function buildRollingPriceOption(rows: readonly RollingPriceRow[]): ChartOption {
  const known = rows.flatMap((row) => (row.rolling == null ? [] : [row.rolling]));
  const low = Math.min(...known) - 0.5;
  const high = Math.max(101, Math.max(...known) + 0.5);
  const step = niceStep(high - low);
  const min = Math.floor(low / step) * step;
  const max = min + Math.ceil((high - min) / step) * step;
  return {
    grid: { left: 4, right: 12, top: 12, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ dataIndex: number }>) => {
        const row = rows[params[0]?.dataIndex ?? 0];
        const lines: TooltipRow[] = [{
          label: 'Bình quân 7 ngày',
          value: row.rolling == null ? 'không có lần khớp' : formatPricePercent(row.rolling),
          color: CHART_PALETTE.brand,
        }];
        if (row.daily == null) {
          lines.push({ label: 'Trong ngày', value: 'không khớp' });
        } else {
          lines.push({ label: 'Trong ngày', value: formatPricePercent(row.daily) });
          lines.push({ label: 'Số Note khớp', value: chartNumber(row.quantity) });
        }
        return tooltipHtml(bucketTitle(row.bucketStart, 'DAY'), lines);
      },
    },
    xAxis: { type: 'category', data: rows.map((row) => bucketLabel(row.bucketStart, 'DAY')), boundaryGap: false },
    yAxis: { type: 'value', min, max, interval: step, axisLabel: { formatter: (value: number) => `${value}%` } },
    series: [{
      name: 'Bình quân 7 ngày',
      type: 'line',
      smooth: 0.35,
      connectNulls: true,
      showSymbol: false,
      lineStyle: { width: 2 },
      color: CHART_PALETTE.brand,
      data: rows.map((row) => row.rolling),
      markLine: {
        silent: true,
        symbol: 'none',
        data: [{ yAxis: 100 }],
        lineStyle: { color: CHART_PALETTE.neutral, width: 1, type: [4, 4] },
        label: { formatter: 'Ngang giá 100%', position: 'insideStartTop', color: CHART_PALETTE.muted, fontSize: 11 },
      },
    }],
  };
}
