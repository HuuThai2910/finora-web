import {
  bucketLabel,
  bucketTitle,
  type LoanStatisticsSeries,
  type ProductStat,
} from '@/features/statistics';
import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_FOCUS, CHART_PALETTE, chartNumber, moneyShort, tooltipHtml } from '@/lib/charts/theme';
import { formatCurrency, formatPercent } from '@/utils';

/**
 * Biểu đồ của trang Sản phẩm vay, chép từ buildDemandOption, buildRiskOption, buildDisbursedOption của mockup
 * products.html. Số liệu từ API thống kê Loan: series cột tháng (`productPoints` thưa, chỉ có dòng khác 0) và
 * `portfolio.byProduct` của summary. Hàm thuần.
 */

type AxisParams = Array<{ dataIndex: number }>;

/** Số sản phẩm được vẽ đường riêng; phần còn lại gộp một đường xám. */
const LINE_LIMIT = CHART_PALETTE.categorical.length;

export interface DemandGroup {
  name: string;
  color: string;
  /** Đường gộp các sản phẩm còn lại: nét đứt. */
  others: boolean;
  values: number[];
  total: number;
}

export interface DemandData {
  months: string[];
  groups: DemandGroup[];
  total: number;
}

export const productName = (id: number, names: Map<number, string>) => names.get(id) ?? `Sản phẩm #${id}`;

/**
 * Hồ sơ nộp mỗi tháng của từng sản phẩm. Ba sản phẩm nhiều hồ sơ nhất có đường riêng, các sản phẩm khác
 * gộp thành "Sản phẩm khác". Cột không có dòng trong `productPoints` nghĩa là 0 hồ sơ (backend chỉ trả dòng khác 0).
 *
 * Chỉ vẽ các tháng đã trọn (bỏ cột tháng chứa `today`, như mockup): tháng đang chạy mới có vài ngày nên đường
 * luôn cắm xuống ở đầu mút, trông như nhu cầu giảm mạnh trong khi tháng chưa hết.
 * @param today hôm nay theo giờ Việt Nam (YYYY-MM-DD).
 */
