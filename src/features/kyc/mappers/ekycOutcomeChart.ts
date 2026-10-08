import type { EkycStatusType, UserStats } from '@/features/user';
import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, chartNumber, tooltipHtml } from '@/lib/charts/theme';
import { EKYC_CHART_ORDER } from '../constants';
import { ekycDisplay } from './customerDisplay';

export interface EkycOutcomeRow {
  status: EkycStatusType;
  label: string;
  count: number;
  /** Tỷ lệ trên tổng số tài khoản, 0 đến 100. */
  share: number;
}

const PERCENT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
export const formatShare = (share: number) => `${PERCENT.format(share)}%`;

/** Số tài khoản theo trạng thái eKYC từ `/admin/users/stats` (đếm ở DB, toàn hệ thống). */
export function toOutcomeRows(stats: UserStats): EkycOutcomeRow[] {
  return EKYC_CHART_ORDER.map((status) => {
    const count = stats.byEkycStatus[status] ?? 0;
    return { status, label: ekycDisplay(status).label, count, share: stats.total > 0 ? (count / stats.total) * 100 : 0 };
  });
}

/**
 * Thanh ngang theo trạng thái: đã xác minh tô màu nhấn, các trạng thái còn lại xám (màu chỉ mang nghĩa "đạt").
 * Hàm thuần: dữ liệu vào, option ra.
 */
export function buildEkycOutcomeOption(rows: EkycOutcomeRow[]): ChartOption {
  return {
    grid: { left: 16, right: 72, top: 4, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const row = rows[params[0]?.dataIndex ?? 0];
        return tooltipHtml(row.label, [
          { label: 'Số tài khoản', value: chartNumber(row.count) },
          { label: 'Tỷ lệ', value: formatShare(row.share) },
        ], 'Bấm để lọc bảng');
      },
    },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((row) => row.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: CHART_PALETTE.ink2, fontSize: 12 },
    },
    series: [{
      type: 'bar',
      barWidth: 14,
      cursor: 'pointer',
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      data: rows.map((row) => ({
        value: row.count,
        itemStyle: { color: row.status === 'VERIFIED' ? CHART_PALETTE.brand : CHART_PALETTE.neutral },
      })),
      label: {
        show: true,
        position: 'right',
        color: CHART_PALETTE.ink2,
        fontSize: 12,
        formatter: (param: { dataIndex: number }) => {
          const row = rows[param.dataIndex];
          return `${chartNumber(row.count)}  ${formatShare(row.share)}`;
        },
      },
    }],
  };
}
