import { changePercent, sumOf, type InvestmentSeriesPoint, type LoanStatisticsSummary } from '@/features/statistics';
import { moneyShort } from '@/lib/charts/theme';
import { EMPTY, formatPercent } from '@/utils';
import type { PeriodKpiKey } from '../types';

export interface KpiDelta {
  /** Phần trăm thay đổi so với kỳ trước liền kề. */
  percent: number;
  /** Tăng là tốt (vốn gọi được, phí thu). */
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

export interface InvestmentPeriods {
  current: InvestmentSeriesPoint[];
  previous: InvestmentSeriesPoint[];
  previousComplete: boolean;
}

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

/**
 * Bốn ô số liệu theo kỳ của mockup: nhãn, số lớn, chênh lệch. Dư nợ và tỷ lệ nợ xấu chỉ có ảnh chụp
 * hiện tại (backend không lưu lịch sử) nên ghi "hiện tại" thay cho chênh lệch; vốn gọi được và phí chợ
 * Notes cộng theo series ngày của kỳ và so với kỳ trước liền kề.
 */
export function buildPeriodKpis(
  summary: LoanStatisticsSummary | undefined,
  periods: InvestmentPeriods | undefined,
): KpiTile[] {
  const portfolio = summary?.portfolio;
  const committed = periods ? sumOf(periods.current, (point) => point.committedAmount) : undefined;
  const committedBefore = periods ? sumOf(periods.previous, (point) => point.committedAmount) : 0;
  const fee = periods ? sumOf(periods.current, (point) => point.platformFee) : undefined;
  const feeBefore = periods ? sumOf(periods.previous, (point) => point.platformFee) : 0;

  return [
    { key: 'outstanding', label: 'Dư nợ hiện tại', value: money(portfolio?.principalOutstanding), note: 'hiện tại' },
    { key: 'committed', label: 'Vốn gọi được', value: money(committed), ...compare(committed, committedBefore, periods) },
    { key: 'npl', label: 'Tỷ lệ nợ xấu', value: portfolio ? formatPercent(portfolio.nplRatioPercent) : EMPTY, note: 'hiện tại' },
    { key: 'fee', label: 'Phí chợ Notes', value: money(fee), ...compare(fee, feeBefore, periods) },
  ];
}

const PERCENT1 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "+12,3%", "-4,0%". */
export const formatDelta = (percent: number) => `${percent >= 0 ? '+' : '-'}${PERCENT1.format(Math.abs(percent))}%`;
