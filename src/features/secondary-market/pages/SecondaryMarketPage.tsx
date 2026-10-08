import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { investmentApi } from '@/lib/api/investmentApi';
import {
  useGetAdminTradesQuery,
  useGetOrderBookAdminSummaryQuery,
  useGetOrderBooksQuery,
} from '../api/orderBookApi';
import { MarketSummaryCard } from '../components/MarketSummaryCard';
import { MarketTrendCharts } from '../components/MarketTrendCharts';
import { OrderBookDrawer } from '../components/OrderBookDrawer';
import { OrderBookTable } from '../components/OrderBookTable';
import { TradeTable } from '../components/TradeTable';
import { MARKET_PAGE_SIZE, SETTLEMENT_LABEL } from '../constant';
import { useMarketView, type TradeFilter } from '../hooks/useMarketView';
import type { OrderBookAdminSummary } from '../types';
import './SecondaryMarketPage.css';

const TRADE_FILTERS: ReadonlyArray<{ value: TradeFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: SETTLEMENT_LABEL.PENDING },
  { value: 'SETTLED', label: SETTLEMENT_LABEL.SETTLED },
  { value: 'FAILED', label: SETTLEMENT_LABEL.FAILED },
];

/** Số lần khớp theo trạng thái thanh toán, lấy từ API summary (tính trên toàn chợ). */
function tradeCount(summary: OrderBookAdminSummary | undefined, filter: TradeFilter): number | undefined {
  if (!summary) return undefined;
  if (filter === 'PENDING') return summary.pendingCount;
  if (filter === 'SETTLED') return summary.settledCount;
  if (filter === 'FAILED') return summary.failedCount;
  return summary.pendingCount + summary.settledCount + summary.failedCount;
}

/**
 * Giám sát chợ Notes, sổ lệnh Ask/Bid.
 *
 * Trang này **chỉ đọc**. Đặt và hủy lệnh là việc của nhà đầu tư trên app: backend lấy danh tính từ
 * token, nên nếu quản trị đặt lệnh thì lệnh thuộc về chính tài khoản quản trị, sai nghiệp vụ.
 * Biểu đồ giá trị khớp theo ngày và giá bình quân lấy từ API thống kê của Investment; ô tìm kiếm bị bỏ vì
 * API danh sách không có tham số tìm.
 */
export function SecondaryMarketPage() {
  const dispatch = useDispatch<AppDispatch>();
  const market = useMarketView();
  const { view, tradeFilter, page } = market;

  const summary = useGetOrderBookAdminSummaryQuery();
  // Sổ lệnh luôn tải (trang 0 khi đang xem giao dịch) để tab "Sổ lệnh" có số đếm thật từ totalElements.
  const books = useGetOrderBooksQuery({ page: view === 'BOOKS' ? page : 0, size: MARKET_PAGE_SIZE });
  const trades = useGetAdminTradesQuery(
    { page, size: MARKET_PAGE_SIZE, settlement: tradeFilter === 'ALL' ? undefined : tradeFilter },
    { skip: view !== 'TRADES' },
  );
  const active = view === 'BOOKS' ? books : trades;
  const busy = active.isFetching || summary.isFetching;

  const reload = () => {
    dispatch(investmentApi.util.invalidateTags(['OrderBooks']));
  };

  const showTrades = (status: TradeFilter) => {
    market.setView('TRADES', status);
    document.getElementById('sm-list')?.scrollIntoView({ block: 'start' });
  };

  const rows = view === 'BOOKS' ? books.data?.content ?? [] : trades.data?.content ?? [];
  const total = active.data?.totalElements ?? 0;
  const emptyText = view === 'BOOKS'
    ? 'Chưa có khoản vay nào có Note đang lưu hành.'
    : tradeFilter === 'ALL' ? 'Chưa có lần khớp nào trên chợ Notes.' : 'Không có lần khớp nào ở trạng thái này.';

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title"><h1>Chợ thứ cấp Notes</h1></div>
        <button type="button" className="ui-btn ghost" onClick={reload} disabled={busy}>
          <Icon name="refresh" />
          {busy ? 'Đang tải...' : 'Tải lại'}
        </button>
      </header>

      <MarketSummaryCard
        summary={summary.data}
        isLoading={summary.isLoading}
        error={summary.error}
        onRetry={summary.refetch}
        onShowTrades={showTrades}
      />

      <MarketTrendCharts />

      <section className="ui-card sm-list" id="sm-list" aria-label="Sổ lệnh và giao dịch">
        <div className="sm-list-head">
          <div className="ui-tabs" role="tablist" aria-label="Xem theo">
            <button type="button" role="tab" aria-selected={view === 'BOOKS'} onClick={() => market.setView('BOOKS')}>
              Sổ lệnh{books.data && <span className="n">{books.data.totalElements}</span>}
            </button>
            <button type="button" role="tab" aria-selected={view === 'TRADES'} onClick={() => market.setView('TRADES')}>
              Giao dịch{summary.data && <span className="n">{tradeCount(summary.data, 'ALL')}</span>}
            </button>
          </div>
          {view === 'TRADES' && (
            <div className="sm-seg" role="tablist" aria-label="Trạng thái thanh toán">
              {TRADE_FILTERS.map((filter) => {
                const count = tradeCount(summary.data, filter.value);
                return (
                  <button
                    key={filter.value}
                    type="button"
                    role="tab"
                    aria-selected={tradeFilter === filter.value}
                    className={filter.value === 'FAILED' && count ? 'is-danger' : undefined}
                    onClick={() => market.setTradeFilter(filter.value)}
                  >
                    {filter.label}
                    {count != null && <span>{count}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {active.error ? (
          <ErrorNotice error={active.error} onRetry={active.refetch} />
        ) : active.isLoading || !active.data ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách...</div>
        ) : rows.length === 0 ? (
          <div className="ui-empty">{emptyText}</div>
        ) : (
          <div className={active.isFetching ? 'ui-busy' : undefined}>
            {view === 'BOOKS' && books.data ? (
              <OrderBookTable books={books.data.content} openListingId={market.openListingId} onOpen={market.openBook} />
            ) : trades.data ? (
              <TradeTable trades={trades.data.content} onOpenBook={market.openBook} />
            ) : null}
            <Pager
              page={page}
              size={MARKET_PAGE_SIZE}
              total={total}
              unit={view === 'BOOKS' ? 'khoản vay' : 'lần khớp'}
              disabled={active.isFetching}
              onPage={market.setPage}
            />
          </div>
        )}
      </section>

      {market.openListingId != null && (
        <OrderBookDrawer listingId={market.openListingId} onClose={market.closeBook} />
      )}
    </section>
  );
}
