import {
  buildDebtGroupOption,
  changePercent,
  buildTradedValueOption,
  debtGroupName,
  formatIsoDate,
  overdueGroups,
  sumOf,
  type CreditGradeStat,
  type StatisticsBucket,
} from '@/features/statistics';
import type { ChartOption } from '@/lib/charts/echarts';
import { moneyShort } from '@/lib/charts/theme';
import { formatNumber, formatPercent } from '@/utils';
import type { DashboardStatistics } from '../hooks/useDashboardStatistics';
import type { DashboardChartKey } from '../types';
import { formatDelta } from './periodKpis';
import { rollingAverage } from './rolling';
import {
  buildAutoInvestOption,
  buildFundingOption,
  buildFunnelOption,
  buildGradesOption,
  gradeLabel,
  sharePercent,
  type FundingRow,
} from './chartOptions';

/** Đoạn chữ của câu dẫn; phần `strong` in đậm (số liệu chính). */
export type LeadPart = string | { strong: string };

export interface ChartSpecReady {
  status: 'ready';
  option: ChartOption;
  ariaLabel: string;
  lead: LeadPart[];
  /** Bảng bên cạnh biểu đồ: có `headers` thì là bảng nhiều cột, không thì là cặp nhãn, giá trị. */
  headers?: string[];
  rows: string[][];
  /** Dòng in đậm trong bảng cặp nhãn, giá trị. */
  strongRows?: number;
  note: string;
  /** Biểu đồ dùng dư nợ từ projection: hiện cảnh báo khi có projection cũ. */
  staleProjections?: number;
}

export type ChartSpec =
  | { status: 'loading' }
  | { status: 'error'; error: unknown; retry: () => void }
  | { status: 'empty'; text?: string; note?: string }
  | ChartSpecReady;

/**
 * Đọc `currentData` (kết quả của đúng tham số hiện tại) thay cho `data`: đổi kỳ 7/30/90 thì hiện trạng thái
 * tải thay vì vẽ tạm số của kỳ cũ, và không ghép series kỳ mới của service này với kỳ cũ của service kia.
 */
interface QueryState<T> {
  currentData?: T;
  error?: unknown;
  isLoading: boolean;
  refetch: () => unknown;
}

/** Gộp trạng thái của các query nguồn: lỗi của query đầu tiên lỗi, đang tải nếu còn query chưa có dữ liệu. */
function gate(queries: Array<QueryState<unknown>>): ChartSpec | null {
  const failed = queries.find((query) => query.error);
  if (failed) return { status: 'error', error: failed.error, retry: () => void failed.refetch() };
  if (queries.some((query) => query.isLoading || query.currentData === undefined)) return { status: 'loading' };
  return null;
}

const money = (value: number) => `${moneyShort(value)} đ`;
const unitNote = (bucket: StatisticsBucket) => (bucket === 'DAY' ? 'Theo ngày' : 'Theo tuần (tuần bắt đầu thứ Hai)');
const rangeNote = (from: string, to: string) => `từ ${formatIsoDate(from)} đến ${formatIsoDate(to)}`;

function fundingSpec(stats: DashboardStatistics): ChartSpec {
  const pending = gate([stats.investmentCompare, stats.loanCompare]);
  if (pending) return pending;
  const investment = stats.investmentCompare.currentData;
  const loan = stats.loanCompare.currentData;
  const investmentPeriods = stats.investmentPeriods;
  const loanPeriods = stats.loanPeriods;
  if (!investment || !loan || !investmentPeriods || !loanPeriods) return { status: 'loading' };
  // Ghép theo ngày; hai service cắt cột cùng một cách (finora-common), ngày thiếu bên nào để trống.
  const committed = new Map(rollingAverage(investment.points, stats.currentFrom, (point) => point.committedAmount).map((point) => [point.bucketStart, point]));
  const disbursed = new Map(rollingAverage(loan.points, stats.currentFrom, (point) => point.disbursedAmount).map((point) => [point.bucketStart, point]));
  const rows: FundingRow[] = [...new Set([...committed.keys(), ...disbursed.keys()])].sort()
    .map((bucketStart) => ({ bucketStart, committed: committed.get(bucketStart) ?? null, disbursed: disbursed.get(bucketStart) ?? null }));
  const committedSum = sumOf(investmentPeriods.current, (point) => point.committedAmount);
  const disbursedSum = sumOf(loanPeriods.current, (point) => point.disbursedAmount);
  if (committedSum === 0 && disbursedSum === 0) return { status: 'empty' };
  const days = stats.period;
  const change = changePercent(committedSum, sumOf(investmentPeriods.previous, (point) => point.committedAmount), investmentPeriods.previousComplete);
  return {
    status: 'ready',
    option: buildFundingOption(rows),
    ariaLabel: `Biểu đồ đường vốn gọi được và tiền giải ngân bình quân 7 ngày, ${days} ngày gần nhất`,
    lead: ['Nhà đầu tư góp ', { strong: money(committedSum) }, ', giải ngân cho người vay ', { strong: money(disbursedSum) }, ` trong ${days} ngày.`],
    rows: [
      ['Vốn gọi được', money(committedSum)],
      ['Đã giải ngân', money(disbursedSum)],
      ['Tỷ lệ giải ngân', sharePercent(disbursedSum, committedSum)],
      ['Gọi vốn bình quân mỗi ngày', money(committedSum / days)],
      ['Giải ngân bình quân mỗi ngày', money(disbursedSum / days)],
      ['Lệnh góp vốn', formatNumber(sumOf(investmentPeriods.current, (point) => point.commitments))],
      ...(change == null ? [] : [['Vốn gọi được so với kỳ trước', formatDelta(change)]]),
    ],
    strongRows: 2,
    note: `Đường là bình quân 7 ngày, ${rangeNote(stats.currentFrom, investment.to)}`,
  };
}

