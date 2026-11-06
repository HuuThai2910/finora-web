import { useUserLabel } from '../hooks/useUserLabel';

/**
 * Tên người dùng (người vay, nhà đầu tư) ở dòng chính của một ô bảng thay cho mã số. Chưa tra được tên (đang tải, không
 * có quyền Xem khách hàng) thì hiện `fallback`.
 */
export function UserName({ userId, fallback }: { userId: string; fallback: string }) {
  return <span className="svc-who font-medium text-primary">{useUserLabel(userId, fallback)}</span>;
}
