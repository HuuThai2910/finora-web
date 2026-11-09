import { usePermission } from '@/features/auth';
import { useGetLoanStatisticsSummaryQuery } from '@/features/statistics';
import { useGetAdminApplicationsQuery } from '../api/loanReviewApi';
import type { ApplicationFilter } from '../constant';
import type { ServicingFlag } from '../types';

/**
 * Đếm một trạng thái bằng lời gọi danh sách `size=1` (chỉ đọc `totalElements`). Dùng khi không có quyền thống kê;
 * lời gọi mang tag danh sách hồ sơ nên tự làm mới sau khi duyệt, từ chối hoặc bấm "Làm mới".
 */
function useCountByList(status: Exclude<ApplicationFilter, 'ALL'> | undefined, skip: boolean): number | undefined {
  const { data } = useGetAdminApplicationsQuery({ status, page: 0, size: 1 }, { skip });
  return data?.totalElements;
}

/**
 * Số hồ sơ của từng tab lọc trên trang Quản lý khoản vay.
 *
 * - Có quyền Xem "Tổng quan & thống kê": đọc `applications` của summary thống kê (một lời gọi thay cho bốn).
 * - Không có quyền đó: mỗi tab một lời gọi danh sách `size=1` (quyền Xem "Hồ sơ vay" là đủ), để nhân viên chỉ xem hồ sơ
 *   vẫn thấy số trên tab.
 *
 * Cả hai nguồn dùng chung tag `AdminApplicationList` nên tự làm mới cùng danh sách.
 *
 * @returns Số đếm theo tab; `undefined` khi chưa có dữ liệu hoặc lỗi (UI ẩn số thay vì hiện 0 sai). Summary đã có mà
 *   thiếu khóa trạng thái nghĩa là 0 hồ sơ.
 */
export function useApplicationStatusCounts(): Record<ApplicationFilter, number | undefined> {
  const canStats = usePermission().canView('dashboard');
  const { data } = useGetLoanStatisticsSummaryQuery(undefined, { skip: !canStats });
  const all = useCountByList(undefined, canStats);
  const pending = useCountByList('PENDING_REVIEW', canStats);
  const approved = useCountByList('APPROVED', canStats);
  const rejected = useCountByList('REJECTED', canStats);

  if (!canStats) return { ALL: all, PENDING_REVIEW: pending, APPROVED: approved, REJECTED: rejected };
  if (!data) return { ALL: undefined, PENDING_REVIEW: undefined, APPROVED: undefined, REJECTED: undefined };
  const { total, byStatus } = data.applications;
  return {
    ALL: total,
    PENDING_REVIEW: byStatus.PENDING_REVIEW ?? 0,
    APPROVED: byStatus.APPROVED ?? 0,
    REJECTED: byStatus.REJECTED ?? 0,
  };
}

/**
 * Số hồ sơ của các tab lọc theo việc sau giải ngân (đang quá hạn, chờ duyệt cơ cấu, có sự cố): mỗi tab một lời gọi danh
 * sách `size=1` với cùng tham số `servicing` như bảng, nên số trên tab luôn khớp số dòng khi bấm sang. Lời gọi mang tag
 * danh sách hồ sơ nên tự làm mới sau thao tác ở tab "Sau giải ngân" hoặc khi bấm "Làm mới".
 */
export function useServicingFilterCounts(flags: ServicingFlag[]): Partial<Record<ServicingFlag, number>> {
  const overdue = useGetAdminApplicationsQuery({ servicing: 'OVERDUE', page: 0, size: 1 }, { skip: !flags.includes('OVERDUE') });
  const reschedule = useGetAdminApplicationsQuery(
    { servicing: 'RESCHEDULE_PENDING', page: 0, size: 1 }, { skip: !flags.includes('RESCHEDULE_PENDING') });
  const incident = useGetAdminApplicationsQuery({ servicing: 'INCIDENT', page: 0, size: 1 }, { skip: !flags.includes('INCIDENT') });
  return {
    OVERDUE: overdue.data?.totalElements,
    RESCHEDULE_PENDING: reschedule.data?.totalElements,
    INCIDENT: incident.data?.totalElements,
  };
}
