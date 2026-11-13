import { useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { ekycReviewDetailPath, useLazyGetUserEkycAttemptsQuery } from '@/features/ekyc-review';
import { LockUserModal, useGetUserStatsQuery, useGetUsersQuery, type EkycStatusType, type UserItem } from '@/features/user';
import { fromListState } from '@/lib/navigation';
import { toast } from '@/lib/toast';
import { CustomerDetailModal } from '../components/CustomerDetailModal';
import { CustomerTable, type CustomerRowActions } from '../components/CustomerTable';
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

/** `state` của đường dẫn hộp chi tiết mở từ danh sách: đóng hộp thì lùi lịch sử về đúng danh sách đó. */
interface CustomerModalState {
  customerModal?: boolean;
}

const LIST_PATH = '/customers/kyc';

/**
 * Khách hàng (người vay, nhà đầu tư): danh sách với thanh lọc dùng chung (ô tìm, bảng lọc, chip). Bộ lọc chỉ dùng dữ
 * liệu của finora-user — không lọc theo ví hay khoản vay để không gọi chéo service.
 *
 * Chi tiết khách là hộp thoại mở trên danh sách tại `/customers/kyc/:id` (giữ query của danh sách), nên đường dẫn cũ
 * tới hồ sơ khách từ trang khác vẫn mở đúng khách; đóng hộp thì về danh sách.
 */
export default function CustomerKycPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: openId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const filters = useUrlFilters(FILTER_KEYS);
  const { applied, draft } = filters;
  const filter: KycFilter = isKycFilter(applied.ekyc) ? applied.ekyc : 'ALL';
  const role = ROLE_OPTIONS.find((item) => item.value === applied.role) ?? null;
  const locked = applied.locked === 'true' ? true : applied.locked === 'false' ? false : undefined;
  const gender = applied.gender in GENDER_LABELS ? (applied.gender as 'MALE' | 'FEMALE' | 'OTHER') : undefined;
  const page = readPage(searchParams.get('page'));
  const search = (searchParams.get('q') ?? '').trim();
  const permission = usePermission();
  // Mục "Duyệt xác minh"/"Xem xác minh" ở menu dòng chỉ có khi được Xem "Duyệt xác minh danh tính".
  const canReview = permission.canView('ekyc');
  const otherFilters = FILTER_KEYS.some((key) => key !== 'ekyc' && applied[key]);
  const [lockTarget, setLockTarget] = useState<UserItem | null>(null);
  const [findAttempts] = useLazyGetUserEkycAttemptsQuery();

  // Chỉ người vay và nhà đầu tư (scope=CUSTOMER); lọc ở backend để kết quả trải trên toàn bộ khách hàng.
  const users = useGetUsersQuery({
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
  });
  const stats = useGetUserStatsQuery();
  // Tổng số lượt chờ (số trong ô chọn "Chờ duyệt tay") và lượt chờ của từng khách cho menu dòng.
  const pending = usePendingAttemptLookup(canReview);
  const customers = users.data?.content ?? [];
  const customerId = openId && /^\d+$/.test(openId) ? Number(openId) : null;

  const openDetail = (customer: UserItem) =>
    navigate({ pathname: `${LIST_PATH}/${customer.id}`, search: location.search }, { state: { customerModal: true } satisfies CustomerModalState });
  const closeDetail = () => {
    if ((location.state as CustomerModalState | null)?.customerModal) navigate(-1);
    else navigate({ pathname: LIST_PATH, search: location.search }, { replace: true });
  };
  // Màn xác minh nhớ danh sách (bộ lọc, trang) để breadcrumb đưa về đúng chỗ.
  const openAttempt = (attemptId: string) =>
    navigate(ekycReviewDetailPath(attemptId), { state: fromListState({ pathname: LIST_PATH, search: location.search }) });

  const actions: CustomerRowActions = {
    openDetail,
    review: canReview ? { attempts: pending.byCustomer, isLoading: pending.isFetching } : null,
    openAttempt,
    viewLatestAttempt: async (customer) => {
      try {
        // Backend trả lượt mới nhất trước; lượt bỏ dở (chưa gửi) không có gì để xem.
        const attempts = await findAttempts(customer.id, true).unwrap();
        const latest = attempts.content.find((item) => item.submittedAt);
        if (latest) openAttempt(latest.attemptId);
        else toast.info('Khách chưa gửi lượt xác minh nào để xem.');
      } catch (error) {
        toast.error(error);
      }
    },
    toggleLock: permission.canAct('customer') ? setLockTarget : null,
  };

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

  const isRefreshing = users.isFetching || stats.isFetching || pending.isFetching;
  const refresh = () => {
    void users.refetch();
    void stats.refetch();
    if (canReview) void pending.refetch();
  };

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Khách hàng</h1>
          <p>Người vay và nhà đầu tư đăng ký trên ứng dụng di động.</p>
        </div>
      </header>

      <section
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
          total={users.data?.totalElements}
          unit="khách hàng"
          title="Lọc khách hàng"
          actions={(
            <button type="button" className="ui-btn ghost" onClick={refresh} disabled={isRefreshing}>
              <Icon name="refresh" />
              {isRefreshing ? 'Đang tải...' : 'Làm mới'}
            </button>
          )}
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

        {users.error ? (
          <ErrorNotice error={users.error} onRetry={users.refetch} />
        ) : users.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách khách hàng...</div>
        ) : customers.length === 0 ? (
          <div className="ui-empty">
            {search
              ? `Không tìm thấy khách hàng khớp "${search}". Số điện thoại và CCCD phải gõ đủ số.`
              : otherFilters ? 'Không có khách hàng phù hợp với bộ lọc.' : EMPTY_TEXT[filter]}
          </div>
        ) : (
          <div className={users.isFetching ? 'ui-busy' : undefined}>
            <CustomerTable customers={customers} actions={actions} />
            <Pager
              page={page}
              size={KYC_LIST_PAGE_SIZE}
              total={users.data?.totalElements ?? 0}
              unit="khách hàng"
              disabled={users.isFetching}
              onPage={(next) => setParam('page', next > 0 ? String(next + 1) : '')}
            />
          </div>
        )}
      </section>

      {customerId != null && <CustomerDetailModal customerId={customerId} onClose={closeDetail} onOpenAttempt={openAttempt} />}
      {lockTarget && <LockUserModal user={lockTarget} onClose={() => setLockTarget(null)} onDone={() => setLockTarget(null)} />}
    </section>
  );
}
