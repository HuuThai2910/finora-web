import type { PillTone } from '@/components/StatusPill';
import type { OrderSide, SettlementStatus } from './types';

/**
 * Mức phí chuyển nhượng nền tảng đang thu, chỉ để **hiển thị** cho quản trị đối chiếu. Con số
 * chính thức nằm trên từng lần khớp do backend chốt.
 */
export const FEE_RATE_PERCENT = 5;

/** Bảng danh sách quản trị: 10 dòng mỗi trang. */
export const MARKET_PAGE_SIZE = 10;

export const SIDE_LABEL: Record<OrderSide, string> = { BID: 'Mua', ASK: 'Bán' };

export const SETTLEMENT_STATUSES: readonly SettlementStatus[] = ['PENDING', 'SETTLED', 'FAILED'];

export const SETTLEMENT_LABEL: Record<SettlementStatus, string> = {
  PENDING: 'Chờ thanh toán',
  SETTLED: 'Đã thanh toán',
  FAILED: 'Cần đối soát',
};

/** "Chờ thanh toán" là việc hệ thống tự xử lý nên để xám; chỉ đã xong và lỗi mới mang màu. */
export const SETTLEMENT_TONE: Record<SettlementStatus, PillTone> = {
  PENDING: 'neutral',
  SETTLED: 'success',
  FAILED: 'danger',
};

/** Số mức giá mỗi phía hiện trong thang giá của ngăn sổ lệnh. */
export const LADDER_DEPTH = 8;

/** Số mức giá mỗi phía backend gửi trong ảnh chụp sổ (`OrderBookQueryService.DEPTH`). */
export const SNAPSHOT_DEPTH = 20;

/**
 * Mã lỗi thanh toán thường gặp khi chuyển tiền cho một lần khớp, viết lại cho quản trị đọc. Mã lạ
 * giữ nguyên để còn tra được trong nhật ký của dịch vụ thanh toán.
 */
const SETTLEMENT_ERROR_LABEL: Record<string, string> = {
  PAYMENT_UNAVAILABLE: 'dịch vụ thanh toán chưa phản hồi',
  PAYMENT_HOLD_INSUFFICIENT: 'khoản giữ không đủ',
  PAYMENT_HOLD_NOT_FOUND: 'không thấy khoản giữ',
  PAYMENT_HOLD_ORDER_MISMATCH: 'khoản giữ không khớp lệnh',
  PAYMENT_SETTLE_FORBIDDEN: 'thiếu quyền dịch vụ',
};

export const settlementErrorLabel = (code: string): string => SETTLEMENT_ERROR_LABEL[code] ?? code;
