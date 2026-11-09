import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { investmentApi } from '@/lib/api/investmentApi';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { SearchBox } from '@/components/SearchBox';
import { toast } from '@/lib/toast';
import { usePermission } from '@/features/auth';
import { OrderIncidentsSection } from '@/features/servicing';
import { useGetMarketListingsQuery, type ListingSort } from '../api/investmentApi';
import { CloseExpiredDialog } from '../components/CloseExpiredDialog';
import { CommitmentTrendCard } from '../components/CommitmentTrendCard';
import { FundingListFilters, isFilterActive, type ListingFilters } from '../components/FundingListFilters';
import { FundingListTable } from '../components/FundingListTable';
import { FundingSettingsModal } from '../components/FundingSettingsModal';
import { FundingSummary } from '../components/FundingSummary';
import { FUNDING_PAGE_SIZE, LISTING_TABS, isListingTab, type ListingTab } from '../constants';
import { useFundingSummary } from '../hooks/useFundingSummary';
import { HEAD_ACTIONS } from '../styles';

/** Số đếm của tab "Chờ duyệt" khi có khoản chờ: màu cam đậm, thành chữ trắng khi tab đang chọn. */
const HOT_COUNT = 'fu-hot text-warning font-bold opacity-100 in-aria-selected:text-white';

const EMPTY_TEXT: Record<ListingTab, string> = {
  ALL: 'Chưa có khoản vay nào trên sàn gọi vốn.',
  DRAFT: 'Không còn bản nháp nào từ luồng cũ. Khoản vay mới tự lên sàn và mở gọi vốn.',
  OPEN: 'Không có khoản nào đang gọi vốn.',
  FULLY_FUNDED: 'Không có khoản nào đã đủ vốn.',
  CLOSED: 'Chưa có khoản nào đóng vì hết hạn.',
  CANCELLED: 'Chưa có khoản nào bị rút khỏi sàn.',
};

/** Đọc số trang từ URL (tính từ 1 cho dễ đọc), trả về chỉ số từ 0 như backend. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/**
 * Gọi vốn & Notes: tìm khoản vay trên sàn và mở trang chi tiết để thao tác.
 *
 * Khoản vay lên sàn tự động ở chặng chờ duyệt; trang này không đưa lên sàn, không sửa hay
 * gỡ niêm yết. Duyệt, khóa vốn và phát hành Note nằm ở trang chi tiết từng khoản, nơi biết
 * chắc khoản đang ở bước nào. Tab, trang và bộ lọc nằm trên URL để quay lại đúng chỗ.
 */
const SORT_LABELS: Record<ListingSort, string> = {
  rate: 'Lãi cao trước',
  newest: 'Mới lên sàn trước',
  closing: 'Sắp hết hạn gọi vốn',
  amount: 'Số tiền gọi lớn trước',
};

