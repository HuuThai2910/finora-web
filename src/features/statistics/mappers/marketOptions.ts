import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, chartNumber, moneyShort, tooltipHtml } from '@/lib/charts/theme';
import { formatCurrency } from '@/utils';
import type { InvestmentSeriesPoint, StatisticsBucket } from '../types';
import { bucketLabel, bucketTitle } from './period';

const PRICE = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Giá phần nghìn của backend (985) thành phần trăm dư nợ (98,5). */
export const permilleToPercent = (permille: number) => permille / 10;

/** "98,5%". */
export const formatPricePercent = (percent: number) => `${PRICE.format(percent)}%`;

/**
 * Cột giá trị khớp lệnh trên chợ Notes theo ngày (hoặc tuần), tooltip kèm số lần khớp và phí nền tảng.
 * Chép `buildValueOption` của mockup secondary-market.html. Hàm thuần.
 */
export function buildTradedValueOption(points: InvestmentSeriesPoint[], bucket: StatisticsBucket): ChartOption {
  return {
    grid: { left: 4, right: 12, top: 16, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const point = points[params[0]?.dataIndex ?? 0];
        const title = bucketTitle(point.bucketStart, bucket);
        if (point.trades === 0) return tooltipHtml(title, [{ label: 'Không có lần khớp', value: '' }]);
        return tooltipHtml(title, [
          { label: 'Giá trị khớp', value: formatCurrency(point.tradedAmount), color: CHART_PALETTE.brand },
          { label: 'Số lần khớp', value: chartNumber(point.trades) },
          { label: 'Phí nền tảng', value: formatCurrency(point.platformFee) },
        ]);
      },
    },
    xAxis: { type: 'category', data: points.map((point) => bucketLabel(point.bucketStart, bucket)) },
    yAxis: { type: 'value', axisLabel: { formatter: moneyShort } },
    series: [{
      name: 'Giá trị khớp',
      type: 'bar',
      barMaxWidth: 14,
      color: CHART_PALETTE.brand,
      data: points.map((point) => point.tradedAmount),
    }],
  };
}
