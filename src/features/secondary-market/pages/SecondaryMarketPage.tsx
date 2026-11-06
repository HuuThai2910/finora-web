import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { usePermission } from '@/features/auth';
import { investmentApi } from '@/lib/api/investmentApi';
import {
  useGetAdminTradesQuery,
  useGetOrderBookAdminSummaryQuery,
  useGetOrderBooksQuery,
  useGetTransferDocumentsQuery,
} from '../api/orderBookApi';
import { MarketSummaryCard } from '../components/MarketSummaryCard';
import { MarketTrendCharts } from '../components/MarketTrendCharts';
import { OrderBookDrawer } from '../components/OrderBookDrawer';
import { OrderBookTable } from '../components/OrderBookTable';
import { TradeTable } from '../components/TradeTable';
import { TransferDocumentTable } from '../components/TransferDocumentTable';
import { MARKET_PAGE_SIZE, SETTLEMENT_LABEL } from '../constant';
import { useMarketView, type DocumentFilter, type TradeFilter } from '../hooks/useMarketView';
import type { OrderBookAdminSummary } from '../types';

const TRADE_FILTERS: ReadonlyArray<{ value: TradeFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PENDING', label: SETTLEMENT_LABEL.PENDING },
  { value: 'SETTLED', label: SETTLEMENT_LABEL.SETTLED },
  { value: 'FAILED', label: SETTLEMENT_LABEL.FAILED },
];

const DOCUMENT_FILTERS: ReadonlyArray<{ value: DocumentFilter; label: string }> = [
  { value: 'FAILED', label: 'Lập lỗi' },
  { value: 'PENDING', label: 'Đang lập' },
];

/** Chỉ đọc `totalElements`: đếm văn bản theo trạng thái mà không tải cả danh sách. */
const COUNT_ONLY = { page: 0, size: 1 } as const;

/** Nhóm nút lọc phụ (`sm-seg`) của tab Giao dịch và Giấy xác nhận. */
const SEG = 'sm-seg inline-flex flex-wrap gap-0.5 max-w-full p-0.75 bg-surface-muted border border-line rounded-md';
/** Bộ lọc thanh toán: nhóm nút liền khối, phụ hơn tab chính. Nút đang chọn nền trắng viền mảnh. */
const SEG_BUTTON =
  'inline-flex items-center gap-1.5 h-7 px-3 rounded-sm text-secondary text-[13px] font-medium whitespace-nowrap ' +
  'hover:text-primary aria-selected:bg-white aria-selected:text-primary aria-selected:shadow-[0_0_0_1px_var(--color-line)]';
