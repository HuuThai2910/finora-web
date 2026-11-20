import type { ActivityClient, ActivityKind, ActivityOutcome, ActivityRange } from './types';

export const ACTIVITY_PAGE_SIZE = 50;
/** Log tới Azure chậm vài phút nên làm mới mỗi 30 giây là đủ. */
export const ACTIVITY_REFRESH_MS = 30_000;

/** Route id của Gateway → tên nhóm chức năng dễ hiểu; route mới chưa có ở đây thì hiện nguyên route id. */
export const SERVICE_LABELS: Record<string, string> = {
  'user-auth-service': 'Đăng nhập',
  'user-service': 'Người dùng',
  'user-admin-service': 'Người dùng (quản trị)',
  'loan-service': 'Khoản vay',
  'loan-admin-service': 'Khoản vay (quản trị)',
  'payment-service': 'Thanh toán',
  'investment-service': 'Đầu tư',
  'ai-service': 'AI chấm điểm',
  'notification-service': 'Thông báo',
  'blockchain-service': 'Blockchain',
  gateway: 'Cổng kết nối',
};

export const serviceLabel = (service: string) => SERVICE_LABELS[service] ?? service;

/**
 * Loại thao tác trong bảng lọc. Giá trị gửi lên API là tham số `method` sẵn có: `GET` chỉ lượt xem, `WRITE` mọi lượt
 * gọi làm thay đổi (POST/PUT/PATCH/DELETE).
 */
export const KIND_OPTIONS: Array<{ value: ActivityKind; label: string }> = [
  { value: 'GET', label: 'Xem' },
  { value: 'WRITE', label: 'Thay đổi' },
];

export const RANGE_OPTIONS: Array<{ value: ActivityRange; label: string }> = [
  { value: '1h', label: '1 giờ qua' },
  { value: '24h', label: '24 giờ qua' },
  { value: '7d', label: '7 ngày qua' },
  { value: '30d', label: '30 ngày qua' },
];

export const CLIENT_LABELS: Record<ActivityClient, string> = {
  WEB: 'Web',
  MOBILE: 'Mobile',
  OTHER: 'Khác',
};

/** Ứng dụng có trong bảng lọc; lượt gọi "Khác" (công cụ, máy chủ) vẫn hiện khi không lọc. */
export const CLIENT_FILTER_OPTIONS: ActivityClient[] = ['WEB', 'MOBILE'];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
  BORROWER: 'Người vay',
  INVESTOR: 'Nhà đầu tư',
  USER: 'Người dùng',
};

/** Chỉ hai kết quả: mã dưới 400 là thành công, còn lại (lỗi yêu cầu lẫn lỗi hệ thống) đều là lỗi. */
export const OUTCOME_OPTIONS: Array<{ value: ActivityOutcome; label: string }> = [
  { value: 'SUCCESS', label: 'Thành công' },
  { value: 'ERROR', label: 'Lỗi' },
];

export const isErrorStatus = (status: number) => status >= 400;
