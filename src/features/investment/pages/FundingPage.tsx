import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { investmentApi } from '@/lib/api/investmentApi';
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
import { toast } from '@/lib/toast';
import { usePermission } from '@/features/auth';
import { LOAN_PURPOSE_CODES } from '@/features/loan/constant';
import { formatBusinessLabel } from '@/features/loan/formatters';
import { OrderIncidentsSection } from '@/features/servicing';
import { useGetMarketListingsQuery, type ListingSort } from '../api/investmentApi';
import { CloseExpiredDialog } from '../components/CloseExpiredDialog';
import { CommitmentTrendCard } from '../components/CommitmentTrendCard';
import { FundingListTable } from '../components/FundingListTable';
import { FundingSettingsModal } from '../components/FundingSettingsModal';
import { FundingSummary } from '../components/FundingSummary';
import { FUNDING_PAGE_SIZE, GRADE_OPTIONS, LISTING_TABS, isListingTab, type ListingTab } from '../constants';
import { useFundingSummary } from '../hooks/useFundingSummary';
import { HEAD_ACTIONS } from '../styles';

const EMPTY_TEXT: Record<ListingTab, string> = {
  ALL: 'Chưa có khoản vay nào trên sàn gọi vốn.',
  DRAFT: 'Không còn bản nháp nào từ luồng cũ. Khoản vay mới tự lên sàn và mở gọi vốn.',
  OPEN: 'Không có khoản nào đang gọi vốn.',
  FULLY_FUNDED: 'Không có khoản nào đã đủ vốn.',
  CLOSED: 'Chưa có khoản nào đóng vì hết hạn.',
  CANCELLED: 'Chưa có khoản nào bị rút khỏi sàn.',
};

const SORT_LABELS: Record<ListingSort, string> = {
  rate: 'Lãi cao trước',
  newest: 'Mới lên sàn trước',
  closing: 'Sắp hết hạn gọi vốn',
  amount: 'Số tiền gọi lớn trước',
};

/**
 * Tham số bộ lọc trên URL. `tab` (trạng thái) và `grade` giữ tên cũ để link sẵn có (Tổng quan dẫn `?tab=DRAFT`) mở
 * đúng; link cũ `?status=`, `?minRate=`, `?maxTerm=` được đổi sang khóa mới khi mở trang.
 */
const FILTER_KEYS = [
  'tab', 'amountMin', 'amountMax', 'fundedMin', 'fundedMax', 'rateMin', 'rateMax', 'termMin', 'termMax', 'grade',
  'scoreMin', 'scoreMax', 'purposeCode', 'closesFrom', 'closesTo', 'openedFrom', 'openedTo',
] as const;

/** Khóa URL cũ → khóa mới. */
const LEGACY_KEYS: Record<string, (typeof FILTER_KEYS)[number]> = { status: 'tab', minRate: 'rateMin', maxTerm: 'termMax' };

const orUndefined = (value: string) => value || undefined;
const percent = (value: string) => `${value.replace('.', ',')}%`;

/** Đọc số trang từ URL (tính từ 1 cho dễ đọc), trả về chỉ số từ 0 như backend. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/**
 * Gọi vốn: tìm khoản vay trên sàn và mở trang chi tiết để thao tác.
 *
 * Khoản vay lên sàn tự động; trang này không đưa lên sàn, không sửa hay gỡ niêm yết. Duyệt, khóa vốn và phát hành Note
 * nằm ở trang chi tiết từng khoản. Thanh lọc dùng chung (ô tìm, bảng lọc, chip) và mọi bộ lọc nằm trên URL.
 */
