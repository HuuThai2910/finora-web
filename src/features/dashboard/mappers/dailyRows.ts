import type { InvestmentSeriesPoint, LoanSeriesPoint } from '@/features/statistics';
import { moneyShort } from '@/lib/charts/theme';
import { formatNumber } from '@/utils';
import type { PeriodKpiKey } from '../types';

/** Một dòng của bảng "Số liệu từng ngày": cột thiếu ở một service là `null` (hiện "-"), không coi là 0. */
export interface DailyRow {
  bucketStart: string;
  /** Dư nợ gốc cuối ngày (cuối tuần với cột tuần); `null` khi backend không tính được. */
  outstanding: number | null;
  committed: number | null;
  disbursed: number | null;
  submitted: number | null;
  /** Tỷ lệ nợ xấu cuối ngày (phần trăm); `null` khi dư nợ bằng 0 hoặc không tính được. */
  npl: number | null;
  fee: number | null;
}

export interface DailyColumn {
  key: Exclude<keyof DailyRow, 'bucketStart'>;
  header: string;
  /** Tiêu đề khi mỗi dòng là một tuần (cột lấy số cuối tuần thay vì cộng cả tuần). */
  weeklyHeader?: string;
  /** Cột ứng với một ô của thẻ Số liệu: bấm tiêu đề để chọn ô đó, cột đang chọn được tô nhạt. */
  kpi?: PeriodKpiKey;
  format: (value: number) => string;
}

/** Tiền rút gọn như mockup ("553 tr", "255 nghìn", "31,3 tỷ"); 0 ghi "0". */
const shortMoney = (value: number) => (value === 0 ? '0' : moneyShort(value));

const TWO_DECIMALS = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Dư nợ theo tỷ, đủ 2 chữ số để cột thẳng hàng như mockup ("11,24 tỷ"). */
const billions = (value: number) => `${TWO_DECIMALS.format(value / 1e9)} tỷ`;

/**
 * Các cột theo thứ tự mockup. Dư nợ và nợ xấu là số cuối ngày backend tính lại từ lịch sử Fineract
 * (với cột tuần là số cuối tuần); các cột còn lại cộng trong ngày hoặc trong tuần.
 */
export const DAILY_COLUMNS: DailyColumn[] = [
  { key: 'outstanding', header: 'Dư nợ cuối ngày', weeklyHeader: 'Dư nợ cuối tuần', kpi: 'outstanding', format: billions },
  { key: 'committed', header: 'Vốn gọi được', kpi: 'committed', format: shortMoney },
  { key: 'disbursed', header: 'Giải ngân', format: shortMoney },
  { key: 'submitted', header: 'Hồ sơ nộp', format: formatNumber },
  { key: 'npl', header: 'Tỷ lệ nợ xấu', kpi: 'npl', format: (value) => `${TWO_DECIMALS.format(value)}%` },
  { key: 'fee', header: 'Phí chợ Notes', kpi: 'fee', format: shortMoney },
];

/** Ghép series Investment và Loan theo ngày đầu cột, mới nhất ở trên. */
export function buildDailyRows(investment: InvestmentSeriesPoint[], loan: LoanSeriesPoint[]): DailyRow[] {
  const investmentBy = new Map(investment.map((point) => [point.bucketStart, point]));
  const loanBy = new Map(loan.map((point) => [point.bucketStart, point]));
  const starts = [...new Set([...investmentBy.keys(), ...loanBy.keys()])].sort().reverse();
  return starts.map((bucketStart) => {
    const inv = investmentBy.get(bucketStart);
    const ln = loanBy.get(bucketStart);
    return {
      bucketStart,
      outstanding: ln?.portfolio?.principalOutstanding ?? null,
      committed: inv?.committedAmount ?? null,
      disbursed: ln?.disbursedAmount ?? null,
      submitted: ln?.applicationsSubmitted ?? null,
      npl: ln?.portfolio?.nplRatioPercent ?? null,
      fee: inv?.platformFee ?? null,
    };
  });
}

