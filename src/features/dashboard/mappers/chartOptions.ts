import {
  bucketLabel,
  bucketTitle,
  type CreditGradeStat,
  type InvestmentSeriesPoint,
  type StatisticsBucket,
  type UserSeriesPoint,
} from '@/features/statistics';
import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_FOCUS, CHART_PALETTE, chartArea, chartNumber, moneyShort, tooltipHtml } from '@/lib/charts/theme';
import { formatCurrency } from '@/utils';
import type { RollingPoint } from './rolling';

/**
 * Option ECharts của trang Tổng quan, chép từ các hàm build*Option của mockup dashboard.html và thay dữ liệu
 * giả bằng điểm series thật. Hàm thuần: dữ liệu vào, option ra.
 */

type AxisParams = Array<{ dataIndex: number }>;
const firstIndex = (params: AxisParams) => params[0]?.dataIndex ?? 0;

/** Đường mềm nhưng không vọt quá điểm dữ liệu (không lộn xuống dưới 0 giữa hai ngày). */
const SMOOTH = { smooth: 0.3, smoothMonotone: 'x' } as const;

const perDay = (value: number) => `${moneyShort(Math.round(value))} đ/ngày`;
const dayValue = (point: RollingPoint | null) => (point == null ? '-' : formatCurrency(point.day));

export interface TrendInput {
  points: RollingPoint[];
  name: string;
}

/**
 * Xu hướng của ô số liệu đang chọn: bình quân 7 ngày, một đường mềm có vùng mờ dần (mockup buildTrendOption).
 * Tooltip ghi cả số thật của ngày để không ai đọc nhầm bình quân thành số trong ngày.
 */
export function buildTrendOption({ points, name }: TrendInput): ChartOption {
  return {
    grid: { left: 4, right: 24, top: 12, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (params: AxisParams) => {
        const point = points[firstIndex(params)];
        return tooltipHtml(bucketTitle(point.bucketStart, 'DAY'), [
          { label: `${name}, bình quân 7 ngày`, value: perDay(point.average), color: CHART_PALETTE.brand },
          { label: 'Trong ngày', value: dayValue(point) },
        ]);
      },
    },
    xAxis: { type: 'category', data: points.map((point) => bucketLabel(point.bucketStart, 'DAY')), boundaryGap: false },
    yAxis: { type: 'value', scale: true, axisLabel: { formatter: moneyShort } },
    series: [{
      name, type: 'line', ...SMOOTH, data: points.map((point) => Math.round(point.average)),
      color: CHART_PALETTE.brand, areaStyle: chartArea(CHART_PALETTE.brand),
    }],
  };
}

export interface FundingRow {
  bucketStart: string;
  committed: RollingPoint | null;
  disbursed: RollingPoint | null;
}

/**
 * Hai đường bình quân 7 ngày: vốn nhà đầu tư góp và tiền giải ngân (mockup buildFundingOption).
 * Ngày thiếu ở một service để trống.
 */
export function buildFundingOption(rows: FundingRow[]): ChartOption {
  return {
    legend: { data: ['Vốn gọi được', 'Đã giải ngân'] },
    grid: { left: 4, right: 24, top: 36, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (params: AxisParams) => {
        const row = rows[firstIndex(params)];
        return tooltipHtml(bucketTitle(row.bucketStart, 'DAY'), [
          { label: 'Vốn gọi được, bình quân 7 ngày', value: row.committed ? perDay(row.committed.average) : '-', color: CHART_PALETTE.pair[0] },
          { label: 'Giải ngân, bình quân 7 ngày', value: row.disbursed ? perDay(row.disbursed.average) : '-', color: CHART_PALETTE.pair[1] },
          { label: 'Vốn gọi được trong ngày', value: dayValue(row.committed) },
          { label: 'Giải ngân trong ngày', value: dayValue(row.disbursed) },
        ]);
      },
    },
    xAxis: { type: 'category', data: rows.map((row) => bucketLabel(row.bucketStart, 'DAY')), boundaryGap: false },
    yAxis: { type: 'value', scale: true, splitNumber: 4, axisLabel: { formatter: moneyShort } },
    series: [
      { name: 'Vốn gọi được', type: 'line', ...SMOOTH, data: rows.map((row) => (row.committed ? Math.round(row.committed.average) : null)), color: CHART_PALETTE.pair[0], areaStyle: chartArea(CHART_PALETTE.pair[0]), emphasis: CHART_FOCUS },
      { name: 'Đã giải ngân', type: 'line', ...SMOOTH, data: rows.map((row) => (row.disbursed ? Math.round(row.disbursed.average) : null)), color: CHART_PALETTE.pair[1], emphasis: CHART_FOCUS },
    ],
  };
}

