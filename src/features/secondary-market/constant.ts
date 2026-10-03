import type { OrderSide, SettlementStatus } from './types';

/**
 * Mức phí chuyển nhượng nền tảng đang thu, chỉ để **hiển thị** cho quản trị đối chiếu. Con số
 * chính thức nằm trên từng lần khớp do backend chốt.
 */
export const FEE_RATE_PERCENT = 5;

export const SIDE_LABEL: Record<OrderSide, string> = { BID: 'Mua', ASK: 'Bán' };

export const SETTLEMENT_LABEL: Record<SettlementStatus, string> = {
  PENDING: 'Chờ thanh toán',
  SETTLED: 'Đã thanh toán',
  FAILED: 'Cần đối soát',
};

/** Dùng lại tông trạng thái của sàn gọi vốn để hai trang quản trị nhất quán. */
export const SETTLEMENT_TONE: Record<SettlementStatus, string> = {
  PENDING: 'is-draft',
  SETTLED: 'is-funded',
  FAILED: 'is-cancelled',
};

/** Số mức giá mỗi phía hiện trong hộp sổ lệnh; backend gửi tối đa 20. */
export const LADDER_DEPTH = 8;

/**
 * Mã lỗi Payment thường gặp khi thanh toán lần khớp, viết lại cho quản trị đọc. Mã lạ giữ nguyên để
 * còn tra được trong log của Payment.
 */
const SETTLEMENT_ERROR_LABEL: Record<string, string> = {
  PAYMENT_UNAVAILABLE: 'Payment chưa phản hồi',
  PAYMENT_HOLD_INSUFFICIENT: 'khoản giữ không đủ',
  PAYMENT_HOLD_NOT_FOUND: 'không thấy khoản giữ',
  PAYMENT_HOLD_ORDER_MISMATCH: 'khoản giữ không khớp lệnh',
  PAYMENT_SETTLE_FORBIDDEN: 'thiếu quyền dịch vụ',
};

export const settlementErrorLabel = (code: string): string => SETTLEMENT_ERROR_LABEL[code] ?? code;