export function FundingPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const { canView, canAct } = usePermission();
  // Đóng khoản quá hạn là thao tác của "Gọi vốn" (khác quyền "Cấu hình gọi vốn" của hộp Tham số sàn).
  const canCloseExpired = canAct('funding');
  const notify = (message: string) => toast.success(message);
  const filters = useUrlFilters(FILTER_KEYS);
  const { applied, draft } = filters;

  // Link cũ: đổi khóa URL sang bộ lọc mới (thay mục lịch sử, không thêm).
  useEffect(() => {
    const legacy = Object.keys(LEGACY_KEYS).filter((key) => searchParams.has(key));
    if (legacy.length === 0) return;
    const params = new URLSearchParams(searchParams);
    legacy.forEach((key) => {
      const value = params.get(key);
      params.delete(key);
      if (value && !params.has(LEGACY_KEYS[key])) params.set(LEGACY_KEYS[key], value);
    });
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const tab: ListingTab = isListingTab(applied.tab) ? applied.tab : 'ALL';
  const page = readPage(searchParams.get('page'));
  const search = (searchParams.get('q') ?? '').trim();
  const sortParam = searchParams.get('sort');
  const sort: ListingSort = sortParam && sortParam in SORT_LABELS ? (sortParam as ListingSort) : 'rate';
  const grades = splitList(applied.grade);

  const summary = useFundingSummary();
  const list = useGetMarketListingsQuery({
    status: tab,
    q: search || undefined,
    sort: sort === 'rate' ? undefined : sort,
    amountMin: orUndefined(applied.amountMin),
    amountMax: orUndefined(applied.amountMax),
    fundedPercentMin: orUndefined(applied.fundedMin),
    fundedPercentMax: orUndefined(applied.fundedMax),
    rateMin: orUndefined(applied.rateMin),
    rateMax: orUndefined(applied.rateMax),
    termMin: orUndefined(applied.termMin),
    termMax: orUndefined(applied.termMax),
    grades: grades.length > 0 ? grades.join(',') : undefined,
    scoreMin: orUndefined(applied.scoreMin),
    scoreMax: orUndefined(applied.scoreMax),
    purposeCode: orUndefined(applied.purposeCode),
    closesFrom: orUndefined(applied.closesFrom),
    closesTo: orUndefined(applied.closesTo),
    openedFrom: orUndefined(applied.openedFrom),
    openedTo: orUndefined(applied.openedTo),
    page,
    size: FUNDING_PAGE_SIZE,
  });
  const listings = list.data?.content ?? [];
  const counts = summary.summary?.counts;

  const errors = {
    amount: rangeError(draft.amountMin, draft.amountMax),
    funded: rangeError(draft.fundedMin, draft.fundedMax)
      ?? (Number(draft.fundedMin || 0) > 100 || Number(draft.fundedMax || 0) > 100 ? 'Tiến độ nằm trong 0–100%.' : null),
    rate: rangeError(draft.rateMin, draft.rateMax),
    term: rangeError(draft.termMin, draft.termMax),
    score: rangeError(draft.scoreMin, draft.scoreMax),
    closes: rangeError(draft.closesFrom, draft.closesTo, false),
    opened: rangeError(draft.openedFrom, draft.openedTo, false),
  };

  const chips: FilterChip[] = [];
  const rangeChip = (key: string, label: string, min: string, max: string, format: (value: string) => string,
    ...removed: Array<(typeof FILTER_KEYS)[number]>) => {
    if (min || max) chips.push({ key, label: rangeChipLabel(label, min, max, format), onRemove: () => filters.remove(...removed) });
  };
  if (tab !== 'ALL') {
    const label = LISTING_TABS.find((item) => item.value === tab)?.label ?? tab;
    chips.push({ key: 'tab', label: `Trạng thái: ${label}`, onRemove: () => filters.remove('tab') });
  }
  rangeChip('amount', 'Số tiền gọi', applied.amountMin, applied.amountMax, compactMoney, 'amountMin', 'amountMax');
  rangeChip('funded', 'Tiến độ', applied.fundedMin, applied.fundedMax, percent, 'fundedMin', 'fundedMax');
  rangeChip('rate', 'Lãi suất', applied.rateMin, applied.rateMax, percent, 'rateMin', 'rateMax');
  rangeChip('term', 'Kỳ hạn', applied.termMin, applied.termMax, (value) => `${value} tháng`, 'termMin', 'termMax');
  if (grades.length > 0) chips.push({ key: 'grade', label: `Hạng: ${grades.join(', ')}`, onRemove: () => filters.remove('grade') });
  rangeChip('score', 'Điểm', applied.scoreMin, applied.scoreMax, (value) => value, 'scoreMin', 'scoreMax');
  if (applied.purposeCode) chips.push({ key: 'purpose', label: `Mục đích: ${formatBusinessLabel(applied.purposeCode)}`, onRemove: () => filters.remove('purposeCode') });
  rangeChip('closes', 'Hạn gọi vốn', applied.closesFrom, applied.closesTo, shortDate, 'closesFrom', 'closesTo');
  rangeChip('opened', 'Ngày mở', applied.openedFrom, applied.openedTo, shortDate, 'openedFrom', 'openedTo');

  const updateParam = (key: string, value: string, replace = false) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params, { replace });
  };

  // Làm mới bảng lẫn số đếm trong một lần: mọi query danh sách cùng tag `MarketListingList`.
  const refreshAll = () => {
    dispatch(investmentApi.util.invalidateTags([{ type: 'MarketListingList', id: 'ALL' }]));
  };

  // "Chờ duyệt" chỉ còn ý nghĩa với bản nháp của luồng cũ: ẩn khi không có, trừ khi đang lọc đúng trạng thái đó.
  const statusOptions = LISTING_TABS.filter((item) => item.value !== 'ALL'
    && (item.value !== 'DRAFT' || tab === 'DRAFT' || (counts?.DRAFT ?? 0) > 0));

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Gọi vốn</h1>
        </div>
        <div className={`fu-head-actions ${HEAD_ACTIONS}`}>
          <button type="button" className="ui-btn ghost" onClick={refreshAll} disabled={list.isFetching}>
            <Icon name="refresh" />
            {list.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
          {/* Tham số sàn thuộc chức năng "Cấu hình gọi vốn", phân quyền riêng với Gọi vốn. */}
          {canView('funding-settings') && (
            <button type="button" className="ui-btn ghost" onClick={() => setSettingsOpen(true)}>Tham số sàn</button>
          )}
        </div>
      </header>

      <FundingSummary
        summary={summary.summary}
        isLoading={summary.isLoading}
        error={summary.error}
        onRetry={summary.refetch}
        onCloseExpired={canCloseExpired ? () => setCloseOpen(true) : undefined}
      />

      {/* Lệnh góp vốn chưa khớp với ví (quyền Xem "Đối soát & sự cố"); không có lệnh nào thì không chiếm chỗ. */}
      {canView('reconciliation') && <OrderIncidentsSection hideWhenEmpty />}

      {/* Biểu đồ đọc series thống kê, cần quyền Xem "Tổng quan & thống kê". */}
      {canView('dashboard') && <CommitmentTrendCard />}

      <section
        className="ui-card fu-list pt-3.5 px-3.5 pb-3 max-[760px]:px-2.5 max-[760px]:pb-2.5"
        aria-label="Danh sách khoản gọi vốn"
      >
        <FilterBar
          className="mb-3"
          search={{
            value: search,
            onSearch: (next) => updateParam('q', next, true),
            label: 'Tìm khoản gọi vốn',
            placeholder: 'Tìm theo mã hồ sơ hoặc mã hợp đồng',
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
          unit="khoản vay"
          title="Lọc khoản gọi vốn"
          actions={(
            <select
              className="ui-select fu-sort"
              aria-label="Sắp xếp"
              value={sort}
              onChange={(event) => updateParam('sort', event.target.value === 'rate' ? '' : event.target.value)}
            >
              {(Object.keys(SORT_LABELS) as ListingSort[]).map((key) => (
                <option key={key} value={key}>{SORT_LABELS[key]}</option>
              ))}
            </select>
          )}
        >
          <SelectField
            label="Trạng thái đợt gọi vốn"
            value={isListingTab(draft.tab) && draft.tab !== 'ALL' ? draft.tab : ''}
            allLabel={counts ? `Tất cả trạng thái (${counts.ALL})` : 'Tất cả trạng thái'}
            options={statusOptions.map((item) => ({ value: item.value, label: item.label, count: counts?.[item.value] }))}
            onChange={(value) => filters.setDraft({ tab: value })}
          />
          <RangeField
            label="Số tiền gọi vốn"
            kind="money"
            min={draft.amountMin}
            max={draft.amountMax}
            error={errors.amount}
            onChange={(min, max) => filters.setDraft({ amountMin: min, amountMax: max })}
          />
          <RangeField
            label="Tiến độ đã gọi (%)"
            kind="percent"
            decimal
            min={draft.fundedMin}
            max={draft.fundedMax}
            error={errors.funded}
            onChange={(min, max) => filters.setDraft({ fundedMin: min, fundedMax: max })}
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
          <RangeField
            label="Kỳ hạn (tháng)"
            min={draft.termMin}
            max={draft.termMax}
            error={errors.term}
            onChange={(min, max) => filters.setDraft({ termMin: min, termMax: max })}
          />
          <ToggleGroupField
            label="Hạng tín dụng"
            values={splitList(draft.grade)}
            options={GRADE_OPTIONS.map((value) => ({ value, label: value }))}
            onChange={(values) => filters.setDraft({ grade: values.join(',') })}
          />
          <RangeField
            label="Điểm tín dụng"
            min={draft.scoreMin}
            max={draft.scoreMax}
            error={errors.score}
            onChange={(min, max) => filters.setDraft({ scoreMin: min, scoreMax: max })}
          />
          <SelectField
            label="Mục đích vay"
            value={draft.purposeCode}
            allLabel="Tất cả mục đích"
            options={LOAN_PURPOSE_CODES.map((value) => ({ value, label: formatBusinessLabel(value) }))}
            onChange={(value) => filters.setDraft({ purposeCode: value })}
          />
          <DateRangeField
            label="Hạn gọi vốn"
            from={draft.closesFrom}
            to={draft.closesTo}
            error={errors.closes}
            onChange={(from, to) => filters.setDraft({ closesFrom: from, closesTo: to })}
          />
          <DateRangeField
            label="Ngày mở gọi vốn"
            from={draft.openedFrom}
            to={draft.openedTo}
            error={errors.opened}
            onChange={(from, to) => filters.setDraft({ openedFrom: from, openedTo: to })}
          />
        </FilterBar>

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách khoản vay...</div>
        ) : listings.length === 0 ? (
          <div className="ui-empty">
            {search
              ? `Không có khoản vay nào có mã khớp "${search}".`
              : chips.length > (tab !== 'ALL' ? 1 : 0)
                ? 'Không có khoản vay nào khớp bộ lọc. Thử nới điều kiện hoặc xóa lọc.'
                : EMPTY_TEXT[tab]}
          </div>
        ) : (
          <div className={list.isFetching ? 'ui-busy' : undefined}>
            <FundingListTable listings={listings} tab={tab} />
            <Pager
              page={page}
              size={FUNDING_PAGE_SIZE}
              total={list.data?.totalElements ?? 0}
              unit="khoản vay"
              disabled={list.isFetching}
              onPage={(next) => updateParam('page', next > 0 ? String(next + 1) : '')}
            />
          </div>
        )}
      </section>

      {settingsOpen && (
        <FundingSettingsModal
          onClose={() => setSettingsOpen(false)}
          onNotice={notify}
          // Hai hộp thoại không chồng lên nhau (Esc sẽ đóng cả hai): đóng Tham số sàn rồi mới mở hộp xác nhận.
          onCloseExpired={canCloseExpired ? () => { setSettingsOpen(false); setCloseOpen(true); } : undefined}
        />
      )}
      {closeOpen && <CloseExpiredDialog onClose={() => setCloseOpen(false)} onDone={notify} />}
    </section>
  );
}
