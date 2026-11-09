import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { loanApi } from '@/lib/api/loanApi';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon, type IconName } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { SearchBox } from '@/components/SearchBox';
import { usePermission } from '@/features/auth';
import { useGetAdminApplicationsQuery } from '../api/loanReviewApi';
import { ApplicationTable } from '../components/ApplicationTable';
import { PendingReviewCard } from '../components/PendingReviewCard';
import { SubmittedValueCard } from '../components/SubmittedValueCard';
import {
  APPLICATION_LIST_PAGE_SIZE,
  HIDDEN_FILTER_LABELS,
  isApplicationFilter,
  isHiddenApplicationFilter,
  isServicingFlag,
  SERVICING_FLAG_LABELS,
  type ApplicationFilter,
  type ApplicationListFilter,
} from '../constant';
import { useActorNames } from '../hooks/useActorNames';
import { useApplicationStatusCounts, useServicingFilterCounts } from '../hooks/useApplicationStatusCounts';
import type { ServicingFlag } from '../types';
import { usePendingReviewSummary } from '../hooks/usePendingReviewSummary';

// Hàng đầu: biểu đồ giá trị hồ sơ nộp 30 ngày + thẻ gọn chờ thẩm định (mockup .ln-top); màn dưới 1100px xếp dọc.
// Nhân viên không có quyền Xem thống kê (lớp `single`): chỉ còn thẻ chờ thẩm định, chiếm cả hàng.
const TOP_ROW =
  'loan-top grid grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)] gap-4 *:min-w-0 [&.single]:grid-cols-[minmax(0,1fr)] max-[1100px]:grid-cols-[minmax(0,1fr)]';

const FILTERS: Array<{ value: ApplicationFilter; label: string; icon: IconName }> = [
  { value: 'ALL', label: 'Tất cả', icon: 'list' },
  { value: 'PENDING_REVIEW', label: 'Chờ thẩm định', icon: 'clock' },
  { value: 'APPROVED', label: 'Đã duyệt', icon: 'checkCircle' },
  { value: 'REJECTED', label: 'Đã từ chối', icon: 'xCircle' },
];

/**
 * Tab lọc theo việc sau giải ngân (thay cho trang Vận hành khoản vay cũ): khoản vay đang quá hạn, có yêu cầu cơ cấu chờ
 * thẩm định, có sự cố đối soát/giải ngân. Tab "Có sự cố" dành cho người xem được "Đối soát & sự cố".
 */