function funnelSpec(stats: DashboardStatistics): ChartSpec {
  const pending = gate([stats.loanChart]);
  if (pending) return pending;
  const series = stats.loanChart.currentData;
  if (!series) return { status: 'loading' };
  const { funnel } = series;
  if (funnel.submitted === 0) return { status: 'empty' };
  const steps = [
    { label: 'Nộp hồ sơ', count: funnel.submitted },
    { label: 'Chấm điểm xong', count: funnel.scored },
    { label: 'Được duyệt', count: funnel.approved },
    { label: 'Chấp nhận điều khoản', count: funnel.termsAccepted },
    { label: 'Yêu cầu gọi vốn', count: funnel.fundingRequested },
    { label: 'Đủ vốn', count: funnel.fullyFunded },
    { label: 'Đã giải ngân', count: funnel.disbursed },
  ];
  return {
    status: 'ready',
    option: buildFunnelOption(steps),
    ariaLabel: 'Biểu đồ thanh ngang số hồ sơ vay qua từng bước',
    lead: [{ strong: sharePercent(funnel.disbursed, funnel.submitted) }, ' hồ sơ nộp trong kỳ đã được giải ngân.'],
    headers: ['Bước', 'Hồ sơ', 'Tỷ lệ'],
    rows: steps.map((step) => [step.label, formatNumber(step.count), sharePercent(step.count, funnel.submitted)]),
    note: `Hồ sơ nộp ${rangeNote(series.from, series.to)}, đếm số hồ sơ đã tới từng bước`,
  };
}

const GRADE_ORDER = ['A', 'B', 'C', 'D', 'E'];
const gradeRank = (grade: CreditGradeStat) => {
  const index = GRADE_ORDER.indexOf(grade.grade);
  return index < 0 ? GRADE_ORDER.length : index;
};

function gradesSpec(stats: DashboardStatistics): ChartSpec {
  const pending = gate([stats.loanSummary]);
  if (pending) return pending;
  const portfolio = stats.loanSummary.currentData?.portfolio;
  if (!portfolio) return { status: 'loading' };
  const grades = [...portfolio.byCreditGrade].sort((a, b) => gradeRank(a) - gradeRank(b));
  const total = sumOf(grades, (grade) => grade.principalOutstanding);
  if (grades.every((grade) => grade.loans === 0)) return { status: 'empty', text: 'Chưa có khoản vay nào còn dư nợ.' };
  const topTwo = sumOf(grades.filter((grade) => grade.grade === 'A' || grade.grade === 'B'), (grade) => grade.principalOutstanding);
  return {
    status: 'ready',
    option: buildGradesOption(grades),
    ariaLabel: 'Biểu đồ cột dư nợ gốc theo hạng tín dụng',
    lead: ['Hạng A và B chiếm ', { strong: sharePercent(topTwo, total) }, ' dư nợ gốc.'],
    headers: ['Hạng', 'Khoản', 'Dư nợ'],
    rows: grades.map((grade) => [gradeLabel(grade.grade), formatNumber(grade.loans), money(grade.principalOutstanding)]),
    note: 'Hiện tại, theo hạng định giá lúc duyệt hồ sơ',
    staleProjections: portfolio.staleProjections,
  };
}

