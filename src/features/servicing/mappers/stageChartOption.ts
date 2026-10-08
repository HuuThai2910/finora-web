import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, chartNumber, tooltipHtml } from '@/lib/charts/theme';
import type { StageCount } from '../hooks/useServicingCounts';

/**
 * Thanh ngang số hồ sơ thu hồi đang mở theo khoảng số ngày quá hạn (chép `buildBucketsOption` của
 * mockup, bỏ tiền quá hạn và dư nợ vì backend chưa có API tổng tiền theo mức độ).
 */
export function buildStageOption(stages: StageCount[]): ChartOption {
  const max = Math.max(1, ...stages.map((item) => item.count));
  return {
    grid: { left: 4, right: 32, top: 4, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      formatter: (params: unknown) => {
        const first = Array.isArray(params) ? (params[0] as { dataIndex?: number }) : undefined;
        const item = stages[first?.dataIndex ?? 0];
        return tooltipHtml(`Quá hạn ${item.range.toLowerCase()}`, [
          { label: 'Mức độ', value: item.label },
          { label: 'Nhóm nợ', value: String(item.debtGroup) },
          { label: 'Số hồ sơ', value: chartNumber(item.count) },
        ]);
      },
    },
    xAxis: { type: 'value', show: false, max },
    yAxis: {
      type: 'category',
      inverse: true,
      data: stages.map((item) => item.range),
      axisLine: { show: false },
      axisLabel: { color: CHART_PALETTE.ink2, fontSize: 12 },
    },
    series: [{
      type: 'bar',
      data: stages.map((item) => item.count),
      barWidth: 14,
      color: CHART_PALETTE.brand,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      showBackground: true,
      backgroundStyle: { color: '#eef2f8', borderRadius: [0, 4, 4, 0] },
      label: {
        show: true,
        position: 'right',
        distance: 8,
        color: CHART_PALETTE.ink,
        fontSize: 12,
        fontWeight: 500,
        formatter: (param: { value?: unknown }) => chartNumber(Number(param.value ?? 0)),
      },
    }],
  };
}
