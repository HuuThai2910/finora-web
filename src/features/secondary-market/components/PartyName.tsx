import { Link } from 'react-router-dom';
import { usePermission } from '@/features/auth';

interface Props {
  /** Mã người dùng bên finora-user, chỉ để mở hồ sơ khách hàng; không hiển thị. */
  userId: string | null;
  /** Họ tên backend đã tra; null khi dịch vụ người dùng chưa trả. */
  name: string | null;
  /** Bảng nhiều tên để chữ thường; thẻ thông tin để chữ liên kết màu xanh. */
  plain?: boolean;
}

/**
 * Họ tên một người (người vay, bên mua, bên bán), bấm để mở hồ sơ khách hàng. Hồ sơ cần quyền Xem "Khách hàng"; thiếu
 * quyền thì chỉ hiện chữ. Chưa có họ tên thì ghi rõ, không hiện mã người dùng.
 */
export function PartyName({ userId, name, plain = false }: Props) {
  const canOpen = usePermission().canView('customer');
  if (!name) return <span className="text-muted">Chưa có họ tên</span>;
  if (!canOpen || !userId) return <span>{name}</span>;
  return (
    <Link
      className={plain ? 'text-primary hover:text-brand hover:underline underline-offset-2' : 'ui-link'}
      to={`/customers/kyc/${encodeURIComponent(userId)}`}
    >
      {name}
    </Link>
  );
}
