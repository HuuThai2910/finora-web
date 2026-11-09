import { Link } from 'react-router-dom';
import { StatusPill } from '@/components/StatusPill';
import { APPLICATION_STATUS_LABELS, formatDateTime } from '../../formatters';
import { applicationStatusTone } from '../../mappers/applicationListDisplay';
import type { AdminLoanReviewDetail } from '../../types';
import { PendingQueueNav } from './PendingQueueNav';
import { toast } from '@/lib/toast';

interface ReviewHeaderProps {
  application: AdminLoanReviewDetail;
  borrowerName: string;
  /** Có quyền Xem "Khách hàng": tên người vay mở hồ sơ khách hàng. */
  canViewCustomer: boolean;
  /** Có quyền Xem "Blockchain": hiện nút Xác minh dữ liệu. */
  canViewProofs: boolean;
  onCopied: (message: string) => void;
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

/**
 * Đầu trang: chỉ định danh hồ sơ (người vay, trạng thái, mã, ngày nộp) và lối sang Bằng chứng blockchain;
 * điều khoản nằm ở thẻ Khoản vay.
 */
export function ReviewHeader({ application, borrowerName, canViewCustomer, canViewProofs, onCopied }: ReviewHeaderProps) {
  // Nhân viên đọc và chép mã HS-… (tìm được ở ô tìm của Quản lý khoản vay); LA-… chỉ còn trên URL.
  const displayCode = application.applicationCode || application.applicationNumber;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      onCopied(`Đã chép mã hồ sơ ${displayCode}.`);
    } catch {
      // Trình duyệt chặn clipboard (http, quyền): báo để người dùng tự chọn và chép.
      toast.warning('Trình duyệt chặn chép tự động. Hãy chọn mã hồ sơ rồi chép thủ công.');
    }
  };

  return (
    // Icon trong nút ở đầu trang (Hồ sơ chờ tiếp theo) 16px, lớn hơn icon nút thường.
    <header className="lr-heading flex items-start justify-between gap-4 max-[600px]:flex-col max-[600px]:gap-2.5 [&_.ui-btn_svg]:size-4">
      <div className="ui-title">
        <div className="lr-title-row flex items-center gap-2 flex-wrap">
          <h1>
            {canViewCustomer ? (
              <Link
                className="lr-borrower-link text-inherit hover:text-brand hover:underline"
                to={`/customers/kyc/${encodeURIComponent(application.borrowerId)}`}
                title="Mở hồ sơ khách hàng"
              >
                {borrowerName}
              </Link>
            ) : borrowerName}
          </h1>
          <StatusPill tone={applicationStatusTone(application.status)}>
            {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
          </StatusPill>
        </div>
        <p className="lr-meta flex items-center gap-1.5 flex-wrap">
          <span className="ui-mono text-[12px]">{displayCode}</span>
          <button
            type="button"
            className="lr-copy grid place-items-center size-6 rounded-sm text-muted hover:bg-surface-muted hover:text-primary [&_svg]:size-3.25"
            onClick={copy}
            aria-label="Chép mã hồ sơ"
            title="Chép mã hồ sơ"
          >
            <CopyIcon />
          </button>
          <span aria-hidden="true">·</span>
          Nộp {formatDateTime(application.submittedAt)}
        </p>
      </div>
      {/* Nút Bằng chứng blockchain và bộ chuyển hàng chờ cùng một cụm bên phải đầu trang. */}
      <div className="lr-head-actions flex items-center gap-2 flex-wrap">
        {/* Explorer tra `LOAN_APPLICATION` theo ID số của hồ sơ; Loan trước B73 không trả `id` nên khóa nút thay vì dựng link sai.
            Không có quyền Xem "Blockchain" thì trang đích chặn, nên không hiện nút. */}
        {!canViewProofs ? null : application.id ? (
          <Link
            className="ui-btn ghost"
            to={`/blockchain/proofs?referenceType=LOAN_APPLICATION&referenceId=${application.id}`}
          >
            Xác minh dữ liệu
          </Link>
        ) : (
          <button type="button" className="ui-btn ghost" disabled title="Máy chủ chưa trả ID hồ sơ nên chưa mở được bằng chứng.">
            Xác minh dữ liệu
          </button>
        )}
        <PendingQueueNav applicationNumber={application.applicationNumber} submittedAt={application.submittedAt} />
      </div>
    </header>
  );
}
