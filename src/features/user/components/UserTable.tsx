import { RowMenu, type RowMenuItem } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { ROLE_LABELS, formatGender, maskIdNumber } from '../constant';
import type { UserItem } from '../types';

interface UserTableProps {
  users: UserItem[];
  /** ID tài khoản quản trị viên đang đăng nhập: không cho tự đổi vai trò hoặc tự khóa. */
  currentAdminId: string | null;
  onChangeRole: (user: UserItem) => void;
  onToggleLock: (user: UserItem) => void;
}

/** Cột phụ ẩn khi bảng hẹp để cột vai trò và nút "⋯" vẫn nằm trong khung, không phải cuộn ngang mới thấy. */
const HIDE_MD = 'user-hide-md max-[1100px]:hidden';
const HIDE_SM = 'user-hide-sm max-[900px]:hidden';
const HIDE_XS = 'user-hide-xs max-[600px]:hidden';

/** Lý do khóa mục khóa/mở khóa; `null` khi bấm được. */
function lockBlockedReason(user: UserItem, isSelf: boolean): string | null {
  if (isSelf) return 'Không thể tự khóa tài khoản của chính bạn';
  // Không biết đang khóa hay mở thì không biết bấm sẽ làm gì: chờ tra cứu được trạng thái (Làm mới).
  if (user.locked == null) return 'Chưa đọc được trạng thái tài khoản, bấm Làm mới rồi thử lại';
  return null;
}

/** Bảng người dùng; các thao tác của dòng gom vào menu "⋯". */
export function UserTable({ users, currentAdminId, onChangeRole, onToggleLock }: UserTableProps) {
  // Khóa/mở khóa là quyền Thao tác "Khách hàng"; đổi vai trò chỉ ADMIN (route trang này cũng chỉ mở cho ADMIN).
  const { canAct, isAdmin } = usePermission();
  const canLock = canAct('customer');
  return (
    <div className="ui-table-wrap">
      <table className="ui-table list">
        <thead>
          <tr>
            <th>Người dùng</th>
            <th className={HIDE_XS}>Số điện thoại</th>
            <th className={HIDE_MD}>Giới tính</th>
            <th className={HIDE_SM}>Số CCCD</th>
            <th>Vai trò</th>
            <th className="act"><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = currentAdminId != null && String(user.id) === currentAdminId;
            const isLocked = user.locked === true;
            const name = user.fullName || user.email;
            const lockBlocked = lockBlockedReason(user, isSelf);
            const idNumber = maskIdNumber(user.idNumber);
            return (
              <tr key={user.id}>
                {/* Email dài xuống dòng ở màn hẹp thay vì đẩy cột vai trò và nút "⋯" ra ngoài khung. */}
                <td className="max-[600px]:whitespace-normal max-[600px]:wrap-anywhere">
                  <div className="user-name-row flex items-center gap-1.5">
                    <span className={user.fullName ? 'user-name font-medium' : 'user-name empty text-muted font-normal'}>
                      {user.fullName || 'Chưa cập nhật tên'}
                    </span>
                    {isSelf && <StatusPill tone="neutral" small>Bạn</StatusPill>}
                    {isLocked && <StatusPill tone="danger" small>Đã khóa</StatusPill>}
                  </div>
                  <span className="ui-sub">{user.email}</span>
                </td>
                <td className={HIDE_XS}>{user.phone || '-'}</td>
                <td className={HIDE_MD}>{formatGender(user.gender)}</td>
                <td className={HIDE_SM}>{idNumber ? <span className="ui-mono">{idNumber}</span> : '-'}</td>
                <td>
                  {ROLE_LABELS[user.role] ?? user.role}
                  {user.role === 'STAFF' && (
                    <span className="ui-sub">{user.staffRoleName || 'Chưa gán vai trò nhân viên'}</span>
                  )}
                </td>
                <td className="act">
                  <RowMenu
                    label={`Thao tác với ${name}`}
                    items={[
                      { key: 'detail', label: 'Xem chi tiết', icon: 'eye', to: `/customers/kyc/${user.id}` },
                      ...(isAdmin ? [{
                        key: 'role',
                        label: 'Đổi vai trò',
                        icon: 'userCheck',
                        onSelect: () => onChangeRole(user),
                        disabled: isSelf,
                        disabledReason: 'Không thể đổi vai trò của chính bạn',
                      } satisfies RowMenuItem] : []),
                      ...(canLock ? [{
                        key: 'lock',
                        label: isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
                        icon: isLocked ? 'unlock' : 'lock',
                        danger: !isLocked,
                        separatorBefore: true,
                        onSelect: () => onToggleLock(user),
                        disabled: lockBlocked != null,
                        disabledReason: lockBlocked ?? undefined,
                      } satisfies RowMenuItem] : []),
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
