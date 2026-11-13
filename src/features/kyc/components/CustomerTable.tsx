import { RowMenu, type RowMenuItem } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { maskIdNumber, maskPhone, type UserItem } from '@/features/user';
import { ekycDisplay, formatDay, roleLabel } from '../mappers/customerDisplay';

/** Thao tác của dòng; trang giữ quyền và lượt chờ, bảng chỉ dựng menu. */
export interface CustomerRowActions {
  openDetail: (customer: UserItem) => void;
  /** Lượt chờ duyệt tay của khách để mở thẳng; `null` khi không có quyền Xem "Duyệt xác minh danh tính". */
  review: { attempts: Map<number, string>; isLoading: boolean } | null;
  openAttempt: (attemptId: string) => void;
  /** Mở lượt gần nhất đã gửi của khách (đã xác minh hoặc bị từ chối); trang tra lượt khi bấm. */
  viewLatestAttempt: (customer: UserItem) => void;
  /** `null` khi không có quyền Thao tác "Khách hàng". */
  toggleLock: ((customer: UserItem) => void) | null;
}

interface CustomerTableProps {
  customers: UserItem[];
  actions: CustomerRowActions;
}

/** Cột phụ ẩn bớt khi bảng hẹp; lớp `hide-md`/`hide-sm` giữ làm mốc. */
const HIDE_MD = 'hide-md max-[1100px]:hidden';
const HIDE_SM = 'hide-sm max-[760px]:hidden';

function reviewItem(customer: UserItem, actions: CustomerRowActions): RowMenuItem | null {
  const { review } = actions;
  if (!review) return null;
  if (customer.ekycStatus === 'MANUAL_REVIEW') {
    const attemptId = review.attempts.get(customer.id);
    return attemptId
      ? { key: 'review', label: 'Duyệt xác minh', icon: 'userCheck', onSelect: () => actions.openAttempt(attemptId) }
      : {
          key: 'review',
          label: 'Duyệt xác minh',
          icon: 'userCheck',
          onSelect: () => undefined,
          disabled: true,
          disabledReason: review.isLoading ? 'Đang tải lượt chờ duyệt...' : 'Không tìm thấy lượt chờ duyệt của khách này',
        };
  }
  if (customer.ekycStatus === 'VERIFIED' || customer.ekycStatus === 'FAILED') {
    return { key: 'review', label: 'Xem xác minh', icon: 'idCard', onSelect: () => actions.viewLatestAttempt(customer) };
  }
  return null;
}

function menuItems(customer: UserItem, actions: CustomerRowActions): RowMenuItem[] {
  const items: RowMenuItem[] = [
    { key: 'detail', label: 'Xem chi tiết', icon: 'eye', onSelect: () => actions.openDetail(customer) },
  ];
  const review = reviewItem(customer, actions);
  if (review) items.push(review);
  // Chỉ khi đã đọc được trạng thái khóa: không biết đang khóa hay mở thì không biết mục này sẽ làm gì.
  const { toggleLock } = actions;
  if (toggleLock && customer.locked != null) {
    items.push({
      key: 'lock',
      label: customer.locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      icon: customer.locked ? 'unlock' : 'lock',
      danger: !customer.locked,
      separatorBefore: true,
      onSelect: () => toggleLock(customer),
    });
  }
  return items;
}

/**
 * Bảng khách hàng: bấm dòng mở hộp chi tiết, nút "⋯" cuối dòng mở menu thao tác (xem chi tiết, duyệt hoặc xem xác
 * minh, khóa / mở khóa). Số CCCD và số điện thoại chỉ hiện 4 số cuối; số đầy đủ ở hộp chi tiết.
 */
export function CustomerTable({ customers, actions }: CustomerTableProps) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table list kyc-table">
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th className={HIDE_SM}>Vai trò</th>
            <th className={`${HIDE_SM} ${HIDE_MD}`}>Số CCCD</th>
            <th className={`${HIDE_SM} ${HIDE_MD}`}>Số điện thoại</th>
            <th>Xác minh</th>
            <th className={HIDE_SM}>Ngày đăng ký</th>
            <th className="act"><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const ekyc = ekycDisplay(customer.ekycStatus);
            const idNumber = maskIdNumber(customer.idNumber);
            const phone = maskPhone(customer.phone);
            return (
              <tr
                key={customer.id}
                className="clickable"
                tabIndex={0}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button, a')) return;
                  actions.openDetail(customer);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.target === event.currentTarget) actions.openDetail(customer);
                }}
              >
                <td>
                  <span className={customer.fullName ? 'kyc-name block font-medium text-primary' : 'kyc-name empty block font-normal text-muted'}>
                    {customer.fullName || 'Chưa có họ tên'}
                  </span>
                  <span className="ui-sub">{customer.email}</span>
                </td>
                <td className={HIDE_SM}>{roleLabel(customer.role)}</td>
                <td className={`${HIDE_SM} ${HIDE_MD}`}>{idNumber ? <span className="ui-mono">{idNumber}</span> : '-'}</td>
                <td className={`${HIDE_SM} ${HIDE_MD}`}>{phone ? <span className="ui-mono">{phone}</span> : '-'}</td>
                <td>
                  <StatusPill tone={ekyc.tone}>{ekyc.label}</StatusPill>
                  {customer.locked === true && <span className="ui-sub text-danger">Tài khoản đã khóa</span>}
                </td>
                <td className={HIDE_SM}>{formatDay(customer.createdAt)}</td>
                <td className="act">
                  <RowMenu label={`Thao tác với ${customer.fullName || customer.email}`} items={menuItems(customer, actions)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
