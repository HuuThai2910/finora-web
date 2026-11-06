import { usePermission } from '@/features/auth';
import { useGetUserQuery, type UserItem } from '@/features/user';

/**
 * Bản ghi người dùng kèm tên hiển thị (người vay, nhà đầu tư hoặc cán bộ đã ghi nhận): họ tên, chưa có họ tên (chưa
 * xác minh danh tính) thì email. Đang tải hoặc tra lỗi thì `label` là `fallback` để bảng và ngăn chi tiết không bị
 * chặn; mã do hệ thống tự ghi (không phải người dùng) cũng rơi vào nhánh này. Tra hồ sơ cần quyền Xem "Khách hàng";
 * nhân viên không có quyền này thì không gọi API (khỏi nhận 403), `user` luôn là `undefined` và `canLookup` là false để
 * nơi gọi ẩn phần liên hệ, liên kết sang trang khách hàng.
 */
export function useUserRecord(userId: string, fallback: string): {
  label: string;
  user: UserItem | undefined;
  canLookup: boolean;
} {
  const canLookup = usePermission().canView('customer');
  const { data } = useGetUserQuery(userId, { skip: !userId || !canLookup });
  return { label: data ? data.fullName ?? data.email : fallback, user: data, canLookup };
}

/** Chỉ tên hiển thị của một người dùng; xem `useUserRecord`. */
export function useUserLabel(userId: string, fallback: string): string {
  return useUserRecord(userId, fallback).label;
}
