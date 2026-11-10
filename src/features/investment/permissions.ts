import type { OpsFunctionCode } from '@/features/auth';

/**
 * Chi tiết hồ sơ vay quản trị (`GET /admin/loan-applications/{số}/review`) mở cho các chức năng đọc hồ sơ ở Loan
 * (`APPLICATION_READERS`: hồ sơ vay, thu hồi, cơ cấu, đối soát). Trang Gọi vốn đọc từ đó lịch sử xử lý, ai đã ký hợp
 * đồng và lịch trả; thiếu quyền thì các phần đó ẩn thay vì báo lỗi 403.
 */
const LOAN_READERS: OpsFunctionCode[] = ['loan-application', 'collection', 'reschedule', 'reconciliation'];

export const canReadLoanApplication = (canView: (code: OpsFunctionCode) => boolean): boolean =>
  LOAN_READERS.some(canView);

/**
 * Hợp đồng và kỳ trả cho quản trị (`/admin/loan-contracts`, `/admin/loans/{mã}/installments` của Loan) mở cho quyền
 * Xem "Gọi vốn" cộng các chức năng đọc hồ sơ vay, nên nhân viên chỉ có quyền Gọi vốn vẫn thấy hạn ký, mã băm và ai đã ký.
 */
export const canReadFundingContract = (canView: (code: OpsFunctionCode) => boolean): boolean =>
  canView('funding') || canReadLoanApplication(canView);
