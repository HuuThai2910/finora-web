import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { RowMenu } from '@/components/RowMenu';
import { SearchBox } from '@/components/SearchBox';
import { StatusPill } from '@/components/StatusPill';
import { toast } from '@/lib/toast';
import { formatNumber, matchesSearch } from '@/utils';
import { useGetStaffRolesQuery } from '../api/userQueries';
import { DeleteStaffRoleModal } from '../components/DeleteStaffRoleModal';
import { PermissionSectionTabs } from '../components/PermissionSectionTabs';
import { StaffRoleModal } from '../components/StaffRoleModal';
import type { StaffRole } from '../types';

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
  return `${formatNumber(views)} Xem, ${formatNumber(actions)} Sửa`;
}

/**
 * Phần "Vai trò nhân viên" của trang Phân quyền (chỉ ADMIN): mỗi vai trò nhân viên là một bộ quyền Xem/Thao tác trên
 * các màn quản trị. Gán vai trò cho từng tài khoản làm ở phần "Người dùng" (đổi vai trò sang "Nhân viên").
 */
export default function StaffRolesPage() {
  const roles = useGetStaffRolesQuery();
  const [action, setAction] = useState<PendingAction>(null);
  // Kết quả thao tác báo bằng toast dùng chung (`@/lib/toast`).
  const setNotice = useCallback((message: string | null) => { if (message) toast.success(message); }, []);
  const all = roles.data ?? [];
  // Danh sách vai trò nhỏ và tải hết một lần: lọc ở client theo tên, mô tả hoặc mã vai trò; từ khóa giữ trên URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = (searchParams.get('q') ?? '').trim();
  const list = all.filter((role) => matchesSearch(search, role.name, role.description, role.code));
  const updateSearch = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('q', next);
    else params.delete('q');
    setSearchParams(params, { replace: true });
  };

  const finish = (message: string) => {
    setAction(null);
    setNotice(message);
  };

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Phân quyền</h1>
          <p>Mỗi vai trò nhân viên quy định màn nào được xem và thao tác nào được làm trên web quản trị.</p>
        </div>
        <div className="user-head-actions flex flex-wrap gap-2">
          <button type="button" className="ui-btn primary" onClick={() => setAction({ kind: 'create' })}>
            <Icon name="plus" />
            Tạo vai trò
          </button>
        </div>
      </header>

      <PermissionSectionTabs />

      <section className="ui-card user-card overflow-hidden" aria-label="Danh sách vai trò nhân viên">
        <div className="user-toolbar flex flex-wrap items-center justify-end gap-2 px-3 pt-3 max-[760px]:px-2">
          <SearchBox
            className="staff-role-search w-65 max-[760px]:w-full"
            value={search}
            onSearch={updateSearch}
            label="Tìm vai trò nhân viên"
            placeholder="Tìm theo tên hoặc mô tả vai trò"
          />
        </div>
        <div className="user-body p-3 max-[760px]:py-2.5 max-[760px]:px-2">
          {roles.error ? (
            <ErrorNotice error={roles.error} onRetry={roles.refetch} />
          ) : roles.isLoading ? (
            <div className="ui-empty" aria-busy="true">Đang tải vai trò nhân viên...</div>
          ) : all.length === 0 ? (
            <div className="ui-empty">Chưa có vai trò nhân viên nào. Bấm "Tạo vai trò" để bắt đầu.</div>
          ) : list.length === 0 ? (
            <div className="ui-empty">Không tìm thấy vai trò khớp "{search}".</div>
          ) : (
            <div className={roles.isFetching ? 'ui-table-wrap ui-busy' : 'ui-table-wrap'}>
              <table className="ui-table list staff-role-table">
                <thead>
                  <tr>
                    <th>Vai trò</th>
                    {/* Màn hẹp ẩn mô tả (đọc trong hộp Sửa quyền) để nút "⋯" không bị đẩy ra ngoài khung. */}
                    <th className="staff-hide-sm max-[760px]:hidden">Mô tả</th>
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
                          <div className="user-name-row flex items-center gap-1.5">
                            <span className="user-name font-medium">{role.name}</span>
                            {role.builtIn && <StatusPill tone="info" small>Mặc định</StatusPill>}
                          </div>
                        </td>
                        <td className="staff-role-desc max-[760px]:hidden max-w-90 text-secondary whitespace-normal">{role.description || <span className="user-name empty text-muted font-normal">Chưa có mô tả</span>}</td>
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
    </section>
  );
}
