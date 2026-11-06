import { useCallback } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { toast } from '@/lib/toast';
import { usePermission } from '@/features/auth';
import { toUiApiError } from '@/lib/api/errors';
import { useBackToList } from '@/lib/navigation';
import { useGetReviewDetailQuery } from '../api/loanReviewApi';
import { DecisionTray } from '../components/review/DecisionTray';
import { HistoryTab } from '../components/review/HistoryTab';
import { ReviewHeader } from '../components/review/ReviewHeader';
import { ReviewOverviewTab } from '../components/review/ReviewOverviewTab';
import {
  approveBlockedReason,
  isReviewTab,
  REVIEW_TABS,
  scoringRetryBlockedReason,
  type ReviewTabId,
} from '../mappers/reviewDisplay';
import { ScoreSlip } from '../components/review/ScoreSlip';
import { ScoringDetailTab } from '../components/review/ScoringDetailTab';
import { useAssessmentExplanation } from '../hooks/useAssessmentExplanation';
import { useReviewDecision } from '../hooks/useReviewDecision';
import { useActorNames } from '../hooks/useActorNames';

// Hai cột: tờ trình theo tab bên trái, phiếu kết luận 320px bên phải; dưới 1180px còn một cột.
const DOSSIER = 'lr-dossier grid grid-cols-[minmax(0,1fr)_320px] gap-5 [align-items:start] max-[1180px]:grid-cols-[minmax(0,1fr)]';

const TAB =
  'inline-flex items-center h-9.5 px-3 -mb-px border-b-2 border-b-transparent text-secondary text-[14px] font-medium whitespace-nowrap hover:text-primary aria-selected:text-brand aria-selected:border-b-brand aria-selected:font-semibold';

function BackLink() {
  // Về đúng tab, trang của danh sách đã mở hồ sơ này (state do danh sách truyền khi mở chi tiết).
  const to = useBackToList('/loans');
  return <Link className="ui-link lr-back [justify-self:start]" to={to}>Về danh sách hồ sơ vay</Link>;
}

/**
 * Chi tiết một hồ sơ vay (`/loans/:applicationNumber/review`): tờ trình theo tab bên trái, phiếu
 * kết quả chấm điểm và khay quyết định luôn trong tầm tay bên phải.
 *
 * Trang chỉ điều phối: dữ liệu từ `GET /admin/loan-applications/{number}/review`, giải thích AI tải
 * ngay với hồ sơ chờ thẩm định (cần điểm CIC để quyết định), hồ sơ khác tải khi mở tab chấm điểm; thao tác
 * duyệt/từ chối/chấm lại nằm trong `useReviewDecision`.
 */
export default function LoanReviewPage() {
  const { applicationNumber = '' } = useParams<{ applicationNumber: string }>();
  // Chuyển sang hồ sơ khác (bộ chuyển hàng chờ) thì dựng lại từ đầu: thông báo, lỗi, form từ chối
  // và khóa idempotency của hồ sơ trước không được mang sang.
  return <LoanReviewView key={applicationNumber} applicationNumber={applicationNumber} />;
}

