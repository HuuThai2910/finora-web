import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { RootState } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { SearchBox } from '@/components/SearchBox';
import { useGetStaffRolesQuery, useGetUserStatsQuery, useGetUsersQuery } from '../api/userQueries';
import { ChangeRoleModal } from '../components/ChangeRoleModal';
import { LockUserModal } from '../components/LockUserModal';
import { PermissionSectionTabs } from '../components/PermissionSectionTabs';
import { UserTable } from '../components/UserTable';
import { ROLE_LABELS, USER_LIST_PAGE_SIZE, isRoleFilter, type RoleFilter } from '../constant';
import type { RoleType, UserItem } from '../types';

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
  const search = (searchParams.get('q') ?? '').trim();
  // Lọc theo vai trò nhân viên chỉ có nghĩa ở tab Nhân viên.
  const staffRoleCode = role === 'STAFF' ? (searchParams.get('staffRole') ?? '') : '';

  // Trạng thái xác minh xem và lọc ở trang Khách hàng; trang này lọc theo vai trò, vai trò nhân viên và chuỗi tìm.
  const users = useGetUsersQuery({
    page,
    size: USER_LIST_PAGE_SIZE,
    role,
    ekycStatus: 'ALL',
    staffRoleCode: staffRoleCode || undefined,
    q: search || undefined,
  });
  const stats = useGetUserStatsQuery();
  const staffRoles = useGetStaffRolesQuery(undefined, { skip: role !== 'STAFF' });
  const currentAdminId = useSelector((state: RootState) => state.auth.profile?.id ?? null);

  const [action, setAction] = useState<PendingAction>(null);

  const updateQuery = (next: { role?: RoleFilter; page?: number; q?: string; staffRole?: string }) => {
    const nextRole = next.role ?? role;
    const nextPage = next.page ?? 0;
    const nextSearch = next.q ?? search;
    const nextStaffRole = nextRole === 'STAFF' ? (next.staffRole ?? (next.role ? '' : staffRoleCode)) : '';
    const params: Record<string, string> = {};
    if (nextRole !== 'ALL') params.role = nextRole;
    if (nextStaffRole) params.staffRole = nextStaffRole;
    if (nextSearch) params.q = nextSearch;
    if (nextPage > 0) params.page = String(nextPage + 1);
    setSearchParams(params, { replace: next.q !== undefined && next.q !== search });
  };

  // Số trên tab là tổng toàn hệ thống từ /stats, không phải số dòng của trang đang tải.
  const tabCount = (tab: RoleFilter): number | undefined => {
    if (!stats.data) return undefined;
    return tab === 'ALL' ? stats.data.total : stats.data.byRole[tab as RoleType] ?? 0;
  };

  // Hộp thoại tự báo kết quả bằng toast; trang chỉ đóng hộp.
  const finish = () => setAction(null);

  const list = users.data?.content ?? [];
  const isRefreshing = users.isFetching || stats.isFetching;

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Phân quyền</h1>
          <p>Xem tài khoản theo vai trò, đổi vai trò, gán vai trò nhân viên và khóa tài khoản khi cần.</p>
        </div>
        <div className="user-head-actions flex flex-wrap gap-2">
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

      <section className="ui-card user-card overflow-hidden" aria-label="Danh sách người dùng">
        <div className="user-toolbar flex items-center justify-between gap-x-4 gap-y-3 flex-wrap px-4 border-b border-b-line max-[760px]:px-3">
          {/*
            Màn hẹp: tab nằm một hàng và cuộn ngang thay vì xuống dòng (xuống dòng làm vạch chân tab rời khỏi đáy thanh).
            Khung cuộn kéo xuống 1px và đệm lại 1px để vạch của tab đang chọn vẫn đè lên viền dưới như cũ.
          */}
          <div
            className="ui-line-tabs user-role-tabs max-w-full -mb-px pb-px flex-nowrap overflow-x-auto whitespace-nowrap scrollbar-thin *:flex-none"
            role="tablist"
            aria-label="Lọc vai trò người dùng"
          >
            {ROLE_TABS.map((tab) => (
              <button key={tab} type="button" role="tab" aria-selected={role === tab} onClick={() => updateQuery({ role: tab })}>
                {tab === 'ALL' ? 'Tất cả' : ROLE_LABELS[tab]}
                {tabCount(tab) != null && <span className="n">{tabCount(tab)}</span>}
              </button>
            ))}
          </div>
          <div className="user-filters flex flex-wrap items-center gap-2 py-2.5 max-[760px]:w-full">
            {role === 'STAFF' && (
              <select
                className="ui-select user-staff-filter max-[760px]:flex-1"
                aria-label="Lọc theo vai trò nhân viên"
                value={staffRoleCode}
                onChange={(event) => updateQuery({ staffRole: event.target.value })}
              >
                <option value="">Mọi vai trò nhân viên</option>
                {(staffRoles.data ?? []).map((item) => (
                  <option key={item.code} value={item.code}>{item.name}</option>
                ))}
              </select>
            )}
            <SearchBox
              className="user-search w-65 max-[760px]:w-full"
              value={search}
              onSearch={(next) => updateQuery({ q: next, staffRole: staffRoleCode })}
              label="Tìm tài khoản"
              placeholder="Tìm tên, email, SĐT hoặc CCCD"
            />
          </div>
        </div>

        <div className="user-body p-3 max-[760px]:py-2.5 max-[760px]:px-2">
          {users.error ? (
            <ErrorNotice error={users.error} onRetry={users.refetch} />
          ) : users.isLoading ? (
            <div className="ui-empty" aria-busy="true">Đang tải danh sách người dùng...</div>
          ) : list.length === 0 ? (
            <div className="ui-empty">
              {search ? `Không tìm thấy tài khoản khớp "${search}".` : 'Không có người dùng phù hợp với bộ lọc.'}
            </div>
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
                onPage={(next) => updateQuery({ page: next, staffRole: staffRoleCode })}
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
    </section>
  );
}
