import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import {
  DateRangeField,
  FilterBar,
  RangeField,
  SelectField,
  rangeChipLabel,
  rangeError,
  shortDate,
  useUrlFilters,
  type FilterChip,
} from '@/components/filters';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { usePermission } from '@/features/auth';
import { PendingAttemptTable, useGetEkycAttemptsQuery } from '@/features/ekyc-review';
import { useGetUserStatsQuery, useGetUsersQuery, type EkycStatusType } from '@/features/user';
import { CustomerTable } from '../components/CustomerTable';
import { EkycOutcomeCard } from '../components/EkycOutcomeCard';
import { KycOverview } from '../components/KycOverview';
import { SignupWeeklyCard } from '../components/SignupWeeklyCard';
import { KYC_FILTERS, KYC_LIST_PAGE_SIZE, isKycFilter, type KycFilter } from '../constants';
import { usePendingAttemptLookup } from '../hooks/usePendingAttemptLookup';
import { ekycDisplay } from '../mappers/customerDisplay';

/** Đọc số trang từ URL (tính từ 1 cho dễ đọc), trả về chỉ số từ 0 như backend. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

const EMPTY_TEXT: Record<KycFilter, string> = {
  ALL: 'Chưa có khách hàng nào.',
  MANUAL_REVIEW: 'Không còn hồ sơ nào chờ duyệt tay.',
  VERIFIED: 'Chưa có khách hàng đã xác minh.',
  PENDING: 'Không có khách hàng chưa xác minh.',
  FAILED: 'Không có khách hàng xác minh thất bại.',
};

/** Tham số bộ lọc trên URL; `ekyc` giữ tên cũ để link Tổng quan `?ekyc=MANUAL_REVIEW` mở đúng. */
const FILTER_KEYS = [
  'ekyc', 'role', 'locked', 'createdFrom', 'createdTo', 'ageMin', 'ageMax', 'gender', 'lastLoginFrom', 'lastLoginTo',
] as const;

const ROLE_OPTIONS: Array<{ value: 'BORROWER' | 'INVESTOR'; label: string }> = [
  { value: 'BORROWER', label: 'Người vay' },
  { value: 'INVESTOR', label: 'Nhà đầu tư' },
];
const GENDER_LABELS: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
const LOCK_LABELS: Record<string, string> = { false: 'Đang hoạt động', true: 'Đã khóa' };
const EKYC_OPTIONS = KYC_FILTERS.filter((item): item is EkycStatusType => item !== 'ALL');
const orUndefined = (value: string) => value || undefined;

/**
 * Khách hàng (người vay, nhà đầu tư): hai thẻ biểu đồ đầu trang, dưới là danh sách với thanh lọc dùng chung (ô tìm,
 * bảng lọc, chip). Bộ lọc chỉ dùng dữ liệu của finora-user — không lọc theo ví hay khoản vay để không gọi chéo service.
 */
