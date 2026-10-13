import {
  bucketLabel,
  bucketTitle,
  type LoanStatisticsSeries,
  type ProductStat,
} from '@/features/statistics';
import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_FOCUS, CHART_FONT, CHART_PALETTE, chartNumber, moneyShort, tooltipHtml } from '@/lib/charts/theme';
import { formatCurrency, formatPercent } from '@/utils';

/**
 * Biểu đồ của trang Sản phẩm vay, gốc từ buildDemandOption, buildRiskOption, buildDisbursedOption của mockup
 * products.html (hai biểu đồ đầu trang nay vẽ bằng cột thay cho đường và thanh ngang). Số liệu từ API thống kê
 * Loan: series cột tháng (`productPoints` thưa, chỉ có dòng khác 0) và `portfolio.byProduct` của summary. Hàm thuần.
 */

type AxisParams = Array<{ dataIndex: number }>;

/** Số sản phẩm có màu riêng trong cột; phần còn lại gộp một nhóm xám. */
const NAMED_LIMIT = CHART_PALETTE.categorical.length;

export interface DemandGroup {
  name: string;
  color: string;
  /** Nhóm gộp các sản phẩm còn lại: màu xám, nằm trên cùng mỗi cột. */
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
 * Hồ sơ nộp mỗi tháng của từng sản phẩm. Ba sản phẩm nhiều hồ sơ nhất có màu riêng, các sản phẩm khác
 * gộp thành "N sản phẩm khác". Cột không có dòng trong `productPoints` nghĩa là 0 hồ sơ (backend chỉ trả dòng khác 0).
 *
 * Chỉ vẽ các tháng đã trọn (bỏ cột tháng chứa `today`, như mockup): tháng đang chạy mới có vài ngày nên cột
 * cuối luôn thấp hẳn, trông như nhu cầu giảm mạnh trong khi tháng chưa hết.
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
  const top = ranked.slice(0, NAMED_LIMIT);
  const rest = ranked.slice(NAMED_LIMIT);
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

/** Nhóm nằm trên cùng cột của một tháng: nhóm cuối có hồ sơ; tháng không có hồ sơ nào thì là nhóm đầu. */
function topGroupIndex(groups: DemandGroup[], position: number): number {
  for (let index = groups.length - 1; index > 0; index -= 1) {
    if (groups[index].values[position] > 0) return index;
  }
  return 0;
}

/**
 * Cột chồng hồ sơ nộp mỗi tháng, mỗi nhóm sản phẩm một khúc. Nhóm nhiều hồ sơ nhất nằm sát trục để xu hướng
 * của nó đọc được ngay, nhóm gộp xám nằm trên cùng. Khúc trên cùng của tháng bo đầu và mang nhãn tổng tháng.
 * Chú giải chỉ để nhận màu, không bấm ẩn nhóm: ẩn một khúc thì nhãn tổng trên đỉnh cột sẽ sai.
 */
export function buildDemandOption({ months, groups }: DemandData): ChartOption {
  const totals = months.map((_, position) => groups.reduce((sum, group) => sum + group.values[position], 0));
  const tops = months.map((_, position) => topGroupIndex(groups, position));
  const gridTop = groups.length > 2 ? 56 : 36;
  return {
    legend: { data: groups.map((group) => group.name), selectedMode: false, itemGap: 14, itemWidth: 10, itemHeight: 10 },
    grid: { left: 4, right: 8, top: gridTop, bottom: 4, containLabel: true },
    // Thẻ hẹp như điện thoại thì chú giải xuống thêm một dòng; hạ vùng vẽ để dòng đó không đè nhãn trục y.
    media: [
      { query: { minWidth: 0 }, option: { grid: { top: gridTop } } },
      { query: { maxWidth: 420 }, option: { grid: { top: gridTop + 26 } } },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: AxisParams) => {
        const position = params[0]?.dataIndex ?? 0;
        const rows = groups.map((group) => ({ label: group.name, value: `${chartNumber(group.values[position])} hồ sơ`, color: group.color }));
        return tooltipHtml(bucketTitle(months[position], 'MONTH'), rows, `Tổng ${chartNumber(totals[position])} hồ sơ`);
      },
    },
    xAxis: { type: 'category', data: months.map((month) => bucketLabel(month, 'MONTH')) },
    yAxis: { type: 'value', minInterval: 1, splitNumber: 4 },
    series: groups.map((group, groupIndex) => ({
      name: group.name,
      type: 'bar',
      stack: 'demand',
      barMaxWidth: 24,
      color: group.color,
      // Viền màu nền làm khe hở giữa các khúc, như cột chồng ở trang Tổng quan.
      itemStyle: { borderColor: CHART_PALETTE.surface, borderWidth: 1, borderRadius: 0 },
      emphasis: CHART_FOCUS,
      data: group.values.map((value, position) => (tops[position] === groupIndex
        ? {
          value,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', distance: 6, formatter: chartNumber(totals[position]), color: CHART_PALETTE.ink2, fontSize: 11 },
        }
        : value)),
    })),
  };
}

