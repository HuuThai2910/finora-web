import type { LoanInstallments } from '@/features/investment';
import { formatDate } from '@/utils';
import type { AdminOrderBookDetail } from '../types';

export type RepaymentTone = 'ok' | 'warn' | 'danger';
export type CellTone = 'paid' | 'late' | 'next' | 'later';

export interface RepaymentView {
  /** Số kỳ đã trả; null khi chưa đọc được kỳ trả từ hệ thống lõi. */
  paid: number | null;
  total: number;
  state: { label: string; tone: RepaymentTone };
  /** Mỗi ô một kỳ; rỗng khi chưa đọc được kỳ trả. */
  cells: Array<{ key: number; tone: CellTone; title: string }>;
  nextDue: string | null;
  maturity: string | null;
}

const DAY_MS = 86_400_000;

/** Số ngày quá hạn: theo bản chiếu của Investment, thiếu thì tính từ kỳ quá hạn sớm nhất tới ngày nghiệp vụ của lõi. */
function overdueDays(book: AdminOrderBookDetail, installments: LoanInstallments | undefined): number {
  if (book.daysPastDue != null && book.daysPastDue > 0) return book.daysPastDue;
  const first = installments?.installments.find((item) => item.status === 'OVERDUE');
  if (!installments || !first) return 0;
  const span = new Date(`${installments.businessDate}T00:00:00`).getTime() - new Date(`${first.dueDate}T00:00:00`).getTime();
  return Math.max(1, Math.round(span / DAY_MS));
}

/**
 * Tình hình trả nợ của khoản vay cho cột phải của sổ lệnh (giá phần vốn trên chợ phụ thuộc điều này).
 *
 * Nguồn: kỳ trả theo lịch hiện hành của hệ thống lõi (API kỳ trả của Loan: kỳ nào đã trả, quá hạn) và bản chiếu ở
 * Investment (nợ xấu, số ngày quá hạn, ngày đáo hạn). Nợ xấu đứng trên quá hạn; không quá hạn thì "Trả đúng hạn".
 */
export function repaymentView(book: AdminOrderBookDetail, installments: LoanInstallments | undefined): RepaymentView {
  const items = installments?.installments ?? [];
  const days = overdueDays(book, installments);
  const state: RepaymentView['state'] = book.defaulted
    ? { label: 'Nợ xấu', tone: 'danger' }
    : days > 0 ? { label: `Quá hạn ${days} ngày`, tone: 'warn' } : { label: 'Trả đúng hạn', tone: 'ok' };
  const nextIndex = items.findIndex((item) => item.status === 'DUE' || item.status === 'UPCOMING');

  return {
    paid: installments ? installments.paidCount : null,
    total: items.length > 0 ? items.length : book.termMonths,
    state,
    cells: items.map((item, index) => ({
      key: item.number,
      tone: item.status === 'PAID' ? 'paid' : item.status === 'OVERDUE' ? 'late' : index === nextIndex ? 'next' : 'later',
      title: `Kỳ ${item.number}, hạn ${formatDate(item.dueDate)}`,
    })),
    nextDue: nextIndex >= 0 ? items[nextIndex].dueDate : null,
    maturity: book.maturityDate ?? (items.length > 0 ? items[items.length - 1].dueDate : null),
  };
}