export function FundingPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const { canView, canAct } = usePermission();
  // Đóng khoản quá hạn là thao tác của "Gọi vốn & Notes" (khác quyền "Cấu hình gọi vốn" của hộp Tham số sàn).
  const canCloseExpired = canAct('funding');
  const notify = (message: string) => toast.success(message);

  const requestedTab = searchParams.get('tab');
  const tab: ListingTab = isListingTab(requestedTab) ? requestedTab : 'ALL';
  const page = readPage(searchParams.get('page'));
  const filters: ListingFilters = {
    grade: searchParams.get('grade') ?? '',
    minRate: searchParams.get('minRate') ?? '',
    maxTermMonths: searchParams.get('maxTerm') ?? '',
  };
  // Tìm theo mã hồ sơ/hợp đồng và kiểu sắp xếp: backend xử lý (`q`, `sort` của /market/listings).
  const search = (searchParams.get('q') ?? '').trim();
  const sortParam = searchParams.get('sort');
  const sort: ListingSort = sortParam && sortParam in SORT_LABELS ? (sortParam as ListingSort) : 'rate';

  const summary = useFundingSummary();
  const list = useGetMarketListingsQuery({
    status: tab,
    // Chuỗi rỗng phải thành undefined, nếu không backend hiểu thành lọc theo hạng rỗng.
    grade: filters.grade || undefined,
    // Người dùng gõ phần trăm (12) và backend cũng so theo điểm phần trăm/năm, nên gửi nguyên số đã gõ.
    minRate: filters.minRate || undefined,
    maxTermMonths: filters.maxTermMonths ? Number(filters.maxTermMonths) : undefined,
    q: search || undefined,
    sort: sort === 'rate' ? undefined : sort,
    page,
    size: FUNDING_PAGE_SIZE,
  });
  const listings = list.data?.content ?? [];

  // Đổi tab hoặc bộ lọc thì về trang đầu: giữ trang 3 khi kết quả chỉ còn 1 trang sẽ ra bảng rỗng.
  const updateQuery = (next: { tab?: ListingTab; page?: number; filters?: ListingFilters; q?: string; sort?: ListingSort }) => {
    const nextTab = next.tab ?? tab;
    const nextFilters = next.filters ?? filters;
    const nextSearch = next.q ?? search;
    const nextSort = next.sort ?? sort;
    const params: Record<string, string> = {};
    if (nextSearch) params.q = nextSearch;
    if (nextSort !== 'rate') params.sort = nextSort;
    if (nextTab !== 'ALL') params.tab = nextTab;
    if ((next.page ?? 0) > 0) params.page = String((next.page ?? 0) + 1);
    if (nextFilters.grade) params.grade = nextFilters.grade;
    if (nextFilters.minRate) params.minRate = nextFilters.minRate;
    if (nextFilters.maxTermMonths) params.maxTerm = nextFilters.maxTermMonths;
    // Gõ tìm thay mục lịch sử hiện tại để nút Quay lại không phải lùi qua từng lần gõ.
    setSearchParams(params, { replace: next.q !== undefined && next.q !== search });
  };

  // Làm mới bảng lẫn số đếm trong một lần: mọi query danh sách cùng tag `MarketListingList`.
  const refreshAll = () => {
    dispatch(investmentApi.util.invalidateTags([{ type: 'MarketListingList', id: 'ALL' }]));
  };

  const counts = summary.summary?.counts;
  const filtered = isFilterActive(filters);
  // Tab "Chờ duyệt" chỉ còn ý nghĩa với bản nháp của luồng cũ: ẩn khi không có, trừ khi URL đang mở đúng tab đó.
  const tabs = LISTING_TABS.filter((item) => item.value !== 'DRAFT' || tab === 'DRAFT' || (counts?.DRAFT ?? 0) > 0);

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Gọi vốn &amp; chuyển nhượng</h1>
        </div>
        <div className={`fu-head-actions ${HEAD_ACTIONS}`}>
          <button type="button" className="ui-btn ghost" onClick={refreshAll} disabled={list.isFetching}>
            <Icon name="refresh" />
            {list.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
          {/* Tham số sàn thuộc chức năng "Cấu hình gọi vốn", phân quyền riêng với Gọi vốn & Notes. */}
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
        <div className="fu-list-bar flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="ui-tabs" role="tablist" aria-label="Lọc theo trạng thái">
            {tabs.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                onClick={() => updateQuery({ tab: item.value })}
              >
                {item.label}
                {counts && (
                  <span className={`n${item.value === 'DRAFT' && counts.DRAFT > 0 ? ` ${HOT_COUNT}` : ''}`}>{counts[item.value]}</span>
                )}
              </button>
            ))}
          </div>
          <FundingListFilters
            key={searchParams.toString()}
            applied={filters}
            onApply={(next) => updateQuery({ filters: next })}
          />
        </div>
        <div className="fu-search-bar mb-3 flex flex-wrap items-center gap-2">
          <SearchBox
            className="fu-search w-70 max-[760px]:w-full"
            value={search}
            onSearch={(next) => updateQuery({ q: next })}
            label="Tìm khoản gọi vốn"
            placeholder="Tìm theo mã hồ sơ hoặc mã hợp đồng"
          />
          <label className="flex items-center gap-2 text-[13px] text-secondary max-[760px]:w-full">
            Sắp xếp
            <select
              className="ui-select fu-sort max-[760px]:flex-1"
              value={sort}
              onChange={(event) => updateQuery({ sort: event.target.value as ListingSort })}
            >
              {(Object.keys(SORT_LABELS) as ListingSort[]).map((key) => (
                <option key={key} value={key}>{SORT_LABELS[key]}</option>
              ))}
            </select>
          </label>
        </div>

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách khoản vay...</div>
        ) : listings.length === 0 ? (
          <div className="ui-empty">
            {search
              ? `Không có khoản vay nào có mã khớp "${search}".`
              : filtered ? 'Không có khoản vay nào khớp bộ lọc. Thử nới điều kiện hoặc xóa lọc.' : EMPTY_TEXT[tab]}
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
              onPage={(next) => updateQuery({ page: next })}
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