function LoanReviewView({ applicationNumber }: { applicationNumber: string }) {
  // Tab nằm trên URL để gửi đường dẫn đúng phần đang xem.
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const requestedTab = searchParams.get('tab');
  const tab: ReviewTabId = isReviewTab(requestedTab) ? requestedTab : 'review';

  const detail = useGetReviewDetailQuery(applicationNumber, { skip: !applicationNumber });
  const application = detail.data;
  // Hồ sơ chờ thẩm định cần điểm CIC, số lần tra cứu ngay ở tab Thẩm định nên tải giải thích luôn.
  const needExplanation = tab === 'model' || application?.status === 'PENDING_REVIEW';
  const explanation = useAssessmentExplanation(applicationNumber, application?.assessment ?? null, needExplanation);
  const decision = useReviewDecision(application);
  const permission = usePermission();
  // Duyệt, từ chối và yêu cầu chấm lại cần quyền Thao tác "Hồ sơ vay"; chỉ có quyền Xem thì trang chỉ đọc.
  const canAct = permission.canAct('loan-application');
  // Kết quả thao tác báo bằng toast dùng chung (`@/lib/toast`).
  const setCopyMessage = useCallback((message: string | null) => { if (message) toast.success(message); }, []);

  const adminIds = application?.recentHistory.filter((item) => item.actorType === 'ADMIN').map((item) => item.actorId) ?? [];
  const { displayName } = useActorNames([application?.borrowerId, application?.adminDecidedBy, ...adminIds]);

  const selectTab = (next: ReviewTabId) => {
    // Giữ `state` (URL danh sách đã mở hồ sơ) để breadcrumb và nút quay lại vẫn về đúng chỗ sau khi đổi tab.
    setSearchParams(next === 'review' ? {} : { tab: next }, { replace: true, state: location.state });
  };

  if (!applicationNumber) {
    return <section className="ui-page"><div className="ui-alert" role="alert">Thiếu mã hồ sơ.</div></section>;
  }
  if (detail.isLoading) {
    return (
      <section className="ui-page">
        <div className="ui-card ui-empty" aria-busy="true">Đang tải hồ sơ...</div>
      </section>
    );
  }
  if (detail.error || !application) {
    const notFound = toUiApiError(detail.error).status === 404;
    return (
      <section className="ui-page lr-page">
        {notFound ? (
          <div className="ui-alert" role="alert">Không tìm thấy hồ sơ {applicationNumber}.</div>
        ) : (
          <ErrorNotice error={detail.error} onRetry={detail.refetch} />
        )}
        <BackLink />
      </section>
    );
  }

  const assessmentStatus = application.assessment?.status;
  // Từ chối chỉ cần hồ sơ đang chờ thẩm định (backend nhận cả khi lần chấm gần nhất lỗi); duyệt cần lần chấm thành công.
  const canReject = application.status === 'PENDING_REVIEW';
  // Nút chấm lại hiện khi lần chấm gần nhất lỗi hoặc đang chờ thử lại, nhưng chỉ bật ở trạng thái Loan nhận yêu cầu.
  const showRetry = canAct && (assessmentStatus === 'FAILED' || assessmentStatus === 'RETRY_PENDING');
  const retryBlockedReason = scoringRetryBlockedReason(application);

  return (
    <section className="ui-page lr-page">
      <ReviewHeader
        application={application}
        borrowerName={displayName(application.borrowerId)}
        canViewCustomer={permission.canView('customer')}
        canViewProofs={permission.canView('blockchain')}
        onCopied={setCopyMessage}
      />

      <div className={detail.isFetching ? `${DOSSIER} ui-busy` : DOSSIER}>
        {/* Màn hẹp: thứ tự 0, giữa phần điểm (-1) và khay quyết định (2). */}
        <div className="lr-main grid gap-4 min-w-0 max-[1180px]:order-0">
          <div
            className="lr-tabs flex gap-1 overflow-x-auto overflow-y-hidden border-b border-b-line"
            role="tablist"
            aria-label="Nội dung hồ sơ vay"
          >
            {REVIEW_TABS.map((item) => (
              <button key={item.id} type="button" role="tab" className={TAB} aria-selected={tab === item.id} onClick={() => selectTab(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="lr-tab-body grid gap-4 min-w-0">
            {tab === 'review' ? (
              <ReviewOverviewTab
                application={application}
                explanation={explanation.data}
                explanationLoading={explanation.isLoading}
                onOpenScoring={() => selectTab('model')}
              />
            ) : null}
            {tab === 'model' ? (
              <ScoringDetailTab
                assessment={application.assessment}
                explanation={explanation.data}
                isLoading={explanation.isLoading}
                error={explanation.error}
                onRetry={explanation.reload}
              />
            ) : null}
            {tab === 'history' ? <HistoryTab history={application.recentHistory} displayName={displayName} /> : null}
          </div>
        </div>

        {/*
          Phiếu kết luận dính khi cuộn, tự cuộn riêng nếu cao hơn màn hình. Dưới 1180px phiếu tách đôi
          (display: contents): phần điểm lên đầu trang, khay quyết định xuống cuối.
        */}
        <aside
          className="lr-slip sticky top-[calc(var(--header-height)+16px)] grid max-h-[calc(100vh-var(--header-height)-32px)] overflow-y-auto max-[1180px]:contents"
          aria-label="Kết luận thẩm định"
        >
          <ScoreSlip
            application={application}
            showRetry={showRetry}
            retryBlockedReason={retryBlockedReason}
            retrying={decision.retrying}
            onRetry={decision.retry}
          />
          <DecisionTray
            application={application}
            approveBlockedReason={approveBlockedReason(application)}
            canReject={canReject}
            canAct={canAct}
            approving={decision.approving}
            rejecting={decision.rejecting}
            error={decision.decisionError}
            displayName={displayName}
            onApprove={decision.approve}
            onReject={decision.reject}
            onReload={() => {
              decision.clearDecisionError();
              void detail.refetch();
            }}
          />
        </aside>
      </div>
    </section>
  );
}
