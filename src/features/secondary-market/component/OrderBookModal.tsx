import { useEffect } from 'react';
import { EMPTY, formatDateTime, parseDecimal } from '@/utils';
import { useGetOrderBookQuery } from '../api/orderBookApi';
import { LADDER_DEPTH, SIDE_LABEL } from '../constant';
import { formatAnnualRate, formatMoney, formatPrice } from '../formatters';
import type { OrderBookSnapshot, PriceLevel } from '../types';

interface Props {
  listingId: number;
  loanId: number;
  onClose: () => void;
}

/**
 * Thang giá của một sổ, tự cập nhật khi có lệnh đặt, khớp hoặc huỷ (luồng SSE trong
 * `useGetOrderBookQuery`). Chỉ có độ sâu gộp theo mức giá — sổ công khai không cho biết ai đặt lệnh.
 */
export function OrderBookModal({ listingId, loanId, onClose }: Props) {
  const { data, isLoading, isError, refetch } = useGetOrderBookQuery(listingId);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="inv-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="inv-modal is-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sm-book-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="inv-detail-head">
          <div>
            <h2 id="sm-book-title" className="inv-modal-title">Sổ lệnh khoản vay #{loanId}</h2>
            <p className="inv-modal-note">Tự cập nhật khi có lệnh mới, không cần tải lại.</p>
          </div>
          {data?.defaulted && <span className="inv-status is-cancelled">Nợ xấu</span>}
        </header>

        {isLoading && <div className="inv-empty">Đang tải sổ lệnh…</div>}
        {isError && (
          <div className="inv-error" role="alert">
            Không tải được sổ lệnh.{' '}
            <button type="button" className="inv-link" onClick={() => refetch()}>Thử lại</button>
          </div>
        )}
        {data && <BookBody book={data} />}

        <footer className="inv-modal-actions">
          <button type="button" className="inv-btn inv-btn-ghost" onClick={onClose}>Đóng</button>
        </footer>
      </div>
    </div>
  );
}

function BookBody({ book }: { book: OrderBookSnapshot }) {
  return (
    <>
      <dl className="inv-kv sm-book-kv">
        <div><dt>Khớp gần nhất</dt><dd>{formatPrice(book.lastTradePercent)}</dd></div>
        <div><dt>Hạng, lãi suất</dt><dd>{book.creditGrade ? `${book.creditGrade}, ` : ''}{formatAnnualRate(book.annualInterestRate)}</dd></div>
        <div><dt>Kỳ hạn</dt><dd>{book.termMonths} tháng</dd></div>
        <div><dt>Dư nợ mỗi Note</dt><dd>{book.referenceOutstanding ? `${formatMoney(book.referenceOutstanding)} đ` : EMPTY}</dd></div>
      </dl>

      {book.defaulted && book.defaultWarning && (
        <div className="inv-error" role="note">{book.defaultWarning}</div>
      )}

      <div className="sm-book-grid">
        <section className="inv-detail-card" aria-labelledby="sm-ladder-title">
          <h3 id="sm-ladder-title" className="inv-detail-heading">Thang giá</h3>
          <Ladder book={book} />
        </section>
        <section className="inv-detail-card" aria-labelledby="sm-ticks-title">
          <h3 id="sm-ticks-title" className="inv-detail-heading">Khớp gần đây</h3>
          {book.recentTrades.length === 0 ? (
            <p className="inv-muted">Chưa có lần khớp nào.</p>
          ) : (
            <ul className="sm-ticks">
              {book.recentTrades.map((tick, index) => (
                <li key={`${tick.executedAt}-${index}`} className="sm-tick">
                  <span className="inv-desc">{formatDateTime(tick.executedAt)}</span>
                  <span className={tick.aggressorSide === 'BID' ? 'sm-bid' : 'sm-ask'}>{SIDE_LABEL[tick.aggressorSide]}</span>
                  <span className="sm-tick-price">{formatPrice(tick.pricePercent)}</span>
                  <span className="sm-ladder-qty">{tick.quantity} Note</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

/**
 * Bên bán ở trên (giá bán tốt nhất sát dải giữa), bên mua ở dưới, như thang giá của sàn chứng khoán.
 * Thanh nhạt mọc từ phải theo số Note so với mức lớn nhất; mỗi phía có nhãn chữ, không chỉ màu.
 */
function Ladder({ book }: { book: OrderBookSnapshot }) {
  const asks = book.asks.slice(0, LADDER_DEPTH).reverse();
  const bids = book.bids.slice(0, LADDER_DEPTH);
  const max = Math.max(1, ...asks.map((l) => l.quantity), ...bids.map((l) => l.quantity));
  const bestBid = parseDecimal(book.bestBidPercent);
  const bestAsk = parseDecimal(book.bestAskPercent);
  const spread =
    bestBid != null && bestAsk != null
      ? `Chênh lệch ${formatPrice(String(Math.round((bestAsk - bestBid) * 10) / 10))}`
      : 'Một phía đang trống, chưa khớp được';

  return (
    <div className="sm-ladder">
      <div className="sm-ladder-side sm-ask">Bên bán</div>
      {asks.length ? asks.map((l) => <LadderRow key={`a${l.pricePercent}`} level={l} max={max} side="ask" />) : <p className="inv-muted">Chưa ai đặt bán.</p>}
      <div className="sm-ladder-spread">{spread}</div>
      {bids.length ? bids.map((l) => <LadderRow key={`b${l.pricePercent}`} level={l} max={max} side="bid" />) : <p className="inv-muted">Chưa ai đặt mua.</p>}
      <div className="sm-ladder-side sm-bid">Bên mua</div>
    </div>
  );
}

function LadderRow({ level, max, side }: { level: PriceLevel; max: number; side: 'bid' | 'ask' }) {
  return (
    <div className="sm-ladder-row">
      <span className={`sm-ladder-bar is-${side}`} style={{ width: `${Math.round((level.quantity / max) * 100)}%` }} />
      <span className={`sm-ladder-price sm-${side}`}>{formatPrice(level.pricePercent)}</span>
      <span className="inv-desc">{level.orderCount} lệnh</span>
      <span className="sm-ladder-qty">{level.quantity} Note</span>
    </div>
  );
}