export interface FunnelStep {
  label: string;
  count: number;
}

const PERCENT0 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
export const sharePercent = (part: number, whole: number) => (whole > 0 ? `${PERCENT0.format((part / whole) * 100)}%` : '-');

/**
 * Thanh ngang số hồ sơ đã tới từng bước, nhãn kèm tỷ lệ so với số nộp.
 * Phễu của backend không đơn điệu (số được duyệt có thể lớn hơn số chấm điểm xong vì đếm theo trạng thái
 * hiện tại), nên trục lấy giá trị lớn nhất và dòng "qua được từ bước trước" bỏ khi vượt 100%.
 */
export function buildFunnelOption(steps: FunnelStep[]): ChartOption {
  const first = steps[0]?.count ?? 0;
  const max = Math.max(1, ...steps.map((step) => step.count));
  return {
    grid: { left: 16, right: 96, top: 4, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      formatter: (params: AxisParams) => {
        const index = firstIndex(params);
        const step = steps[index];
        const rows = [
          { label: 'Số hồ sơ', value: chartNumber(step.count) },
          { label: 'So với số nộp', value: sharePercent(step.count, first) },
        ];
        const before = steps[index - 1]?.count ?? 0;
        if (index > 0 && before > 0 && step.count <= before) {
          rows.push({ label: 'Qua được từ bước trước', value: sharePercent(step.count, before) });
        }
        return tooltipHtml(step.label, rows);
      },
    },
    xAxis: { type: 'value', show: false, max },
    yAxis: { type: 'category', inverse: true, data: steps.map((step) => step.label), axisLine: { show: false }, axisLabel: { color: CHART_PALETTE.ink2, fontSize: 12 } },
    series: [{
      type: 'bar',
      data: steps.map((step) => step.count),
      barWidth: 16,
      color: CHART_PALETTE.brand,
      itemStyle: { borderRadius: [0, 8, 8, 0] },
      showBackground: true,
      backgroundStyle: { color: '#f1f4fa', borderRadius: [0, 8, 8, 0] },
      label: {
        show: true,
        position: 'right',
        distance: 8,
        color: CHART_PALETTE.ink2,
        fontSize: 12,
        formatter: (param: { value: number }) => `{v|${chartNumber(param.value)}}  {m|${sharePercent(param.value, first)}}`,
        rich: { v: { color: CHART_PALETTE.ink, fontWeight: 500 }, m: { color: CHART_PALETTE.muted } },
      },
    }],
  };
}

/** "Hạng A"; hồ sơ không có hạng định giá thì backend trả UNGRADED. */
export const gradeLabel = (grade: string) => (grade === 'UNGRADED' ? 'Chưa xếp hạng' : `Hạng ${grade}`);

