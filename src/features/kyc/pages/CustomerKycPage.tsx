import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
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

  // Lọc ở backend để kết quả trải trên toàn bộ người dùng, không chỉ trang đang tải.
  const users = useGetUsersQuery({ page, size: KYC_LIST_PAGE_SIZE, role: 'ALL', ekycStatus: filter });
  const stats = useGetUserStatsQuery();

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

  const customers = users.data?.content ?? [];
  const isRefreshing = users.isFetching || stats.isFetching;

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Khách hàng eKYC</h1>
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

      <div className="kyc-overview">
        <SignupWeeklyCard />
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
          <div className="ui-tabs" role="tablist" aria-label="Lọc trạng thái eKYC">
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
            <CustomerTable customers={customers} filter={filter} />
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
