import { useState } from 'react';
import { toUiApiError } from '@/lib/api/errors';
import {
  useActivateNotesMutation,
  useApproveListingMutation,
  useFinalizeCommitmentsMutation,
  useGetFundingSettingsQuery,
  useGetMarketListingsQuery,
} from '../api/investmentApi';
import { useStageCounts } from '../hooks/useStageCounts';
import { DEFAULT_FUNDING_DAYS } from '../constant';
import type { ApproveListingRequest, MarketListing } from '../types';
import { formatMoney } from '../formatters';
import { ApproveListingModal } from './ApproveListingModal';
import { EMPTY_FILTERS, FundingFilters, isFilterActive, type ListingFilters } from './FundingFilters';
import { FundingPipeline, type StageFilter } from './FundingPipeline';
import { FundingSettingsModal } from './FundingSettingsModal';
import { FundingTable, FundingTableSkeleton } from './FundingTable';
import { ListingDetailModal } from './ListingDetailModal';
import './css/FundingPage.css';

const PAGE_SIZE = 20;

type Notice = { tone: 'ok' | 'error'; text: string };

/**
 * Bàn điều phối gọi vốn của quản trị viên.
 *
 * Khoản vay lên sàn tự động: worker bên Investment Service quét các khoản đã duyệt ở
 * finora-loan theo chu kỳ và tự tạo niêm yết ở chặng chờ duyệt. Trang này không có nút
 * đưa lên sàn, cũng không sửa hay gỡ được niêm yết — dữ liệu thuộc về khoản vay, sửa ở
 * đây sẽ lệch khỏi hợp đồng gốc.
 *
 * Ba việc quản trị làm được: duyệt (chốt mệnh giá Note), khóa vốn và phát hành Note cho
 * khoản đã đủ vốn. Cả ba gọi được từ menu thao tác trên dòng lẫn từ màn chi tiết.
 */
