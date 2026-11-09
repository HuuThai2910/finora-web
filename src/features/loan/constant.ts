import type { PillTone } from '@/components/StatusPill';
import type { ServicingFlag } from './types';

export const LOAN_PAGE_SIZE = 20;

/** Một trang danh sách hồ sơ trên web quản trị (theo quy tắc bảng: 10 dòng mỗi trang). */
export const APPLICATION_LIST_PAGE_SIZE = 10;

/** Nhóm trạng thái có số đếm sẵn (thống kê) cho ô chọn trạng thái của bảng lọc; "ALL" là tổng. */
export type ApplicationFilter = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

/** Nhãn và màu cờ việc sau giải ngân trên dòng hồ sơ; cùng tên với tab lọc tương ứng. */
export const SERVICING_FLAG_LABELS: Record<ServicingFlag, { label: string; tone: PillTone }> = {
  OVERDUE: { label: 'Đang quá hạn', tone: 'danger' },
  RESCHEDULE_PENDING: { label: 'Chờ duyệt cơ cấu', tone: 'warning' },
  INCIDENT: { label: 'Có sự cố', tone: 'warning' },
};

export function isServicingFlag(value: string | null): value is ServicingFlag {
  return value === 'OVERDUE' || value === 'RESCHEDULE_PENDING' || value === 'INCIDENT';
}

/** Hạng tín dụng trong bảng lọc (hạng của lần chấm mới nhất, cùng bộ hạng với trang Gọi vốn). */
export const GRADE_FILTER_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

/** Mục đích vay (`LoanPurpose` của finora-loan) theo thứ tự hiển thị; nhãn lấy từ `formatBusinessLabel`. */
export const LOAN_PURPOSE_CODES = [
  'DEBT_CONSOLIDATION', 'CREDIT_CARD', 'HOME_IMPROVEMENT', 'MAJOR_PURCHASE', 'MEDICAL', 'CAR', 'SMALL_BUSINESS',
  'MOVING', 'VACATION', 'EDUCATION', 'OTHER',
];
