import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { Toast } from '@/components/Toast';
import { usePermission } from '@/features/auth';
import { toUiApiError } from '@/lib/api/errors';
import { useGetEkycAttemptQuery } from '../api/ekycReviewQueries';
import { DraftFieldsCard } from '../components/DraftFieldsCard';
import { EvidenceGallery } from '../components/EvidenceGallery';
import { LivenessCard } from '../components/LivenessCard';
import { ReviewDecisionModal } from '../components/ReviewDecisionModal';
import { ReviewSummaryPanel } from '../components/ReviewSummaryPanel';
import { EKYC_REVIEW_LIST_PATH } from '../constants';
import { attemptStatusDisplay, formatDayTime } from '../mappers/attemptDisplay';
import type { EkycReviewDecision } from '../types';
import './EkycReviewListPage.css';
import './EkycReviewDetailPage.css';

function BackLink() {
  return (
    <Link className="ui-link ekr-back" to={EKYC_REVIEW_LIST_PATH}>
      <Icon name="chevronLeft" />
      Về danh sách duyệt eKYC
    </Link>
  );
}

/**
 * Chi tiết một lượt eKYC (`/customers/ekyc-review/:attemptId`): trường đọc từ thẻ và nguồn, ảnh/video
 * bằng chứng, lý do liveness bên trái; kết quả tóm tắt và nút Duyệt/Từ chối bên phải.
 */
export default function EkycReviewDetailPage() {
  const { attemptId = '' } = useParams<{ attemptId: string }>();
  // Đổi sang lượt khác thì dựng lại từ đầu: hộp thoại, thông báo và object URL của lượt trước không mang sang.
  return <EkycReviewView key={attemptId} attemptId={attemptId} />;
}

function EkycReviewView({ attemptId }: { attemptId: string }) {
  const detail = useGetEkycAttemptQuery(attemptId, { skip: !attemptId });
  const attempt = detail.data;
  const [decision, setDecision] = useState<EkycReviewDecision | null>(null);
  const [conflict, setConflict] = useState(false);
  const canViewCustomer = usePermission().canView('customer');
  const [toast, setToast] = useState<string | null>(null);
  // Tham chiếu ổn định: Toast đặt lại hẹn giờ mỗi khi `onDismiss` đổi.
  const dismissToast = useCallback(() => setToast(null), []);

  if (!attemptId) {
    return <section className="ui-page"><div className="ui-alert" role="alert">Thiếu mã lượt eKYC.</div></section>;
  }
  if (detail.isLoading) {
    return (
      <section className="ui-page">
        <div className="ui-card ui-empty" aria-busy="true">Đang tải lượt eKYC...</div>
      </section>
    );
  }
  if (!attempt) {
    const notFound = toUiApiError(detail.error).status === 404;
    return (
      <section className="ui-page">
        {notFound
          ? <div className="ui-alert" role="alert">Không tìm thấy lượt eKYC này.</div>
          : <ErrorNotice error={detail.error} onRetry={detail.refetch} />}
        <BackLink />
      </section>
    );
  }

  const status = attemptStatusDisplay(attempt.status);

  return (
    <section className="ui-page">
      <BackLink />
      <header className="ui-page-head ekr-head">
        <div className="ekr-head-main">
          <div className="ekr-title-row">
            <h1>{attempt.email}</h1>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </div>
          <div className="ekr-meta">
            <span><span className="k">Mã lượt</span> <span className="ui-mono">{attempt.attemptId}</span></span>
            {canViewCustomer
              ? <Link className="ui-link" to={`/customers/kyc/${attempt.userProfileId}`}>Hồ sơ khách hàng #{attempt.userProfileId}</Link>
              : <span>Hồ sơ khách hàng #{attempt.userProfileId}</span>}
            <span><span className="k">Bắt đầu</span> {formatDayTime(attempt.createdAt)}</span>
            <span><span className="k">Gửi duyệt</span> {formatDayTime(attempt.submittedAt)}</span>
          </div>
        </div>
        <button type="button" className="ui-btn ghost" onClick={() => void detail.refetch()} disabled={detail.isFetching}>
          <Icon name="refresh" />
          {detail.isFetching ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      {conflict ? (
        <div className="ekr-notice" role="alert">
          Lượt này vừa được quản trị viên khác xử lý trước. Trang đã tải lại kết quả mới nhất.
        </div>
      ) : null}
      {/* Lỗi khi tải lại: vẫn giữ dữ liệu lần trước để người duyệt không mất chỗ đang xem. */}
      {detail.error ? <ErrorNotice error={detail.error} onRetry={detail.refetch} /> : null}

      <div className="ekr-dossier">
        <div className={detail.isFetching ? 'ekr-main ui-busy' : 'ekr-main'}>
          <DraftFieldsCard attempt={attempt} />
          <EvidenceGallery attemptId={attempt.attemptId} evidence={attempt.evidence} />
          <LivenessCard attempt={attempt} />
        </div>
        <ReviewSummaryPanel
          attempt={attempt}
          refreshing={detail.isFetching}
          onDecide={(next) => {
            setConflict(false);
            setDecision(next);
          }}
        />
      </div>

      {decision ? (
        <ReviewDecisionModal
          attempt={attempt}
          decision={decision}
          onClose={() => setDecision(null)}
          onDone={(message) => {
            setDecision(null);
            setToast(message);
          }}
          onConflict={() => {
            setDecision(null);
            setConflict(true);
          }}
        />
      ) : null}
      {toast ? <Toast message={toast} onDismiss={dismissToast} /> : null}
    </section>
  );
}