export function FundingPage() {
  const [page, setPage] = useState(0);
  const [stage, setStage] = useState<StageFilter>('ALL');
  // `filters` là thứ đang gõ trên form, `applied` là thứ đã gửi lên API. Tách đôi để gõ
  // giữa chừng không bắn request mỗi ký tự, và để nút Xóa lọc biết có gì đang áp dụng.
  const [filters, setFilters] = useState<ListingFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<ListingFilters>(EMPTY_FILTERS);
  const [viewing, setViewing] = useState<MarketListing | null>(null);
  const [approving, setApproving] = useState<MarketListing | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyListingId, setBusyListingId] = useState<number | null>(null);

  const counts = useStageCounts();
  const settings = useGetFundingSettingsQuery();
  const { data, isLoading, isError, isFetching, refetch } = useGetMarketListingsQuery({
    status: stage,
    // Chuỗi rỗng phải thành undefined, nếu không RTK Query gửi `grade=` lên và backend
    // hiểu thành lọc theo hạng rỗng — không khoản nào khớp.
    grade: applied.grade || undefined,
    // Người dùng gõ phần trăm (12), backend lưu tỷ lệ (0.12) — quy đổi ngay tại biên
    // gọi API để mọi chỗ khác trong trang chỉ làm việc với con số người dùng nhìn thấy.
    minRate: applied.minRate ? (Number(applied.minRate) / 100).toFixed(4) : undefined,
    maxTermMonths: applied.maxTermMonths ? Number(applied.maxTermMonths) : undefined,
    page,
    size: PAGE_SIZE,
  });
  const [approveListing, approveState] = useApproveListingMutation();
  const [finalizeCommitments] = useFinalizeCommitmentsMutation();
  const [activateNotes] = useActivateNotesMutation();

  const listings = data?.content ?? [];
  const isFiltered = isFilterActive(applied);
  const totalPages = Math.max(data?.totalPages ?? 1, 1);

  // Modal chi tiết luôn nhìn bản mới nhất trong cache (tiến độ đổi sau mỗi lần tải lại).
  // Khoản rời khỏi trang vì đổi trạng thái thì giữ bản chụp cuối, để modal không biến mất
  // giữa lúc quản trị đang đọc.
  const viewingListing = viewing
    ? listings.find((item) => item.listingId === viewing.listingId) ?? viewing
    : null;

  // Lọc lại phải về trang đầu: giữ nguyên trang 3 khi kết quả mới chỉ có 1 trang sẽ
  // hiện bảng rỗng dù dữ liệu vẫn có.
  const selectStage = (next: StageFilter) => {
    setStage(next);
    setPage(0);
  };

  const handleSearch = () => {
    setApplied(filters);
    setPage(0);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(0);
  };

  const handleApprove = async (request: ApproveListingRequest) => {
    if (!approving) return;
    const loanId = approving.loanId;
    try {
      await approveListing({ listingId: approving.listingId, body: request }).unwrap();
      // Đóng cả modal chi tiết: bản chụp trong đó vẫn là "chờ duyệt", để mở tiếp sẽ hiện
      // sai chặng cho tới khi danh sách tải lại.
      setApproving(null);
      setViewing(null);
      setNotice({ tone: 'ok', text: `Đã duyệt khoản vay #${loanId} lên sàn. Nhà đầu tư có thể đặt lệnh từ bây giờ.` });
    } catch {
      // Giữ modal mở để không mất lựa chọn mệnh giá; lỗi hiện ngay trong modal.
    }
  };

  const handleFinalize = async (listing: MarketListing) => {
    setBusyListingId(listing.listingId);
    setNotice(null);
    try {
      const result = await finalizeCommitments(listing.listingId).unwrap();
      setNotice({
        tone: 'ok',
        text:
          result.finalizedCount === 0
            ? `Mọi phần vốn của khoản vay #${listing.loanId} đã được khóa từ trước.`
            : `Đã khóa ${result.finalizedCount} phần vốn của khoản vay #${listing.loanId}. Bước tiếp: phát hành Notes.`,
      });
    } catch (error) {
      setNotice({ tone: 'error', text: toUiApiError(error).message });
    } finally {
      setBusyListingId(null);
    }
  };

  const handleActivateNotes = async (listing: MarketListing) => {
    setBusyListingId(listing.listingId);
    setNotice(null);
    try {
      const result = await activateNotes(listing.listingId).unwrap();
      setNotice({
        tone: 'ok',
        text:
          result.issuedNoteCount === 0
            ? `Notes của khoản vay #${listing.loanId} đã được phát hành trước đó, không tạo thêm.`
            : `Đã phát hành ${result.issuedNoteCount} Note cho khoản vay #${listing.loanId}.`,
      });
    } catch (error) {
      setNotice({ tone: 'error', text: toUiApiError(error).message });
    } finally {
      setBusyListingId(null);
    }
  };

  const openApprove = (listing: MarketListing) => {
    setNotice(null);
    setApproving(listing);
  };

  const openDetail = (listing: MarketListing) => {
    setNotice(null);
    setViewing(listing);
  };

  return (
    <div className="inv-page">
      <header className="inv-header">
        <div>
          <h1 className="inv-title">Gọi vốn &amp; Notes</h1>
          <p className="inv-lead">
            Khoản vay đã ký hợp đồng tự về <strong>Chờ duyệt</strong>. Chốt mệnh giá Note để
            mở gọi vốn; khi đủ vốn thì khóa vốn rồi phát hành Note cho nhà đầu tư.
          </p>
        </div>
        <div className="inv-header-actions">
          {settings.data && (
            <span className="inv-settings-chip" title="Tham số áp dụng cho khoản lên sàn từ giờ">
              Mệnh giá {formatMoney(settings.data.noteDenomination)} đ
              <span className="inv-dot" aria-hidden="true" />
              {settings.data.fundingDays} ngày
            </span>
          )}
          <button type="button" className="inv-btn inv-btn-ghost" onClick={() => setSettingsOpen(true)}>
            Tham số sàn
          </button>
          <button type="button" className="inv-btn inv-btn-ghost" disabled={isFetching} onClick={() => refetch()}>
            {isFetching ? 'Đang tải…' : 'Tải lại'}
          </button>
        </div>
      </header>

      <FundingPipeline counts={counts} active={stage} onSelect={selectStage} />

      <FundingFilters
        filters={filters}
        isFiltered={isFiltered}
        onChange={setFilters}
        onSubmit={handleSearch}
        onReset={handleResetFilters}
      />

      {notice && (
        <div
          className={notice.tone === 'ok' ? 'inv-notice' : 'inv-error inv-error-row'}
          role={notice.tone === 'ok' ? 'status' : 'alert'}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            className="inv-notice-close"
            aria-label="Đóng thông báo"
            onClick={() => setNotice(null)}
          >
            &times;
          </button>
        </div>
      )}

      {isLoading && <FundingTableSkeleton />}

      {isError && (
        <div className="inv-error" role="alert">
          Không tải được sàn gọi vốn.{' '}
          <button type="button" className="inv-link" onClick={() => refetch()}>Thử lại</button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Mờ nhẹ khi đang tải lại: bảng vẫn đọc được, người dùng biết số đang cập nhật
              mà không bị nháy sang trạng thái trống. */}
          <div className={isFetching ? 'inv-refreshing' : undefined}>
            <FundingTable
              listings={listings}
              isFiltered={isFiltered}
              activeStage={stage}
              busyListingId={busyListingId}
              onViewDetail={openDetail}
              onApprove={openApprove}
              onFinalize={handleFinalize}
              onActivateNotes={handleActivateNotes}
            />
          </div>

          {listings.length > 0 && (
            <div className="inv-pager">
              <span className="inv-muted">
                Trang {page + 1} / {totalPages}
                <span className="inv-dot" aria-hidden="true" />
                {data?.totalElements ?? 0} khoản
              </span>
              <div className="inv-actions">
                <button
                  type="button"
                  className="inv-btn sm inv-btn-ghost"
                  disabled={page === 0 || isFetching}
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                >
                  Trang trước
                </button>
                <button
                  type="button"
                  className="inv-btn sm inv-btn-ghost"
                  disabled={(data?.last ?? true) || isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {viewingListing && (
        <ListingDetailModal
          listing={viewingListing}
          onClose={() => setViewing(null)}
          onApprove={openApprove}
        />
      )}

      {approving && (
        <ApproveListingModal
          listing={approving}
          submitting={approveState.isLoading}
          errorMessage={approveState.error ? toUiApiError(approveState.error).message : null}
          defaultFundingDays={settings.data?.fundingDays ?? DEFAULT_FUNDING_DAYS}
          onClose={() => setApproving(null)}
          onSubmit={handleApprove}
        />
      )}

      {settingsOpen && (
        <FundingSettingsModal
          onClose={() => setSettingsOpen(false)}
          onNotice={(text) => setNotice({ tone: 'ok', text })}
        />
      )}
    </div>
  );
}
