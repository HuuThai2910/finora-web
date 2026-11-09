import { parseDecimal } from '@/utils';
import { LADDER_DEPTH } from '../constant';
import { formatPrice } from '../formatters';
import { SIDE_TEXT } from '../styles';
import type { OrderBookSnapshot, PriceLevel } from '../types';

const HEAD = 'py-1.5 px-2.5 bg-[#f6f8fd] text-secondary text-[12px] font-medium';
const CELL = 'relative py-1.25 px-2.5 border-b border-b-divider';
/** Ô số Note bám về phía dải giá ở giữa: bên mua canh phải, bên bán canh trái; số lệnh nằm phía ngoài. */
const QTY_ALIGN = { bid: 'text-right', ask: 'text-left' } as const;
/** Thanh nhạt sau số Note, mọc từ dải giá ra ngoài. */
const BAR_SIDE = { bid: 'right-0 bg-[rgba(10,125,79,0.12)]', ask: 'left-0 bg-[rgba(194,38,58,0.1)]' } as const;
const NOTE_CELL = `${CELL} text-muted text-[12px] text-center`;

function QuantityCell({ level, max, side }: { level: PriceLevel; max: number; side: 'bid' | 'ask' }) {
  // Độ rộng thanh là giá trị động theo số Note, nên phải đặt inline.
  const width = `${Math.round((level.quantity / max) * 100)}%`;
  return (
    <td className={`q-${side} ${CELL} ${QTY_ALIGN[side]}`}>
      <i
        className={`bar absolute top-1 bottom-1 pointer-events-none rounded-[4px] ${BAR_SIDE[side]}`}
        style={{ width }}
        aria-hidden="true"
      />
      <span className="relative">
        {side === 'bid' && <small className="mr-1.5 text-muted text-[12px]">{level.orderCount} lệnh</small>}
        {level.quantity} phần vốn
        {side === 'ask' && <small className="ml-1.5 text-muted text-[12px]">{level.orderCount} lệnh</small>}
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
      <table className="sm-ladder w-full mt-2 border-separate border-spacing-0 table-fixed text-[13px] tabular-nums">
        <thead>
          <tr>
            <th scope="col" className={`${HEAD} w-[40%] text-right rounded-l-md`}>Bên mua</th>
            <th scope="col" className={`${HEAD} w-[20%] text-center`}>Giá</th>
            <th scope="col" className={`${HEAD} w-[40%] text-left rounded-r-md`}>Bên bán</th>
          </tr>
        </thead>
        <tbody>
          {asks.length ? asks.map((level) => (
            <tr key={`a${level.pricePercent}`}>
              <td className={CELL} />
              <td className={`px sm-ask ${CELL} ${SIDE_TEXT.ask} text-center font-medium`}>{formatPrice(level.pricePercent)}</td>
              <QuantityCell level={level} max={max} side="ask" />
            </tr>
          )) : <tr className="empty"><td colSpan={3} className={NOTE_CELL}>Chưa ai đặt bán.</td></tr>}
          <tr className="spread">
            <td colSpan={3} className="relative py-1.5 px-2.5 border-b border-b-divider bg-surface-muted text-secondary text-[12px] text-center">
              {spread}
            </td>
          </tr>
          {bids.length ? bids.map((level) => (
            <tr key={`b${level.pricePercent}`}>
              <QuantityCell level={level} max={max} side="bid" />
              <td className={`px sm-bid ${CELL} ${SIDE_TEXT.bid} text-center font-medium`}>{formatPrice(level.pricePercent)}</td>
              <td className={CELL} />
            </tr>
          )) : <tr className="empty"><td colSpan={3} className={NOTE_CELL}>Chưa ai đặt mua.</td></tr>}
        </tbody>
      </table>
      {hidden && <p className="sm-ladder-foot mt-1.5 text-muted text-[12px]">{hidden}.</p>}
    </>
  );
}
