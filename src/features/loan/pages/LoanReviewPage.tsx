import { useCallback, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Toast } from '@/components/Toast';
import { toUiApiError } from '@/lib/api/errors';
import { useGetReviewDetailQuery } from '../api/loanReviewApi';
import { DecisionTray } from '../components/review/DecisionTray';
import { HistoryTab } from '../components/review/HistoryTab';
import { ReviewHeader } from '../components/review/ReviewHeader';
import { ReviewOverviewTab } from '../components/review/ReviewOverviewTab';
import { isReviewTab, REVIEW_TABS, type ReviewTabId } from '../mappers/reviewDisplay';
import { ScoreSlip } from '../components/review/ScoreSlip';
import { ScoringDetailTab } from '../components/review/ScoringDetailTab';
import { useAssessmentExplanation } from '../hooks/useAssessmentExplanation';
import { useReviewDecision } from '../hooks/useReviewDecision';
import { useActorNames } from '../hooks/useActorNames';
import './LoanReviewPage.css';

function BackLink() {
  return <Link className="ui-link lr-back" to="/loans">Về danh sách hồ sơ vay</Link>;
}

/**
 * Chi tiết một hồ sơ vay (`/loans/:applicationNumber/review`): tờ trình theo tab bên trái, phiếu
 * kết quả chấm điểm và khay quyết định luôn trong tầm tay bên phải.
 *
 * Trang chỉ điều phối: dữ liệu từ `GET /admin/loan-applications/{number}/review`, giải thích AI tải
 * lười khi mở tab chấm điểm, thao tác duyệt/từ chối/chấm lại nằm trong `useReviewDecision`.
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
  const requestedTab = searchParams.get('tab');
  const tab: ReviewTabId = isReviewTab(requestedTab) ? requestedTab : 'review';

  const detail = useGetReviewDetailQuery(applicationNumber, { skip: !applicationNumber });
  const application = detail.data;
  const explanation = useAssessmentExplanation(applicationNumber, application?.assessment ?? null, tab === 'model');
  const decision = useReviewDecision(application);
  const [copyMessage, setCopyMessage] = useState('');
  // Giữ tham chiếu ổn định: Toast đặt lại giờ ẩn mỗi khi onDismiss đổi.
  const dismissCopy = useCallback(() => setCopyMessage(''), []);

  const adminIds = application?.recentHistory.filter((item) => item.actorType === 'ADMIN').map((item) => item.actorId) ?? [];
  const { displayName } = useActorNames([application?.borrowerId, application?.adminDecidedBy, ...adminIds]);

  const selectTab = (next: ReviewTabId) => {
    setSearchParams(next === 'review' ? {} : { tab: next }, { replace: true });
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
  const canDecide = application.status === 'PENDING_REVIEW' && assessmentStatus === 'SUCCEEDED';
  const canRetry = assessmentStatus === 'FAILED' || assessmentStatus === 'RETRY_PENDING';

  return (
    <section className="ui-page lr-page">
      <ReviewHeader application={application} borrowerName={displayName(application.borrowerId)} onCopied={setCopyMessage} />

      {decision.notice ? <div className="lr-notice" role="status">{decision.notice}</div> : null}

      <div className={detail.isFetching ? 'lr-dossier ui-busy' : 'lr-dossier'}>
        <div className="lr-main">
          <div className="lr-tabs" role="tablist" aria-label="Nội dung hồ sơ vay">
            {REVIEW_TABS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => selectTab(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="lr-tab-body">
            {tab === 'review' ? (
              <ReviewOverviewTab application={application} explanation={explanation.data} onOpenScoring={() => selectTab('model')} />
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

        <aside className="lr-slip" aria-label="Kết luận thẩm định">
          <ScoreSlip application={application} canRetry={canRetry} retrying={decision.retrying} onRetry={decision.retry} />
          {decision.retryError ? <div className="lr-slip-error"><ErrorNotice error={decision.retryError} /></div> : null}
          <DecisionTray
            application={application}
            canDecide={canDecide}
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

      {copyMessage ? <Toast message={copyMessage} onDismiss={dismissCopy} /> : null}
    </section>
  );
}
