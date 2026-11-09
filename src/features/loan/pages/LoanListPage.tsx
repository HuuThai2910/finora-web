import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { loanApi } from '@/lib/api/loanApi';
import { ErrorNotice } from '@/components/ErrorNotice';
import {
  DateRangeField,
  FilterBar,
  RangeField,
  SelectField,
  ToggleGroupField,
  compactMoney,
  rangeChipLabel,
  rangeError,
  shortDate,
  splitList,
  useUrlFilters,
  type FilterChip,
} from '@/components/filters';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { usePermission } from '@/features/auth';
import { useGetAdminProductsQuery } from '@/features/product/api/productApi';
import { useGetAdminApplicationsQuery } from '../api/loanReviewApi';
import { ApplicationTable } from '../components/ApplicationTable';
import { PendingReviewCard } from '../components/PendingReviewCard';
import { SubmittedValueCard } from '../components/SubmittedValueCard';
import {
  APPLICATION_LIST_PAGE_SIZE,
  GRADE_FILTER_OPTIONS,
  LOAN_PURPOSE_CODES,
  SERVICING_FLAG_LABELS,
  isServicingFlag,
} from '../constant';
import { APPLICATION_STATUS_LABELS, formatBusinessLabel } from '../formatters';
import { useActorNames } from '../hooks/useActorNames';
import { useApplicationStatusCounts, useServicingFilterCounts } from '../hooks/useApplicationStatusCounts';
import type { LoanApplicationStatus, ServicingFlag } from '../types';
import { usePendingReviewSummary } from '../hooks/usePendingReviewSummary';

// Hàng đầu: biểu đồ giá trị hồ sơ nộp 30 ngày + thẻ gọn chờ thẩm định (mockup .ln-top); màn dưới 1100px xếp dọc.
// Nhân viên không có quyền Xem thống kê (lớp `single`): chỉ còn thẻ chờ thẩm định, chiếm cả hàng.
const TOP_ROW =
  'loan-top grid grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)] gap-4 *:min-w-0 [&.single]:grid-cols-[minmax(0,1fr)] max-[1100px]:grid-cols-[minmax(0,1fr)]';

/**
 * Tham số bộ lọc trên URL. `status` và `servicing` giữ tên cũ để link sẵn có (Tổng quan, chuông thông báo, chuyển hướng
 * `/loans/overdue`, `/system/incidents`…) vẫn mở đúng bộ lọc.
 */
const FILTER_KEYS = [
  'status', 'servicing', 'submittedFrom', 'submittedTo', 'amountMin', 'amountMax', 'termMin', 'termMax',
  'scoreMin', 'scoreMax', 'grade', 'rateMin', 'rateMax', 'productCode', 'purposeCode',
] as const;

const STATUSES = Object.keys(APPLICATION_STATUS_LABELS) as LoanApplicationStatus[];
const SERVICING_FLAGS: ServicingFlag[] = ['OVERDUE', 'RESCHEDULE_PENDING', 'INCIDENT'];

const isStatus = (value: string): value is LoanApplicationStatus => (STATUSES as string[]).includes(value);
const orUndefined = (value: string) => value || undefined;
const plain = (value: string) => value;

