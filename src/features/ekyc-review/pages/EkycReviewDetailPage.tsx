import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { toast } from '@/lib/toast';
import { usePermission } from '@/features/auth';
import { CustomerDetailModal } from '@/features/kyc';
import { useGetUserQuery } from '@/features/user';
import { toUiApiError } from '@/lib/api/errors';
import { useGetEkycAttemptQuery } from '../api/ekycReviewQueries';
import { CheckSlip } from '../components/CheckSlip';
import { DocumentCard, FaceCard } from '../components/EvidenceCards';
import { PendingAttemptNav } from '../components/PendingAttemptNav';
import { ReviewDecisionModal } from '../components/ReviewDecisionModal';
import { ekycReviewDetailPath } from '../constants';
import { attemptStatusDisplay } from '../mappers/attemptDisplay';
import type { EkycReviewDecision } from '../types';

/**
 * Màn xác minh một lượt (`/customers/kyc/review/:attemptId`): giấy tờ (ảnh thẻ cạnh các trường đọc được), khuôn mặt
 * (video, khung hình theo động tác) bên trái; kết quả kiểm tra tự động và nút Duyệt/Từ chối bên phải. Về danh sách bằng
 * breadcrumb (nhớ bộ lọc qua `state`).
 */
export default function EkycReviewDetailPage() {
  const { attemptId = '' } = useParams<{ attemptId: string }>();
  // Đổi sang lượt khác thì dựng lại từ đầu: hộp thoại, thông báo và object URL của lượt trước không mang sang.
  return <EkycReviewView key={attemptId} attemptId={attemptId} />;
}

function EkycReviewView({ attemptId }: { attemptId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const detail = useGetEkycAttemptQuery(attemptId, { skip: !attemptId });
  const attempt = detail.data;
  const [decision, setDecision] = useState<EkycReviewDecision | null>(null);
  const [conflict, setConflict] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const canViewCustomer = usePermission().canView('customer');
  // Họ tên khách (chỉ có sau khi lượt được duyệt); thiếu thì tiêu đề là email của lượt. Cần quyền Xem "Khách hàng".
  const profileId = attempt ? String(attempt.userProfileId) : '';
  const profile = useGetUserQuery(profileId, { skip: !canViewCustomer || !profileId });

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
      </section>
    );
  }

  const status = attemptStatusDisplay(attempt.status);
  const name = profile.data?.fullName || null;

  return (
    <section className="ui-page">
      <header className="ui-page-head ekr-head items-start">
        <div className="ekr-title-row flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-[20px] font-bold leading-[1.3] tracking-[-0.01em] text-primary wrap-anywhere">{name || attempt.email}</h1>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        <div className="ekr-head-actions flex flex-wrap items-center gap-2">
          <PendingAttemptNav attemptId={attempt.attemptId} />
          {canViewCustomer && (
            <button type="button" className="ui-btn ghost" onClick={() => setProfileOpen(true)}>Hồ sơ khách hàng</button>
          )}
        </div>
      </header>

      {conflict ? (
        <div className="ekr-notice py-2.5 px-4 rounded-md bg-warning-bg text-warning text-[13px] font-medium" role="alert">
          Lượt này vừa được quản trị viên khác xử lý trước. Trang đã tải lại kết quả mới nhất.
        </div>
      ) : null}
      {/* Lỗi khi tải lại: vẫn giữ dữ liệu lần trước để người duyệt không mất chỗ đang xem. */}
      {detail.error ? <ErrorNotice error={detail.error} onRetry={detail.refetch} /> : null}

      {/* Màn hẹp còn một cột: "Kiểm tra tự động" lên đầu, rồi giấy tờ và khuôn mặt. */}
      <div className="ekr-dossier grid grid-cols-[minmax(0,1fr)_320px] gap-5 [align-items:start] max-[1180px]:grid-cols-[minmax(0,1fr)]">
        <div className={detail.isFetching ? 'ekr-main ui-busy grid gap-4 min-w-0' : 'ekr-main grid gap-4 min-w-0'}>
          <DocumentCard attempt={attempt} profile={profile.data} />
          <FaceCard attempt={attempt} />
        </div>
        <CheckSlip
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
          displayName={name}
          onClose={() => setDecision(null)}
          onDone={(message) => {
            setDecision(null);
            toast.success(message);
          }}
          onConflict={() => {
            setDecision(null);
            setConflict(true);
          }}
        />
      ) : null}

      {/* Hồ sơ khách mở chồng lên màn này, không rời trang; mở lượt khác thì chuyển sang lượt đó, giữ lối về danh sách. */}
      {profileOpen && (
        <CustomerDetailModal
          customerId={attempt.userProfileId}
          onClose={() => setProfileOpen(false)}
          onOpenAttempt={(next) => {
            setProfileOpen(false);
            if (next !== attempt.attemptId) navigate(ekycReviewDetailPath(next), { state: location.state });
          }}
        />
      )}
    </section>
  );
}
