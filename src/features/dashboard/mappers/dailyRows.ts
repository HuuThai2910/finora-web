import type { InvestmentSeriesPoint, LoanSeriesPoint } from '@/features/statistics';
import { moneyShort } from '@/lib/charts/theme';
import { formatNumber } from '@/utils';
import type { PeriodKpiKey } from '../types';

/** Một dòng của bảng "Số liệu từng ngày": cột thiếu ở một service là `null` (hiện "-"), không coi là 0. */
export interface DailyRow {
  bucketStart: string;
  committed: number | null;
  disbursed: number | null;
  submitted: number | null;
  approved: number | null;
  fee: number | null;
}

export interface DailyColumn {
  key: Exclude<keyof DailyRow, 'bucketStart'>;
  header: string;
  /** Cột ứng với một ô của thẻ Số liệu: bấm tiêu đề để chọn ô đó, cột đang chọn được tô nhạt. */
  kpi?: PeriodKpiKey;
  format: (value: number) => string;
}

/** Tiền rút gọn như mockup ("553 tr", "255 nghìn", "31,3 tỷ"); 0 ghi "0". */
const shortMoney = (value: number) => (value === 0 ? '0' : moneyShort(value));

/**
 * Các cột lấy được theo ngày từ series thật. Mockup còn "Dư nợ cuối ngày" và "Tỷ lệ nợ xấu" nhưng backend
 * chưa lưu lịch sử dư nợ, nên hai cột này bỏ (ghi chú dưới bảng).
 */
export const DAILY_COLUMNS: DailyColumn[] = [
  { key: 'committed', header: 'Vốn gọi được', kpi: 'committed', format: shortMoney },
  { key: 'disbursed', header: 'Giải ngân', format: shortMoney },
  { key: 'submitted', header: 'Hồ sơ nộp', format: formatNumber },
  { key: 'approved', header: 'Hồ sơ duyệt', format: formatNumber },
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
      committed: inv?.committedAmount ?? null,
      disbursed: ln?.disbursedAmount ?? null,
      submitted: ln?.applicationsSubmitted ?? null,
      approved: ln?.applicationsApproved ?? null,
      fee: inv?.platformFee ?? null,
    };
  });
}

