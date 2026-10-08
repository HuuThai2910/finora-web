import { Icon } from '@/components/Icon';
import { ErrorNotice } from '@/components/ErrorNotice';
import { EMPTY, formatNumber } from '@/utils';
import { FEE_RATE_PERCENT } from '../constant';
import { formatMoneyVnd } from '../formatters';
import type { OrderBookAdminSummary, SettlementStatus } from '../types';

interface Props {
  summary: OrderBookAdminSummary | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Bấm ô thanh toán để mở thẳng danh sách giao dịch lọc theo trạng thái đó. */
  onShowTrades: (status: SettlementStatus) => void;
}

/** Icon "i" của dòng quy tắc; Icon dùng chung chưa có hình này. */
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

/**
 * Bốn số liệu trong một thẻ, tính trên toàn chợ (API summary), không phải trang đang xem.
 *
 * Hai ô về thanh toán là nút: "Cần đối soát" lớn hơn 0 nghĩa là dịch vụ thanh toán đã từ chối một lần
 * khớp, việc duy nhất trên trang này mà quản trị phải ra tay, nên bấm vào là tới đúng danh sách.
 */
export function MarketSummaryCard({ summary, isLoading, error, onRetry, onShowTrades }: Props) {
  const failed = summary?.failedCount ?? 0;
  const value = (text: string) => (summary ? text : isLoading ? '...' : EMPTY);

  return (
    <section className="ui-card sm-card" aria-label="Số liệu toàn chợ">
      {error ? (
        <div className="sm-card-error"><ErrorNotice error={error} onRetry={onRetry} /></div>
      ) : (
        <div className="sm-figs" aria-busy={isLoading}>
          <div className="sm-fig">
            <span className="lbl">Phí đã thu</span>
            <b className="val">{value(formatMoneyVnd(summary?.feeCollected))}</b>
            <span className="hint">
              {summary ? `${formatNumber(summary.settledCount)} lần khớp, ${formatMoneyVnd(summary.settledAmount)} đã chuyển` : ' '}
            </span>
          </div>
          <button type="button" className="sm-fig" onClick={() => onShowTrades('PENDING')}>
            <span className="lbl">Chờ thanh toán <Icon name="chevronRight" /></span>
            <b className="val">{value(formatNumber(summary?.pendingCount))}{summary && <small>lần khớp</small>}</b>
            <span className="hint">{summary ? `${formatMoneyVnd(summary.pendingAmount)} đang giữ chờ chuyển` : ' '}</span>
          </button>
          <button type="button" className={failed > 0 ? 'sm-fig is-danger' : 'sm-fig'} onClick={() => onShowTrades('FAILED')}>
            <span className="lbl">Cần đối soát <Icon name="chevronRight" /></span>
            <b className="val">{value(formatNumber(summary?.failedCount))}{summary && <small>lần khớp</small>}</b>
            <span className="hint">
              {!summary ? ' ' : failed > 0 ? 'Thanh toán bị từ chối, Note đã đổi chủ' : 'Không có lần khớp lỗi'}
            </span>
          </button>
          <div className="sm-fig">
            <span className="lbl">Đang chờ khớp</span>
            <b className="val">
              {value(`${formatNumber(summary?.openBidNotes)} mua, ${formatNumber(summary?.openAskNotes)} bán`)}
            </b>
            <span className="hint">
              {summary ? `Note trong ${formatNumber(summary.openBidOrders + summary.openAskOrders)} lệnh đang nằm trong sổ` : ' '}
            </span>
          </div>
        </div>
      )}
      <p className="sm-rule">
        <InfoIcon />
        <span>
          Nhà đầu tư đặt lệnh giới hạn theo % dư nợ gốc còn lại, hệ thống khớp ngay khi giá mua gặp giá bán.
          Nền tảng thu <b>{FEE_RATE_PERCENT}%</b> trên tiền bán, trừ vào tiền người bán nhận. Trang này chỉ để
          theo dõi và đối soát.
        </span>
      </p>
    </section>
  );
}