/** Sản phẩm còn dư nợ, xếp tỷ lệ nợ xấu từ cao xuống. */
export function toRiskRows(products: ProductStat[]): Array<ProductStat & { nplRatioPercent: number }> {
  return products
    .filter((item): item is ProductStat & { nplRatioPercent: number } => item.nplRatioPercent != null && item.principalOutstanding > 0)
    .sort((a, b) => b.nplRatioPercent - a.nplRatioPercent);
}

/** Tên sản phẩm dài hơn chừng này ký tự thì cắt kèm "…" để nhãn trục không chiếm nhiều dòng; tên đủ có ở tooltip và bảng. */
const NAME_MAX_CHARS = 36;

const axisName = (name: string) => (name.length > NAME_MAX_CHARS ? `${name.slice(0, NAME_MAX_CHARS - 1).trimEnd()}…` : name);

/** Nấc bề rộng biểu đồ (px) để tính lại bề rộng nhãn trục, cách nhau 20px. Nấc 0 luôn khớp nên thu hẹp lại vẫn đúng. */
const LABEL_WIDTH_STEPS = [0, ...Array.from({ length: 56 }, (_, index) => 300 + index * 20)];

/**
 * ECharts không tự co nhãn trục danh mục theo bề rộng một cột, nên tên sản phẩm dài sẽ đè lên nhau khi thẻ hẹp.
 * Media query của ECharts tính theo bề rộng biểu đồ và chạy lại mỗi lần đổi cỡ; các nấc khớp được gộp theo thứ
 * tự nên nấc lớn nhất thắng. Mỗi nấc đặt bề rộng nhãn bằng bề rộng một cột ở cỡ nhỏ nhất của nấc trừ khe hở,
 * tên dài tự xuống dòng.
 * @param sidePadding tổng lề trái phải của grid (px).
 */
function categoryLabelMedia(count: number, sidePadding: number): NonNullable<ChartOption['media']> {
  return LABEL_WIDTH_STEPS.map((minWidth) => ({
    query: { minWidth },
    option: { xAxis: { axisLabel: { width: Math.max(28, Math.floor((Math.max(minWidth, 300) - sidePadding) / count) - 6) } } },
  }));
}

/**
 * Cột tỷ lệ nợ xấu từng sản phẩm, cao nhất bên trái; vạch đứt ngang là tỷ lệ toàn danh mục (nếu có), nhãn vạch
 * đặt ở đầu phải, phía trên các cột thấp nhất. Tên sản phẩm dưới trục cũng bấm được vì cột 0% không có hình để bấm.
 */
export function buildRiskOption(rows: Array<ProductStat & { nplRatioPercent: number }>, platformRatio: number | null): ChartOption {
  const max = Math.max(5, ...rows.map((row) => row.nplRatioPercent), platformRatio ?? 0);
  return {
    grid: { left: 4, right: 8, top: 26, bottom: 4, containLabel: true },
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
    xAxis: {
      type: 'category',
      data: rows.map((row) => row.productName),
      triggerEvent: true,
      axisLabel: {
        interval: 0,
        hideOverlap: false,
        color: CHART_PALETTE.ink2,
        // Khai báo font ngay ở nhãn: containLabel đo nhãn chỉ bằng thuộc tính của axisLabel (không lấy font chung
        // của theme), đo bằng font mặc định thì ngắt dòng ít hơn lúc vẽ và dòng cuối bị cắt ở đáy biểu đồ.
        fontFamily: CHART_FONT,
        fontSize: 11,
        lineHeight: 14,
        overflow: 'break',
        formatter: axisName,
      },
    },
    yAxis: { type: 'value', show: false, max: Math.ceil(max) },
    series: [{
      type: 'bar',
      barMaxWidth: 24,
      cursor: 'pointer',
      color: CHART_PALETTE.brand,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: rows.map((row) => row.nplRatioPercent),
      label: { show: true, position: 'top', distance: 6, color: CHART_PALETTE.ink, fontSize: 12, formatter: (param: { value: number }) => formatPercent(param.value) },
      ...(platformRatio == null ? {} : {
        markLine: {
          silent: true,
          symbol: 'none',
          z: 1,
          lineStyle: { color: '#aab6c8', width: 1, type: 'dashed' },
          label: { position: 'insideEndTop', formatter: `toàn danh mục ${formatPercent(platformRatio)}`, color: CHART_PALETTE.muted, fontSize: 11 },
          data: [{ yAxis: platformRatio }],
        },
      }),
    }],
    media: categoryLabelMedia(rows.length, 12),
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
