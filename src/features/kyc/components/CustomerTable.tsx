import { useLocation, useNavigate } from 'react-router-dom';
import { RowMenu, type RowMenuItem } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { ekycReviewDetailPath } from '@/features/ekyc-review';
import { maskIdNumber, type UserItem } from '@/features/user';
import { fromListState } from '@/lib/navigation';
import type { KycFilter } from '../constants';
import { ekycDisplay, formatDay, roleLabel } from '../mappers/customerDisplay';

interface CustomerReviewLookup {
  /** Mã khách → mã lượt đang chờ duyệt tay của khách đó. */
  attempts: Map<number, string>;
  isLoading: boolean;
}

interface CustomerTableProps {
  customers: UserItem[];
  /** Tab đang chọn: cột cuối đổi theo trạng thái để mỗi tab chỉ hiện thứ người xem cần. */
  filter: KycFilter;
  /** Lượt chờ duyệt để mở từ menu dòng; `null` khi tài khoản không có quyền Xem "Duyệt xác minh danh tính". */
  review: CustomerReviewLookup | null;
}

const detailPath = (id: number) => `/customers/kyc/${id}`;

/** Cột phụ ẩn bớt khi bảng hẹp; lớp `hide-md`/`hide-sm` giữ làm mốc. */
const HIDE_MD = 'hide-md max-[1100px]:hidden';
const HIDE_SM = 'hide-sm max-[760px]:hidden';

function menuItems(customer: UserItem, review: CustomerReviewLookup | null): RowMenuItem[] {
  const items: RowMenuItem[] = [{ key: 'detail', label: 'Chi tiết', icon: 'eye', to: detailPath(customer.id) }];
  if (!review || customer.ekycStatus !== 'MANUAL_REVIEW') return items;

  const attemptId = review.attempts.get(customer.id);
  if (attemptId) {
    items.push({ key: 'review', label: 'Duyệt xác minh', icon: 'userCheck', to: ekycReviewDetailPath(attemptId) });
  } else {
    items.push({
      key: 'review',
      label: 'Duyệt xác minh',
      icon: 'userCheck',
      onSelect: () => undefined,
      disabled: true,
      disabledReason: review.isLoading ? 'Đang tải lượt chờ duyệt...' : 'Không tìm thấy lượt chờ duyệt của khách này',
    });
  }
  return items;
}

/** Bảng khách hàng. Cả dòng bấm được để mở hồ sơ; thao tác của dòng gom vào menu "⋯". */
export function CustomerTable({ customers, filter, review }: CustomerTableProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // Nhớ URL danh sách (tab, trang) để nút quay lại ở trang chi tiết về đúng chỗ.
  const openDetail = (id: number) => navigate(detailPath(id), { state: fromListState(location) });
  const showStatus = filter === 'ALL';
  const showVerifiedAt = filter === 'VERIFIED';

  return (
    <div className="ui-table-wrap">
      <table className="ui-table list kyc-table">
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th className={HIDE_MD}>Vai trò</th>
            <th className={HIDE_SM}>Số CCCD</th>
            <th className={HIDE_MD}>Số điện thoại</th>
            {showStatus && <th>Xác minh</th>}
            {showVerifiedAt ? <th>Xác minh</th> : <th className={showStatus ? HIDE_SM : undefined}>Đăng ký</th>}
            <th className="act"><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const ekyc = ekycDisplay(customer.ekycStatus);
            // Bảng chỉ hiện 4 số cuối; số đầy đủ ở trang chi tiết.
            const idNumber = maskIdNumber(customer.idNumber);
            return (
              <tr
                key={customer.id}
                className="clickable"
                tabIndex={0}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button, a')) return;
                  openDetail(customer.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.target === event.currentTarget) openDetail(customer.id);
                }}
              >
                <td>
                  <span className={customer.fullName ? 'kyc-name block font-medium text-primary' : 'kyc-name empty block font-normal text-muted'}>
                    {customer.fullName || 'Chưa có họ tên'}
                  </span>
                  <span className="ui-sub">{customer.email}</span>
                </td>
                <td className={HIDE_MD}>{roleLabel(customer.role)}</td>
                <td className={HIDE_SM}>{idNumber ? <span className="ui-mono">{idNumber}</span> : '-'}</td>
                <td className={HIDE_MD}>{customer.phone || '-'}</td>
                {showStatus && <td><StatusPill tone={ekyc.tone}>{ekyc.label}</StatusPill></td>}
                {showVerifiedAt
                  ? <td>{formatDay(customer.ekycCompletedAt)}</td>
                  : <td className={showStatus ? HIDE_SM : undefined}>{formatDay(customer.createdAt)}</td>}
                <td className="act">
                  <RowMenu label={`Thao tác với ${customer.fullName || customer.email}`} items={menuItems(customer, review)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
