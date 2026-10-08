import { useGetLoanStatisticsSummaryQuery } from '@/features/statistics';
import type { ApplicationFilter } from '../constant';

/**
 * Số hồ sơ của từng tab lọc trên trang Quản lý khoản vay, từ `applications` của summary thống kê
 * (một lời gọi thay cho mỗi tab một lời gọi `size=1`). Summary dùng chung tag `AdminApplicationList`,
 * nên tự làm mới cùng danh sách sau khi duyệt, từ chối hoặc bấm "Làm mới".
 *
 * @returns Số đếm theo tab; `undefined` khi summary chưa xong hoặc lỗi (UI ẩn số thay vì hiện 0 sai).
 *   Đã có summary mà thiếu khóa trạng thái nghĩa là 0 hồ sơ.
 */
export function useApplicationStatusCounts(): Record<ApplicationFilter, number | undefined> {
  const { data } = useGetLoanStatisticsSummaryQuery();
  if (!data) return { ALL: undefined, PENDING_REVIEW: undefined, APPROVED: undefined, REJECTED: undefined };
  const { total, byStatus } = data.applications;
  return {
    ALL: total,
    PENDING_REVIEW: byStatus.PENDING_REVIEW ?? 0,
    APPROVED: byStatus.APPROVED ?? 0,
    REJECTED: byStatus.REJECTED ?? 0,
  };
}
