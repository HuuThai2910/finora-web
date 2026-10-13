import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, chartNumber, moneyShort, tooltipHtml } from '@/lib/charts/theme';
import { formatCurrency } from '@/utils';
import type { DebtGroupStat, PortfolioPosition } from '../types';
import { bucketLabel, formatIsoDate } from './period';

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

/** Nhóm nợ vẽ trên biểu đồ quá hạn theo tháng (nhóm 1 không vẽ, như biểu đồ hiện tại). */
export const OVERDUE_DEBT_GROUPS = [2, 3, 4, 5] as const;

/** Dư nợ gốc một nhóm trong vị thế cuối tháng; nhóm vắng mặt coi là 0 (backend luôn trả đủ năm nhóm). */
export const groupPrincipal = (position: PortfolioPosition, group: number) =>
  position.debtGroups.find((item) => item.debtGroup === group)?.principalOutstanding ?? 0;

export interface DebtGroupMonth {
  bucketStart: string;
  position: PortfolioPosition;
}

/**
 * Cột chồng dư nợ gốc quá hạn theo nhóm 2 đến 5, mỗi cột là số cuối một tháng (tháng đang chạy lấy hôm
 * nay), backend tính lại từ lịch sử Fineract (mockup buildOverdueOption). Hàm thuần.
 */
export function buildDebtGroupMonthsOption(months: DebtGroupMonth[]): ChartOption {
  const total = (month: DebtGroupMonth) => OVERDUE_DEBT_GROUPS.reduce((sum, group) => sum + groupPrincipal(month.position, group), 0);
  return {
    legend: { data: OVERDUE_DEBT_GROUPS.map((group) => `Nhóm ${group}`) },
    grid: { left: 4, right: 12, top: 36, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const month = months[params[0]?.dataIndex ?? 0];
        return tooltipHtml(`Cuối ngày ${formatIsoDate(month.position.asOf)}`, OVERDUE_DEBT_GROUPS.map((group, index) => ({
          label: `Nhóm ${group}: ${debtGroupName(group)}`,
          value: formatCurrency(groupPrincipal(month.position, group)),
          color: SEVERITY[index],
        })), `Tổng ${formatCurrency(total(month))}`);
      },
    },
    xAxis: { type: 'category', data: months.map((month) => bucketLabel(month.bucketStart, 'MONTH')) },
    yAxis: { type: 'value', axisLabel: { formatter: moneyShort } },
    series: OVERDUE_DEBT_GROUPS.map((group, index) => ({
      name: `Nhóm ${group}`,
      type: 'bar',
      stack: 'overdue',
      barMaxWidth: 28,
      color: SEVERITY[index] ?? CHART_PALETTE.ink,
      data: months.map((month) => groupPrincipal(month.position, group)),
      itemStyle: { borderRadius: index === OVERDUE_DEBT_GROUPS.length - 1 ? [4, 4, 0, 0] : 0 },
    })),
  };
}

/**
 * Cột dư nợ gốc của các khoản quá hạn theo nhóm nợ 2 đến 5, ảnh chụp hiện tại. Trang Tổng quan chỉ dùng
 * khi không có lịch sử theo tháng (Fineract không đọc được). Tooltip kèm số khoản và tiền quá hạn. Hàm thuần.
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
