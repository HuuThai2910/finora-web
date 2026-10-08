import { useGetUserQuery } from '@/features/user';

/**
 * Tên hiển thị của một người dùng (người vay hoặc cán bộ đã ghi nhận): họ tên, chưa có họ tên
 * (chưa eKYC) thì email. Đang tải hoặc tra lỗi thì dùng `fallback` để bảng và ngăn chi tiết không
 * bị chặn; mã do hệ thống tự ghi (không phải người dùng) cũng rơi vào nhánh này.
 */
export function useUserLabel(userId: string, fallback: string): string {
  const { data } = useGetUserQuery(userId, { skip: !userId });
  return data ? data.fullName ?? data.email : fallback;
}
