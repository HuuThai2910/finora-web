import type { PillTone } from '@/components/StatusPill';
import type { BookSort, BookState, TradeProgress } from './types';

/**
 * Mức phí chuyển nhượng nền tảng đang thu, chỉ để **ghi trên nhãn** cho quản trị đối chiếu. Số tiền phí chính thức nằm
 * trên từng lần khớp do backend chốt.
 */
export const FEE_RATE_PERCENT = 5;

/** Danh sách sổ, giao dịch và phần vốn: 10 dòng mỗi trang. */
export const MARKET_PAGE_SIZE = 10;

/** Số mức giá mỗi phía hiện trong thẻ Sổ lệnh (backend gửi tối đa 20). */
export const LADDER_DEPTH = 8;

export const LIST_PATH = '/investments/secondary';
export const bookPath = (listingId: number) => `${LIST_PATH}/${listingId}`;
export const tradeDetailPath = (listingId: number, tradeReference: string) =>
  `${bookPath(listingId)}/trades/${encodeURIComponent(tradeReference)}`;

/** Chỉ nợ xấu mang màu; còn lại là có hay chưa có lệnh chờ, để xám. */
export const BOOK_STATE_META: Record<BookState, { label: string; tone: PillTone }> = {
  HAS_ORDERS: { label: 'Có lệnh chờ', tone: 'neutral' },
  NO_ORDERS: { label: 'Chưa có lệnh', tone: 'neutral' },
  DEFAULTED: { label: 'Nợ xấu', tone: 'danger' },
};

export const BOOK_STATES: readonly BookState[] = ['HAS_ORDERS', 'NO_ORDERS', 'DEFAULTED'];

/** Thứ tự danh sách; giá trị rỗng trên URL là khớp gần nhất trước. */
export const BOOK_SORT_OPTIONS: ReadonlyArray<{ value: Exclude<BookSort, 'RECENT'>; label: string }> = [
  { value: 'DEPTH', label: 'Nhiều phần vốn chờ nhất' },
  { value: 'RATE', label: 'Lãi suất cao nhất' },
];

export const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const;

/** Chặng việc hệ thống tự chạy thì xám; chỉ hoàn tất mới có màu. */
export const TRADE_PROGRESS_META: Record<TradeProgress, { label: string; tone: PillTone }> = {
  SETTLING: { label: 'Chờ thanh toán', tone: 'neutral' },
  DOC_PENDING: { label: 'Đang lập giấy xác nhận', tone: 'neutral' },
  DONE: { label: 'Hoàn tất', tone: 'success' },
};

export const TRADE_PROGRESSES: readonly TradeProgress[] = ['SETTLING', 'DOC_PENDING', 'DONE'];

export const isBookState = (value: string): value is BookState => BOOK_STATES.some((state) => state === value);
export const isTradeProgress = (value: string): value is TradeProgress =>
  TRADE_PROGRESSES.some((progress) => progress === value);
