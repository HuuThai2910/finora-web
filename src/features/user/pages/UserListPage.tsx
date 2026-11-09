import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { RootState } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import {
  DateRangeField,
  FilterBar,
  SelectField,
  rangeChipLabel,
  rangeError,
  shortDate,
  useUrlFilters,
  type FilterChip,
} from '@/components/filters';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { useGetStaffRolesQuery, useGetUserStatsQuery, useGetUsersQuery } from '../api/userQueries';
import { ChangeRoleModal } from '../components/ChangeRoleModal';
import { CreateStaffModal } from '../components/CreateStaffModal';
import { LockUserModal } from '../components/LockUserModal';
import { PermissionSectionTabs } from '../components/PermissionSectionTabs';
import { StaffCreatedModal } from '../components/StaffCreatedModal';
import { UserTable } from '../components/UserTable';
import { ROLE_FILTER_OPTIONS, ROLE_LABELS, USER_LIST_PAGE_SIZE, isRoleFilter } from '../constant';
import type { RoleType, StaffAccountCreated, UserItem } from '../types';

type PendingAction =
  | { kind: 'role' | 'lock'; user: UserItem }
  | { kind: 'create' }
  | { kind: 'created'; account: StaffAccountCreated }
  | null;

/** Tham số bộ lọc trên URL; `role` giữ tên cũ để link `?role=…` vẫn mở đúng. */
const FILTER_KEYS = ['role', 'staffRole', 'locked', 'createdFrom', 'createdTo', 'lastLoginFrom', 'lastLoginTo'] as const;

const LOCK_LABELS: Record<string, string> = { false: 'Đang hoạt động', true: 'Đã khóa' };

function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/**
 * Trang Phân quyền, tab "Người dùng": mọi tài khoản (quản trị viên, nhân viên, nhà đầu tư, người vay) với thanh lọc dùng
 * chung (ô tìm, bảng lọc, chip). Tạo nhân viên mới bằng thông tin riêng; "Đổi vai trò" chỉ có ở dòng tài khoản nội bộ.
 */
