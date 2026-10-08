import type { LoanApplicationStatus } from '../types';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Màu nhãn trạng thái hồ sơ. Màu dành cho việc cần người làm (chờ thẩm định, chờ chấm lại) và kết
 * quả cuối; các bước hệ thống tự chạy (đã nộp, đang kiểm tra, đang chấm) để trung tính.
 */
export function applicationStatusTone(status: LoanApplicationStatus | string): Tone {
  switch (status) {
    case 'PENDING_REVIEW':
    case 'SCORING_RETRY_PENDING':
      return 'warning';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    default:
      return 'neutral';
  }
}

/**
 * Màu điểm đánh giá theo khuyến nghị AI do backend trả (`aiRecommendation`), không tự đặt ngưỡng
 * điểm ở frontend vì ngưỡng duyệt/từ chối là cấu hình của chính sách tín dụng.
 */
export function recommendationTone(recommendation: string | null | undefined): Tone {
  // Loan Service lưu APPROVED/PENDING_REVIEW/REJECTED; AUTO_* là tên cũ của AI Service, giữ để không vỡ dữ liệu cũ.
  switch (recommendation) {
    case 'APPROVED':
    case 'AUTO_APPROVE':
      return 'success';
    case 'PENDING_REVIEW':
      return 'warning';
    case 'REJECTED':
    case 'AUTO_REJECT':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Mã hồ sơ rút gọn cho bảng (mã đủ để trong `title`), ví dụ "LA-7FA66C38…". */
export function shortApplicationNumber(applicationNumber: string): string {
  return applicationNumber.length > 12 ? `${applicationNumber.slice(0, 11)}…` : applicationNumber;
}

/** Ngày giờ gọn cho dòng phụ trong bảng, ví dụ "09:12 22/9/26". */
export function formatCompactDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${date.getDate()}/${date.getMonth() + 1}/${String(date.getFullYear()).slice(2)}`;
}

/** Số ngày trọn đã trôi qua kể từ một thời điểm, dùng cho "chờ lâu nhất". */
export function daysSince(value: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(value).getTime()) / 86_400_000));
}

/** Nhãn khuyến nghị AI, nhận cả tên Loan Service lưu (APPROVED…) lẫn tên cũ của AI Service (AUTO_*). */
export function recommendationLabel(recommendation: string | null | undefined): string {
  switch (recommendation) {
    case 'APPROVED':
    case 'AUTO_APPROVE':
      return 'Đủ điều kiện duyệt tự động';
    case 'PENDING_REVIEW':
      return 'Cần chuyên viên thẩm định';
    case 'REJECTED':
    case 'AUTO_REJECT':
      return 'Không đủ điều kiện theo chính sách';
    default:
      return recommendation ?? '-';
  }
}
