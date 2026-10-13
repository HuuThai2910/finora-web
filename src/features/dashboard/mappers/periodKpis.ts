import {
  changePercent,
  sumOf,
  type InvestmentSeriesPoint,
  type LoanSeriesPoint,
  type LoanStatisticsSummary,
  type PortfolioPosition,
} from '@/features/statistics';
import { moneyShort } from '@/lib/charts/theme';
import { EMPTY, formatPercent } from '@/utils';
import type { PeriodKpiKey } from '../types';
import type { LevelPoint } from './chartOptions';

export interface KpiDelta {
  /** Thay đổi so với kỳ trước liền kề: phần trăm, hoặc điểm phần trăm khi `unit` là `point`. */
  percent: number;
  /** Tỷ lệ (nợ xấu) so bằng hiệu số điểm phần trăm, không so phần trăm của phần trăm. */
  unit?: 'point';
  /** Hướng thay đổi này là tốt: dư nợ, vốn gọi được, phí thu tăng là tốt; nợ xấu giảm là tốt. */
  good: boolean;
}

export interface KpiTile {
  key: PeriodKpiKey;
  label: string;
  value: string;
  /** Chỉ có khi so được trung thực (kỳ trước đủ cột và khác 0). */
  delta?: KpiDelta;
  /** Dòng nhỏ thay cho chênh lệch khi không so được: "hiện tại", "kỳ trước bằng 0". */
  note: string;
}

export interface SeriesPeriods<T> {
  current: T[];
  previous: T[];
  previousComplete: boolean;
}

export type InvestmentPeriods = SeriesPeriods<InvestmentSeriesPoint>;

/** Số tiền rút gọn như mockup ("31,3 tỷ", "4,6 tr"); đơn vị tiền nằm trong chữ tỷ/tr. */
const money = (value: number | undefined) => (value == null ? EMPTY : moneyShort(value));

/** Chênh lệch so với kỳ trước, hoặc lý do không so được (để ô số không bỏ trống dòng thứ ba). */
function compare(current: number | undefined, previous: number, periods: InvestmentPeriods | undefined): Pick<KpiTile, 'delta' | 'note'> {
  if (!periods || current == null) return { note: '' };
  if (!periods.previousComplete) return { note: 'chưa đủ số liệu kỳ trước' };
  const percent = changePercent(current, previous, true);
  if (percent == null) return { note: 'kỳ trước bằng 0' };
  return { delta: { percent, good: percent >= 0 }, note: '' };
}

/** Dư nợ cuối ngày gần nhất có số của một đoạn series (cột chưa tới không có `portfolio`). */
function lastPortfolio(points: readonly LoanSeriesPoint[]): PortfolioPosition | undefined {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const portfolio = points[index].portfolio;
    if (portfolio) return portfolio;
  }
  return undefined;
}

/**
 * Dư nợ và tỷ lệ nợ xấu hôm nay so với cuối ngày trước kỳ (mockup: "so với N ngày trước"), cả hai đầu đều
 * lấy từ số backend tính lại theo lịch sử Fineract để cùng một cách tính. Không có lịch sử thì giữ "hiện tại".
 * Thiếu lịch sử của một số khoản thì không so: số lớn của ô là số hiện tại gồm cả các khoản đó, đặt cạnh
 * chênh lệch tính trên phần còn lại sẽ khiến người đọc suy ra sai số kỳ trước.
 */
function compareSnapshot(
  loanPeriods: SeriesPeriods<LoanSeriesPoint> | undefined,
  unavailableLoans: number,
  kind: 'outstanding' | 'npl',
): Pick<KpiTile, 'delta' | 'note'> {
  const fallback = { note: 'hiện tại' };
  if (unavailableLoans > 0) return fallback;
  if (!loanPeriods?.previousComplete) return fallback;
  const now = lastPortfolio(loanPeriods.current);
  const before = lastPortfolio(loanPeriods.previous);
  if (!now || !before) return fallback;
  if (kind === 'outstanding') {
    const percent = changePercent(now.principalOutstanding, before.principalOutstanding, true);
    return percent == null ? { note: 'kỳ trước bằng 0' } : { delta: { percent, good: percent >= 0 }, note: '' };
  }
  if (now.nplRatioPercent == null || before.nplRatioPercent == null) return fallback;
  const points = now.nplRatioPercent - before.nplRatioPercent;
  return { delta: { percent: points, unit: 'point', good: points <= 0 }, note: '' };
}

