import { formatDateTime } from '@/utils';
import { formatAnnualRate, formatMoney, formatPrice } from '../formatters';
import type { OrderBookSummary } from '../types';

interface Props {
  books: OrderBookSummary[];
  onOpen: (book: OrderBookSummary) => void;
}

/**
 * Mỗi khoản vay còn Note lưu hành một dòng: giá mua tốt nhất, giá bán tốt nhất và giá khớp gần nhất.
 * Bấm mã khoản vay để xem thang giá đầy đủ.
 */
export function OrderBookTable({ books, onOpen }: Props) {
  if (books.length === 0) {
    return <div className="inv-empty">Chưa có khoản vay nào có Note đang lưu hành.</div>;
  }

  return (
    <div className="inv-table-wrap">
      <table className="inv-table sm-table">
        {/* Cột khoản vay rộng để dòng mô tả không bị gãy; ba cột giá chỉ chứa một con số. */}
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '14%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Khoản vay</th>
            <th className="inv-num">Mua cao nhất</th>
            <th className="inv-num">Bán thấp nhất</th>
            <th className="inv-num">Khớp gần nhất</th>
            <th className="inv-col-status">Tình trạng</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.listingId} className="inv-row">
              <td>
                <button type="button" className="inv-row-link" onClick={() => onOpen(book)}>
                  Khoản vay #{book.loanId}
                </button>
                <div className="inv-desc">
                  {book.creditGrade && <span className="inv-grade">Hạng {book.creditGrade}</span>}
                  {book.creditGrade && <span className="inv-dot" aria-hidden="true" />}
                  {formatAnnualRate(book.annualInterestRate)}
                  <span className="inv-dot" aria-hidden="true" />
                  {book.termMonths} tháng
                  <span className="inv-dot" aria-hidden="true" />
                  mệnh giá {formatMoney(book.noteDenomination)} đ
                </div>
              </td>
              {/* Ô trống ghi gạch xám: gạch tô màu phía trông như một giá. */}
              <td className={book.bestBidPercent == null ? 'inv-num sm-none' : 'inv-num sm-bid'}>
                {formatPrice(book.bestBidPercent)}
              </td>
              <td className={book.bestAskPercent == null ? 'inv-num sm-none' : 'inv-num sm-ask'}>
                {formatPrice(book.bestAskPercent)}
              </td>
              <td className={book.lastTradePercent == null ? 'inv-num sm-none' : 'inv-num'}>
                <strong className="inv-num-strong">{formatPrice(book.lastTradePercent)}</strong>
                {book.lastTradeAt && <div className="inv-desc">{formatDateTime(book.lastTradeAt)}</div>}
              </td>
              <td className="inv-col-status">
                {/* Nợ xấu bằng chữ, không chỉ màu. */}
                {book.defaulted ? (
                  <span className="inv-status is-cancelled">Nợ xấu</span>
                ) : (
                  <span className="inv-status is-open">Đang lưu hành</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
