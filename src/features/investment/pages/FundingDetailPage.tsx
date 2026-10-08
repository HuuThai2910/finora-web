import { useCallback, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { Toast } from '@/components/Toast';
import {
  useGetFundingProgressQuery,
  useGetFundingSettingsQuery,
  useGetMarketListingQuery,
} from '../api/investmentApi';
import { FundingFlow } from '../components/detail/FundingFlow';
import { FundingTimelineCard } from '../components/detail/FundingTimelineCard';
import { InvestorTable } from '../components/detail/InvestorTable';
import { NoteTable } from '../components/detail/NoteTable';
import { ProgressMeter } from '../components/detail/ProgressMeter';
import { TermsCard } from '../components/detail/TermsCard';
import { DEFAULT_FUNDING_DAYS } from '../constants';
import { useFundingActions } from '../hooks/useFundingActions';
import { useInvestorNames } from '../hooks/useInvestorNames';
import { useListingStage } from '../hooks/useListingStage';
import { stepStatus } from '../mappers/listingDisplay';
import { STAGE_INDEX } from '../stage';
// Ô nhập và dòng lỗi (`fu-input`, `fu-err`) dùng chung với trang danh sách.
import './FundingPage.css';
import './FundingDetailPage.css';

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
  const [toast, setToast] = useState<string | null>(null);

  const listingQuery = useGetMarketListingQuery(listingId, { skip: !validId });
  const listing = listingQuery.data;
  const progress = useGetFundingProgressQuery(listingId, { skip: !validId || !listing || listing.status === 'DRAFT' });
  const settings = useGetFundingSettingsQuery(undefined, { skip: listing?.status !== 'DRAFT' });
  const { stage, investors, investorsLoaded, investorsLoading, investorsError, refetchInvestors, probeNotes } =
    useListingStage(listing);
  const { names, isLoading: namesLoading } = useInvestorNames(investors.map((item) => item.investorId));
  const nameOf = useCallback((investorId: string) => names[investorId] ?? 'Không tra được tên', [names]);
  const actions = useFundingActions(listing, setToast);
  // Tham chiếu ổn định: Toast đặt lại hẹn giờ mỗi khi `onDismiss` đổi.
  const dismissToast = useCallback(() => setToast(null), []);

  if (!validId) {
    return (
      <section className="ui-page">
        <div className="ui-card ui-empty">
          Mã khoản gọi vốn không hợp lệ. <Link className="ui-link" to={LIST_PATH}>Về danh sách gọi vốn</Link>
        </div>
      </section>
    );
  }

  if (listingQuery.error) {
    return (
      <section className="ui-page">
        <ErrorNotice error={listingQuery.error} onRetry={listingQuery.refetch} />
        <Link className="ui-link" to={LIST_PATH}>Về danh sách gọi vốn</Link>
      </section>
    );
  }

  if (!listing || !stage) {
    return (
      <section className="ui-page" aria-busy="true">
        <div className="fd-head-skel"><span className="ui-skeleton fd-skel-title" /><span className="ui-skeleton fd-skel-meta" /></div>
        <div className="ui-card ui-empty">Đang tải khoản gọi vốn...</div>
      </section>
    );
  }

  const notesIssued = stage.steps[STAGE_INDEX.NOTES_ISSUED] === 'done';
  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const finalized = investors.filter((item) => item.status === 'FINALIZED');
  const tabs: Array<{ id: DetailTab; label: string; count?: number }> = [{ id: 'overview', label: 'Tổng quan' }];
  if (listing.status !== 'DRAFT') tabs.push({ id: 'investors', label: 'Nhà đầu tư', count: investorsLoaded ? live.length : undefined });
  if (notesIssued) tabs.push({ id: 'notes', label: 'Note', count: finalized.reduce((sum, item) => sum + item.noteCount, 0) });
  const requestedTab = searchParams.get('tab');
  const tab: DetailTab = tabs.find((item) => item.id === requestedTab)?.id ?? 'overview';
  const status = stepStatus(listing, stage);

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <div className="fd-title-row">
            <h1>{listing.purpose}</h1>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </div>
          <p>
            <span className="ui-mono">#{listing.loanId}</span>, hạng {listing.creditGrade}
            {listing.creditScore != null ? `, điểm ${listing.creditScore}` : ''}, {listing.region}
          </p>
        </div>
        <Link className="ui-btn ghost" to={LIST_PATH}>Về danh sách</Link>
      </header>

      <div className="fd-layout">
        <div className="fd-main">
          <div className="ui-line-tabs fd-tabs" role="tablist" aria-label="Nội dung khoản gọi vốn">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setSearchParams(item.id === 'overview' ? {} : { tab: item.id }, { replace: true })}
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
              names={names}
              namesLoading={namesLoading}
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
          defaultFundingDays={settings.data?.fundingDays ?? DEFAULT_FUNDING_DAYS}
          busy={actions.busy}
          errorOf={actions.errorOf}
          onApprove={(request) => void actions.approve(request)}
          onFinalize={() => void actions.finalize()}
          onActivate={() => void actions.activate()}
          onCloseExpired={() => void actions.closeExpired()}
        />
      </div>

      {listingQuery.isFetching && <span className="ui-sr-only" role="status">Đang cập nhật khoản gọi vốn</span>}
      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </section>
  );
}
