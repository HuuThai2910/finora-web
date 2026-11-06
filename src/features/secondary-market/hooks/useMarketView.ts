import { useSearchParams } from 'react-router-dom';
import { SETTLEMENT_STATUSES } from '../constant';
import type { SettlementStatus } from '../types';

export type MarketView = 'BOOKS' | 'TRADES' | 'DOCUMENTS';
export type TradeFilter = 'ALL' | SettlementStatus;
/** Danh sách giấy xác nhận chỉ cho xem nhóm cần theo dõi: lập lỗi (chờ thử lại) và đang lập. */
export type DocumentFilter = 'FAILED' | 'PENDING';

export interface MarketViewState {
  view: MarketView;
  tradeFilter: TradeFilter;
  documentFilter: DocumentFilter;
  /** Trang hiện tại, tính từ 0 như backend. */
  page: number;
  /** Đợt đang mở trong ngăn sổ lệnh. */
  openListingId: number | null;
}

const VIEW_PARAM: Record<MarketView, string | null> = { BOOKS: null, TRADES: 'trades', DOCUMENTS: 'documents' };

const isSettlement = (value: string | null): value is SettlementStatus =>
  SETTLEMENT_STATUSES.some((status) => status === value);

function readView(raw: string | null): MarketView {
  if (raw === 'trades') return 'TRADES';
  if (raw === 'documents') return 'DOCUMENTS';
  return 'BOOKS';
}

/** Số trên URL tính từ 1 cho dễ đọc; giá trị lạ coi như trang đầu. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

function readId(raw: string | null): number | null {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Trạng thái xem của trang chợ Notes nằm trên URL (`?view=trades&settlement=FAILED&page=2&book=418`,
 * `?view=documents&doc=PENDING`) để chia sẻ đường dẫn tới đúng danh sách hoặc đúng sổ đang mở, và nút Lùi của trình
 * duyệt vẫn đúng. Giấy xác nhận mặc định lọc nhóm lỗi nên không ghi `doc=FAILED` lên URL.
 */
export function useMarketView() {
  const [params, setParams] = useSearchParams();
  const settlement = params.get('settlement');
  const state: MarketViewState = {
    view: readView(params.get('view')),
    tradeFilter: isSettlement(settlement) ? settlement : 'ALL',
    documentFilter: params.get('doc') === 'PENDING' ? 'PENDING' : 'FAILED',
    page: readPage(params.get('page')),
    openListingId: readId(params.get('book')),
  };

  const write = (next: MarketViewState) => {
    const query: Record<string, string> = {};
    const view = VIEW_PARAM[next.view];
    if (view) query.view = view;
    if (next.view === 'TRADES' && next.tradeFilter !== 'ALL') query.settlement = next.tradeFilter;
    if (next.view === 'DOCUMENTS' && next.documentFilter !== 'FAILED') query.doc = next.documentFilter;
    if (next.page > 0) query.page = String(next.page + 1);
    if (next.openListingId != null) query.book = String(next.openListingId);
    setParams(query);
  };

  return {
    ...state,
    setView: (view: MarketView, tradeFilter: TradeFilter = 'ALL') =>
      write({ ...state, view, tradeFilter, documentFilter: 'FAILED', page: 0 }),
    setTradeFilter: (tradeFilter: TradeFilter) => write({ ...state, tradeFilter, page: 0 }),
    showDocuments: (documentFilter: DocumentFilter) => write({ ...state, view: 'DOCUMENTS', documentFilter, page: 0 }),
    setPage: (page: number) => write({ ...state, page }),
    openBook: (listingId: number) => write({ ...state, openListingId: listingId }),
    closeBook: () => write({ ...state, openListingId: null }),
  };
}
