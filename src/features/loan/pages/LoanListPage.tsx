import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { loanApi } from '@/lib/api/loanApi';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon, type IconName } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { useGetAdminApplicationsQuery } from '../api/loanReviewApi';
import { ApplicationTable } from '../components/ApplicationTable';
import { PendingReviewCard } from '../components/PendingReviewCard';
import { SubmittedValueCard } from '../components/SubmittedValueCard';
import { APPLICATION_LIST_PAGE_SIZE, isApplicationFilter, type ApplicationFilter } from '../constant';
import { useActorNames } from '../hooks/useActorNames';
import { useApplicationStatusCounts } from '../hooks/useApplicationStatusCounts';
import { usePendingReviewSummary } from '../hooks/usePendingReviewSummary';
import './LoanListPage.css';

const FILTERS: Array<{ value: ApplicationFilter; label: string; icon: IconName }> = [
  { value: 'ALL', label: 'Tất cả', icon: 'list' },
  { value: 'PENDING_REVIEW', label: 'Chờ thẩm định', icon: 'clock' },
  { value: 'APPROVED', label: 'Đã duyệt', icon: 'checkCircle' },
  { value: 'REJECTED', label: 'Đã từ chối', icon: 'xCircle' },
];

/** Đọc số trang từ URL (tính từ 1 cho dễ đọc), trả về chỉ số từ 0 như backend. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

export default function LoanListPage() {
  const dispatch = useDispatch<AppDispatch>();
  // Tab và trang nằm trên URL để chia sẻ đường dẫn hoặc quay lại đúng chỗ đang xem.
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('status');
  const filter: ApplicationFilter = isApplicationFilter(requested) ? requested : 'ALL';
  const page = readPage(searchParams.get('page'));

  const list = useGetAdminApplicationsQuery({
    status: filter === 'ALL' ? undefined : filter,
    page,
    size: APPLICATION_LIST_PAGE_SIZE,
  });
  const counts = useApplicationStatusCounts();
  const pending = usePendingReviewSummary();
  const applications = list.data?.data ?? [];
  const { displayName, names } = useActorNames(applications.map((item) => item.borrowerId));

  const updateQuery = (nextFilter: ApplicationFilter, nextPage: number) => {
    const params: Record<string, string> = {};
    if (nextFilter !== 'ALL') params.status = nextFilter;
    if (nextPage > 0) params.page = String(nextPage + 1);
    setSearchParams(params);
  };

  // Làm mới mọi danh sách hồ sơ trên trang (bảng, số đếm tab, thẻ chờ thẩm định, biểu đồ 30 ngày) trong
  // một lần: series thống kê cũng cung cấp tag danh sách hồ sơ.
  const refreshAll = () => {
    dispatch(loanApi.util.invalidateTags([{ type: 'AdminApplicationList', id: 'LIST' }]));
  };

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Quản lý hồ sơ vay</h1>
          <p>Theo dõi hồ sơ từ lúc nộp đến khi có quyết định; hồ sơ chờ thẩm định nằm ở tab riêng.</p>
        </div>
        <button type="button" className="ui-btn ghost" onClick={refreshAll} disabled={list.isFetching}>
          <Icon name="refresh" />
          {list.isFetching ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      <div className="loan-top">
        <SubmittedValueCard />
        <PendingReviewCard
          summary={pending.summary}
          isLoading={pending.isLoading}
          error={pending.error}
          onRetry={pending.refetch}
        />
      </div>

      <section className="ui-card loan-list" aria-label="Danh sách hồ sơ vay">
        <div className="loan-list-bar">
          <div className="ui-tabs" role="tablist" aria-label="Lọc trạng thái hồ sơ">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                onClick={() => updateQuery(item.value, 0)}
              >
                <Icon name={item.icon} />
                {item.label}
                {counts[item.value] != null && <span className="n">{counts[item.value]}</span>}
              </button>
            ))}
          </div>
        </div>

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách hồ sơ...</div>
        ) : applications.length === 0 ? (
          <div className="ui-empty">Không có hồ sơ ở trạng thái này.</div>
        ) : (
          <div className={list.isFetching ? 'ui-busy' : undefined}>
            <ApplicationTable
              applications={applications}
              displayName={displayName}
              isVerified={(borrowerId) => names[borrowerId]?.ekycVerified === true}
            />
            <Pager
              page={page}
              size={APPLICATION_LIST_PAGE_SIZE}
              total={list.data?.totalElements ?? 0}
              unit="hồ sơ"
              disabled={list.isFetching}
              onPage={(next) => updateQuery(filter, next)}
            />
          </div>
        )}
      </section>
    </section>
  );
}
