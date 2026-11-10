import { useGetLoanInstallmentsQuery } from '@/features/investment';
import { formatDate } from '@/utils';
import { formatMoneyVnd } from '../../formatters';
import { repaymentView, type CellTone, type RepaymentTone } from '../../mappers/repayment';
import type { AdminOrderBookDetail } from '../../types';

const STATE_TEXT: Record<RepaymentTone, string> = { ok: 'text-success', warn: 'text-warning', danger: 'text-danger' };
const CELL: Record<CellTone, string> = {
  paid: 'bg-success',
  late: 'bg-danger',
  next: 'bg-white shadow-[inset_0_0_0_2px_var(--color-brand)]',
  later: 'bg-[#eef0f3]',
};
const DATA = 'grid gap-2 [&_div]:flex [&_div]:items-baseline [&_div]:justify-between [&_div]:gap-3 [&_div]:text-[13px] '
  + '[&_dt]:text-muted [&_dd]:text-right [&_dd]:font-medium [&_dd]:tabular-nums';

/**
 * Cột phải của sổ lệnh: tình hình trả nợ của khoản vay (quyết định giá phần vốn trên chợ) và vài con số về chuyển
 * nhượng. Không lặp giá hay lệnh của sổ. Dính khi cuộn như cột Tiến trình của trang Gọi vốn; dưới 1180px nằm trên cùng.
 *
 * Kỳ trả đọc từ API kỳ trả của Loan theo mã khoản vay Investment đã nhận lúc giải ngân; chưa đọc được thì chỉ còn trạng
 * thái và các dòng số liệu.
 */
export function BookSlip({ book }: { book: AdminOrderBookDetail }) {
  const installments = useGetLoanInstallmentsQuery(book.loanNumber ?? '', { skip: !book.loanNumber });
  const view = repaymentView(book, installments.data);

  return (
    <aside
      className="sticky top-[calc(var(--header-height)+16px)] grid max-h-[calc(100vh-var(--header-height)-32px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[1180px]:static max-[1180px]:-order-1 max-[1180px]:max-h-none"
      aria-label="Trả nợ và chuyển nhượng"
    >
      <section className="ui-card px-4.5 py-4">
        <h2 className="text-[14px] font-semibold">Trả nợ</h2>
        {view.paid != null && (
          <div className="mt-2.5 flex items-end gap-2">
            <span className="text-[40px] leading-none font-semibold tabular-nums">{view.paid}/{view.total}</span>
            <span className="pb-1 text-muted text-[13px]">kỳ đã trả</span>
          </div>
        )}
        <p className={`mt-1.5 text-[13px] font-semibold ${STATE_TEXT[view.state.tone]}`}>{view.state.label}</p>
        {view.cells.length > 0 && (
          <div className="mt-3 mb-1 flex gap-0.75" role="img" aria-label={`Lịch trả ${view.total} kỳ, đã trả ${view.paid ?? 0} kỳ`}>
            {view.cells.map((cell) => (
              <i key={cell.key} className={`h-2.5 flex-1 rounded-[3px] ${CELL[cell.tone]}`} title={cell.title} />
            ))}
          </div>
        )}
        <dl className={`${DATA} mt-3.5 border-t border-t-divider pt-3`}>
          {view.nextDue && <div><dt>Kỳ tới</dt><dd>{formatDate(view.nextDue)}</dd></div>}
          {book.outstandingPerNote && (
            <div><dt>Dư nợ gốc mỗi phần vốn</dt><dd>{formatMoneyVnd(book.outstandingPerNote)}</dd></div>
          )}
          {view.maturity && <div><dt>Tất toán dự kiến</dt><dd>{formatDate(view.maturity)}</dd></div>}
        </dl>

        <div className="mt-4 border-t border-t-divider pt-3.5">
          <h2 className="text-[14px] font-semibold">Chuyển nhượng</h2>
          <dl className={`${DATA} mt-2`}>
            <div><dt>Phần vốn đã đổi chủ</dt><dd>{book.transferredNotes}</dd></div>
            <div><dt>Người đang nắm giữ</dt><dd>{book.holderCount} nhà đầu tư</dd></div>
            <div><dt>Phí nền tảng đã thu</dt><dd>{formatMoneyVnd(book.feeCollected)}</dd></div>
          </dl>
        </div>
      </section>
    </aside>
  );
}