export default function CustomerKycPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useUrlFilters(FILTER_KEYS);
  const { applied, draft } = filters;
  const filter: KycFilter = isKycFilter(applied.ekyc) ? applied.ekyc : 'ALL';
  const role = ROLE_OPTIONS.find((item) => item.value === applied.role) ?? null;
  const locked = applied.locked === 'true' ? true : applied.locked === 'false' ? false : undefined;
  const gender = applied.gender in GENDER_LABELS ? (applied.gender as 'MALE' | 'FEMALE' | 'OTHER') : undefined;
  const page = readPage(searchParams.get('page'));
  const search = (searchParams.get('q') ?? '').trim();
  const listRef = useRef<HTMLElement>(null);
  const permission = usePermission();
  // Biểu đồ đăng ký theo tuần đọc series thống kê, cần quyền Xem "Tổng quan & thống kê".
  const canStats = permission.canView('dashboard');
  // Hàng chờ theo lượt và mục "Duyệt xác minh" ở menu dòng chỉ có khi được Xem "Duyệt xác minh danh tính".
  const canReview = permission.canView('ekyc');
  const otherFilters = FILTER_KEYS.some((key) => key !== 'ekyc' && applied[key]);
  // "Chờ duyệt tay" là hàng chờ theo LƯỢT (việc cần làm), không phải danh sách khách; thiếu quyền duyệt, đang tìm hoặc
  // đang lọc thêm tiêu chí khác thì là danh sách khách có trạng thái đó.
  const showQueue = filter === 'MANUAL_REVIEW' && canReview && !search && !otherFilters;

  // Chỉ người vay và nhà đầu tư (scope=CUSTOMER); lọc ở backend để kết quả trải trên toàn bộ khách hàng.
  const users = useGetUsersQuery(
    {
      page,
      size: KYC_LIST_PAGE_SIZE,
      role: role?.value ?? 'ALL',
      ekycStatus: filter,
      q: search || undefined,
      scope: 'CUSTOMER',
      advanced: {
        locked,
        gender,
        createdFrom: orUndefined(applied.createdFrom),
        createdTo: orUndefined(applied.createdTo),
        ageMin: applied.ageMin ? Number(applied.ageMin) : undefined,
        ageMax: applied.ageMax ? Number(applied.ageMax) : undefined,
        lastLoginFrom: orUndefined(applied.lastLoginFrom),
        lastLoginTo: orUndefined(applied.lastLoginTo),
      },
    },
    { skip: showQueue },
  );
  const queue = useGetEkycAttemptsQuery(
    { status: 'MANUAL_REVIEW', page, size: KYC_LIST_PAGE_SIZE },
    { skip: !showQueue },
  );
  const stats = useGetUserStatsQuery();
  // Tổng số lượt chờ và lượt của từng khách cho menu dòng.
  const pending = usePendingAttemptLookup(canReview);
  const customers = users.data?.content ?? [];

  const setParam = (key: string, value: string, replace = false) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    // Gõ tìm thay URL thay vì thêm mục lịch sử, để nút Quay lại không phải lùi qua từng lần gõ.
    setSearchParams(params, { replace });
  };

  // Số trong ô chọn là tổng toàn hệ thống (/stats; chờ duyệt tay là tổng số lượt), không phải số dòng của trang.
  const ekycCount = (status: EkycStatusType): number | undefined => {
    if (status === 'MANUAL_REVIEW' && canReview) return pending.total;
    return stats.data ? stats.data.byEkycStatus[status] ?? 0 : undefined;
  };

  const errors = {
    created: rangeError(draft.createdFrom, draft.createdTo, false),
    age: rangeError(draft.ageMin, draft.ageMax),
    lastLogin: rangeError(draft.lastLoginFrom, draft.lastLoginTo, false),
  };

  const chips: FilterChip[] = [];
  if (filter !== 'ALL') chips.push({ key: 'ekyc', label: `Xác minh: ${ekycDisplay(filter).label}`, onRemove: () => filters.remove('ekyc') });
  if (role) chips.push({ key: 'role', label: `Vai trò: ${role.label}`, onRemove: () => filters.remove('role') });
  if (locked != null) chips.push({ key: 'locked', label: `Tài khoản: ${LOCK_LABELS[String(locked)]}`, onRemove: () => filters.remove('locked') });
  if (applied.createdFrom || applied.createdTo) {
    chips.push({
      key: 'created',
      label: rangeChipLabel('Ngày đăng ký', applied.createdFrom, applied.createdTo, shortDate),
      onRemove: () => filters.remove('createdFrom', 'createdTo'),
    });
  }
  if (applied.ageMin || applied.ageMax) {
    chips.push({
      key: 'age',
      label: rangeChipLabel('Tuổi', applied.ageMin, applied.ageMax, (value) => value),
      onRemove: () => filters.remove('ageMin', 'ageMax'),
    });
  }
  if (gender) chips.push({ key: 'gender', label: `Giới tính: ${GENDER_LABELS[gender]}`, onRemove: () => filters.remove('gender') });
  if (applied.lastLoginFrom || applied.lastLoginTo) {
    chips.push({
      key: 'lastLogin',
      label: rangeChipLabel('Đăng nhập cuối', applied.lastLoginFrom, applied.lastLoginTo, shortDate),
      onRemove: () => filters.remove('lastLoginFrom', 'lastLoginTo'),
    });
  }

  const selectFromChart = (status: EkycStatusType) => {
    setParam('ekyc', status);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const list = showQueue ? queue : users;
  const isRefreshing = list.isFetching || stats.isFetching || pending.isFetching;
  const refresh = () => {
    void list.refetch();
    void stats.refetch();
    if (canReview) void pending.refetch();
  };

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Khách hàng</h1>
        </div>
        <button type="button" className="ui-btn ghost" onClick={refresh} disabled={isRefreshing}>
          <Icon name="refresh" />
          {isRefreshing ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      {/* Không có quyền Xem thống kê: chỉ còn thẻ kết quả xác minh, chiếm cả hàng. */}
      <KycOverview twoColumns={canStats}>
        {canStats && <SignupWeeklyCard />}
        <EkycOutcomeCard
          stats={stats.data}
          isLoading={stats.isLoading}
          error={stats.error}
          onRetry={stats.refetch}
          onSelect={selectFromChart}
        />
      </KycOverview>

      <section
        ref={listRef}
        className="ui-card kyc-list pt-3.5 px-3.5 pb-3 max-[760px]:px-2.5 max-[760px]:pb-2.5"
        aria-label="Danh sách khách hàng"
      >
        <FilterBar
          className="mb-3"
          search={{
            value: search,
            onSearch: (next) => setParam('q', next, true),
            label: 'Tìm khách hàng',
            placeholder: 'Tìm tên, email, SĐT hoặc CCCD',
          }}
          activeCount={chips.length}
          chips={chips}
          onOpen={filters.resetDraft}
          onApply={() => {
            if (Object.values(errors).some(Boolean)) return false;
            filters.applyDraft();
            return true;
          }}
          onClearAll={filters.clearAll}
          total={list.data?.totalElements}
          unit={showQueue ? 'lượt chờ duyệt' : 'khách hàng'}
          title="Lọc khách hàng"
        >
          <SelectField
            label="Vai trò"
            value={draft.role}
            allLabel="Tất cả vai trò"
            options={ROLE_OPTIONS.map((item) => ({
              ...item, count: stats.data ? stats.data.byRole[item.value] ?? 0 : undefined,
            }))}
            onChange={(value) => filters.setDraft({ role: value })}
          />
          <SelectField
            label="Xác minh danh tính"
            value={isKycFilter(draft.ekyc) && draft.ekyc !== 'ALL' ? draft.ekyc : ''}
            allLabel="Tất cả trạng thái"
            options={EKYC_OPTIONS.map((value) => ({ value, label: ekycDisplay(value).label, count: ekycCount(value) }))}
            onChange={(value) => filters.setDraft({ ekyc: value })}
          />
          <DateRangeField
            label="Ngày đăng ký"
            from={draft.createdFrom}
            to={draft.createdTo}
            error={errors.created}
            onChange={(from, to) => filters.setDraft({ createdFrom: from, createdTo: to })}
          />
          <SelectField
            label="Trạng thái tài khoản"
            value={draft.locked}
            allLabel="Tất cả"
            options={[{ value: 'false', label: LOCK_LABELS.false }, { value: 'true', label: LOCK_LABELS.true }]}
            onChange={(value) => filters.setDraft({ locked: value })}
          />
          <RangeField
            label="Tuổi"
            min={draft.ageMin}
            max={draft.ageMax}
            error={errors.age}
            onChange={(min, max) => filters.setDraft({ ageMin: min, ageMax: max })}
          />
          <SelectField
            label="Giới tính"
            value={draft.gender}
            allLabel="Tất cả"
            options={Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }))}
            onChange={(value) => filters.setDraft({ gender: value })}
          />
          <DateRangeField
            label="Lần đăng nhập cuối"
            from={draft.lastLoginFrom}
            to={draft.lastLoginTo}
            error={errors.lastLogin}
            onChange={(from, to) => filters.setDraft({ lastLoginFrom: from, lastLoginTo: to })}
          />
        </FilterBar>

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">
            {showQueue ? 'Đang tải hàng chờ duyệt...' : 'Đang tải danh sách khách hàng...'}
          </div>
        ) : (showQueue ? (queue.data?.content.length ?? 0) : customers.length) === 0 ? (
          <div className="ui-empty">
            {showQueue
              ? 'Không còn lượt nào chờ duyệt tay.'
              : search
                ? `Không tìm thấy khách hàng khớp "${search}". Số điện thoại và CCCD phải gõ đủ số.`
                : otherFilters ? 'Không có khách hàng phù hợp với bộ lọc.' : EMPTY_TEXT[filter]}
          </div>
        ) : (
          <div className={list.isFetching ? 'ui-busy' : undefined}>
            {showQueue ? (
              <PendingAttemptTable attempts={queue.data?.content ?? []} />
            ) : (
              <CustomerTable
                customers={customers}
                filter={filter}
                review={canReview ? { attempts: pending.byCustomer, isLoading: pending.isFetching } : null}
              />
            )}
            <Pager
              page={page}
              size={KYC_LIST_PAGE_SIZE}
              total={list.data?.totalElements ?? 0}
              unit={showQueue ? 'lượt chờ duyệt' : 'khách hàng'}
              disabled={list.isFetching}
              onPage={(next) => setParam('page', next > 0 ? String(next + 1) : '')}
            />
          </div>
        )}
      </section>
    </section>
  );
}
