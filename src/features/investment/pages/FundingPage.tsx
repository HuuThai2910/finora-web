import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { investmentApi } from '@/lib/api/investmentApi';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { Toast } from '@/components/Toast';
import { useGetMarketListingsQuery } from '../api/investmentApi';
import { CommitmentTrendCard } from '../components/CommitmentTrendCard';
import { FundingListFilters, isFilterActive, type ListingFilters } from '../components/FundingListFilters';
import { FundingListTable } from '../components/FundingListTable';
import { FundingSettingsModal } from '../components/FundingSettingsModal';
import { FundingSummary } from '../components/FundingSummary';
import { FUNDING_PAGE_SIZE, LISTING_TABS, isListingTab, type ListingTab } from '../constants';
import { useFundingSummary } from '../hooks/useFundingSummary';
import './FundingPage.css';

const EMPTY_TEXT: Record<ListingTab, string> = {
  ALL: 'Chưa có khoản vay nào trên sàn gọi vốn.',
  DRAFT: 'Không có khoản nào chờ duyệt. Khoản vay vừa ký hợp đồng sẽ tự về đây.',
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
export function FundingPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Tham chiếu ổn định: Toast đặt lại hẹn giờ mỗi khi `onDismiss` đổi.
  const dismissToast = useCallback(() => setToast(null), []);

  const requestedTab = searchParams.get('tab');
  const tab: ListingTab = isListingTab(requestedTab) ? requestedTab : 'ALL';
  const page = readPage(searchParams.get('page'));
  const filters: ListingFilters = {
    grade: searchParams.get('grade') ?? '',
    minRate: searchParams.get('minRate') ?? '',
    maxTermMonths: searchParams.get('maxTerm') ?? '',
  };

  const summary = useFundingSummary();
  const list = useGetMarketListingsQuery({
    status: tab,
    // Chuỗi rỗng phải thành undefined, nếu không backend hiểu thành lọc theo hạng rỗng.
    grade: filters.grade || undefined,
    // Người dùng gõ phần trăm (12), backend lưu tỷ lệ (0.12): quy đổi ngay tại biên gọi API.
    minRate: filters.minRate ? (Number(filters.minRate) / 100).toFixed(4) : undefined,
    maxTermMonths: filters.maxTermMonths ? Number(filters.maxTermMonths) : undefined,
    page,
    size: FUNDING_PAGE_SIZE,
  });
  const listings = list.data?.content ?? [];

  // Đổi tab hoặc bộ lọc thì về trang đầu: giữ trang 3 khi kết quả chỉ còn 1 trang sẽ ra bảng rỗng.
  const updateQuery = (next: { tab?: ListingTab; page?: number; filters?: ListingFilters }) => {
    const nextTab = next.tab ?? tab;
    const nextFilters = next.filters ?? filters;
    const params: Record<string, string> = {};
    if (nextTab !== 'ALL') params.tab = nextTab;
    if ((next.page ?? 0) > 0) params.page = String((next.page ?? 0) + 1);
    if (nextFilters.grade) params.grade = nextFilters.grade;
    if (nextFilters.minRate) params.minRate = nextFilters.minRate;
    if (nextFilters.maxTermMonths) params.maxTerm = nextFilters.maxTermMonths;
    setSearchParams(params);
  };

  // Làm mới bảng lẫn số đếm trong một lần: mọi query danh sách cùng tag `MarketListingList`.
  const refreshAll = () => {
    dispatch(investmentApi.util.invalidateTags([{ type: 'MarketListingList', id: 'ALL' }]));
  };

  const counts = summary.summary?.counts;
  const filtered = isFilterActive(filters);

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Gọi vốn &amp; Notes</h1>
        </div>
        <div className="fu-head-actions">
          <button type="button" className="ui-btn ghost" onClick={refreshAll} disabled={list.isFetching}>
            <Icon name="refresh" />
            {list.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button type="button" className="ui-btn ghost" onClick={() => setSettingsOpen(true)}>Tham số sàn</button>
        </div>
      </header>

      <FundingSummary summary={summary.summary} isLoading={summary.isLoading} error={summary.error} onRetry={summary.refetch} />

      <CommitmentTrendCard />

      <section className="ui-card fu-list" aria-label="Danh sách khoản gọi vốn">
        <div className="fu-list-bar">
          <div className="ui-tabs" role="tablist" aria-label="Lọc theo trạng thái">
            {LISTING_TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                onClick={() => updateQuery({ tab: item.value })}
              >
                {item.label}
                {counts && (
                  <span className={`n${item.value === 'DRAFT' && counts.DRAFT > 0 ? ' fu-hot' : ''}`}>{counts[item.value]}</span>
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

        {list.error ? (
          <ErrorNotice error={list.error} onRetry={list.refetch} />
        ) : list.isLoading ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh sách khoản vay...</div>
        ) : listings.length === 0 ? (
          <div className="ui-empty">
            {filtered ? 'Không có khoản vay nào khớp bộ lọc. Thử nới điều kiện hoặc xóa lọc.' : EMPTY_TEXT[tab]}
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

      {settingsOpen && <FundingSettingsModal onClose={() => setSettingsOpen(false)} onNotice={setToast} />}
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </section>
  );
}
