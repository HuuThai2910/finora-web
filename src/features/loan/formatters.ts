import type { LoanApplicationStatus } from './types';

export const APPLICATION_STATUS_LABELS: Record<LoanApplicationStatus, string> = {
  SUBMITTED: 'Đã nộp',
  ELIGIBILITY_PENDING: 'Đang kiểm tra điều kiện',
  SCORING: 'Đang chấm điểm',
  SCORING_RETRY_PENDING: 'Chờ chấm lại',
  PENDING_REVIEW: 'Chờ thẩm định',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  WITHDRAWN: 'Đã rút',
};

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value));
}

export function formatPercent(value: number | null | undefined, fraction = false): string {
  if (value == null) return '—';
  const percentage = fraction ? value * 100 : value;
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(percentage)}%`;
}

export function formatPercentagePoints(value: number | null | undefined): string {
  if (value == null) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value)} điểm phần trăm`;
}

const LABELS: Record<string, string> = {
  ANNUITY: 'Trả góp đều hằng kỳ',
  EQUAL_PRINCIPAL: 'Gốc đều, lãi giảm dần',
  DEBT_CONSOLIDATION: 'Hợp nhất các khoản nợ',
  CREDIT_CARD: 'Thanh toán dư nợ thẻ tín dụng',
  HOME_IMPROVEMENT: 'Sửa chữa nhà',
  MAJOR_PURCHASE: 'Mua sắm tài sản có giá trị',
  MEDICAL: 'Chi phí y tế',
  CAR: 'Mua hoặc sửa chữa xe',
  SMALL_BUSINESS: 'Vốn kinh doanh nhỏ',
  MOVING: 'Chi phí chuyển nơi ở',
  VACATION: 'Du lịch',
  EDUCATION: 'Chi phí giáo dục',
  OTHER: 'Khác',
  RENT: 'Đi thuê',
  OWN: 'Nhà thuộc sở hữu',
  MORTGAGE: 'Đang trả góp nhà',
  HIGH_SCHOOL: 'Trung học phổ thông',
  COLLEGE: 'Cao đẳng',
  UNIVERSITY: 'Đại học',
  POSTGRADUATE: 'Sau đại học',
  VERIFIED: 'Đã xác minh',
  PENDING: 'Đang chờ xử lý',
  PROCESSING: 'Đang xử lý',
  EXPIRED: 'Đã hết hạn',
  ELIGIBLE: 'Đủ điều kiện',
  INELIGIBLE: 'Chưa đủ điều kiện',
  INVALID_PROFILE: 'Hồ sơ cần kiểm tra thêm',
  DEPENDENCY_UNAVAILABLE: 'Chưa kiểm tra được',
  RETRY_PENDING: 'Đang chờ thử lại',
  SUCCEEDED: 'Đã chấm điểm',
  FAILED: 'Chấm điểm chưa thành công',
  SELF_DECLARED: 'Người vay tự khai',
  MOCK_USER_PROFILE: 'Hồ sơ người vay đang giả lập',
  NO_HISTORY: 'Chưa có lịch sử tín dụng tại FINORA',
  FINORA_INTERNAL: 'Lịch sử tín dụng nội bộ FINORA',
  BORROWER: 'Người vay',
  ADMIN: 'Quản trị viên',
  SYSTEM: 'Hệ thống',
  PENDING_REVIEW: 'Cần chuyên viên thẩm định',
  AI_POLICY: 'Quyết định tự động theo chính sách',
  AUTO_APPROVE: 'Đủ điều kiện duyệt tự động',
  AUTO_REJECT: 'Không đủ điều kiện theo chính sách',
  APPROVE: 'Đề xuất duyệt',
  REJECT: 'Đề xuất từ chối',
};

/** Chuyển enum backend sang câu tiếng Việt; vẫn giữ fallback để UI không vỡ khi backend thêm giá trị. */
export function formatBusinessLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return LABELS[value] ?? value.split('_').join(' ').toLocaleLowerCase('vi-VN');
}

export function formatMonths(value: number | null | undefined): string {
  if (value == null) return 'Chưa cung cấp';
  if (value < 12) return `${value} tháng`;
  const years = Math.floor(value / 12);
  const months = value % 12;
  return months === 0 ? `${years} năm` : `${years} năm ${months} tháng`;
}
