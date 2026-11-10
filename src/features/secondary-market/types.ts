/**
 * Contract Chợ chuyển nhượng (sổ lệnh Ask/Bid của Investment Service) cho web quản trị.
 *
 * Tiền, giá và lãi suất trả về dạng **chuỗi** decimal để không mất chính xác khi qua JSON; chỉ đổi sang number ở lớp
 * hiển thị. Giá là % dư nợ gốc còn lại, một chữ số thập phân (`"97.5"`). Lãi suất năm đã ở dạng phần trăm
 * (`"15.0000"` = 15%/năm).
 */

export type OrderSide = 'BID' | 'ASK';
export type SettlementStatus = 'PENDING' | 'SETTLED' | 'FAILED';

/** Trạng thái sổ trên danh sách: nợ xấu đứng trên hết, còn lại là có hay chưa có lệnh chờ. */
export type BookState = 'HAS_ORDERS' | 'NO_ORDERS' | 'DEFAULTED';
export type BookSort = 'RECENT' | 'DEPTH' | 'RATE';

/**
 * Chặng gộp của một lần khớp: chờ thanh toán, đang lập giấy xác nhận, hoàn tất. Backend tính cả trường hợp lỗi vào
 * chặng đang chờ tương ứng, nên giao diện không có nhãn lỗi.
 */
export type TradeProgress = 'SETTLING' | 'DOC_PENDING' | 'DONE';

/** `AdminOrderBookResponse`: một dòng danh sách sổ lệnh. */
export interface AdminOrderBook {
  listingId: number;
  applicationCode: string | null;
  contractCode: string | null;
  purpose: string;
  purposeCode: string | null;
  creditGrade: string;
  annualInterestRate: string;
  termMonths: number;
  outstandingNotes: number;
  outstandingPrincipal: string;
  bestBidPercent: string | null;
  bestAskPercent: string | null;
  restingBidNotes: number;
  restingAskNotes: number;
  lastTradePercent: string | null;
  lastTradeAt: string | null;
  state: BookState;
}

/** `AdminOrderBookDetailResponse`: khoản vay, trả nợ (bản chiếu ở Investment), số liệu chuyển nhượng của một sổ. */
export interface AdminOrderBookDetail {
  listingId: number;
  applicationCode: string | null;
  contractCode: string | null;
  purpose: string;
  purposeCode: string | null;
  /** Chỉ để mở hồ sơ khách hàng, không hiển thị. */
  borrowerId: string | null;
  borrowerFullName: string | null;
  creditGrade: string;
  annualInterestRate: string;
  termMonths: number;
  noteDenomination: string;
  notesIssuedAt: string | null;
  defaulted: boolean;
  issuedNotes: number;
  outstandingNotes: number;
  outstandingPerNote: string | null;
  /** Mã khoản vay ở Loan để đọc kỳ trả; không hiển thị. */
  loanNumber: string | null;
  daysPastDue: number | null;
  maturityDate: string | null;
  transferredNotes: number;
  holderCount: number;
  feeCollected: string;
  settlingTrades: number;
  documentPendingTrades: number;
  completedTrades: number;
}

/** `AdminListingNoteResponse`: một phần vốn của khoản vay (tab Phần vốn). */
export interface ListingNote {
  noteId: number;
  noteNumber: string;
  status: string;
  holderId: string;
  holderName: string | null;
  originalInvestorId: string | null;
  originalInvestorName: string | null;
  transferCount: number;
  askPricePercent: string | null;
}

export interface PriceLevel {
  pricePercent: string;
  quantity: number;
  orderCount: number;
}

/** `OrderBookSnapshotResponse`: ảnh chụp công khai của một sổ (độ sâu gộp theo mức giá, không có ai đặt lệnh). */
export interface OrderBookSnapshot {
  listingId: number;
  sequence: number;
  bids: PriceLevel[];
  asks: PriceLevel[];
}

/** `AdminTradeResponse`: một lần khớp kèm khoản vay, họ tên hai bên và giấy xác nhận. */
export interface AdminTrade {
  tradeReference: string;
  listingId: number;
  buyerId: string;
  sellerId: string;
  pricePercent: string;
  quantity: number;
  amount: string;
  platformFee: string;
  sellerProceeds: string;
  settlementStatus: SettlementStatus;
  executedAt: string;
  settledAt: string | null;
  applicationCode: string | null;
  purpose: string | null;
  purposeCode: string | null;
  buyerName: string | null;
  sellerName: string | null;
  outstandingPerNote: string | null;
  documentStatus: 'PENDING' | 'ISSUED' | 'FAILED' | null;
  documentNumber: string | null;
  documentIssuedAt: string | null;
  progress: TradeProgress;
}

/** `AdminNoteOwnershipResponse`: một phần vốn của lần khớp, người đang giữ, giá đang rao bán, lịch sử chuyển nhượng. */
export interface TradeNoteOwnership {
  noteId: number;
  noteNumber: string;
  status: string;
  currentHolderId: string;
  currentHolderName: string | null;
  askPricePercent: string | null;
  /** Mới nhất trước. */
  transfers: {
    tradeReference: string | null;
    sellerId: string;
    buyerId: string;
    sellerName: string | null;
    buyerName: string | null;
    transferredAt: string;
  }[];
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

/**
 * Giấy xác nhận chuyển nhượng phần vốn (PDF FINORA đóng dấu số) của một lần khớp đã thanh toán. Trang Xác minh dữ liệu
 * (blockchain) đọc chi tiết và tải PDF để tính lại mã băm.
 */
export type TransferDocumentStatus = 'PENDING' | 'ISSUED' | 'FAILED';

export interface TransferDocumentDetail {
  documentNumber: string;
  tradeReference: string;
  status: TransferDocumentStatus;
  documentHash: string | null;
  issuedAt: string | null;
  /** Đúng phần `data` của sự kiện mà Blockchain đã neo; gửi nguyên vào `POST /verify` để tính lại hash. */
  proofArtifact: Record<string, unknown> | null;
}
