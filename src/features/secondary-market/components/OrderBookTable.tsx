import { StatusPill } from '@/components/StatusPill';
import { EMPTY, formatDateTime } from '@/utils';
import { formatPrice, formatRate } from '../formatters';
import type { OrderBookSummary } from '../types';
import { LOAN_CELL, LOAN_LINK, MARKET_TABLE, NONE_TEXT, SIDE_TEXT } from '../styles';

/**
 * Dòng có sổ đang mở trong ngăn được tô xanh nhạt, thắng nền khi rê chuột; khi dòng đang focus bằng bàn phím
 * thì nền focus của bảng chung vẫn thắng như trước.
 */
const ROW = 'clickable [&.is-open:not(:focus-visible)_td]:bg-brand-50';

interface Props {
  books: OrderBookSummary[];
  /** Mã đợt của sổ đang mở trong ngăn, để tô dòng tương ứng. */
  openListingId: number | null;
  onOpen: (listingId: number) => void;
}

/** Ô giá: trống thì gạch xám, vì gạch tô màu phía mua/bán trông như một giá. */
function PriceCell({ value, side }: { value: string | null; side: 'bid' | 'ask' }) {
  return (
    <td className={value == null ? `num sm-none ${NONE_TEXT}` : `num sm-${side} ${SIDE_TEXT[side]} font-medium`}>
      {formatPrice(value)}
    </td>
  );
}

/**
 * Mỗi khoản vay còn Note lưu hành một dòng: giá mua tốt nhất, giá bán tốt nhất và giá khớp gần nhất.
 * Bấm cả dòng (hoặc mã khoản vay bằng bàn phím) để mở ngăn thang giá đầy đủ.
 */
export function OrderBookTable({ books, openListingId, onOpen }: Props) {
  return (
    <div className="ui-table-wrap">
      <table className={`ui-table list sm-table ${MARKET_TABLE}`}>
        <thead>
          <tr>
            <th>Khoản vay</th>
            <th>Hạng</th>
            <th className="num">Lãi suất/năm</th>
            <th className="num">Kỳ hạn</th>
            <th className="num">Mua cao nhất</th>
            <th className="num">Bán thấp nhất</th>
            <th className="num">Khớp gần nhất</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr
              key={book.listingId}
              className={book.listingId === openListingId ? `${ROW} is-open` : ROW}
              onClick={() => onOpen(book.listingId)}
            >
              <td>
                <span className={`sm-loan ${LOAN_CELL}`}>
                  <button
                    type="button"
                    className={`sm-link ${LOAN_LINK}`}
                    aria-expanded={book.listingId === openListingId}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(book.listingId);
                    }}
                  >
                    {book.applicationCode ? `Hồ sơ ${book.applicationCode}` : `Khoản vay #${book.loanId}`}
                  </button>
                  {book.defaulted && <StatusPill tone="danger" small>Nợ xấu</StatusPill>}
                </span>
                <span className="ui-sub ui-mono">Đợt #{book.listingId}</span>
              </td>
              <td>
                <span className="sm-grade inline-grid place-items-center min-w-6 h-5.5 px-1.5 rounded-sm bg-fill text-primary text-[12px] font-semibold">
                  {book.creditGrade ?? EMPTY}
                </span>
              </td>
              <td className="num">{formatRate(book.annualInterestRate)}</td>
              <td className="num">{book.termMonths} tháng</td>
              <PriceCell value={book.bestBidPercent} side="bid" />
              <PriceCell value={book.bestAskPercent} side="ask" />
              <td className={book.lastTradePercent == null ? `num sm-none ${NONE_TEXT}` : 'num'}>
                {book.lastTradePercent == null ? 'Chưa khớp' : (
                  <>
                    <span className="strong">{formatPrice(book.lastTradePercent)}</span>
                    <span className="ui-sub">{formatDateTime(book.lastTradeAt)}</span>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
