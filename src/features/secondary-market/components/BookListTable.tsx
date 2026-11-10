import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { PurposeIcon } from '@/features/loan';
import { fromListState } from '@/lib/navigation';
import { formatDateTime } from '@/utils';
import { BOOK_STATE_META, bookPath } from '../constant';
import { formatAnnualRate, formatMillions, formatPrice } from '../formatters';
import type { AdminOrderBook } from '../types';

/** Lãi suất ẩn dưới 1380px để bảng không tràn ngang; hai cột giá tốt nhất ẩn ở màn hẹp. */
const HIDE_MD = 'max-[1380px]:hidden';
const HIDE_SM = 'max-[760px]:hidden';

/** Ô giá: chưa có lệnh ở phía đó thì chữ xám "Chưa có", giá để chữ đen (màu chỉ dành cho trạng thái). */
function PriceCell({ value, className = '' }: { value: string | null; className?: string }) {
  return (
    <td className={`num ${className}`}>
      {value == null ? <span className="text-muted">Chưa có</span> : formatPrice(value)}
    </td>
  );
}

/**
 * Bảng sổ lệnh: mỗi khoản vay còn phần vốn lưu hành một dòng. Cả dòng bấm được để mở chi tiết sổ; nút cuối dòng giữ
 * cho người dùng bàn phím và trình đọc màn hình.
 */
export function BookListTable({ books }: { books: AdminOrderBook[] }) {
  const navigate = useNavigate();
  // Trang chi tiết nhớ URL danh sách (bộ lọc, trang) để breadcrumb quay lại đúng chỗ.
  const listState = fromListState(useLocation());

  return (
    <div className="ui-table-wrap">
      <table className="ui-table list [&_td]:px-2 [&_th]:px-2">
        <thead>
          <tr>
            <th>Khoản vay</th>
            <th className={HIDE_MD}>Lãi suất</th>
            <th className="num">Đang lưu hành</th>
            <th className={`num ${HIDE_SM}`}>Mua cao nhất</th>
            <th className={`num ${HIDE_SM}`}>Bán thấp nhất</th>
            <th className="num">Khớp gần nhất</th>
            <th>Trạng thái</th>
            <th><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => {
            const state = BOOK_STATE_META[book.state] ?? { label: book.state, tone: 'neutral' as const };
            const open = () => navigate(bookPath(book.listingId), { state: listState });
            return (
              <tr
                key={book.listingId}
                className="clickable"
                tabIndex={0}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a')) return;
                  open();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.target === event.currentTarget) open();
                }}
              >
                <td>
                  <div className="ui-row-main">
                    <span className="ui-dot"><PurposeIcon purpose={book.purposeCode} /></span>
                    <div className="min-w-0">
                      {/* Khoản niêm yết trước khi Loan có mã HS- thì chỉ còn mục đích; không hiện mã kỹ thuật. */}
                      {book.applicationCode ? <span className="ui-code">{book.applicationCode}</span> : null}
                      <span
                        className={book.applicationCode ? 'ui-sub max-w-60 truncate' : 'ui-code block max-w-60 truncate'}
                        title={book.purpose}
                      >
                        {book.purpose}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={HIDE_MD}>
                  {formatAnnualRate(book.annualInterestRate)}
                  <span className="ui-sub">hạng {book.creditGrade}, {book.termMonths} tháng</span>
                </td>
                <td className="num">
                  <span className="strong">{book.outstandingNotes} phần vốn</span>
                  <span className="ui-sub">dư nợ {formatMillions(book.outstandingPrincipal)}</span>
                </td>
                <PriceCell value={book.bestBidPercent} className={HIDE_SM} />
                <PriceCell value={book.bestAskPercent} className={HIDE_SM} />
                <td className="num">
                  {book.lastTradePercent == null ? <span className="text-muted">Chưa khớp</span> : (
                    <>
                      <span className="strong">{formatPrice(book.lastTradePercent)}</span>
                      <span className="ui-sub">{formatDateTime(book.lastTradeAt)}</span>
                    </>
                  )}
                </td>
                <td><StatusPill tone={state.tone} dot>{state.label}</StatusPill></td>
                <td className="num">
                  <Link className="ui-btn soft" to={bookPath(book.listingId)} state={listState}>
                    Chi tiết
                    <Icon name="arrowRight" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
