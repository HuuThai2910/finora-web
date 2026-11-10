import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { toUiApiError } from '@/lib/api/errors';
import { useBackToList } from '@/lib/navigation';
import { useGetAdminOrderBookQuery } from '../api/orderBookApi';
import { BookLoanCard } from '../components/detail/BookLoanCard';
import { BookNotesTab } from '../components/detail/BookNotesTab';
import { BookSlip } from '../components/detail/BookSlip';
import { BookTradesTab } from '../components/detail/BookTradesTab';
import { OrderBookCard } from '../components/detail/OrderBookCard';
import { LIST_PATH } from '../constant';

type DetailTab = 'overview' | 'trades' | 'notes';

// Hai cột như trang hồ sơ vay và Gọi vốn: nội dung theo tab bên trái, cột 320px bên phải; dưới 1180px còn một cột.
const DOSSIER = 'grid grid-cols-[minmax(0,1fr)_320px] gap-5 [align-items:start] max-[1180px]:grid-cols-[minmax(0,1fr)]';
const TAB =
  'inline-flex items-center gap-1.5 h-9.5 px-3 -mb-px border-b-2 border-b-transparent text-secondary text-[14px] font-medium ' +
  'whitespace-nowrap hover:text-primary aria-selected:text-brand aria-selected:border-b-brand aria-selected:font-semibold';

/**
 * Chi tiết một sổ lệnh (`/investments/secondary/:listingId`): tiêu đề là mục đích vay, nhãn cạnh tiêu đề chỉ khi nợ xấu,
 * đầu trang không có nút. Tab Tổng quan (sổ lệnh hai phía + thông tin khoản vay), Giao dịch, Phần vốn; cột phải là tình
 * hình trả nợ và số liệu chuyển nhượng. Trang chỉ đọc; tab đang xem và bộ lọc của tab nằm trên URL.
 */
export default function OrderBookDetailPage() {
  const params = useParams();
  const listingId = Number(params.listingId);
  const valid = Number.isInteger(listingId) && listingId > 0;
  const detail = useGetAdminOrderBookQuery(listingId, { skip: !valid });
  const book = detail.data;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const backUrl = useBackToList(LIST_PATH);

  if (!valid || toUiApiError(detail.error).status === 404) {
    return (
      <section className="ui-page">
        <div className="ui-card ui-empty">
          Không tìm thấy sổ lệnh này. <Link className="ui-link" to={backUrl}>Về Chợ chuyển nhượng</Link>
        </div>
      </section>
    );
  }
  if (detail.error) {
    return (
      <section className="ui-page">
        <ErrorNotice error={detail.error} onRetry={detail.refetch} />
        <Link className="ui-link" to={backUrl}>Về Chợ chuyển nhượng</Link>
      </section>
    );
  }
  if (!book) {
    return (
      <section className="ui-page" aria-busy="true">
        <span className="ui-skeleton block h-5.5 w-80 max-w-full" />
        <div className="ui-card ui-empty">Đang tải sổ lệnh...</div>
      </section>
    );
  }

  const tradeCount = book.settlingTrades + book.documentPendingTrades + book.completedTrades;
  const tabs: Array<{ id: DetailTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'trades', label: 'Giao dịch', count: tradeCount },
    { id: 'notes', label: 'Phần vốn', count: book.issuedNotes },
  ];
  const requested = searchParams.get('tab');
  const tab: DetailTab = tabs.find((item) => item.id === requested)?.id ?? 'overview';

  return (
    <section className="ui-page">
      <header className="ui-title">
        <div className="flex flex-wrap items-center gap-2">
          <h1>{book.purpose}</h1>
          {book.defaulted && <StatusPill tone="danger" dot>Nợ xấu</StatusPill>}
        </div>
      </header>

      <div className={detail.isFetching ? `${DOSSIER} ui-busy` : DOSSIER}>
        <div className="grid min-w-0 gap-4">
          <div
            className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-b-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Nội dung sổ lệnh"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                className={TAB}
                aria-selected={tab === item.id}
                // Đổi tab bỏ bộ lọc của tab cũ; giữ `state` để breadcrumb vẫn nhớ danh sách gốc.
                onClick={() => setSearchParams(item.id === 'overview' ? {} : { tab: item.id }, { replace: true, state: location.state })}
              >
                {item.label}
                {item.count != null && <span className="text-muted text-[13px] font-normal tabular-nums">{item.count}</span>}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="grid min-w-0 gap-4">
            {tab === 'overview' && (
              <>
                <OrderBookCard listingId={book.listingId} />
                <BookLoanCard book={book} />
              </>
            )}
            {tab === 'trades' && <BookTradesTab book={book} />}
            {tab === 'notes' && <BookNotesTab listingId={book.listingId} total={book.issuedNotes} />}
          </div>
        </div>

        <BookSlip book={book} />
      </div>
    </section>
  );
}
