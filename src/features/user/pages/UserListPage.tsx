import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { RootState } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { Toast } from '@/components/Toast';
import { useGetUserStatsQuery, useGetUsersQuery } from '../api/userQueries';
import { ChangeRoleModal } from '../components/ChangeRoleModal';
import { LockUserModal } from '../components/LockUserModal';
import { PermissionSectionTabs } from '../components/PermissionSectionTabs';
import { UserTable } from '../components/UserTable';
import { ROLE_LABELS, USER_LIST_PAGE_SIZE, isRoleFilter, type RoleFilter } from '../constant';
import type { RoleType, UserItem } from '../types';
import './UserListPage.css';

const ROLE_TABS: RoleFilter[] = ['ALL', 'ADMIN', 'STAFF', 'INVESTOR', 'BORROWER'];

type PendingAction = { kind: 'role' | 'lock'; user: UserItem } | null;

function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

export default function UserListPage() {
  // Bộ lọc và trang nằm trên URL để chia sẻ đường dẫn và giữ chỗ khi quay lại.
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const role: RoleFilter = isRoleFilter(roleParam) ? roleParam : 'ALL';
  const page = readPage(searchParams.get('page'));

  // Trạng thái xác minh xem và lọc ở trang Khách hàng; trang này chỉ lọc theo vai trò.
  const users = useGetUsersQuery({ page, size: USER_LIST_PAGE_SIZE, role, ekycStatus: 'ALL' });
  const stats = useGetUserStatsQuery();
  const currentAdminId = useSelector((state: RootState) => state.auth.profile?.id ?? null);

  const [action, setAction] = useState<PendingAction>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const updateQuery = (next: { role?: RoleFilter; page?: number }) => {
    const nextRole = next.role ?? role;
    const nextPage = next.page ?? 0;
    const params: Record<string, string> = {};
    if (nextRole !== 'ALL') params.role = nextRole;
    if (nextPage > 0) params.page = String(nextPage + 1);
    setSearchParams(params);
  };

  // Số trên tab là tổng toàn hệ thống từ /stats, không phải số dòng của trang đang tải.
  const tabCount = (tab: RoleFilter): number | undefined => {
    if (!stats.data) return undefined;
    return tab === 'ALL' ? stats.data.total : stats.data.byRole[tab as RoleType] ?? 0;
  };

  const finish = (message: string) => {
    setAction(null);
    setNotice(message);
  };

  const list = users.data?.content ?? [];
  const isRefreshing = users.isFetching || stats.isFetching;

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Phân quyền</h1>
          <p>Xem tài khoản theo vai trò, đổi vai trò, gán vai trò nhân viên và khóa tài khoản khi cần.</p>
        </div>
        <div className="user-head-actions">
          <button
            type="button"
            className="ui-btn ghost"
            onClick={() => {
              void users.refetch();
              void stats.refetch();
            }}
            disabled={isRefreshing}
          >
            <Icon name="refresh" />
            {isRefreshing ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </header>

      <PermissionSectionTabs />

      <section className="ui-card user-card" aria-label="Danh sách người dùng">
        <div className="user-toolbar">
          <div className="ui-line-tabs" role="tablist" aria-label="Lọc vai trò người dùng">
            {ROLE_TABS.map((tab) => (
              <button key={tab} type="button" role="tab" aria-selected={role === tab} onClick={() => updateQuery({ role: tab })}>
                {tab === 'ALL' ? 'Tất cả' : ROLE_LABELS[tab]}
                {tabCount(tab) != null && <span className="n">{tabCount(tab)}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="user-body">
          {users.error ? (
            <ErrorNotice error={users.error} onRetry={users.refetch} />
          ) : users.isLoading ? (
            <div className="ui-empty" aria-busy="true">Đang tải danh sách người dùng...</div>
          ) : list.length === 0 ? (
            <div className="ui-empty">Không có người dùng phù hợp với bộ lọc.</div>
          ) : (
            <div className={users.isFetching ? 'ui-busy' : undefined}>
              <UserTable
                users={list}
                currentAdminId={currentAdminId == null ? null : String(currentAdminId)}
                onChangeRole={(user) => setAction({ kind: 'role', user })}
                onToggleLock={(user) => setAction({ kind: 'lock', user })}
              />
              <Pager
                page={page}
                size={USER_LIST_PAGE_SIZE}
                total={users.data?.totalElements ?? 0}
                unit="người dùng"
                disabled={users.isFetching}
                onPage={(next) => updateQuery({ page: next })}
              />
            </div>
          )}
        </div>
      </section>

      {action?.kind === 'role' && (
        <ChangeRoleModal user={action.user} onClose={() => setAction(null)} onDone={finish} />
      )}
      {action?.kind === 'lock' && (
        <LockUserModal user={action.user} onClose={() => setAction(null)} onDone={finish} />
      )}
      {notice && <Toast message={notice} onDismiss={dismissNotice} />}
    </section>
  );
}