export function toDemandData(series: LoanStatisticsSeries, names: Map<number, string>, today: string): DemandData {
  const currentMonth = `${today.slice(0, 7)}-01`;
  const months = series.points.map((point) => point.bucketStart).filter((month) => month < currentMonth);
  const index = new Map(months.map((month, position) => [month, position]));
  const byProduct = new Map<number, number[]>();
  series.productPoints.forEach((point) => {
    const position = index.get(point.bucketStart);
    if (position == null) return;
    const values = byProduct.get(point.productId) ?? months.map(() => 0);
    values[position] += point.applicationsSubmitted;
    byProduct.set(point.productId, values);
  });
  const ranked = [...byProduct.entries()]
    .map(([id, values]) => ({ id, values, total: values.reduce((sum, value) => sum + value, 0) }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
  const top = ranked.slice(0, LINE_LIMIT);
  const rest = ranked.slice(LINE_LIMIT);
  const groups: DemandGroup[] = top.map((item, position) => ({
    name: productName(item.id, names),
    color: CHART_PALETTE.categorical[position],
    others: false,
    values: item.values,
    total: item.total,
  }));
  if (rest.length > 0) {
    const values = months.map((_, position) => rest.reduce((sum, item) => sum + item.values[position], 0));
    groups.push({ name: `${rest.length} sản phẩm khác`, color: CHART_PALETTE.neutral, others: true, values, total: values.reduce((a, b) => a + b, 0) });
  }
  return { months, groups, total: ranked.reduce((sum, item) => sum + item.total, 0) };
}

export interface DemandTrend {
  /** Sản phẩm tăng nhiều nhất từ tháng đầu đến tháng cuối; `null` khi không sản phẩm nào tăng. */
  rising: { name: string; from: number; to: number } | null;
  /** Sản phẩm giảm liên tục ít nhất hai tháng cuối, kèm số tháng giảm liền. */
  falling: Array<{ name: string; months: number }>;
}

/** Số tháng liền nhau giảm tính từ tháng cuối ngược về trước. */
function trailingDeclines(values: number[]): number {
  let count = 0;
  for (let index = values.length - 1; index > 0 && values[index] < values[index - 1]; index -= 1) count += 1;
  return count;
}

/**
 * Câu tóm tắt xu hướng như mockup ("X tăng nhanh nhất, a lên b hồ sơ/tháng; Y giảm n tháng liền"), tính trên
 * các đường sản phẩm riêng (không tính nhóm gộp). Chỉ so số thật của tháng đầu và tháng cuối, không nội suy.
 */
export function describeDemandTrend({ groups }: DemandData): DemandTrend {
  const named = groups.filter((group) => !group.others && group.values.length >= 2);
  const rising = named
    .map((group) => ({ name: group.name, from: group.values[0], to: group.values[group.values.length - 1] }))
    .filter((item) => item.to > item.from)
    .sort((a, b) => (b.to - b.from) - (a.to - a.from))[0] ?? null;
  const falling = named
    .map((group) => ({ name: group.name, months: trailingDeclines(group.values) }))
    .filter((item) => item.months >= 2);
  return { rising, falling };
}

/** Một đường cho mỗi nhóm sản phẩm, số tháng cuối ở đầu mút. */
export function buildDemandOption({ months, groups }: DemandData): ChartOption {
  return {
    legend: { data: groups.map((group) => group.name), itemGap: 14, itemWidth: 10, itemHeight: 10 },
    grid: { left: 4, right: 40, top: groups.length > 2 ? 56 : 36, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (params: AxisParams) => {
        const position = params[0]?.dataIndex ?? 0;
        const rows = groups.map((group) => ({ label: group.name, value: `${chartNumber(group.values[position])} hồ sơ`, color: group.color }));
        const total = groups.reduce((sum, group) => sum + group.values[position], 0);
        return tooltipHtml(bucketTitle(months[position], 'MONTH'), rows, `Tổng ${chartNumber(total)} hồ sơ`);
      },
    },
    xAxis: { type: 'category', data: months.map((month) => bucketLabel(month, 'MONTH')), boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1, splitNumber: 4 },
    series: groups.map((group) => ({
      name: group.name,
      type: 'line',
      // Cong rất nhẹ và giữ đơn điệu theo trục x: số liệu thật có thể nhảy mạnh giữa hai tháng, đường cong
      // mạnh (0,3 như mockup) sẽ vồng quá điểm thật, vẽ ra một đỉnh hay một đáy không có.
      smooth: 0.12,
      smoothMonotone: 'x',
      data: group.values,
      color: group.color,
      showSymbol: true,
      symbolSize: 7,
      lineStyle: { width: 2, ...(group.others ? { type: 'dashed' } : {}) },
      itemStyle: { borderColor: CHART_PALETTE.surface, borderWidth: 2 },
      endLabel: { show: true, formatter: (param: { value: number }) => chartNumber(param.value), color: CHART_PALETTE.ink2, fontSize: 11, distance: 6 },
      emphasis: CHART_FOCUS,
    })),
  };
}

/** Sản phẩm còn dư nợ, xếp tỷ lệ nợ xấu từ cao xuống. */
export function toRiskRows(products: ProductStat[]): Array<ProductStat & { nplRatioPercent: number }> {
  return products
    .filter((item): item is ProductStat & { nplRatioPercent: number } => item.nplRatioPercent != null && item.principalOutstanding > 0)
    .sort((a, b) => b.nplRatioPercent - a.nplRatioPercent);
}

/** Thanh ngang tỷ lệ nợ xấu từng sản phẩm, vạch đứt là tỷ lệ toàn danh mục (nếu có). */
export function buildRiskOption(rows: Array<ProductStat & { nplRatioPercent: number }>, platformRatio: number | null): ChartOption {
  const max = Math.max(5, ...rows.map((row) => row.nplRatioPercent), platformRatio ?? 0);
  return {
    grid: { left: 16, right: 56, top: 22, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: AxisParams) => {
        const row = rows[params[0]?.dataIndex ?? 0];
        return tooltipHtml(row.productName, [
          { label: 'Tỷ lệ nợ xấu', value: formatPercent(row.nplRatioPercent) },
          { label: 'Dư nợ gốc', value: formatCurrency(row.principalOutstanding) },
          { label: 'Khoản vay còn dư nợ', value: chartNumber(row.outstandingLoans) },
        ], 'Bấm để xem sản phẩm');
      },
    },
    xAxis: { type: 'value', show: false, max: Math.ceil(max) },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((row) => row.productName),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: CHART_PALETTE.ink2, fontSize: 12, width: 170, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barWidth: 12,
      cursor: 'pointer',
      color: CHART_PALETTE.brand,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      data: rows.map((row) => row.nplRatioPercent),
      label: { show: true, position: 'right', distance: 6, color: CHART_PALETTE.ink, fontSize: 12, formatter: (param: { value: number }) => formatPercent(param.value) },
      ...(platformRatio == null ? {} : {
        markLine: {
          silent: true,
          symbol: 'none',
          z: 1,
          lineStyle: { color: '#aab6c8', width: 1, type: 'dashed' },
          label: { position: 'end', formatter: `toàn danh mục ${formatPercent(platformRatio)}`, color: CHART_PALETTE.muted, fontSize: 11 },
          data: [{ xAxis: platformRatio }],
        },
      }),
    }],
  };
}

/** Cột tiền giải ngân mỗi tháng của một sản phẩm. */
export function buildDisbursedOption(months: string[], values: number[]): ChartOption {
  return {
    grid: { left: 4, right: 8, top: 10, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: AxisParams) => {
        const position = params[0]?.dataIndex ?? 0;
        return tooltipHtml(bucketTitle(months[position], 'MONTH'), [{ label: 'Giải ngân', value: formatCurrency(values[position]), color: CHART_PALETTE.brand }]);
      },
    },
    xAxis: { type: 'category', data: months.map((month) => bucketLabel(month, 'MONTH')) },
    yAxis: { type: 'value', axisLabel: { formatter: moneyShort } },
    series: [{ name: 'Giải ngân', type: 'bar', data: values, color: CHART_PALETTE.brand, barMaxWidth: 20 }],
  };
}

/** Giải ngân từng tháng của một sản phẩm; tháng không có dòng trong `productPoints` là 0. */
export function disbursedByMonth(series: LoanStatisticsSeries, productId: number) {
  const months = series.points.map((point) => point.bucketStart);
  const values = months.map((month) => series.productPoints
    .filter((point) => point.productId === productId && point.bucketStart === month)
    .reduce((sum, point) => sum + point.disbursedAmount, 0));
  return { months, values };
}
