import { useState } from 'react';
import {
  useGetAdminTradesQuery,
  useGetOrderBookAdminSummaryQuery,
  useGetOrderBooksQuery,
} from '../api/orderBookApi';
import { FEE_RATE_PERCENT, SETTLEMENT_LABEL } from '../constant';
import type { OrderBookSummary, SettlementStatus } from '../types';
import { MarketSummaryStrip } from './MarketSummaryStrip';
import { OrderBookModal } from './OrderBookModal';
import { OrderBookTable } from './OrderBookTable';
import { Pager } from './Pager';
import { TradeTable } from './TradeTable';
import './css/SecondaryMarketPage.css';

const PAGE_SIZE = 20;

type View = 'BOOKS' | 'TRADES';
type TradeFilter = 'ALL' | SettlementStatus;

const TRADE_FILTERS: ReadonlyArray<{ value: TradeFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: SETTLEMENT_LABEL.PENDING },
  { value: 'SETTLED', label: SETTLEMENT_LABEL.SETTLED },
  { value: 'FAILED', label: SETTLEMENT_LABEL.FAILED },
];

/**
 * Giám sát chợ Notes — sổ lệnh Ask/Bid (INV-E2).
 *
 * Trang này **chỉ đọc**. Đặt và huỷ lệnh là việc của nhà đầu tư trên app: backend lấy danh tính từ
 * token, nên nếu quản trị đặt lệnh thì lệnh thuộc về chính tài khoản quản trị — sai nghiệp vụ.
 *
 * Việc của quản trị ở đây: xem từng sổ đang chào giá thế nào, ai mua của ai, nền tảng thu bao nhiêu
 * phí, và đối soát lần khớp nào Payment chưa chuyển được tiền.
 */
export function SecondaryMarketPage() {
  const [view, setView] = useState<View>('BOOKS');
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>('ALL');
  const [booksPage, setBooksPage] = useState(0);
  const [tradesPage, setTradesPage] = useState(0);
  const [openBook, setOpenBook] = useState<OrderBookSummary | null>(null);

  const summary = useGetOrderBookAdminSummaryQuery();
  const books = useGetOrderBooksQuery({ page: booksPage, size: PAGE_SIZE }, { skip: view !== 'BOOKS' });
  const trades = useGetAdminTradesQuery(
    { page: tradesPage, size: PAGE_SIZE, settlement: tradeFilter === 'ALL' ? undefined : tradeFilter },
    { skip: view !== 'TRADES' },
  );

  const active = view === 'BOOKS' ? books : trades;
  const reload = () => {
    summary.refetch();
    active.refetch();
  };

  const showTrades = (status: SettlementStatus) => {
    setView('TRADES');
    setTradeFilter(status);
    setTradesPage(0);
  };

  return (
    <div className="inv-page">
      <header className="inv-header">
        <div>
          <h1 className="inv-title">Chợ thứ cấp Notes</h1>
          <p className="inv-lead">
            Nhà đầu tư đặt lệnh mua và bán Note theo % dư nợ gốc; hệ thống khớp ngay khi giá gặp nhau.
            Nền tảng thu <strong>{FEE_RATE_PERCENT}%</strong> trên tiền bán, trừ vào tiền người bán nhận.
          </p>
        </div>
        <div className="inv-header-actions">
          <button
            type="button"
            className="inv-btn inv-btn-ghost"
            disabled={active.isFetching || summary.isFetching}
            onClick={reload}
          >
            {active.isFetching || summary.isFetching ? 'Đang tải…' : 'Tải lại'}
          </button>
        </div>
      </header>

      <MarketSummaryStrip summary={summary.data} onShowTrades={showTrades} />

      <div className="sm-toolbar">
        <div className="sm-segment" role="tablist" aria-label="Xem theo">
          <button type="button" role="tab" aria-selected={view === 'BOOKS'} className={view === 'BOOKS' ? 'is-active' : undefined} onClick={() => setView('BOOKS')}>
            Sổ lệnh
          </button>
          <button type="button" role="tab" aria-selected={view === 'TRADES'} className={view === 'TRADES' ? 'is-active' : undefined} onClick={() => setView('TRADES')}>
            Giao dịch
          </button>
        </div>

        {view === 'TRADES' && (
          <div className="inv-chips" role="tablist" aria-label="Trạng thái thanh toán">
            {TRADE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={tradeFilter === filter.value}
                className={`inv-chip${tradeFilter === filter.value ? ' is-active' : ''}`}
                onClick={() => {
                  setTradeFilter(filter.value);
                  setTradesPage(0);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {active.isLoading && <div className="inv-empty">Đang tải…</div>}
      {active.isError && (
        <div className="inv-error" role="alert">
          Không tải được dữ liệu chợ Notes.{' '}
          <button type="button" className="inv-link" onClick={() => active.refetch()}>Thử lại</button>
        </div>
      )}

      {view === 'BOOKS' && books.data && (
        <div className={books.isFetching ? 'inv-refreshing' : undefined}>
          <OrderBookTable books={books.data.content} onOpen={setOpenBook} />
          <Pager page={books.data} unit="khoản vay" busy={books.isFetching} onPage={setBooksPage} />
        </div>
      )}

      {view === 'TRADES' && trades.data && (
        <div className={trades.isFetching ? 'inv-refreshing' : undefined}>
          <TradeTable trades={trades.data.content} isFiltered={tradeFilter !== 'ALL'} />
          <Pager page={trades.data} unit="lần khớp" busy={trades.isFetching} onPage={setTradesPage} />
        </div>
      )}

      {openBook && (
        <OrderBookModal listingId={openBook.listingId} loanId={openBook.loanId} onClose={() => setOpenBook(null)} />
      )}
    </div>
  );
}
