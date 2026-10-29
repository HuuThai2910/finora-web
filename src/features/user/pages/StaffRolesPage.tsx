import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { RowMenu } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { Toast } from '@/components/Toast';
import { formatNumber } from '@/utils';
import { useGetStaffRolesQuery } from '../api/userQueries';
import { DeleteStaffRoleModal } from '../components/DeleteStaffRoleModal';
import { StaffRoleModal } from '../components/StaffRoleModal';
import type { StaffRole } from '../types';
import './UserListPage.css';
import './StaffRolesPage.css';

type PendingAction = { kind: 'create' } | { kind: 'edit' | 'delete'; role: StaffRole } | null;

/** Lý do không xóa được, hiện ở menu dòng; null khi xóa được. */
function deleteBlockedReason(role: StaffRole): string | null {
  if (role.builtIn) return 'Vai trò mặc định của hệ thống không xóa được.';
  if (role.memberCount > 0) return `Còn ${formatNumber(role.memberCount)} người dùng mang vai trò này; đổi vai trò của họ trước khi xóa.`;
  return null;
}

function permissionSummary(role: StaffRole): string {
  const views = role.permissions.filter((permission) => permission.endsWith(':view')).length;
  const actions = role.permissions.filter((permission) => permission.endsWith(':action')).length;
  return `${formatNumber(views)} Xem, ${formatNumber(actions)} Thao tác`;
}

/**
 * Vai trò & phân quyền (chỉ ADMIN): mỗi vai trò nhân viên là một bộ quyền Xem/Thao tác trên các màn quản trị.
 * Gán vai trò cho từng tài khoản làm ở trang Người dùng & phân quyền (đổi vai trò sang "Nhân viên").
 */
export default function StaffRolesPage() {
  const roles = useGetStaffRolesQuery();
  const [action, setAction] = useState<PendingAction>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const list = roles.data ?? [];

  const finish = (message: string) => {
    setAction(null);
    setNotice(message);
  };

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Vai trò &amp; phân quyền</h1>
          <p>Mỗi vai trò nhân viên quy định màn nào được xem và thao tác nào được làm trên web quản trị.</p>
        </div>
        <div className="user-head-actions">
          <Link className="ui-btn ghost" to="/users">
            <Icon name="chevronLeft" />
            Về Người dùng
          </Link>
          <button type="button" className="ui-btn primary" onClick={() => setAction({ kind: 'create' })}>
            <Icon name="plus" />
            Tạo vai trò
          </button>
        </div>
      </header>

      <section className="ui-card user-card" aria-label="Danh sách vai trò nhân viên">
        <div className="user-body">
          {roles.error ? (
            <ErrorNotice error={roles.error} onRetry={roles.refetch} />
          ) : roles.isLoading ? (
            <div className="ui-empty" aria-busy="true">Đang tải vai trò nhân viên...</div>
          ) : list.length === 0 ? (
            <div className="ui-empty">Chưa có vai trò nhân viên nào. Bấm "Tạo vai trò" để bắt đầu.</div>
          ) : (
            <div className={roles.isFetching ? 'ui-table-wrap ui-busy' : 'ui-table-wrap'}>
              <table className="ui-table list staff-role-table">
                <thead>
                  <tr>
                    <th>Vai trò</th>
                    <th>Mô tả</th>
                    <th>Quyền</th>
                    <th className="num">Thành viên</th>
                    <th className="act"><span className="ui-sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((role) => {
                    const blocked = deleteBlockedReason(role);
                    return (
                      <tr key={role.code}>
                        <td>
                          <div className="user-name-row">
                            <span className="user-name">{role.name}</span>
                            {role.builtIn && <StatusPill tone="info" small>Mặc định</StatusPill>}
                          </div>
                          <span className="ui-sub ui-mono">{role.code}</span>
                        </td>
                        <td className="staff-role-desc">{role.description || <span className="user-name empty">Chưa có mô tả</span>}</td>
                        <td>{permissionSummary(role)}</td>
                        <td className="num">
                          {role.memberCount > 0
                            ? <Link className="ui-link" to="/users?role=STAFF">{formatNumber(role.memberCount)}</Link>
                            : '0'}
                        </td>
                        <td className="act">
                          <RowMenu
                            label={`Thao tác với vai trò ${role.name}`}
                            items={[
                              { key: 'edit', label: 'Sửa quyền', icon: 'edit', onSelect: () => setAction({ kind: 'edit', role }) },
                              {
                                key: 'delete',
                                label: 'Xóa vai trò',
                                icon: 'trash',
                                danger: true,
                                separatorBefore: true,
                                disabled: blocked != null,
                                disabledReason: blocked ?? undefined,
                                onSelect: () => setAction({ kind: 'delete', role }),
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
          )}
        </div>
      </section>

      {action?.kind === 'create' && <StaffRoleModal role={null} onClose={() => setAction(null)} onDone={finish} />}
      {action?.kind === 'edit' && (
        <StaffRoleModal key={action.role.code} role={action.role} onClose={() => setAction(null)} onDone={finish} />
      )}
      {action?.kind === 'delete' && (
        <DeleteStaffRoleModal role={action.role} onClose={() => setAction(null)} onDone={finish} />
      )}
      {notice && <Toast message={notice} onDismiss={dismissNotice} />}
    </section>
  );
}