const SERVICING_FILTERS: Array<{ value: ServicingFlag; icon: IconName }> = [
  { value: 'OVERDUE', icon: 'clock' },
  { value: 'RESCHEDULE_PENDING', icon: 'calendar' },
  { value: 'INCIDENT', icon: 'alert' },
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
  const requestedServicing = searchParams.get('servicing');
  // Lọc theo việc sau giải ngân thay cho lọc trạng thái hồ sơ (hai nhóm tab loại trừ nhau).
  const servicing: ServicingFlag | null = isServicingFlag(requestedServicing) ? requestedServicing : null;
  // Bộ lọc ẩn (vd. chờ chấm lại điểm) không có tab: không tab nào được chọn, thay bằng dòng "Đang lọc".
  const hiddenFilter = !servicing && isHiddenApplicationFilter(requested) ? requested : null;
  const filter: ApplicationListFilter = hiddenFilter ?? (!servicing && isApplicationFilter(requested) ? requested : 'ALL');
  const page = readPage(searchParams.get('page'));
  const search = (searchParams.get('q') ?? '').trim();
  const { canView } = usePermission();
  const servicingTabs = SERVICING_FILTERS.filter((item) =>
    item.value !== 'INCIDENT' || canView('reconciliation') || servicing === 'INCIDENT');

  const list = useGetAdminApplicationsQuery({
    status: filter === 'ALL' ? undefined : filter,
    servicing: servicing ?? undefined,
    q: search || undefined,
    page,
    size: APPLICATION_LIST_PAGE_SIZE,
  });
  const counts = useApplicationStatusCounts();
  const servicingCounts = useServicingFilterCounts(servicingTabs.map((item) => item.value));
  const canStats = canView('dashboard');
  const pending = usePendingReviewSummary();
  const applications = list.data?.data ?? [];
  const { displayName, names } = useActorNames(applications.map((item) => item.borrowerId));

  // Đổi tab hay từ khóa đều về trang đầu; từ khóa giữ nguyên khi đổi tab để lọc tiếp trong trạng thái mới.
  const updateQuery = (
    nextFilter: ApplicationListFilter,
    nextPage: number,
    nextSearch: string = search,
    nextServicing: ServicingFlag | null = null,
  ) => {
    const params: Record<string, string> = {};
    if (nextServicing) params.servicing = nextServicing;
    else if (nextFilter !== 'ALL') params.status = nextFilter;
    if (nextSearch) params.q = nextSearch;
    if (nextPage > 0) params.page = String(nextPage + 1);
    setSearchParams(params, { replace: nextSearch !== search });
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

      <div className={canStats ? TOP_ROW : `${TOP_ROW} single`}>
        {/* Biểu đồ giá trị hồ sơ đọc series thống kê, cần quyền Xem "Tổng quan & thống kê". */}
        {canStats && <SubmittedValueCard />}
        <PendingReviewCard
          summary={pending.summary}
          isLoading={pending.isLoading}
          error={pending.error}
          onRetry={pending.refetch}
        />
      </div>

      <section
        className="ui-card loan-list pt-3.5 px-3.5 pb-3 max-[760px]:px-2.5 max-[760px]:pb-2.5"
        aria-label="Danh sách hồ sơ vay"
      >
        <div className="loan-list-bar flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="ui-tabs" role="tablist" aria-label="Lọc trạng thái hồ sơ">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={!servicing && filter === item.value}
                onClick={() => updateQuery(item.value, 0)}
              >
                <Icon name={item.icon} />
                {item.label}
                {counts[item.value] != null && <span className="n">{counts[item.value]}</span>}
              </button>
            ))}
            {servicingTabs.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={servicing === item.value}
                onClick={() => updateQuery('ALL', 0, search, item.value)}
              >
                <Icon name={item.icon} />
                {SERVICING_FLAG_LABELS[item.value].label}
                {servicingCounts[item.value] != null && <span className="n">{servicingCounts[item.value]}</span>}
              </button>
            ))}
          </div>
          <SearchBox
            className="loan-search w-72 max-[760px]:w-full"
            value={search}
            onSearch={(next) => updateQuery(filter, 0, next, servicing)}
            label="Tìm hồ sơ vay"
            placeholder="Tìm theo mã hồ sơ hoặc mã hợp đồng"
          />
          {hiddenFilter ? (
            <div className="loan-filter-note flex items-center gap-2 flex-wrap text-secondary text-[13px]" role="status">
              <span>Đang lọc: <b className="text-primary font-semibold">{HIDDEN_FILTER_LABELS[hiddenFilter]}</b></span>
              <button type="button" className="ui-btn soft" onClick={() => updateQuery('ALL', 0)}>Bỏ lọc</button>
            </div>
          ) : null}
        </div>

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách hồ sơ...</div>
        ) : applications.length === 0 ? (
          <div className="ui-empty">
            {search
              ? `Không tìm thấy hồ sơ khớp "${search}".`
              : servicing ? `Không có khoản vay ${SERVICING_FLAG_LABELS[servicing].label.toLowerCase()}.` : 'Không có hồ sơ ở trạng thái này.'}
          </div>
        ) : (
          <div className={list.isFetching ? 'ui-busy' : undefined}>
            <ApplicationTable
              applications={applications}
              // Màu điểm chỉ giúp xếp ưu tiên khi thẩm định; ở các tab khác điểm chỉ để tra cứu nên giữ màu chữ thường.
              toneScores={filter === 'PENDING_REVIEW'}
              // Đang lọc theo việc sau giải ngân thì mở thẳng tab "Sau giải ngân" của hồ sơ.
              openTab={servicing ? 'servicing' : undefined}
              displayName={displayName}
              isVerified={(borrowerId) => names[borrowerId]?.ekycVerified === true}
            />
            <Pager
              page={page}
              size={APPLICATION_LIST_PAGE_SIZE}
              total={list.data?.totalElements ?? 0}
              unit="hồ sơ"
              disabled={list.isFetching}
              onPage={(next) => updateQuery(filter, next, search, servicing)}
            />
          </div>
        )}
      </section>
    </section>
  );
}
