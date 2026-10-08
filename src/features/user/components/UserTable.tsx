import { RowMenu } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { EKYC_DISPLAY, ROLE_LABELS, formatGender } from '../constant';
import type { UserItem } from '../types';

interface UserTableProps {
  users: UserItem[];
  /** ID tài khoản quản trị viên đang đăng nhập: không cho tự đổi vai trò hoặc tự khóa. */
  currentAdminId: string | null;
  onChangeRole: (user: UserItem) => void;
  onToggleLock: (user: UserItem) => void;
}

/** Bảng người dùng; các thao tác của dòng gom vào menu "⋯". */
export function UserTable({ users, currentAdminId, onChangeRole, onToggleLock }: UserTableProps) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table list">
        <thead>
          <tr>
            <th>Người dùng</th>
            <th>Số điện thoại</th>
            <th>Giới tính</th>
            <th>Số CCCD</th>
            <th>Vai trò</th>
            <th>eKYC</th>
            <th className="act"><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = currentAdminId != null && String(user.id) === currentAdminId;
            const isLocked = user.locked === true;
            const ekyc = EKYC_DISPLAY[user.ekycStatus];
            const name = user.fullName || user.email;
            return (
              <tr key={user.id}>
                <td>
                  <div className="user-name-row">
                    <span className={user.fullName ? 'user-name' : 'user-name empty'}>
                      {user.fullName || 'Chưa cập nhật tên'}
                    </span>
                    {isSelf && <StatusPill tone="neutral" small>Bạn</StatusPill>}
                    {isLocked && <StatusPill tone="danger" small>Đã khóa</StatusPill>}
                  </div>
                  <span className="ui-sub">{user.email}</span>
                </td>
                <td>{user.phone || '-'}</td>
                <td>{formatGender(user.gender)}</td>
                <td>{user.idNumber ? <span className="ui-mono">{user.idNumber}</span> : '-'}</td>
                <td>{ROLE_LABELS[user.role] ?? user.role}</td>
                <td>
                  {ekyc
                    ? <StatusPill tone={ekyc.tone}>{ekyc.label}</StatusPill>
                    : <StatusPill tone="neutral">{user.ekycStatus}</StatusPill>}
                </td>
                <td className="act">
                  <RowMenu
                    label={`Thao tác với ${name}`}
                    items={[
                      { key: 'detail', label: 'Xem chi tiết', icon: 'eye', to: `/customers/kyc/${user.id}` },
                      {
                        key: 'role',
                        label: 'Đổi vai trò',
                        icon: 'userCheck',
                        onSelect: () => onChangeRole(user),
                        disabled: isSelf,
                        disabledReason: 'Không thể đổi vai trò của chính bạn',
                      },
                      {
                        key: 'lock',
                        label: isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
                        icon: isLocked ? 'unlock' : 'lock',
                        danger: !isLocked,
                        separatorBefore: true,
                        onSelect: () => onToggleLock(user),
                        disabled: isSelf,
                        disabledReason: 'Không thể tự khóa tài khoản của chính bạn',
                      },
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
