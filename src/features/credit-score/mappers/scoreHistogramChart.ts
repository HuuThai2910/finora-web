import type { ScoreHistogramBin } from '@/features/statistics';
import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, chartNumber, tooltipHtml } from '@/lib/charts/theme';

const PERCENT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
export const formatShare = (part: number, whole: number) => (whole > 0 ? `${PERCENT.format((part / whole) * 100)}%` : '-');

/** "Từ 60 đến dưới 70"; cột cuối gồm cả 100 điểm. */
export function binLabel(bin: ScoreHistogramBin): string {
  return bin.to >= 100 ? `Từ ${bin.from} đến ${bin.to}` : `Từ ${bin.from} đến dưới ${bin.to}`;
}

/** Vị trí cột chứa điểm; điểm 100 thuộc cột cuối. */
export function binIndexOf(bins: ScoreHistogramBin[], score: number): number {
  return bins.findIndex((bin) => score >= bin.from && (score < bin.to || (bin.to >= 100 && score <= bin.to)));
}

/**
 * Phân bố điểm tổng hợp (0 đến 100) của lần chấm mới nhất thành công mỗi hồ sơ, 10 cột rộng 10 điểm.
 * Chép ý `buildScoreDistOption` của mockup credit-scoring.html; thay vạch "hồ sơ đang xem" bằng tô đậm cột chứa
 * điểm của hồ sơ vừa chấm (cột 10 điểm không đặt được vạch đúng điểm lẻ). Không vẽ ngưỡng duyệt vì web chưa
 * đọc ngưỡng từ backend. Hàm thuần.
 */
export function buildScoreHistogramOption(bins: ScoreHistogramBin[], currentIndex: number): ChartOption {
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  return {
    grid: { left: 4, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const index = params[0]?.dataIndex ?? 0;
        const bin = bins[index];
        return tooltipHtml(`${binLabel(bin)} điểm`, [
          { label: 'Số hồ sơ', value: chartNumber(bin.count) },
          { label: 'Tỷ lệ', value: formatShare(bin.count, total) },
        ], index === currentIndex ? 'Hồ sơ vừa chấm nằm trong khoảng này' : undefined);
      },
    },
    xAxis: { type: 'category', data: bins.map((bin) => String(bin.from)) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      name: 'Số hồ sơ',
      type: 'bar',
      barWidth: '72%',
      data: bins.map((bin, index) => ({
        value: bin.count,
        itemStyle: { color: index === currentIndex ? CHART_PALETTE.ink : CHART_PALETTE.brand },
      })),
    }],
  };
}
