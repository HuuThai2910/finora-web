import { useCallback, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { toast } from '@/lib/toast';
import { usePermission } from '@/features/auth';
import { useActorNames } from '@/features/loan';
import { useBackToList } from '@/lib/navigation';
import {
  useGetFundingProgressQuery,
  useGetMarketListingQuery,
} from '../api/investmentApi';
import { CloseExpiredDialog } from '../components/CloseExpiredDialog';
import { FundingFlow } from '../components/detail/FundingFlow';
import { FundingTimelineCard } from '../components/detail/FundingTimelineCard';
import { InvestorTable } from '../components/detail/InvestorTable';
import { NoteTable } from '../components/detail/NoteTable';
import { ProgressMeter } from '../components/detail/ProgressMeter';
import { TermsCard } from '../components/detail/TermsCard';
import { useFundingActions } from '../hooks/useFundingActions';
import { useListingStage } from '../hooks/useListingStage';
import { stepStatus } from '../mappers/listingDisplay';
import { STAGE_INDEX } from '../stage';
import { HEAD_ACTIONS } from '../styles';

type DetailTab = 'overview' | 'investors' | 'notes';

const LIST_PATH = '/investments/funding';

/**
 * Chi tiết một khoản gọi vốn (`/investments/funding/:listingId`).
 *
 * Trái: thông tin theo tab (tổng quan, nhà đầu tư, Note). Phải: tiến trình năm bước, nút
 * của bước hiện tại nằm ngay dưới bước đó. Chặng suy ra ở client qua `stage.ts` vì backend
 * chỉ trả trạng thái listing; tab đang xem giữ trên URL để quay lại đúng chỗ.
 */
export default function FundingDetailPage() {
  const params = useParams();
  const listingId = Number(params.listingId);
  const validId = Number.isInteger(listingId) && listingId > 0;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  // Về đúng danh sách đã mở trang này (tab, bộ lọc, trang); mở thẳng bằng đường dẫn thì về danh sách trơn.
  const backUrl = useBackToList(LIST_PATH);
  // Kết quả thao tác báo bằng toast dùng chung (`@/lib/toast`).
  const setToast = useCallback((message: string | null) => { if (message) toast.success(message); }, []);
  const [closeOpen, setCloseOpen] = useState(false);

  const listingQuery = useGetMarketListingQuery(listingId, { skip: !validId });
  const listing = listingQuery.data;
  const progress = useGetFundingProgressQuery(listingId, { skip: !validId || !listing || listing.status === 'DRAFT' });
  const { stage, investors, investorsLoaded, investorsLoading, investorsError, refetchInvestors, probeNotes } =
    useListingStage(listing);
  // Tra tên theo đúng mã nhà đầu tư của khoản này (họ tên, không có thì email, chưa tra được thì mã số).
  const { names, displayName } = useActorNames(investors.map((item) => item.investorId));
  // Tham chiếu chỉ đổi khi có tên mới (`displayName` chỉ đọc `names`): biểu đồ vốn góp dựng lại option, kèm hoạt
  // ảnh, mỗi khi hàm này đổi.
  const nameOf = useCallback((investorId: string) => displayName(investorId), [names]);
  const actions = useFundingActions(listing, setToast);
  const { canAct: canActOn, canView } = usePermission();
  const canAct = canActOn('funding');

  if (!validId) {
    return (
      <section className="ui-page">
        <div className="ui-card ui-empty">
          Mã khoản gọi vốn không hợp lệ. <Link className="ui-link" to={backUrl}>Về danh sách gọi vốn</Link>
        </div>
      </section>
    );
  }

  if (listingQuery.error) {
    return (
      <section className="ui-page">
        <ErrorNotice error={listingQuery.error} onRetry={listingQuery.refetch} />
        <Link className="ui-link" to={backUrl}>Về danh sách gọi vốn</Link>
      </section>
    );
  }

  if (!listing || !stage) {
    return (
      <section className="ui-page" aria-busy="true">
        <div className="fd-head-skel grid gap-2">
          <span className="ui-skeleton fd-skel-title w-80 max-w-full h-5.5" />
          <span className="ui-skeleton fd-skel-meta w-55 max-w-full" />
        </div>
        <div className="ui-card ui-empty">Đang tải khoản gọi vốn...</div>
      </section>
    );
  }

  const notesIssued = stage.steps[STAGE_INDEX.NOTES_ISSUED] === 'done';
  const finalized = investors.filter((item) => item.status === 'FINALIZED');
  const tabs: Array<{ id: DetailTab; label: string; count?: number }> = [{ id: 'overview', label: 'Tổng quan' }];
  // Số trên tab bằng số dòng của bảng: bảng nhà đầu tư liệt kê cả phần vốn đã hủy (mờ đi) nên đếm cả chúng.
  if (listing.status !== 'DRAFT') tabs.push({ id: 'investors', label: 'Nhà đầu tư', count: investorsLoaded ? investors.length : undefined });
  if (notesIssued) tabs.push({ id: 'notes', label: 'Phần vốn', count: finalized.reduce((sum, item) => sum + item.noteCount, 0) });
  const requestedTab = searchParams.get('tab');
  const tab: DetailTab = tabs.find((item) => item.id === requestedTab)?.id ?? 'overview';
  const status = stepStatus(listing, stage);

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <div className="fd-title-row flex items-center gap-2.5 flex-wrap">
            <h1>{listing.purpose}</h1>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </div>
          <p>
            <span className="ui-mono">#{listing.loanId}</span>, hạng {listing.creditGrade}
            {listing.creditScore != null ? `, điểm ${listing.creditScore}` : ''}, {listing.region}
          </p>
        </div>
        <div className={`fu-head-actions ${HEAD_ACTIONS}`}>
          {/* Mã hồ sơ công khai (`applicationNumber`) mở đúng trang thẩm định của khoản vay; listing cũ thiếu mã thì ẩn. */}
          {listing.applicationNumber && (canView('loan-application') || canView('collection') || canView('reschedule') || canView('reconciliation')) && (
            <Link className="ui-btn ghost fd-loan-link" to={`/loans/${encodeURIComponent(listing.applicationNumber)}/review`}>
              Hồ sơ vay
            </Link>
          )}
          {/* Note chỉ giao dịch trên chợ thứ cấp sau khi phát hành. */}
          {notesIssued && canView('secondary-market') && (
            <Link className="ui-btn ghost fd-book-link" to={`/investments/secondary?book=${listing.listingId}`}>Sổ lệnh</Link>
          )}
          {/* `loanId` của listing là ID hồ sơ vay bên Loan; proof chỉ có từ khi khoản vay đã có hợp đồng (W3D). */}
          {listing.contractNumber && canView('blockchain') && (
            <Link
              className="ui-btn ghost"
              to={`/blockchain/proofs?referenceType=LOAN_APPLICATION&referenceId=${listing.loanId}`}
            >
              Xác minh dữ liệu
            </Link>
          )}
          <Link className="ui-btn ghost" to={backUrl}>Về danh sách</Link>
        </div>
      </header>

      {/* Trái là thẻ theo tab, phải là tiến trình dọc; dưới 1180px một cột, tiến trình lên đầu. */}
      <div className="fd-layout grid grid-cols-[minmax(0,1fr)_320px] gap-5 [align-items:start] max-[1180px]:grid-cols-[minmax(0,1fr)]">
        <div className="fd-main grid gap-4 min-w-0">
          <div className="ui-line-tabs fd-tabs border-b border-b-line" role="tablist" aria-label="Nội dung khoản gọi vốn">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                className="h-10.5"
                aria-selected={tab === item.id}
                // Giữ `state` để nút "Về danh sách" vẫn nhớ danh sách gốc sau khi đổi tab.
                onClick={() => setSearchParams(item.id === 'overview' ? {} : { tab: item.id }, { replace: true, state: location.state })}
              >
                {item.label}
                {item.count != null && <span className="n">{item.count}</span>}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <>
              {listing.status !== 'DRAFT' && (
                <>
                  <ProgressMeter listing={listing} investors={investors} investorsLoaded={investorsLoaded} progress={progress.data} nameOf={nameOf} />
                  {investorsError ? (
                    <ErrorNotice error={investorsError} onRetry={refetchInvestors} />
                  ) : investorsLoaded ? (
                    <FundingTimelineCard listing={listing} investors={investors} progress={progress.data} nameOf={nameOf} />
                  ) : null}
                </>
              )}
              <TermsCard listing={listing} />
            </>
          )}
          {tab === 'investors' && (
            <InvestorTable
              investors={investors}
              isLoading={investorsLoading}
              error={investorsError}
              onRetry={refetchInvestors}
              nameOf={nameOf}
            />
          )}
          {tab === 'notes' && <NoteTable commitments={finalized} nameOf={nameOf} />}
        </div>

        <FundingFlow
          listing={listing}
          stage={stage}
          investors={investors}
          investorsError={investorsError}
          onRetryInvestors={refetchInvestors}
          progress={progress.data}
          probeNotes={probeNotes}
          busy={actions.busy}
          canAct={canAct}
          canViewProofs={canView('blockchain')}
          errorOf={actions.errorOf}
          onFinalize={() => void actions.finalize()}
          onActivate={() => void actions.activate()}
          onCloseExpired={() => setCloseOpen(true)}
        />
      </div>

      {listingQuery.isFetching && <span className="ui-sr-only" role="status">Đang cập nhật khoản gọi vốn</span>}
      {closeOpen && <CloseExpiredDialog onClose={() => setCloseOpen(false)} onDone={setToast} />}
    </section>
  );
}
