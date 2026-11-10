import type { PillTone } from '@/components/StatusPill';
import type { ActivityClient, ActivityOutcome, ActivityRange } from './types';

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
 * Nhãn tiếng Việt thay cho tên phương thức, hiện thành nhãn nhỏ cạnh tên thao tác. POST không ghi "Thêm": nhiều lượt POST
 * là đăng nhập, đánh dấu đã đọc, duyệt, lập lại giấy tờ... chứ không tạo mới gì; việc cụ thể nằm ở tên thao tác (`actions.ts`).
 */
const METHOD_INFO: Record<string, { label: string; tone: PillTone }> = {
  GET: { label: 'Xem', tone: 'neutral' },
  POST: { label: 'Gửi', tone: 'info' },
  PUT: { label: 'Sửa', tone: 'warning' },
  PATCH: { label: 'Sửa', tone: 'warning' },
  DELETE: { label: 'Xóa', tone: 'danger' },
};

export const methodInfo = (method: string) => METHOD_INFO[method] ?? { label: method, tone: 'neutral' as PillTone };

/** Giá trị gửi lên API giữ nguyên (`WRITE`, tên phương thức); chỉ nhãn đổi cho khỏi hiểu POST là "thêm mới". */
export const METHOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Mọi thao tác' },
  { value: 'WRITE', label: 'Mọi thao tác trừ xem' },
  { value: 'GET', label: 'Xem' },
  { value: 'POST', label: 'Gửi yêu cầu' },
  { value: 'PUT', label: 'Sửa' },
  { value: 'PATCH', label: 'Sửa một phần' },
  { value: 'DELETE', label: 'Xóa' },
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

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
  BORROWER: 'Người vay',
  INVESTOR: 'Nhà đầu tư',
  USER: 'Người dùng',
};

export const OUTCOME_TABS: Array<{ value: ActivityOutcome | null; label: string }> = [
  { value: null, label: 'Tất cả' },
  { value: 'SUCCESS', label: 'Thành công' },
  { value: 'CLIENT_ERROR', label: 'Lỗi yêu cầu (4xx)' },
  { value: 'SERVER_ERROR', label: 'Lỗi hệ thống (5xx)' },
];

export function statusTone(status: number): PillTone {
  if (status >= 500) return 'danger';
  if (status >= 400) return 'warning';
  return 'success';
}
