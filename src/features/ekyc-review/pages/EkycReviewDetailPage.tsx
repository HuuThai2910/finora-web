import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { toast } from '@/lib/toast';
import { usePermission } from '@/features/auth';
import { useGetUserQuery } from '@/features/user';
import { toUiApiError } from '@/lib/api/errors';
import { useBackToList } from '@/lib/navigation';
import { useGetEkycAttemptQuery } from '../api/ekycReviewQueries';
import { CopyIdButton } from '../components/CopyIdButton';
import { DraftFieldsCard, type DeclaredInfo } from '../components/DraftFieldsCard';
import { EvidenceGallery } from '../components/EvidenceGallery';
import { LivenessCard } from '../components/LivenessCard';
import { PendingAttemptNav } from '../components/PendingAttemptNav';
import { ReviewDecisionModal } from '../components/ReviewDecisionModal';
import { ReviewSummaryPanel } from '../components/ReviewSummaryPanel';
import { EKYC_REVIEW_LIST_PATH } from '../constants';
import { attemptStatusDisplay, formatDayTime } from '../mappers/attemptDisplay';
import type { EkycReviewDecision } from '../types';

/** Về đúng danh sách đã mở trang này (tab "Chờ duyệt tay", trang đang xem), không có thì về trang Khách hàng. */
function BackLink() {
  const backUrl = useBackToList(EKYC_REVIEW_LIST_PATH);
  return (
    <Link
      className="ui-link ekr-back inline-flex items-center gap-1.5 [justify-self:start] text-[13px] [&_svg]:size-3.5"
      to={backUrl}
    >
      <Icon name="chevronLeft" />
      Về danh sách khách hàng
    </Link>
  );
}

/**
 * Chi tiết một lượt xác minh (`/customers/kyc/review/:attemptId`): trường đọc từ thẻ và nguồn, ảnh/video
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
  // Họ tên, SĐT khách tự khai lúc đăng ký để đặt cạnh dữ liệu đọc từ thẻ; cần quyền Xem "Khách hàng".
  const profileId = attempt ? String(attempt.userProfileId) : '';
  const profile = useGetUserQuery(profileId, { skip: !canViewCustomer || !profileId });
  const declared: DeclaredInfo | null = profile.data
    ? { fullName: profile.data.fullName, phone: profile.data.phone }
    : null;
  // Kết quả thao tác báo bằng toast dùng chung (`@/lib/toast`).
  const setToast = useCallback((message: string | null) => { if (message) toast.success(message); }, []);

  if (!attemptId) {
    return <section className="ui-page"><div className="ui-alert" role="alert">Thiếu mã lượt xác minh.</div></section>;
  }
  if (detail.isLoading) {
    return (
      <section className="ui-page">
        <div className="ui-card ui-empty" aria-busy="true">Đang tải lượt xác minh...</div>
      </section>
    );
  }
  if (!attempt) {
    const notFound = toUiApiError(detail.error).status === 404;
    return (
      <section className="ui-page">
        {notFound
          ? <div className="ui-alert" role="alert">Không tìm thấy lượt xác minh này.</div>
          : <ErrorNotice error={detail.error} onRetry={detail.refetch} />}
        <BackLink />
      </section>
    );
  }

  const status = attemptStatusDisplay(attempt.status);

  return (
    <section className="ui-page">
      <BackLink />
      <header className="ui-page-head ekr-head items-start">
        <div className="ekr-head-main flex flex-col gap-1 min-w-0">
          <div className="ekr-title-row flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-bold leading-[1.3] tracking-[-0.01em] text-primary wrap-anywhere">{attempt.email}</h1>
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
          </div>
          {/* Các mục ngăn bằng vạch dọc; màn hẹp xuống dòng nên bỏ vạch, cách nhau bằng khoảng trống. */}
          <div
            className="ekr-meta flex items-center flex-wrap gap-y-1 text-secondary text-[13px] max-[760px]:gap-x-3 *:inline-flex *:items-center *:gap-1 *:min-w-0 [&>*+*]:ml-3 [&>*+*]:pl-3 [&>*+*]:border-l [&>*+*]:border-l-line max-[760px]:[&>*+*]:ml-0 max-[760px]:[&>*+*]:pl-0 max-[760px]:[&>*+*]:[border-left:0]"
          >
            {canViewCustomer
              ? <Link className="ui-link" to={`/customers/kyc/${attempt.userProfileId}`}>Hồ sơ khách hàng #{attempt.userProfileId}</Link>
              : <span>Hồ sơ khách hàng #{attempt.userProfileId}</span>}
            <span><span className="k text-muted">Bắt đầu</span> {formatDayTime(attempt.createdAt)}</span>
            <span><span className="k text-muted">Gửi duyệt</span> {formatDayTime(attempt.submittedAt)}</span>
            {/* Mã lượt (UUID) chỉ cần khi đối chiếu nhật ký: chép bằng nút, không in nguyên chuỗi. */}
            <span><CopyIdButton value={attempt.attemptId} label="Chép mã lượt" /></span>
          </div>
        </div>
        <div className="ekr-head-actions flex flex-wrap items-center gap-2">
          <PendingAttemptNav attemptId={attempt.attemptId} />
          <button type="button" className="ui-btn ghost" onClick={() => void detail.refetch()} disabled={detail.isFetching}>
            <Icon name="refresh" />
            {detail.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </header>

      {conflict ? (
        <div className="ekr-notice py-2.5 px-4 rounded-md bg-warning-bg text-warning text-[13px] font-medium" role="alert">
          Lượt này vừa được quản trị viên khác xử lý trước. Trang đã tải lại kết quả mới nhất.
        </div>
      ) : null}
      {/* Lỗi khi tải lại: vẫn giữ dữ liệu lần trước để người duyệt không mất chỗ đang xem. */}
      {detail.error ? <ErrorNotice error={detail.error} onRetry={detail.refetch} /> : null}

      {/* Màn hẹp còn một cột: "Kết quả kiểm tra" lên đầu, rồi bằng chứng, cuối cùng mới tới khay quyết định. */}
      <div className="ekr-dossier grid grid-cols-[minmax(0,1fr)_320px] gap-5 [align-items:start] max-[1180px]:grid-cols-[minmax(0,1fr)]">
        <div className={detail.isFetching ? 'ekr-main ui-busy grid gap-4 min-w-0' : 'ekr-main grid gap-4 min-w-0'}>
          <DraftFieldsCard attempt={attempt} declared={declared} />
          <EvidenceGallery attemptId={attempt.attemptId} evidence={attempt.evidence} draft={attempt.draft} />
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
    </section>
  );
}
