import { useSearchParams } from 'react-router-dom';
import { SETTLEMENT_STATUSES } from '../constant';
import type { SettlementStatus } from '../types';

export type MarketView = 'BOOKS' | 'TRADES';
export type TradeFilter = 'ALL' | SettlementStatus;

export interface MarketViewState {
  view: MarketView;
  tradeFilter: TradeFilter;
  /** Trang hiện tại, tính từ 0 như backend. */
  page: number;
  /** Đợt đang mở trong ngăn sổ lệnh. */
  openListingId: number | null;
}

const isSettlement = (value: string | null): value is SettlementStatus =>
  SETTLEMENT_STATUSES.some((status) => status === value);

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
 * Trạng thái xem của trang chợ Notes nằm trên URL (`?view=trades&settlement=FAILED&page=2&book=418`)
 * để chia sẻ đường dẫn tới đúng danh sách hoặc đúng sổ đang mở, và nút Lùi của trình duyệt vẫn đúng.
 */
export function useMarketView() {
  const [params, setParams] = useSearchParams();
  const settlement = params.get('settlement');
  const state: MarketViewState = {
    view: params.get('view') === 'trades' ? 'TRADES' : 'BOOKS',
    tradeFilter: isSettlement(settlement) ? settlement : 'ALL',
    page: readPage(params.get('page')),
    openListingId: readId(params.get('book')),
  };

  const write = (next: MarketViewState) => {
    const query: Record<string, string> = {};
    if (next.view === 'TRADES') query.view = 'trades';
    if (next.view === 'TRADES' && next.tradeFilter !== 'ALL') query.settlement = next.tradeFilter;
    if (next.page > 0) query.page = String(next.page + 1);
    if (next.openListingId != null) query.book = String(next.openListingId);
    setParams(query);
  };

  return {
    ...state,
    setView: (view: MarketView, tradeFilter: TradeFilter = 'ALL') =>
      write({ ...state, view, tradeFilter, page: 0 }),
    setTradeFilter: (tradeFilter: TradeFilter) => write({ ...state, tradeFilter, page: 0 }),
    setPage: (page: number) => write({ ...state, page }),
    openBook: (listingId: number) => write({ ...state, openListingId: listingId }),
    closeBook: () => write({ ...state, openListingId: null }),
  };
}
