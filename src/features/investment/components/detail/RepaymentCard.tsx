import { usePermission } from '@/features/auth';
import { ReviewCard, type SchedulePeriod } from '@/features/loan';
import { useLoanServicingStatusQuery } from '@/features/servicing';
import type { InstallmentStatus, LoanInstallments } from '../../types';
import { formatDate, formatDateTime, formatMoney } from '../../formatters';
import { RepaymentPill } from './StageCards';
import { StatStrip, type Stat } from './StatStrip';

interface Props {
  /** Lịch trả theo hợp đồng (snapshot của hồ sơ vay bên Loan); không có quyền đọc hồ sơ vay thì rỗng. */
  periods: SchedulePeriod[];
  /** Mã khoản vay `LN-…` sau giải ngân, để đọc dư nợ và quá hạn. */
  loanNumber: string | null;
  /** Trạng thái từng kỳ theo hệ thống lõi (API kỳ trả quản trị); undefined khi chưa đọc được. */
  installments?: LoanInstallments;
}

const CELL = 'h-2.5 flex-1 rounded-[3px]';
const CELL_TONE = {
  paid: 'bg-success',
  overdue: 'bg-danger',
  due: 'bg-line-strong',
  next: 'bg-white shadow-[inset_0_0_0_2px_var(--color-brand)]',
  later: 'bg-[#eef0f3]',
} as const;
type CellTone = keyof typeof CELL_TONE;

const INSTALLMENT_LABEL: Record<InstallmentStatus, string> = {
  PAID: 'đã trả',
  OVERDUE: 'quá hạn',
  DUE: 'đến hạn hôm nay',
  UPCOMING: 'chưa đến hạn',
};

/** Ngày đến hạn theo lịch (YYYY-MM-DD) so với hôm nay theo giờ máy; chỉ dùng để tô ô, không tính tiền. */
const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

interface Cell {
  key: number;
  tone: CellTone;
  title: string;
}

function Legend({ tones }: { tones: Array<[CellTone, string]> }) {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-muted text-[12px]">
      {tones.map(([tone, label]) => (
        <span key={tone}><i className={`mr-1.25 inline-block size-2.5 rounded-[3px] align-[-1px] ${CELL_TONE[tone]}`} />{label}</span>
      ))}
      <span className="ml-auto">Mỗi ô là một kỳ trả</span>
    </div>
  );
}

/**
 * Tình hình trả nợ của khoản vay đã phát hành phần vốn.
 *
 * Ba nguồn thật: trạng thái từng kỳ theo hệ thống lõi (kỳ nào đã trả, quá hạn; quyền Xem "Gọi vốn" là đủ), lịch trả
 * theo hợp đồng (khi chưa đọc được trạng thái kỳ) và số liệu đối soát của Loan (dư nợ, tiền quá hạn, cần quyền Xem
 * "Đối soát & sự cố"). Có trạng thái kỳ thì thanh ô tô "đã trả"; không có thì chỉ chia theo ngày đến hạn.
 */