/**
 * Điểm của đường xu hướng dư nợ hoặc tỷ lệ nợ xấu: số cuối mỗi cột backend tính lại từ lịch sử Fineract.
 * Bỏ cột chưa có số (cột chưa tới) và cột có dư nợ bằng 0 với tỷ lệ nợ xấu (không có tỷ lệ).
 */
export function portfolioTrendPoints(points: readonly LoanSeriesPoint[], kind: 'outstanding' | 'npl'): LevelPoint[] {
  return points.flatMap((point) => {
    const portfolio = point.portfolio;
    if (!portfolio) return [];
    const value = kind === 'outstanding' ? portfolio.principalOutstanding : portfolio.nplRatioPercent;
    return value == null ? [] : [{ bucketStart: point.bucketStart, asOf: portfolio.asOf, value }];
  });
}

/**
 * Bốn ô số liệu theo kỳ của mockup: nhãn, số lớn, chênh lệch. Dư nợ và tỷ lệ nợ xấu hiện số hiện tại của
 * danh mục, chênh lệch so với cuối ngày trước kỳ; vốn gọi được và phí chợ Notes cộng theo series ngày
 * của kỳ và so với kỳ trước liền kề.
 */
export function buildPeriodKpis(
  summary: LoanStatisticsSummary | undefined,
  periods: InvestmentPeriods | undefined,
  loanPeriods: SeriesPeriods<LoanSeriesPoint> | undefined,
  /** Số khoản vay backend không đọc được lịch sử từ Fineract trong series so sánh. */
  unavailableLoans: number,
): KpiTile[] {
  const portfolio = summary?.portfolio;
  const committed = periods ? sumOf(periods.current, (point) => point.committedAmount) : undefined;
  const committedBefore = periods ? sumOf(periods.previous, (point) => point.committedAmount) : 0;
  const fee = periods ? sumOf(periods.current, (point) => point.platformFee) : undefined;
  const feeBefore = periods ? sumOf(periods.previous, (point) => point.platformFee) : 0;

  return [
    { key: 'outstanding', label: 'Dư nợ hiện tại', value: money(portfolio?.principalOutstanding), ...compareSnapshot(loanPeriods, unavailableLoans, 'outstanding') },
    { key: 'committed', label: 'Vốn gọi được', value: money(committed), ...compare(committed, committedBefore, periods) },
    { key: 'npl', label: 'Tỷ lệ nợ xấu', value: portfolio ? formatPercent(portfolio.nplRatioPercent) : EMPTY, ...compareSnapshot(loanPeriods, unavailableLoans, 'npl') },
    { key: 'fee', label: 'Phí chợ Notes', value: money(fee), ...compare(fee, feeBefore, periods) },
  ];
}

const PERCENT1 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const POINT2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "+12,3%", "-4,0%". */
export const formatDelta = (percent: number) => `${percent >= 0 ? '+' : '-'}${PERCENT1.format(Math.abs(percent))}%`;

/** Chênh lệch của ô số: phần trăm như {@link formatDelta}, điểm phần trăm dạng "+0,12 điểm". */
export const formatKpiDelta = (delta: KpiDelta) => (delta.unit === 'point'
  ? `${delta.percent >= 0 ? '+' : '-'}${POINT2.format(Math.abs(delta.percent))} điểm`
  : formatDelta(delta.percent));

/** Dưới ngưỡng này coi như không đổi (hiện "0,0%" hoặc "0,00 điểm", không mũi tên). */
export const isFlatDelta = (delta: KpiDelta) => Math.abs(delta.percent) < (delta.unit === 'point' ? 0.005 : 0.05);
