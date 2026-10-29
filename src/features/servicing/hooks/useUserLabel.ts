import { usePermission } from '@/features/auth';
import { useGetUserQuery } from '@/features/user';

/**
 * Tên hiển thị của một người dùng (người vay hoặc cán bộ đã ghi nhận): họ tên, chưa có họ tên
 * (chưa eKYC) thì email. Đang tải hoặc tra lỗi thì dùng `fallback` để bảng và ngăn chi tiết không
 * bị chặn; mã do hệ thống tự ghi (không phải người dùng) cũng rơi vào nhánh này. Tra hồ sơ cần quyền Xem
 * "Khách hàng"; nhân viên không có quyền này thì dùng luôn `fallback`, không gọi API để khỏi nhận 403.
 */
export function useUserLabel(userId: string, fallback: string): string {
  const canLookup = usePermission().canView('customer');
  const { data } = useGetUserQuery(userId, { skip: !userId || !canLookup });
  return data ? data.fullName ?? data.email : fallback;
}
