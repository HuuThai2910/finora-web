import {
  bucketTitle,
  changePercent,
  formatIsoDate,
  shiftDays,
  splitPeriods,
  sumOf,
  type LoanSeriesPoint,
} from '@/features/statistics';
import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, chartNumber, moneyShort, tooltipHtml } from '@/lib/charts/theme';
import { formatCurrency } from '@/utils';

/** Số ngày của thẻ; series tải gấp đôi để có kỳ trước liền kề mà so sánh. */
export const SUBMITTED_DAYS = 30;

export interface SubmittedValueSummary {
  /** Cột ngày của kỳ hiện tại (30 ngày tính cả hôm nay). */
  points: LoanSeriesPoint[];
  total: number;
  applications: number;
  /** Số tiền đề nghị bình quân mỗi hồ sơ; `null` khi kỳ không có hồ sơ. */
  average: number | null;
  /** % thay đổi so với 30 ngày trước đó; `null` khi kỳ trước thiếu cột hoặc bằng 0. */
  change: number | null;
  /** Nhãn kỳ cho viên thuốc ở tiêu đề: "09/09 đến 08/10". */
  periodLabel: string;
}

const amountOf = (point: LoanSeriesPoint) => point.applicationsSubmittedAmount ?? 0;

/**
 * Backend thêm `applicationsSubmittedAmount` sau (2026-10-08). Khi chưa có trường này ở mọi cột thì
 * coi là chưa có số liệu, không hiển thị 0 đ (sẽ gây hiểu nhầm là không ai nộp hồ sơ).
 */
export function hasSubmittedAmount(points: readonly LoanSeriesPoint[]): boolean {
  return points.length > 0 && points.every((point) => point.applicationsSubmittedAmount !== undefined);
}

/**
 * Tách series 60 ngày thành kỳ hiện tại và kỳ trước theo ngày bắt đầu cột, rồi cộng tổng tiền, số hồ sơ.
 * @param today hôm nay theo giờ Việt Nam (YYYY-MM-DD), cùng mốc đã dùng để gọi API.
 */
export function summarizeSubmitted(points: readonly LoanSeriesPoint[], today: string): SubmittedValueSummary {
  const currentFrom = shiftDays(today, -(SUBMITTED_DAYS - 1));
  const { current, previous, previousComplete } = splitPeriods(points, currentFrom, SUBMITTED_DAYS);
  const total = sumOf(current, amountOf);
  const applications = sumOf(current, (point) => point.applicationsSubmitted);
  return {
    points: current,
    total,
    applications,
    average: applications > 0 ? total / applications : null,
    change: changePercent(total, sumOf(previous, amountOf), previousComplete),
    periodLabel: `${formatIsoDate(currentFrom).slice(0, 5)} đến ${formatIsoDate(today).slice(0, 5)}`,
  };
}

/** Nhãn trục ngày kiểu mockup: "26/8" (không đệm số 0). */
const dayLabel = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d}/${m}`;
};

/**
 * Cột số tiền đề nghị theo ngày, nhãn trục cách 7 ngày, bong bóng giá trị trên cột cao nhất (như mockup
 * loans.html). Tooltip kèm số hồ sơ của ngày đó. Hàm thuần.
 */
export function buildSubmittedValueOption(points: readonly LoanSeriesPoint[]): ChartOption {
  return {
    grid: { left: 4, right: 12, top: 34, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const point = points[params[0]?.dataIndex ?? 0];
        return tooltipHtml(bucketTitle(point.bucketStart, 'DAY'), [
          { label: 'Số tiền đề nghị', value: formatCurrency(amountOf(point)), color: CHART_PALETTE.brand },
          { label: 'Số hồ sơ', value: chartNumber(point.applicationsSubmitted) },
        ]);
      },
    },
    xAxis: { type: 'category', data: points.map((point) => dayLabel(point.bucketStart)), axisLabel: { interval: 6 } },
    yAxis: { type: 'value', axisLabel: { formatter: moneyShort } },
    series: [{
      name: 'Số tiền đề nghị',
      type: 'bar',
      barMaxWidth: 16,
      color: CHART_PALETTE.brand,
      data: points.map(amountOf),
      // Bong bóng trên cột cao nhất; bỏ khi mọi cột bằng 0 để không chấm một điểm vô nghĩa ở trục.
      markPoint: points.some((point) => amountOf(point) > 0) ? MAX_BUBBLE : undefined,
    }],
  };
}

/** Bong bóng giá trị trên điểm cao nhất, chép `FC.maxBubble` của mockup chart-theme.js. */
const MAX_BUBBLE = {
  symbol: 'circle',
  symbolSize: 9,
  itemStyle: { color: CHART_PALETTE.brand, borderColor: '#fff', borderWidth: 2 },
  label: {
    show: true,
    position: 'top',
    distance: 10,
    formatter: (param: { value: number }) => moneyShort(param.value),
    color: CHART_PALETTE.ink,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: '#fff',
    padding: [5, 8],
    borderRadius: 8,
    shadowColor: 'rgba(15,40,90,.18)',
    shadowBlur: 10,
    shadowOffsetY: 3,
  },
  data: [{ type: 'max' }],
};