/** Số đếm trong nút lọc; nút "Cần đối soát" có lần khớp lỗi (`is-danger`) thì số màu đỏ. */
const SEG_COUNT = 'text-muted font-normal tabular-nums in-[button.is-danger]:text-danger in-[button.is-danger]:font-medium';

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
  const { view, tradeFilter, documentFilter, page } = market;
  const canStats = usePermission().canView('dashboard');

  const summary = useGetOrderBookAdminSummaryQuery();
  // Sổ lệnh luôn tải (trang 0 khi đang xem giao dịch) để tab "Sổ lệnh" có số đếm thật từ totalElements.
  const books = useGetOrderBooksQuery({ page: view === 'BOOKS' ? page : 0, size: MARKET_PAGE_SIZE });
  const trades = useGetAdminTradesQuery(
    { page, size: MARKET_PAGE_SIZE, settlement: tradeFilter === 'ALL' ? undefined : tradeFilter },
    { skip: view !== 'TRADES' },
  );
  // Giấy xác nhận lỗi đếm cho ô "Cần đối soát" và tab; đang lập chỉ để đếm trên bộ lọc của tab.
  const failedDocs = useGetTransferDocumentsQuery({ status: 'FAILED', ...COUNT_ONLY });
  const pendingDocs = useGetTransferDocumentsQuery({ status: 'PENDING', ...COUNT_ONLY });
  const documents = useGetTransferDocumentsQuery(
    { status: documentFilter, page, size: MARKET_PAGE_SIZE },
    { skip: view !== 'DOCUMENTS' },
  );
  const active = view === 'BOOKS' ? books : view === 'TRADES' ? trades : documents;
  const docCount = (filter: DocumentFilter) => (filter === 'FAILED' ? failedDocs.data : pendingDocs.data)?.totalElements;
  const busy = active.isFetching || summary.isFetching;

  const reload = () => {
    // Giấy xác nhận có tag riêng: văn bản đang lập có thể đã phát hành xong kể từ lần tải trước.
    dispatch(investmentApi.util.invalidateTags(['OrderBooks', 'TransferDocuments']));
  };

  const scrollToList = () => document.getElementById('sm-list')?.scrollIntoView({ block: 'start' });
  const showTrades = (status: TradeFilter) => {
    market.setView('TRADES', status);
    scrollToList();
  };
  const showFailedDocuments = () => {
    market.showDocuments('FAILED');
    scrollToList();
  };

  const rowCount = active.data?.content.length ?? 0;
  const total = active.data?.totalElements ?? 0;
  const emptyText = view === 'BOOKS'
    ? 'Chưa có khoản vay nào có Note đang lưu hành.'
    : view === 'DOCUMENTS'
      ? documentFilter === 'FAILED' ? 'Không có giấy xác nhận nào lập lỗi.' : 'Không có giấy xác nhận nào đang lập.'
      : tradeFilter === 'ALL' ? 'Chưa có lần khớp nào trên chợ Notes.' : 'Không có lần khớp nào ở trạng thái này.';
  const docTabCount = failedDocs.data && pendingDocs.data
    ? failedDocs.data.totalElements + pendingDocs.data.totalElements
    : undefined;

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title"><h1>Chợ thứ cấp Notes</h1></div>
        <button type="button" className="ui-btn ghost" onClick={reload} disabled={busy}>
          <Icon name="refresh" />
          {busy ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <MarketSummaryCard
        summary={summary.data}
        isLoading={summary.isLoading}
        error={summary.error}
        onRetry={summary.refetch}
        onShowTrades={showTrades}
        failedDocuments={failedDocs.data?.totalElements}
        onShowFailedDocuments={showFailedDocuments}
      />

      {/* Biểu đồ xu hướng đọc series thống kê, cần quyền Xem "Tổng quan & thống kê". */}
      {canStats && <MarketTrendCharts />}

      <section className="ui-card sm-list pt-3.5 px-3.5 pb-3" id="sm-list" aria-label="Sổ lệnh và giao dịch">
        <div className="sm-list-head flex items-center justify-between gap-3 flex-wrap mb-3 max-[760px]:flex-col max-[760px]:items-stretch">
          <div className="ui-tabs" role="tablist" aria-label="Xem theo">
            <button type="button" role="tab" aria-selected={view === 'BOOKS'} onClick={() => market.setView('BOOKS')}>
              Sổ lệnh{books.data && <span className="n">{books.data.totalElements}</span>}
            </button>
            <button type="button" role="tab" aria-selected={view === 'TRADES'} onClick={() => market.setView('TRADES')}>
              Giao dịch{summary.data && <span className="n">{tradeCount(summary.data, 'ALL')}</span>}
            </button>
            {/* Giấy xác nhận chưa phát hành được (lỗi hoặc đang lập); văn bản đã phát hành xem ở cột cuối bảng giao dịch. */}
            <button type="button" role="tab" aria-selected={view === 'DOCUMENTS'} onClick={() => market.showDocuments('FAILED')}>
              Giấy xác nhận{docTabCount != null && <span className="n">{docTabCount}</span>}
            </button>
          </div>
          {view === 'TRADES' && (
            <div className={SEG} role="tablist" aria-label="Trạng thái thanh toán">
              {TRADE_FILTERS.map((filter) => {
                const count = tradeCount(summary.data, filter.value);
                return (
                  <button
                    key={filter.value}
                    type="button"
                    role="tab"
                    aria-selected={tradeFilter === filter.value}
                    className={filter.value === 'FAILED' && count ? `is-danger ${SEG_BUTTON}` : SEG_BUTTON}
                    onClick={() => market.setTradeFilter(filter.value)}
                  >
                    {filter.label}
                    {count != null && <span className={SEG_COUNT}>{count}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {view === 'DOCUMENTS' && (
            <div className={SEG} role="tablist" aria-label="Trạng thái giấy xác nhận">
              {DOCUMENT_FILTERS.map((filter) => {
                const count = docCount(filter.value);
                return (
                  <button
                    key={filter.value}
                    type="button"
                    role="tab"
                    aria-selected={documentFilter === filter.value}
                    className={filter.value === 'FAILED' && count ? `is-danger ${SEG_BUTTON}` : SEG_BUTTON}
                    onClick={() => market.showDocuments(filter.value)}
                  >
                    {filter.label}
                    {count != null && <span className={SEG_COUNT}>{count}</span>}
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
        ) : rowCount === 0 ? (
          <div className="ui-empty">{emptyText}</div>
        ) : (
          <div className={active.isFetching ? 'ui-busy' : undefined}>
            {view === 'BOOKS' && books.data ? (
              <OrderBookTable books={books.data.content} openListingId={market.openListingId} onOpen={market.openBook} />
            ) : view === 'TRADES' && trades.data ? (
              <TradeTable trades={trades.data.content} onOpenBook={market.openBook} />
            ) : view === 'DOCUMENTS' && documents.data ? (
              <TransferDocumentTable documents={documents.data.content} onOpenBook={market.openBook} />
            ) : null}
            <Pager
              page={page}
              size={MARKET_PAGE_SIZE}
              total={total}
              unit={view === 'BOOKS' ? 'khoản vay' : view === 'TRADES' ? 'lần khớp' : 'giấy xác nhận'}
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
