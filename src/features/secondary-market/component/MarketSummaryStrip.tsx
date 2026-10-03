import { EMPTY } from '@/utils';
import { formatMoney } from '../formatters';
import type { OrderBookAdminSummary, SettlementStatus } from '../types';

interface Props {
  summary: OrderBookAdminSummary | undefined;
  /** Bấm ô thanh toán để mở thẳng danh sách giao dịch lọc theo trạng thái đó. */
  onShowTrades: (status: SettlementStatus) => void;
}

/**
 * Dải bốn số liệu trong một thẻ, tính trên toàn chợ chứ không phải trang đang xem.
 *
 * Hai ô về thanh toán là nút: "Cần đối soát" lớn hơn 0 nghĩa là Payment đã từ chối một lần khớp —
 * việc duy nhất trên trang này mà quản trị phải ra tay, nên bấm vào là tới đúng danh sách.
 */
export function MarketSummaryStrip({ summary, onShowTrades }: Props) {
  const failed = summary?.failedCount ?? 0;

  return (
    <section className="sm-summary" aria-label="Số liệu chợ Notes">
      <div className="sm-figure">
        <span className="sm-figure-label">Phí đã thu</span>
        <strong className="sm-figure-value">{summary ? `${formatMoney(summary.feeCollected)} đ` : EMPTY}</strong>
        <span className="sm-figure-hint">
          {summary ? `${summary.settledCount} lần khớp, ${formatMoney(summary.settledAmount)} đ đã chuyển` : EMPTY}
        </span>
      </div>

      <button type="button" className="sm-figure is-button" onClick={() => onShowTrades('PENDING')}>
        <span className="sm-figure-label">Chờ thanh toán</span>
        <strong className="sm-figure-value">{summary ? summary.pendingCount : EMPTY}</strong>
        <span className="sm-figure-hint">
          {summary ? `${formatMoney(summary.pendingAmount)} đ đang giữ chờ chuyển` : EMPTY}
        </span>
      </button>

      <button
        type="button"
        className={`sm-figure is-button${failed > 0 ? ' is-danger' : ''}`}
        onClick={() => onShowTrades('FAILED')}
      >
        <span className="sm-figure-label">Cần đối soát</span>
        <strong className="sm-figure-value">{summary ? failed : EMPTY}</strong>
        <span className="sm-figure-hint">
          {failed > 0 ? 'Payment từ chối, Note đã đổi chủ' : 'Không có lần khớp lỗi'}
        </span>
      </button>

      <div className="sm-figure">
        <span className="sm-figure-label">Đang chờ khớp</span>
        <strong className="sm-figure-value">
          {summary ? `${summary.openBidNotes} mua, ${summary.openAskNotes} bán` : EMPTY}
        </strong>
        <span className="sm-figure-hint">
          {summary ? `Note trong ${summary.openBidOrders + summary.openAskOrders} lệnh đang nằm trong sổ` : EMPTY}
        </span>
      </div>
    </section>
  );
}
