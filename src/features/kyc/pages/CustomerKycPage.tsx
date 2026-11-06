import { useRef } from 'react';
import { SearchBox } from '@/components/SearchBox';
import { useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
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

export default function CustomerKycPage() {
  // Tab trạng thái và trang nằm trên URL để chia sẻ đường dẫn và giữ chỗ khi quay lại từ trang chi tiết.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('ekyc');
  const filter: KycFilter = isKycFilter(requested) ? requested : 'ALL';
  const page = readPage(searchParams.get('page'));
  const search = (searchParams.get('q') ?? '').trim();
  const listRef = useRef<HTMLElement>(null);
  const permission = usePermission();
  // Biểu đồ đăng ký theo tuần đọc series thống kê, cần quyền Xem "Tổng quan & thống kê".
  const canStats = permission.canView('dashboard');
  // Hàng chờ theo lượt và mục "Duyệt xác minh" ở menu dòng chỉ có khi được Xem "Duyệt xác minh danh tính".
  const canReview = permission.canView('ekyc');
  // Tab "Chờ duyệt tay" là hàng chờ theo LƯỢT (việc cần làm), không phải danh sách khách; thiếu quyền duyệt thì vẫn
  // là danh sách khách có trạng thái đó.
  // Đang tìm thì luôn là danh sách khách (hàng chờ theo lượt không tìm theo khách được).
  const showQueue = filter === 'MANUAL_REVIEW' && canReview && !search;

  // Lọc ở backend để kết quả trải trên toàn bộ người dùng, không chỉ trang đang tải.
  const users = useGetUsersQuery(
    { page, size: KYC_LIST_PAGE_SIZE, role: 'ALL', ekycStatus: filter, q: search || undefined },
    { skip: showQueue },
  );
  const queue = useGetEkycAttemptsQuery(
    { status: 'MANUAL_REVIEW', page, size: KYC_LIST_PAGE_SIZE },
    { skip: !showQueue },
  );
  const stats = useGetUserStatsQuery();
  // Tổng số lượt chờ (số trên tab) và lượt của từng khách cho menu dòng.
  const pending = usePendingAttemptLookup(canReview);
  const customers = users.data?.content ?? [];

  const updateQuery = (nextFilter: KycFilter, nextPage: number, nextSearch = search) => {
    const params: Record<string, string> = {};
    if (nextFilter !== 'ALL') params.ekyc = nextFilter;
    if (nextSearch) params.q = nextSearch;
    if (nextPage > 0) params.page = String(nextPage + 1);
    // Gõ tìm thay URL thay vì thêm mục lịch sử, để nút Quay lại không phải lùi qua từng lần gõ.
    setSearchParams(params, { replace: nextSearch !== search });
  };


  // Số trên tab là tổng toàn hệ thống (/stats; tab chờ duyệt là tổng số lượt), không phải số dòng của trang đang tải.
  const tabCount = (tab: KycFilter): number | undefined => {
    if (tab === 'MANUAL_REVIEW' && canReview) return pending.total;
    if (!stats.data) return undefined;
    return tab === 'ALL' ? stats.data.total : stats.data.byEkycStatus[tab] ?? 0;
  };

  const selectFromChart = (status: EkycStatusType) => {
    updateQuery(status, 0);
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
        <div className="kyc-list-bar mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="ui-tabs" role="tablist" aria-label="Lọc trạng thái xác minh">
            {KYC_FILTERS.map((tab) => {
              const count = tabCount(tab);
              return (
                <button key={tab} type="button" role="tab" aria-selected={filter === tab} onClick={() => updateQuery(tab, 0)}>
                  {tab === 'ALL' ? 'Tất cả' : ekycDisplay(tab).label}
                  {/* Có hồ sơ chờ duyệt tay: số đếm in đậm màu cảnh báo để không bị bỏ sót. */}
                  {count != null && (
                    <span
                      className={tab === 'MANUAL_REVIEW' && count > 0 && filter !== tab
                        ? 'n kyc-hot text-warning font-bold opacity-100'
                        : 'n'}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <SearchBox
            className="kyc-search w-75 max-[760px]:w-full"
            value={search}
            onSearch={(next) => updateQuery(filter, 0, next)}
            label="Tìm khách hàng"
            placeholder="Tìm tên, email, SĐT hoặc CCCD"
          />
        </div>

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
                : EMPTY_TEXT[filter]}
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
              onPage={(next) => updateQuery(filter, next)}
            />
          </div>
        )}
      </section>
    </section>
  );
}
