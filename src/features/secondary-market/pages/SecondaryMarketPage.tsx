import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import {
  FilterBar,
  RangeField,
  SelectField,
  ToggleGroupField,
  rangeChipLabel,
  rangeError,
  splitList,
  useUrlFilters,
  type FilterChip,
} from '@/components/filters';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { investmentApi } from '@/lib/api/investmentApi';
import { useGetAdminOrderBooksQuery } from '../api/orderBookApi';
import { BookListTable } from '../components/BookListTable';
import {
  BOOK_SORT_OPTIONS,
  BOOK_STATES,
  BOOK_STATE_META,
  GRADE_OPTIONS,
  MARKET_PAGE_SIZE,
  isBookState,
} from '../constant';
import type { BookSort } from '../types';

/** Tham số bộ lọc trên URL; rỗng là không lọc. Ô tìm (`q`) và trang (`page`) nằm riêng. */
const FILTER_KEYS = ['state', 'grade', 'rateMin', 'rateMax', 'sort'] as const;

const orUndefined = (value: string) => value || undefined;
const percent = (value: string) => `${value.replace('.', ',')}%`;
const isSort = (value: string): value is Exclude<BookSort, 'RECENT'> =>
  BOOK_SORT_OPTIONS.some((option) => option.value === value);

/** Số trang trên URL tính từ 1 cho dễ đọc; giá trị lạ coi như trang đầu. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/**
 * Chợ chuyển nhượng: sổ lệnh của từng khoản vay còn phần vốn lưu hành; mở một khoản để xem lệnh chờ, các lần khớp và
 * phần vốn. Trang chỉ đọc. Lọc, sắp xếp và phân trang ở server; ô tìm, bộ lọc và trang nằm trên URL để quay lại đúng chỗ.
 */
export function SecondaryMarketPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useUrlFilters(FILTER_KEYS);
  const { applied, draft } = filters;
  const page = readPage(searchParams.get('page'));
  const search = (searchParams.get('q') ?? '').trim();
  const grades = splitList(applied.grade);
  const state = isBookState(applied.state) ? applied.state : undefined;

  const list = useGetAdminOrderBooksQuery({
    q: search || undefined,
    state,
    grades: grades.length > 0 ? grades.join(',') : undefined,
    rateMin: orUndefined(applied.rateMin),
    rateMax: orUndefined(applied.rateMax),
    sort: isSort(applied.sort) ? applied.sort : undefined,
    page,
    size: MARKET_PAGE_SIZE,
  });
  const books = list.data?.content ?? [];
  const rateRangeError = rangeError(draft.rateMin, draft.rateMax);

  const chips: FilterChip[] = [];
  if (state) chips.push({ key: 'state', label: `Trạng thái: ${BOOK_STATE_META[state].label}`, onRemove: () => filters.remove('state') });
  if (grades.length > 0) chips.push({ key: 'grade', label: `Hạng: ${grades.join(', ')}`, onRemove: () => filters.remove('grade') });
  if (applied.rateMin || applied.rateMax) {
    chips.push({
      key: 'rate',
      label: rangeChipLabel('Lãi suất', applied.rateMin, applied.rateMax, percent),
      onRemove: () => filters.remove('rateMin', 'rateMax'),
    });
  }
  const sortLabel = BOOK_SORT_OPTIONS.find((option) => option.value === applied.sort)?.label;
  if (sortLabel) chips.push({ key: 'sort', label: `Sắp xếp: ${sortLabel.toLocaleLowerCase('vi-VN')}`, onRemove: () => filters.remove('sort') });
  const filtered = Boolean(search) || chips.some((chip) => chip.key !== 'sort');

  const updateParam = (key: string, value: string, replace = false) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params, { replace });
  };

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Chợ chuyển nhượng</h1>
          <p>Sổ lệnh của từng khoản vay; mở một khoản để xem các lần khớp, thanh toán và giấy xác nhận.</p>
        </div>
      </header>

      <section className="ui-card pt-3.5 px-3.5 pb-3 max-[760px]:px-2.5 max-[760px]:pb-2.5" aria-label="Sổ lệnh">
        <FilterBar
          className="mb-3"
          search={{
            value: search,
            onSearch: (next) => updateParam('q', next, true),
            label: 'Tìm sổ lệnh',
            placeholder: 'Tìm mã hồ sơ, mã hợp đồng, người vay',
          }}
          activeCount={chips.length}
          chips={chips}
          onOpen={filters.resetDraft}
          onApply={() => {
            if (rateRangeError) return false;
            filters.applyDraft();
            return true;
          }}
          onClearAll={filters.clearAll}
          title="Lọc sổ lệnh"
          actions={(
            <button
              type="button"
              className="ui-btn ghost"
              onClick={() => dispatch(investmentApi.util.invalidateTags(['OrderBooks']))}
              disabled={list.isFetching}
            >
              <Icon name="refresh" />
              {list.isFetching ? 'Đang tải...' : 'Làm mới'}
            </button>
          )}
        >
          <SelectField
            label="Trạng thái"
            value={isBookState(draft.state) ? draft.state : ''}
            allLabel="Tất cả trạng thái"
            options={BOOK_STATES.map((value) => ({ value, label: BOOK_STATE_META[value].label }))}
            onChange={(value) => filters.setDraft({ state: value })}
          />
          <ToggleGroupField
            label="Hạng tín dụng"
            values={splitList(draft.grade)}
            options={GRADE_OPTIONS.map((value) => ({ value, label: value }))}
            onChange={(values) => filters.setDraft({ grade: values.join(',') })}
          />
          <RangeField
            label="Lãi suất (%/năm)"
            kind="percent"
            decimal
            min={draft.rateMin}
            max={draft.rateMax}
            error={rateRangeError}
            onChange={(min, max) => filters.setDraft({ rateMin: min, rateMax: max })}
          />
          <SelectField
            label="Sắp xếp"
            value={isSort(draft.sort) ? draft.sort : ''}
            allLabel="Khớp gần nhất trước"
            options={[...BOOK_SORT_OPTIONS]}
            onChange={(value) => filters.setDraft({ sort: value })}
          />
        </FilterBar>

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải sổ lệnh...</div>
        ) : books.length === 0 ? (
          <div className="ui-empty">
            {filtered
              ? 'Không có khoản vay nào khớp. Thử nới điều kiện hoặc xóa lọc.'
              : 'Chưa có khoản vay nào có phần vốn đang lưu hành.'}
          </div>
        ) : (
          <div className={list.isFetching ? 'ui-busy' : undefined}>
            <BookListTable books={books} />
            <Pager
              page={page}
              size={MARKET_PAGE_SIZE}
              total={list.data?.totalElements ?? 0}
              unit="khoản vay"
              disabled={list.isFetching}
              onPage={(next) => updateParam('page', next > 0 ? String(next + 1) : '')}
            />
          </div>
        )}
      </section>
    </section>
  );
}