function overdueSpec(stats: DashboardStatistics): ChartSpec {
  const note = 'Số hiện tại; hệ thống chưa lưu lịch sử nên chưa có diễn biến 6 tháng';
  const pending = gate([stats.loanSummary]);
  if (pending) return pending;
  const portfolio = stats.loanSummary.currentData?.portfolio;
  if (!portfolio) return { status: 'loading' };
  if (overdueGroups(portfolio.byDebtGroup).every((group) => group.loans === 0)) {
    return { status: 'empty', text: 'Hiện không có khoản vay nào quá hạn.', note };
  }
  return {
    status: 'ready',
    option: buildDebtGroupOption(portfolio.byDebtGroup),
    ariaLabel: 'Biểu đồ cột dư nợ gốc của khoản quá hạn theo nhóm nợ 2 đến 5, số hiện tại',
    lead: ['Nợ xấu (nhóm 3 đến 5) ', { strong: money(portfolio.nplPrincipalOutstanding) }, ', bằng ', { strong: formatPercent(portfolio.nplRatioPercent) }, ' dư nợ gốc.'],
    headers: ['Nhóm', 'Khoản', 'Dư nợ gốc', 'Quá hạn'],
    rows: [...portfolio.byDebtGroup].sort((a, b) => a.debtGroup - b.debtGroup).map((group) => [
      `${group.debtGroup}. ${debtGroupName(group.debtGroup)}`,
      formatNumber(group.loans),
      money(group.principalOutstanding),
      money(group.overdueAmount),
    ]),
    note,
    staleProjections: portfolio.staleProjections,
  };
}

function marketSpec(stats: DashboardStatistics): ChartSpec {
  const pending = gate([stats.investmentChart]);
  if (pending) return pending;
  const series = stats.investmentChart.currentData;
  if (!series) return { status: 'loading' };
  const trades = sumOf(series.points, (point) => point.trades);
  if (trades === 0) return { status: 'empty' };
  const value = sumOf(series.points, (point) => point.tradedAmount);
  const fee = sumOf(series.points, (point) => point.platformFee);
  const unit = stats.chartBucket === 'DAY' ? 'Ngày' : 'Tuần';
  return {
    status: 'ready',
    option: buildTradedValueOption(series.points, stats.chartBucket),
    ariaLabel: `Biểu đồ cột giá trị khớp lệnh chợ Notes ${stats.chartBucket === 'DAY' ? 'theo ngày' : 'theo tuần'}`,
    lead: ['Nền tảng thu ', { strong: money(fee) }, ' phí trên ', { strong: money(value) }, ' giá trị khớp.'],
    rows: [
      ['Giá trị khớp', money(value)],
      ['Số lần khớp', formatNumber(trades)],
      ['Phí nền tảng thu', money(fee)],
      ['Bình quân mỗi lần khớp', money(value / trades)],
      [`${unit} không có lần khớp`, formatNumber(series.points.filter((point) => point.trades === 0).length)],
    ],
    strongRows: 1,
    note: `${unitNote(stats.chartBucket)}, không tính lần khớp thanh toán lỗi`,
  };
}

function autoSpec(stats: DashboardStatistics): ChartSpec {
  const pending = gate([stats.investmentChart]);
  if (pending) return pending;
  const series = stats.investmentChart.currentData;
  if (!series) return { status: 'loading' };
  const placed = sumOf(series.points, (point) => point.autoInvestPlaced);
  const skipped = sumOf(series.points, (point) => point.autoInvestSkipped);
  if (placed + skipped === 0) return { status: 'empty' };
  const configs = stats.investmentSummary.currentData?.autoInvest.activeConfigs;
  return {
    status: 'ready',
    option: buildAutoInvestOption(series.points, stats.chartBucket),
    ariaLabel: `Biểu đồ cột chồng số lần Auto-Invest đặt lệnh và bỏ qua ${stats.chartBucket === 'DAY' ? 'theo ngày' : 'theo tuần'}`,
    lead: configs == null
      ? ['Auto-Invest đặt được ', { strong: sharePercent(placed, placed + skipped) }, ' số lần xét.']
      : [{ strong: formatNumber(configs) }, ' cấu hình Auto-Invest đang bật; đặt được ', { strong: sharePercent(placed, placed + skipped) }, ' số lần xét.'],
    rows: [
      ['Lần xét', formatNumber(placed + skipped)],
      ['Đặt lệnh thành công', formatNumber(placed)],
      ['Bỏ qua', formatNumber(skipped)],
      ['Tỷ lệ đặt được lệnh', sharePercent(placed, placed + skipped)],
    ],
    strongRows: 1,
    note: unitNote(stats.chartBucket),
  };
}

const SPECS: Record<DashboardChartKey, (stats: DashboardStatistics) => ChartSpec> = {
  funding: fundingSpec,
  funnel: funnelSpec,
  grades: gradesSpec,
  overdue: overdueSpec,
  market: marketSpec,
  auto: autoSpec,
};

/** Dữ liệu và trạng thái của biểu đồ đang chọn; chỉ biểu đồ đang chọn được dựng option. */
export const buildChartSpec = (key: DashboardChartKey, stats: DashboardStatistics) => SPECS[key](stats);