export default function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useUrlFilters(FILTER_KEYS);
  const { applied, draft } = filters;
  const page = readPage(searchParams.get('page'));
  const search = (searchParams.get('q') ?? '').trim();
  const role: RoleType | null = isRoleFilter(applied.role) && applied.role !== 'ALL' ? applied.role : null;
  // Vai trò nhân viên chỉ có nghĩa khi lọc Nhân viên (backend cũng ngầm hiểu role=STAFF khi có mã).
  const staffRoleCode = role === 'STAFF' ? applied.staffRole : '';
  const locked = applied.locked === 'true' ? true : applied.locked === 'false' ? false : undefined;

  const users = useGetUsersQuery({
    page,
    size: USER_LIST_PAGE_SIZE,
    role: role ?? 'ALL',
    ekycStatus: 'ALL',
    staffRoleCode: staffRoleCode || undefined,
    q: search || undefined,
    advanced: {
      locked,
      createdFrom: applied.createdFrom || undefined,
      createdTo: applied.createdTo || undefined,
      lastLoginFrom: applied.lastLoginFrom || undefined,
      lastLoginTo: applied.lastLoginTo || undefined,
    },
  });
  const stats = useGetUserStatsQuery();
  const staffRoles = useGetStaffRolesQuery();
  const currentAdminId = useSelector((state: RootState) => state.auth.profile?.id ?? null);
  const [action, setAction] = useState<PendingAction>(null);

  const staffRoleName = (code: string) => staffRoles.data?.find((item) => item.code === code)?.name ?? 'Vai trò nhân viên';
  const createdError = rangeError(draft.createdFrom, draft.createdTo, false);
  const lastLoginError = rangeError(draft.lastLoginFrom, draft.lastLoginTo, false);

  const chips: FilterChip[] = [];
  if (role) chips.push({ key: 'role', label: `Vai trò: ${ROLE_LABELS[role]}`, onRemove: () => filters.remove('role', 'staffRole') });
  if (staffRoleCode) chips.push({ key: 'staffRole', label: `Vai trò nhân viên: ${staffRoleName(staffRoleCode)}`, onRemove: () => filters.remove('staffRole') });
  if (locked != null) chips.push({ key: 'locked', label: `Trạng thái: ${LOCK_LABELS[String(locked)]}`, onRemove: () => filters.remove('locked') });
  if (applied.createdFrom || applied.createdTo) {
    chips.push({
      key: 'created',
      label: rangeChipLabel('Ngày tạo', applied.createdFrom, applied.createdTo, shortDate),
      onRemove: () => filters.remove('createdFrom', 'createdTo'),
    });
  }
  if (applied.lastLoginFrom || applied.lastLoginTo) {
    chips.push({
      key: 'lastLogin',
      label: rangeChipLabel('Đăng nhập cuối', applied.lastLoginFrom, applied.lastLoginTo, shortDate),
      onRemove: () => filters.remove('lastLoginFrom', 'lastLoginTo'),
    });
  }

  const onSearch = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('q', next);
    else params.delete('q');
    params.delete('page');
    setSearchParams(params, { replace: true });
  };
  const onPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    if (next > 0) params.set('page', String(next + 1));
    else params.delete('page');
    setSearchParams(params);
  };

  const list = users.data?.content ?? [];
  const isRefreshing = users.isFetching || stats.isFetching;
  const draftIsStaff = draft.role === 'STAFF';

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Phân quyền</h1>
          <p>Tạo nhân viên, đổi vai trò và khóa tài khoản; mỗi vai trò nhân viên quy định màn nào được xem và thao tác nào được làm.</p>
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
          <button type="button" className="ui-btn primary" onClick={() => setAction({ kind: 'create' })}>
            <Icon name="userPlus" />
            Thêm nhân viên
          </button>
        </div>
      </header>

      <PermissionSectionTabs />

      <section className="ui-card user-card" aria-label="Danh sách người dùng">
        <div className="user-toolbar px-4 py-3 border-b border-b-line max-[760px]:px-3">
          <FilterBar
            search={{ value: search, onSearch, label: 'Tìm tài khoản', placeholder: 'Tìm tên, email, SĐT hoặc CCCD' }}
            activeCount={chips.length}
            chips={chips}
            onOpen={filters.resetDraft}
            onApply={() => {
              if (createdError || lastLoginError) return false;
              filters.applyDraft();
              return true;
            }}
            onClearAll={filters.clearAll}
            total={users.data?.totalElements}
            unit="tài khoản"
          >
            <SelectField
              label="Vai trò"
              value={isRoleFilter(draft.role) && draft.role !== 'ALL' ? draft.role : ''}
              allLabel="Tất cả vai trò"
              options={ROLE_FILTER_OPTIONS.map((value) => ({
                value,
                label: ROLE_LABELS[value],
                count: stats.data ? stats.data.byRole[value] ?? 0 : undefined,
              }))}
              // Đổi khỏi Nhân viên thì bỏ luôn vai trò nhân viên đã chọn.
              onChange={(value) => filters.setDraft({ role: value, staffRole: value === 'STAFF' ? draft.staffRole : '' })}
            />
            {draftIsStaff && (
              <SelectField
                label="Vai trò nhân viên"
                value={draft.staffRole}
                allLabel="Mọi vai trò nhân viên"
                options={(staffRoles.data ?? []).map((item) => ({ value: item.code, label: item.name, count: item.memberCount }))}
                onChange={(value) => filters.setDraft({ staffRole: value })}
              />
            )}
            <SelectField
              label="Trạng thái tài khoản"
              value={draft.locked}
              allLabel="Tất cả trạng thái"
              options={[{ value: 'false', label: LOCK_LABELS.false }, { value: 'true', label: LOCK_LABELS.true }]}
              onChange={(value) => filters.setDraft({ locked: value })}
            />
            <DateRangeField
              label="Ngày tạo"
              from={draft.createdFrom}
              to={draft.createdTo}
              error={createdError}
              onChange={(from, to) => filters.setDraft({ createdFrom: from, createdTo: to })}
            />
            <DateRangeField
              label="Lần đăng nhập cuối"
              from={draft.lastLoginFrom}
              to={draft.lastLoginTo}
              error={lastLoginError}
              onChange={(from, to) => filters.setDraft({ lastLoginFrom: from, lastLoginTo: to })}
            />
          </FilterBar>
        </div>

        <div className="user-body p-3 max-[760px]:py-2.5 max-[760px]:px-2">
          {users.error ? (
            <ErrorNotice error={users.error} onRetry={users.refetch} />
          ) : users.isLoading ? (
            <div className="ui-empty" aria-busy="true">Đang tải danh sách người dùng...</div>
          ) : list.length === 0 ? (
            <div className="ui-empty">
              {search ? `Không tìm thấy tài khoản khớp "${search}".` : 'Không có tài khoản phù hợp với bộ lọc.'}
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
                unit="tài khoản"
                disabled={users.isFetching}
                onPage={onPage}
              />
            </div>
          )}
        </div>
      </section>

      {action?.kind === 'create' && (
        <CreateStaffModal onClose={() => setAction(null)} onCreated={(account) => setAction({ kind: 'created', account })} />
      )}
      {action?.kind === 'created' && <StaffCreatedModal account={action.account} onClose={() => setAction(null)} />}
      {action?.kind === 'role' && <ChangeRoleModal user={action.user} onClose={() => setAction(null)} onDone={() => setAction(null)} />}
      {action?.kind === 'lock' && <LockUserModal user={action.user} onClose={() => setAction(null)} onDone={() => setAction(null)} />}
    </section>
  );
}