/** Đọc số trang từ URL (tính từ 1 cho dễ đọc), trả về chỉ số từ 0 như backend. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

export default function LoanListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useUrlFilters(FILTER_KEYS);
  const { applied, draft } = filters;
  const page = readPage(searchParams.get('page'));
  const search = (searchParams.get('q') ?? '').trim();
  const { canView } = usePermission();

  const status = isStatus(applied.status) ? applied.status : null;
  const servicing: ServicingFlag | null = isServicingFlag(applied.servicing) ? applied.servicing : null;
  // "Có sự cố" dành cho người xem được "Đối soát & sự cố"; link dẫn thẳng vào thì vẫn hiện lựa chọn đang dùng.
  const servicingOptions = SERVICING_FLAGS.filter((flag) =>
    flag !== 'INCIDENT' || canView('reconciliation') || servicing === 'INCIDENT');
  const grades = splitList(applied.grade);

  const list = useGetAdminApplicationsQuery({
    status: status ?? undefined,
    servicing: servicing ?? undefined,
    q: search || undefined,
    submittedFrom: orUndefined(applied.submittedFrom),
    submittedTo: orUndefined(applied.submittedTo),
    amountMin: orUndefined(applied.amountMin),
    amountMax: orUndefined(applied.amountMax),
    termMin: orUndefined(applied.termMin),
    termMax: orUndefined(applied.termMax),
    scoreMin: orUndefined(applied.scoreMin),
    scoreMax: orUndefined(applied.scoreMax),
    grade: grades.length > 0 ? grades.join(',') : undefined,
    rateMin: orUndefined(applied.rateMin),
    rateMax: orUndefined(applied.rateMax),
    productCode: orUndefined(applied.productCode),
    purposeCode: orUndefined(applied.purposeCode),
    page,
    size: APPLICATION_LIST_PAGE_SIZE,
  });
  const counts = useApplicationStatusCounts();
  const servicingCounts = useServicingFilterCounts(servicingOptions);
  // Danh mục sản phẩm cần quyền Xem "Sản phẩm vay"; thiếu quyền thì bỏ mục lọc sản phẩm.
  const canProducts = canView('loan-product');
  const products = useGetAdminProductsQuery({ page: 0, size: 100 }, { skip: !canProducts });
  const canStats = canView('dashboard');
  const pending = usePendingReviewSummary();
  const applications = list.data?.data ?? [];
  const { displayName, names } = useActorNames(applications.map((item) => item.borrowerId));

  const productName = (code: string) => products.data?.data.find((item) => item.code === code)?.name ?? code;
  const errors = {
    submitted: rangeError(draft.submittedFrom, draft.submittedTo, false),
    amount: rangeError(draft.amountMin, draft.amountMax),
    term: rangeError(draft.termMin, draft.termMax),
    score: rangeError(draft.scoreMin, draft.scoreMax)
      ?? (Number(draft.scoreMax || 0) > 100 || Number(draft.scoreMin || 0) > 100 ? 'Điểm nằm trong 0–100.' : null),
    rate: rangeError(draft.rateMin, draft.rateMax),
  };

  const chips: FilterChip[] = [];
  const rangeChip = (key: string, label: string, min: string, max: string, format: (value: string) => string,
    ...removed: Array<(typeof FILTER_KEYS)[number]>) => {
    if (min || max) chips.push({ key, label: rangeChipLabel(label, min, max, format), onRemove: () => filters.remove(...removed) });
  };
  if (status) chips.push({ key: 'status', label: `Trạng thái: ${APPLICATION_STATUS_LABELS[status]}`, onRemove: () => filters.remove('status') });
  if (servicing) chips.push({ key: 'servicing', label: `Sau giải ngân: ${SERVICING_FLAG_LABELS[servicing].label}`, onRemove: () => filters.remove('servicing') });
  rangeChip('submitted', 'Ngày nộp', applied.submittedFrom, applied.submittedTo, shortDate, 'submittedFrom', 'submittedTo');
  rangeChip('amount', 'Số tiền', applied.amountMin, applied.amountMax, compactMoney, 'amountMin', 'amountMax');
  rangeChip('term', 'Kỳ hạn', applied.termMin, applied.termMax, (value) => `${value} tháng`, 'termMin', 'termMax');
  rangeChip('score', 'Điểm', applied.scoreMin, applied.scoreMax, plain, 'scoreMin', 'scoreMax');
  if (grades.length > 0) chips.push({ key: 'grade', label: `Hạng: ${grades.join(', ')}`, onRemove: () => filters.remove('grade') });
  rangeChip('rate', 'Lãi suất', applied.rateMin, applied.rateMax, (value) => `${value.replace('.', ',')}%`, 'rateMin', 'rateMax');
  if (applied.productCode) chips.push({ key: 'product', label: `Sản phẩm: ${productName(applied.productCode)}`, onRemove: () => filters.remove('productCode') });
  if (applied.purposeCode) chips.push({ key: 'purpose', label: `Mục đích: ${formatBusinessLabel(applied.purposeCode)}`, onRemove: () => filters.remove('purposeCode') });

  const onSearch = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('q', next);
    else params.delete('q');
    params.delete('page');
    // Gõ tìm thay URL thay vì thêm mục lịch sử, để nút Quay lại không phải lùi qua từng lần gõ.
    setSearchParams(params, { replace: true });
  };
  const onPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    if (next > 0) params.set('page', String(next + 1));
    else params.delete('page');
    setSearchParams(params);
  };

  // Làm mới mọi danh sách hồ sơ trên trang (bảng, số đếm, thẻ chờ thẩm định, biểu đồ 30 ngày) trong một lần: series
  // thống kê cũng cung cấp tag danh sách hồ sơ.
  const refreshAll = () => {
    dispatch(loanApi.util.invalidateTags([{ type: 'AdminApplicationList', id: 'LIST' }]));
  };

  const statusCount = (value: LoanApplicationStatus): number | undefined =>
    value === 'PENDING_REVIEW' || value === 'APPROVED' || value === 'REJECTED' ? counts[value] : undefined;

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Quản lý hồ sơ vay</h1>
          <p>Theo dõi hồ sơ từ lúc nộp đến khi có quyết định và các việc sau giải ngân; lọc theo trạng thái, số tiền, điểm và hơn thế.</p>
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
        <FilterBar
          className="mb-3"
          search={{ value: search, onSearch, label: 'Tìm hồ sơ vay', placeholder: 'Tìm theo mã hồ sơ hoặc mã hợp đồng' }}
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
          unit="hồ sơ"
          title="Lọc hồ sơ vay"
        >
          <SelectField
            label="Trạng thái hồ sơ"
            value={isStatus(draft.status) ? draft.status : ''}
            allLabel="Tất cả trạng thái"
            options={STATUSES.map((value) => ({ value, label: APPLICATION_STATUS_LABELS[value], count: statusCount(value) }))}
            onChange={(value) => filters.setDraft({ status: value })}
          />
          <SelectField
            label="Sau giải ngân"
            value={isServicingFlag(draft.servicing) ? draft.servicing : ''}
            allLabel="Tất cả"
            options={servicingOptions.map((value) => ({
              value, label: SERVICING_FLAG_LABELS[value].label, count: servicingCounts[value],
            }))}
            onChange={(value) => filters.setDraft({ servicing: value })}
          />
          <DateRangeField
            label="Ngày nộp hồ sơ"
            from={draft.submittedFrom}
            to={draft.submittedTo}
            error={errors.submitted}
            onChange={(from, to) => filters.setDraft({ submittedFrom: from, submittedTo: to })}
          />
          <RangeField
            label="Số tiền vay"
            kind="money"
            min={draft.amountMin}
            max={draft.amountMax}
            error={errors.amount}
            onChange={(min, max) => filters.setDraft({ amountMin: min, amountMax: max })}
          />
          <RangeField
            label="Kỳ hạn (tháng)"
            min={draft.termMin}
            max={draft.termMax}
            error={errors.term}
            onChange={(min, max) => filters.setDraft({ termMin: min, termMax: max })}
          />
          <RangeField
            label="Điểm đánh giá (0–100)"
            decimal
            min={draft.scoreMin}
            max={draft.scoreMax}
            error={errors.score}
            onChange={(min, max) => filters.setDraft({ scoreMin: min, scoreMax: max })}
          />
          <ToggleGroupField
            label="Hạng tín dụng"
            values={splitList(draft.grade)}
            options={GRADE_FILTER_OPTIONS.map((value) => ({ value, label: value }))}
            onChange={(values) => filters.setDraft({ grade: values.join(',') })}
          />
          <RangeField
            label="Lãi suất (%/năm)"
            kind="percent"
            decimal
            min={draft.rateMin}
            max={draft.rateMax}
            error={errors.rate}
            onChange={(min, max) => filters.setDraft({ rateMin: min, rateMax: max })}
          />
          {canProducts && (
            <SelectField
              label="Sản phẩm vay"
              value={draft.productCode}
              allLabel="Tất cả sản phẩm"
              options={(products.data?.data ?? []).map((item) => ({ value: item.code, label: item.name }))}
              onChange={(value) => filters.setDraft({ productCode: value })}
            />
          )}
          <SelectField
            label="Mục đích vay"
            value={draft.purposeCode}
            allLabel="Tất cả mục đích"
            options={LOAN_PURPOSE_CODES.map((value) => ({ value, label: formatBusinessLabel(value) }))}
            onChange={(value) => filters.setDraft({ purposeCode: value })}
          />
        </FilterBar>

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách hồ sơ...</div>
        ) : applications.length === 0 ? (
          <div className="ui-empty">
            {search
              ? `Không tìm thấy hồ sơ khớp "${search}".`
              : chips.length > 0 ? 'Không có hồ sơ phù hợp với bộ lọc.' : 'Chưa có hồ sơ vay.'}
          </div>
        ) : (
          <div className={list.isFetching ? 'ui-busy' : undefined}>
            <ApplicationTable
              applications={applications}
              // Màu điểm chỉ giúp xếp ưu tiên khi thẩm định; ở bộ lọc khác điểm chỉ để tra cứu nên giữ màu chữ thường.
              toneScores={status === 'PENDING_REVIEW'}
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
              onPage={onPage}
            />
          </div>
        )}
      </section>
    </section>
  );
}
