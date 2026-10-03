/**
 * Contract chợ Notes — sổ lệnh Ask/Bid của Investment Service (INV-E2).
 *
 * Tiền, giá và lãi suất trả về dạng **chuỗi** decimal để không mất chính xác khi qua JSON; chỉ đổi
 * sang number ở lớp hiển thị. Giá là % dư nợ gốc còn lại, một chữ số thập phân (`"97.5"`). Lãi suất
 * năm đã ở dạng phần trăm (`"15.0000"` = 15%/năm, theo hợp đồng sự kiện Loan → Investment).
 */

export type OrderSide = 'BID' | 'ASK';
export type SettlementStatus = 'PENDING' | 'SETTLED' | 'FAILED';

/** `OrderBookSummaryResponse` — một dòng trong danh sách sổ. */
export interface OrderBookSummary {
  listingId: number;
  loanId: number;
  creditGrade: string | null;
  annualInterestRate: string;
  termMonths: number;
  noteDenomination: string;
  defaulted: boolean;
  bestBidPercent: string | null;
  bestAskPercent: string | null;
  lastTradePercent: string | null;
  lastTradeAt: string | null;
}

export interface PriceLevel {
  pricePercent: string;
  quantity: number;
  orderCount: number;
}

export interface TradeTick {
  pricePercent: string;
  quantity: number;
  aggressorSide: OrderSide;
  executedAt: string;
}

/** `OrderBookSnapshotResponse` — ảnh chụp công khai của một sổ, không có ai đặt lệnh nào. */
export interface OrderBookSnapshot extends Omit<OrderBookSummary, 'bestBidPercent' | 'bestAskPercent'> {
  sequence: number;
  referenceOutstanding: string | null;
  defaultWarning: string | null;
  bestBidPercent: string | null;
  bestAskPercent: string | null;
  bids: PriceLevel[];
  asks: PriceLevel[];
  recentTrades: TradeTick[];
}

/** `AdminTradeResponse` — một lần khớp kèm hai bên và trạng thái thanh toán. */
export interface AdminTrade {
  tradeReference: string;
  listingId: number;
  loanId: number | null;
  buyerId: string;
  sellerId: string;
  aggressorSide: OrderSide;
  pricePercent: string;
  quantity: number;
  amount: string;
  platformFee: string;
  sellerProceeds: string;
  defaulted: boolean;
  settlementStatus: SettlementStatus;
  settlementAttempts: number;
  lastSettlementError: string | null;
  executedAt: string;
  settledAt: string | null;
}

/** `OrderBookAdminSummaryResponse` — số liệu trên toàn bộ dữ liệu, không phải trang đang xem. */
export interface OrderBookAdminSummary {
  settledCount: number;
  settledAmount: string;
  feeCollected: string;
  pendingCount: number;
  pendingAmount: string;
  failedCount: number;
  openBidOrders: number;
  openBidNotes: number;
  openAskOrders: number;
  openAskNotes: number;
}

/** Phân trang chuẩn của backend FINORA. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
