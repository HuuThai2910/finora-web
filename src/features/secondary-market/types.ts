/**
 * Contract chợ thứ cấp Notes của Investment Service.
 *
 * Tiền và lãi suất trả về dạng **chuỗi** decimal để không mất chính xác khi qua JSON; chỉ
 * đổi sang number ở lớp hiển thị.
 */

export type NoteListingStatus = 'OPEN' | 'SOLD' | 'CANCELLED';

/**
 * Một tin đăng bán Note.
 *
 * Trường `defaulted` và `defaultedReason` là bắt buộc phải hiện rõ: bán Note đang nợ xấu được
 * phép, nhưng người mua phải biết trước khi xác nhận (plan INV-E1 mục 8.2).
 */
export interface NoteListing {
  listingReference: string;
  noteNumber: string;
  loanId: number;
  sellerId: string;

  askingPrice: string;
  outstandingPrincipal: string;
  defaultedReason: string | null;
  defaulted: boolean;

  annualInterestRate: string;
  termMonths: number;
  creditGrade: string | null;

  /** Phí dự kiến nếu bán ở giá đang treo. */
  estimatedFee: string;
  /** Tiền người bán dự kiến nhận sau phí. */
  estimatedProceeds: string;

  status: NoteListingStatus;

  /** Bốn trường dưới chỉ có giá trị khi tin đã bán. */
  buyerId: string | null;
  soldPrice: string | null;
  platformFee: string | null;
  sellerProceeds: string | null;
  soldAt: string | null;

  createdAt: string;
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