export function RepaymentCard({ periods, loanNumber, installments }: Props) {
  const canReconcile = usePermission().canView('reconciliation');
  const status = useLoanServicingStatusQuery(loanNumber ?? '', { skip: !canReconcile || !loanNumber });
  const servicing = status.data;
  const items = installments?.installments ?? [];
  if (items.length === 0 && periods.length === 0 && !servicing) return null;

  const today = installments?.businessDate ?? todayKey();
  // Kỳ tới: kỳ đầu tiên chưa trả và chưa quá hạn (lịch lõi), hoặc kỳ đầu tiên từ hôm nay (lịch hợp đồng).
  const nextIndex = items.length > 0
    ? items.findIndex((item) => item.status === 'DUE' || item.status === 'UPCOMING')
    : periods.findIndex((period) => period.dueDate >= today);
  const next = items.length > 0
    ? (nextIndex >= 0 ? { dueDate: items[nextIndex].dueDate, amount: items[nextIndex].totalDue, number: items[nextIndex].number } : null)
    : (nextIndex >= 0 ? { dueDate: periods[nextIndex].dueDate, amount: periods[nextIndex].totalDue, number: periods[nextIndex].period } : null);
  const lastDue = items.length > 0 ? items[items.length - 1].dueDate : periods[periods.length - 1]?.dueDate;
  const total = items.length > 0 ? items.length : periods.length;

  const cells: Cell[] = items.length > 0
    ? items.map((item, index) => ({
        key: item.number,
        tone: item.status === 'PAID' ? 'paid' : item.status === 'OVERDUE' ? 'overdue' : index === nextIndex ? 'next' : 'later',
        title: `Kỳ ${item.number}: ${formatDate(item.dueDate)}${item.totalDue != null ? `, ${formatMoney(item.totalDue)} đ` : ''}, `
          + (item.status === 'PAID' && item.paidOn ? `đã trả ngày ${formatDate(item.paidOn)}` : INSTALLMENT_LABEL[item.status]),
      }))
    : periods.map((period, index) => ({
        key: period.period,
        tone: index === nextIndex ? 'next' : period.dueDate < today ? 'due' : 'later',
        title: `Kỳ ${period.period}: ${formatDate(period.dueDate)}, ${formatMoney(period.totalDue)} đ`,
      }));
  const legend: Array<[CellTone, string]> = installments
    ? [
        ['paid', 'Đã trả'],
        ...(installments.overdueCount > 0 ? [['overdue', 'Quá hạn'] as [CellTone, string]] : []),
        ['next', 'Kỳ tới'],
        ['later', 'Chưa đến hạn'],
      ]
    : [['due', 'Đã đến hạn'], ['next', 'Kỳ tới'], ['later', 'Chưa đến hạn']];

  const stats: Stat[] = [
    ...(servicing
      ? [{ key: 'outstanding', label: 'Dư nợ', value: `${formatMoney(servicing.totalOutstanding)} đ`, hint: `tính đến ${formatDateTime(servicing.dataAsOf)}` }]
      : []),
    ...(next
      ? [{
          key: 'next',
          label: 'Kỳ trả tới',
          value: formatDate(next.dueDate),
          hint: next.amount != null ? `${formatMoney(next.amount)} đ, kỳ ${next.number}` : `kỳ ${next.number}`,
        }]
      : []),
    ...(installments
      ? [{
          key: 'paid',
          label: 'Đã trả',
          value: `${installments.paidCount}/${total} kỳ`,
          hint: installments.overdueCount > 0
            ? <span className="text-danger">{installments.overdueCount} kỳ quá hạn</span>
            : installments.paidCount === 0 ? 'chưa tới kỳ đầu' : 'không có kỳ quá hạn',
        }]
      : []),
    ...(servicing
      ? [{
          key: 'overdue',
          label: 'Quá hạn',
          value: servicing.overdueAmount > 0 ? `${formatMoney(servicing.overdueAmount)} đ` : 'Không có',
          hint: servicing.overdueAmount > 0 ? `${servicing.daysPastDue} ngày` : null,
        }]
      : []),
    ...(lastDue
      ? [{
          key: 'last',
          label: 'Kỳ cuối',
          value: formatDate(lastDue),
          hint: installments ? 'tất toán dự kiến' : `${periods.length} kỳ trả theo hợp đồng`,
        }]
      : []),
  ];
  // Nhãn đầu thẻ: số liệu đối soát nếu có quyền, không thì suy từ trạng thái kỳ.
  const aside = servicing
    ? <RepaymentPill overdueAmount={servicing.overdueAmount} daysPastDue={servicing.daysPastDue} />
    : installments
      ? <RepaymentPill overdueAmount={installments.overdueCount} daysPastDue={overdueDays(installments, today)} />
      : undefined;

  return (
    <ReviewCard title="Trả nợ" aside={aside}>
      <StatStrip stats={stats} />
      {cells.length > 0 && (
        <>
          <div className="mt-4 mb-2 flex gap-0.75" role="img" aria-label={`Lịch trả ${total} kỳ`}>
            {cells.map((cell) => <i key={cell.key} className={`${CELL} ${CELL_TONE[cell.tone]}`} title={cell.title} />)}
          </div>
          <Legend tones={legend} />
        </>
      )}
    </ReviewCard>
  );
}

/** Số ngày quá hạn tính từ kỳ quá hạn sớm nhất, chỉ để ghi trên nhãn khi không có số liệu đối soát. */
function overdueDays(installments: LoanInstallments, today: string): number {
  const first = installments.installments.find((item) => item.status === 'OVERDUE');
  if (!first) return 0;
  const span = new Date(`${today}T00:00:00`).getTime() - new Date(`${first.dueDate}T00:00:00`).getTime();
  return Math.max(1, Math.round(span / 86_400_000));
}
