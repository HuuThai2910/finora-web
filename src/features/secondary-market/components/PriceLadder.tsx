import { parseDecimal } from '@/utils';
import { LADDER_DEPTH } from '../constant';
import { formatPrice } from '../formatters';
import type { OrderBookSnapshot, PriceLevel } from '../types';

function QuantityCell({ level, max, side }: { level: PriceLevel; max: number; side: 'bid' | 'ask' }) {
  // Độ rộng thanh là giá trị động theo số Note, nên phải đặt inline.
  const width = `${Math.round((level.quantity / max) * 100)}%`;
  return (
    <td className={`q-${side}`}>
      <i className="bar" style={{ width }} aria-hidden="true" />
      <span>
        {side === 'bid' && <small>{level.orderCount} lệnh</small>}
        {level.quantity} Note
        {side === 'ask' && <small>{level.orderCount} lệnh</small>}
      </span>
    </td>
  );
}

/**
 * Thang giá: bên bán ở trên (giá bán tốt nhất sát dải giữa), bên mua ở dưới, như bảng giá chứng
 * khoán. Thanh nhạt dài theo số Note so với mức lớn nhất; mỗi phía có tiêu đề cột bằng chữ, không chỉ màu.
 */
export function PriceLadder({ book }: { book: OrderBookSnapshot }) {
  const asks = book.asks.slice(0, LADDER_DEPTH).reverse();
  const bids = book.bids.slice(0, LADDER_DEPTH);
  const max = Math.max(1, ...asks.map((level) => level.quantity), ...bids.map((level) => level.quantity));
  const bestBid = parseDecimal(book.bestBidPercent);
  const bestAsk = parseDecimal(book.bestAskPercent);
  const spread = bestBid != null && bestAsk != null
    ? `Chênh lệch ${formatPrice(Math.round((bestAsk - bestBid) * 10) / 10)}`
    : 'Một phía đang trống, chưa khớp được';
  const hidden = [
    book.asks.length > LADDER_DEPTH ? `${book.asks.length - LADDER_DEPTH} mức bán xa hơn không hiện` : '',
    book.bids.length > LADDER_DEPTH ? `${book.bids.length - LADDER_DEPTH} mức mua xa hơn không hiện` : '',
  ].filter(Boolean).join(', ');

  return (
    <>
      <table className="sm-ladder">
        <thead>
          <tr>
            <th scope="col">Bên mua</th>
            <th scope="col">Giá</th>
            <th scope="col">Bên bán</th>
          </tr>
        </thead>
        <tbody>
          {asks.length ? asks.map((level) => (
            <tr key={`a${level.pricePercent}`}>
              <td />
              <td className="px sm-ask">{formatPrice(level.pricePercent)}</td>
              <QuantityCell level={level} max={max} side="ask" />
            </tr>
          )) : <tr className="empty"><td colSpan={3}>Chưa ai đặt bán.</td></tr>}
          <tr className="spread"><td colSpan={3}>{spread}</td></tr>
          {bids.length ? bids.map((level) => (
            <tr key={`b${level.pricePercent}`}>
              <QuantityCell level={level} max={max} side="bid" />
              <td className="px sm-bid">{formatPrice(level.pricePercent)}</td>
              <td />
            </tr>
          )) : <tr className="empty"><td colSpan={3}>Chưa ai đặt mua.</td></tr>}
        </tbody>
      </table>
      {hidden && <p className="sm-ladder-foot">{hidden}.</p>}
    </>
  );
}
