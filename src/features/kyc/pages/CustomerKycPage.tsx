import { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { usePermission } from '@/features/auth';
import { PENDING_ATTEMPT_LOOKUP_SIZE, useGetEkycAttemptsQuery } from '@/features/ekyc-review';
import { useGetUserStatsQuery, useGetUsersQuery, type EkycStatusType } from '@/features/user';
import { CustomerTable } from '../components/CustomerTable';
import { EkycOutcomeCard } from '../components/EkycOutcomeCard';
import { SignupWeeklyCard } from '../components/SignupWeeklyCard';
import { KYC_FILTERS, KYC_LIST_PAGE_SIZE, isKycFilter, type KycFilter } from '../constants';
import { ekycDisplay } from '../mappers/customerDisplay';
import './CustomerKycPage.css';

/** Đọc số trang từ URL (tính từ 1 cho dễ đọc), trả về chỉ số từ 0 như backend. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

const EMPTY_TEXT: Record<KycFilter, string> = {
  ALL: 'Chưa có khách hàng nào.',
  MANUAL_REVIEW: 'Không còn hồ sơ nào chờ duyệt tay.',
  VERIFIED: 'Chưa có khách hàng đã xác minh.',
  PENDING: 'Không có khách hàng chờ xác minh.',
  FAILED: 'Không có khách hàng xác minh thất bại.',
};

export default function CustomerKycPage() {
  // Tab trạng thái và trang nằm trên URL để chia sẻ đường dẫn và giữ chỗ khi quay lại từ trang chi tiết.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('ekyc');
  const filter: KycFilter = isKycFilter(requested) ? requested : 'ALL';
  const page = readPage(searchParams.get('page'));
  const listRef = useRef<HTMLElement>(null);
  const permission = usePermission();
  // Biểu đồ đăng ký theo tuần đọc series thống kê, cần quyền Xem "Tổng quan & thống kê".
  const canStats = permission.canView('dashboard');
  // Mục "Duyệt xác minh" ở menu dòng chỉ có khi được Xem "Duyệt xác minh danh tính".
  const canReview = permission.canView('ekyc');

  // Lọc ở backend để kết quả trải trên toàn bộ người dùng, không chỉ trang đang tải.
  const users = useGetUsersQuery({ page, size: KYC_LIST_PAGE_SIZE, role: 'ALL', ekycStatus: filter });
  const stats = useGetUserStatsQuery();
  const customers = users.data?.content ?? [];
  // Lượt chờ duyệt tay chỉ cần tải khi trang bảng đang có khách chờ duyệt tay.
  const hasPendingRow = customers.some((customer) => customer.ekycStatus === 'MANUAL_REVIEW');
  const pending = useGetEkycAttemptsQuery(
    { status: 'MANUAL_REVIEW', page: 0, size: PENDING_ATTEMPT_LOOKUP_SIZE },
    { skip: !canReview || !hasPendingRow },
  );
  // Mã khách → lượt chờ duyệt mới nhất của khách đó (backend sắp lượt gửi sớm trước nên lượt sau ghi đè).
  const pendingAttempts = useMemo(() => {
    const byCustomer = new Map<number, string>();
    for (const attempt of pending.data?.content ?? []) byCustomer.set(attempt.userProfileId, attempt.attemptId);
    return byCustomer;
  }, [pending.data]);

  const updateQuery = (nextFilter: KycFilter, nextPage: number) => {
    const params: Record<string, string> = {};
    if (nextFilter !== 'ALL') params.ekyc = nextFilter;
    if (nextPage > 0) params.page = String(nextPage + 1);
    setSearchParams(params);
  };

  // Số trên tab là tổng toàn hệ thống từ /stats, không phải số dòng của trang đang tải.
  const tabCount = (tab: KycFilter): number | undefined => {
    if (!stats.data) return undefined;
    return tab === 'ALL' ? stats.data.total : stats.data.byEkycStatus[tab] ?? 0;
  };

  const selectFromChart = (status: EkycStatusType) => {
    updateQuery(status, 0);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isRefreshing = users.isFetching || stats.isFetching || pending.isFetching;

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Khách hàng</h1>
        </div>
        <button
          type="button"
          className="ui-btn ghost"
          onClick={() => {
            void users.refetch();
            void stats.refetch();
            if (canReview && hasPendingRow) void pending.refetch();
          }}
          disabled={isRefreshing}
        >
          <Icon name="refresh" />
          {isRefreshing ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <div className={canStats ? 'kyc-overview' : 'kyc-overview single'}>
        {canStats && <SignupWeeklyCard />}
        <EkycOutcomeCard
          stats={stats.data}
          isLoading={stats.isLoading}
          error={stats.error}
          onRetry={stats.refetch}
          onSelect={selectFromChart}
        />
      </div>

      <section ref={listRef} className="ui-card kyc-list" aria-label="Danh sách khách hàng">
        <div className="kyc-list-bar">
          <div className="ui-tabs" role="tablist" aria-label="Lọc trạng thái xác minh">
            {KYC_FILTERS.map((tab) => {
              const count = tabCount(tab);
              return (
                <button key={tab} type="button" role="tab" aria-selected={filter === tab} onClick={() => updateQuery(tab, 0)}>
                  {tab === 'ALL' ? 'Tất cả' : ekycDisplay(tab).label}
                  {count != null && (
                    <span className={tab === 'MANUAL_REVIEW' && count > 0 && filter !== tab ? 'n kyc-hot' : 'n'}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {users.error ? (
          <ErrorNotice error={users.error} onRetry={users.refetch} />
        ) : users.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách khách hàng...</div>
        ) : customers.length === 0 ? (
          <div className="ui-empty">{EMPTY_TEXT[filter]}</div>
        ) : (
          <div className={users.isFetching ? 'ui-busy' : undefined}>
            <CustomerTable
              customers={customers}
              filter={filter}
              review={canReview ? { attempts: pendingAttempts, isLoading: pending.isFetching } : null}
            />
            <Pager
              page={page}
              size={KYC_LIST_PAGE_SIZE}
              total={users.data?.totalElements ?? 0}
              unit="khách hàng"
              disabled={users.isFetching}
              onPage={(next) => updateQuery(filter, next)}
            />
          </div>
        )}
      </section>
    </section>
  );
}
