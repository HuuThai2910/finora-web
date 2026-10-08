import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, chartNumber, moneyShort, tooltipHtml } from '@/lib/charts/theme';
import { formatCurrency } from '@/utils';
import type { DebtGroupStat } from '../types';

/** Tên năm nhóm nợ theo phân loại nợ của ngân hàng (nhóm 3 đến 5 là nợ xấu). */
export const DEBT_GROUP_NAMES: Record<number, string> = {
  1: 'Đủ tiêu chuẩn',
  2: 'Cần chú ý',
  3: 'Dưới tiêu chuẩn',
  4: 'Nghi ngờ',
  5: 'Có khả năng mất vốn',
};

export const debtGroupName = (group: number) => DEBT_GROUP_NAMES[group] ?? `Nhóm ${group}`;

/** Nhóm 2 trở lên là đã quá hạn; nhóm 1 gồm cả khoản đang trả đúng hạn nên không vẽ (sẽ đè các cột khác). */
export const overdueGroups = (groups: DebtGroupStat[]) =>
  [...groups].filter((item) => item.debtGroup >= 2).sort((a, b) => a.debtGroup - b.debtGroup);

/** Màu từ nhạt đến đậm theo mức nặng của nhóm nợ (dải xanh của theme, không dùng màu cảnh báo). */
const SEVERITY = [...CHART_PALETTE.ordinal].reverse().slice(1);

/**
 * Cột dư nợ gốc của các khoản quá hạn theo nhóm nợ 2 đến 5, ảnh chụp hiện tại (backend chưa lưu lịch sử
 * nên không có trục tháng như mockup). Tooltip kèm số khoản và tiền quá hạn. Hàm thuần.
 */
export function buildDebtGroupOption(groups: DebtGroupStat[]): ChartOption {
  const rows = overdueGroups(groups);
  return {
    grid: { left: 4, right: 12, top: 24, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const row = rows[params[0]?.dataIndex ?? 0];
        return tooltipHtml(`Nhóm ${row.debtGroup}: ${debtGroupName(row.debtGroup)}`, [
          { label: 'Dư nợ gốc', value: formatCurrency(row.principalOutstanding) },
          { label: 'Tiền quá hạn', value: formatCurrency(row.overdueAmount) },
          { label: 'Số khoản', value: chartNumber(row.loans) },
        ], row.debtGroup >= 3 ? 'Nợ xấu' : undefined);
      },
    },
    xAxis: { type: 'category', data: rows.map((row) => `Nhóm ${row.debtGroup}`) },
    yAxis: { type: 'value', axisLabel: { formatter: moneyShort } },
    series: [{
      name: 'Dư nợ gốc',
      type: 'bar',
      barMaxWidth: 36,
      data: rows.map((row, index) => ({ value: row.principalOutstanding, itemStyle: { color: SEVERITY[index] ?? CHART_PALETTE.ink } })),
      label: { show: true, position: 'top', color: CHART_PALETTE.ink2, fontSize: 11, formatter: (param: { value: number }) => moneyShort(param.value) },
    }],
  };
}
