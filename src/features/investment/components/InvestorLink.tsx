import { Link } from 'react-router-dom';
import { usePermission } from '@/features/auth';

interface Props {
  /** Mã người dùng bên finora-user (nhà đầu tư, bên mua hoặc bên bán). */
  userId: string;
  /** Tên đã tra (họ tên, không có thì email, chưa tra được thì mã số), lấy từ `useActorNames`. */
  name: string;
  className?: string;
}

/**
 * Tên một nhà đầu tư, bấm để mở hồ sơ khách hàng (`/customers/kyc/:id`). Hồ sơ cần quyền Xem "Khách hàng"; thiếu quyền
 * thì chỉ hiện chữ. Chữ màu thường, rê chuột mới xanh, để bảng nhiều tên không thành một mảng màu liên kết.
 */
export function InvestorLink({ userId, name, className = '' }: Props) {
  const canOpen = usePermission().canView('customer');
  if (!canOpen) return <span className={className}>{name}</span>;
  return (
    <Link
      className={`fu-person text-primary hover:text-brand hover:underline underline-offset-2 ${className}`}
      to={`/customers/kyc/${encodeURIComponent(userId)}`}
    >
      {name}
    </Link>
  );
}