/** Cột dư nợ gốc theo hạng tín dụng của khoản vay (ảnh chụp hiện tại). */
export function buildGradesOption(grades: CreditGradeStat[]): ChartOption {
  return {
    grid: { left: 4, right: 12, top: 20, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: AxisParams) => {
        const grade = grades[firstIndex(params)];
        return tooltipHtml(gradeLabel(grade.grade), [
          { label: 'Dư nợ gốc', value: formatCurrency(grade.principalOutstanding) },
          { label: 'Số khoản', value: chartNumber(grade.loans) },
        ]);
      },
    },
    xAxis: { type: 'category', data: grades.map((grade) => gradeLabel(grade.grade)) },
    yAxis: { type: 'value', axisLabel: { formatter: moneyShort } },
    series: [{
      type: 'bar',
      data: grades.map((grade) => grade.principalOutstanding),
      barMaxWidth: 28,
      color: CHART_PALETTE.brand,
      label: { show: true, position: 'top', color: CHART_PALETTE.ink2, fontSize: 11, formatter: (param: { value: number }) => moneyShort(param.value) },
    }],
  };
}

/** Cột chồng số lần Auto-Invest đặt lệnh và bỏ qua mỗi cột. */
export function buildAutoInvestOption(points: InvestmentSeriesPoint[], bucket: StatisticsBucket): ChartOption {
  return {
    legend: { data: ['Đặt lệnh thành công', 'Bỏ qua'] },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: AxisParams) => {
        const point = points[firstIndex(params)];
        return tooltipHtml(bucketTitle(point.bucketStart, bucket), [
          { label: 'Đặt lệnh thành công', value: `${chartNumber(point.autoInvestPlaced)} lần`, color: CHART_PALETTE.brand },
          { label: 'Bỏ qua', value: `${chartNumber(point.autoInvestSkipped)} lần`, color: CHART_PALETTE.neutral },
        ]);
      },
    },
    xAxis: { type: 'category', data: points.map((point) => bucketLabel(point.bucketStart, bucket)) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: 'Đặt lệnh thành công', type: 'bar', stack: 'auto', data: points.map((point) => point.autoInvestPlaced), color: CHART_PALETTE.brand, barMaxWidth: 18, itemStyle: { borderColor: CHART_PALETTE.surface, borderWidth: 1, borderRadius: 0 }, emphasis: CHART_FOCUS },
      { name: 'Bỏ qua', type: 'bar', stack: 'auto', data: points.map((point) => point.autoInvestSkipped), color: CHART_PALETTE.neutral, barMaxWidth: 18, itemStyle: { borderColor: CHART_PALETTE.surface, borderWidth: 1, borderRadius: [4, 4, 0, 0] }, emphasis: CHART_FOCUS },
    ],
  };
}

/** Cột chồng tài khoản mới: người vay và nhà đầu tư. */
export function buildSignupOption(points: UserSeriesPoint[], bucket: StatisticsBucket): ChartOption {
  return {
    legend: { data: ['Người vay', 'Nhà đầu tư'] },
    grid: { left: 4, right: 8, top: 30, bottom: 2, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: AxisParams) => {
        const point = points[firstIndex(params)];
        return tooltipHtml(bucketTitle(point.bucketStart, bucket), [
          { label: 'Người vay', value: chartNumber(point.registeredBorrowers), color: CHART_PALETTE.pair[0] },
          { label: 'Nhà đầu tư', value: chartNumber(point.registeredInvestors), color: CHART_PALETTE.pair[1] },
        ], `Tổng ${chartNumber(point.registered)} tài khoản`);
      },
    },
    xAxis: { type: 'category', data: points.map((point) => bucketLabel(point.bucketStart, bucket)) },
    yAxis: { type: 'value', minInterval: 1, splitNumber: 3 },
    series: [
      { name: 'Người vay', type: 'bar', stack: 'signup', data: points.map((point) => point.registeredBorrowers), color: CHART_PALETTE.pair[0], barMaxWidth: 14, itemStyle: { borderColor: CHART_PALETTE.surface, borderWidth: 1, borderRadius: 0 }, emphasis: CHART_FOCUS },
      { name: 'Nhà đầu tư', type: 'bar', stack: 'signup', data: points.map((point) => point.registeredInvestors), color: CHART_PALETTE.pair[1], barMaxWidth: 14, itemStyle: { borderColor: CHART_PALETTE.surface, borderWidth: 1, borderRadius: [3, 3, 0, 0] }, emphasis: CHART_FOCUS },
    ],
  };
}
