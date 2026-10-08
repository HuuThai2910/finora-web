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
import { UserTable } from '../components/UserTable';
import {
  EKYC_DISPLAY,
  ROLE_LABELS,
  USER_LIST_PAGE_SIZE,
  isEkycFilter,
  isRoleFilter,
  type EkycFilter,
  type RoleFilter,
} from '../constant';
import type { EkycStatusType, RoleType, UserItem } from '../types';
import './UserListPage.css';

const ROLE_TABS: RoleFilter[] = ['ALL', 'ADMIN', 'INVESTOR', 'BORROWER'];
const EKYC_OPTIONS: EkycStatusType[] = ['VERIFIED', 'PENDING', 'MANUAL_REVIEW', 'FAILED'];

type PendingAction = { kind: 'role' | 'lock'; user: UserItem } | null;

function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

export default function UserListPage() {
  // Bộ lọc và trang nằm trên URL để chia sẻ đường dẫn và giữ chỗ khi quay lại.
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const ekycParam = searchParams.get('ekyc');
  const role: RoleFilter = isRoleFilter(roleParam) ? roleParam : 'ALL';
  const ekycStatus: EkycFilter = isEkycFilter(ekycParam) ? ekycParam : 'ALL';
  const page = readPage(searchParams.get('page'));

  const users = useGetUsersQuery({ page, size: USER_LIST_PAGE_SIZE, role, ekycStatus });
  const stats = useGetUserStatsQuery();
  const currentAdminId = useSelector((state: RootState) => state.auth.profile?.id ?? null);

  const [action, setAction] = useState<PendingAction>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const updateQuery = (next: { role?: RoleFilter; ekyc?: EkycFilter; page?: number }) => {
    const nextRole = next.role ?? role;
    const nextEkyc = next.ekyc ?? ekycStatus;
    const nextPage = next.page ?? 0;
    const params: Record<string, string> = {};
    if (nextRole !== 'ALL') params.role = nextRole;
    if (nextEkyc !== 'ALL') params.ekyc = nextEkyc;
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
          <h1>Người dùng &amp; phân quyền</h1>
          <p>Xem tài khoản theo vai trò, đổi vai trò và khóa tài khoản khi cần.</p>
        </div>
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
      </header>

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
          <select
            className="ui-select"
            value={ekycStatus}
            onChange={(event) => updateQuery({ ekyc: isEkycFilter(event.target.value) ? event.target.value : 'ALL' })}
            aria-label="Lọc trạng thái eKYC"
          >
            <option value="ALL">Mọi trạng thái eKYC</option>
            {EKYC_OPTIONS.map((status) => (
              <option key={status} value={status}>{EKYC_DISPLAY[status].label}</option>
            ))}
          </select>
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
