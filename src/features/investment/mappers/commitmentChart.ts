import { bucketLabel, bucketTitle, type InvestmentSeriesPoint } from '@/features/statistics';
import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, chartNumber, moneyShort, tooltipHtml } from '@/lib/charts/theme';
import { formatCurrency } from '@/utils';

/**
 * Cột vốn nhà đầu tư góp mỗi ngày (theo ngày đặt lệnh, bỏ lệnh đã hủy), thay cho dải cột CSS của mockup
 * funding.html bằng ECharts như các biểu đồ khác của web. Hàm thuần.
 */
export function buildCommitmentOption(points: InvestmentSeriesPoint[]): ChartOption {
  return {
    grid: { left: 4, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const point = points[params[0]?.dataIndex ?? 0];
        const title = bucketTitle(point.bucketStart, 'DAY');
        if (point.commitments === 0) return tooltipHtml(title, [{ label: 'Không có lệnh góp vốn', value: '' }]);
        return tooltipHtml(title, [
          { label: 'Vốn góp', value: formatCurrency(point.committedAmount), color: CHART_PALETTE.brand },
          { label: 'Số lệnh', value: chartNumber(point.commitments) },
        ]);
      },
    },
    xAxis: { type: 'category', data: points.map((point) => bucketLabel(point.bucketStart, 'DAY')) },
    yAxis: { type: 'value', axisLabel: { formatter: moneyShort } },
    series: [{ name: 'Vốn góp', type: 'bar', barMaxWidth: 14, color: CHART_PALETTE.brand, data: points.map((point) => point.committedAmount) }],
  };
}
