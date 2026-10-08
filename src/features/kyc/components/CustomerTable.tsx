import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import type { UserItem } from '@/features/user';
import type { KycFilter } from '../constants';
import { ekycDisplay, formatDay, roleLabel } from '../mappers/customerDisplay';

interface CustomerTableProps {
  customers: UserItem[];
  /** Tab đang chọn: cột cuối đổi theo trạng thái để mỗi tab chỉ hiện thứ người xem cần. */
  filter: KycFilter;
}

const detailPath = (id: number) => `/customers/kyc/${id}`;

/** Bảng khách hàng. Cả dòng bấm được để mở hồ sơ; nút cuối dòng giữ cho người dùng bàn phím và đọc màn hình. */
export function CustomerTable({ customers, filter }: CustomerTableProps) {
  const navigate = useNavigate();
  const showStatus = filter === 'ALL';
  const showVerifiedAt = filter === 'VERIFIED';

  return (
    <div className="ui-table-wrap">
      <table className="ui-table list kyc-table">
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th className="hide-md">Vai trò</th>
            <th className="hide-sm">Số CCCD</th>
            <th className="hide-md">Số điện thoại</th>
            {showStatus && <th>eKYC</th>}
            {showVerifiedAt ? <th>Xác minh</th> : <th className={showStatus ? 'hide-sm' : undefined}>Đăng ký</th>}
            <th><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const ekyc = ekycDisplay(customer.ekycStatus);
            return (
              <tr
                key={customer.id}
                className="clickable"
                tabIndex={0}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a')) return;
                  navigate(detailPath(customer.id));
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.target === event.currentTarget) navigate(detailPath(customer.id));
                }}
              >
                <td>
                  <span className={customer.fullName ? 'kyc-name' : 'kyc-name empty'}>
                    {customer.fullName || 'Chưa có họ tên'}
                  </span>
                  <span className="ui-sub">{customer.email}</span>
                </td>
                <td className="hide-md">{roleLabel(customer.role)}</td>
                <td className="hide-sm">{customer.idNumber ? <span className="ui-mono">{customer.idNumber}</span> : '-'}</td>
                <td className="hide-md">{customer.phone || '-'}</td>
                {showStatus && <td><StatusPill tone={ekyc.tone}>{ekyc.label}</StatusPill></td>}
                {showVerifiedAt
                  ? <td>{formatDay(customer.ekycCompletedAt)}</td>
                  : <td className={showStatus ? 'hide-sm' : undefined}>{formatDay(customer.createdAt)}</td>}
                <td className="num">
                  <Link className="ui-btn soft" to={detailPath(customer.id)}>
                    Chi tiết
                    <Icon name="arrowRight" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
