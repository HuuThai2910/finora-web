import { StatusPill } from '@/components/StatusPill';
import { APPLICATION_STATUS_LABELS, formatDateTime } from '../../formatters';
import { applicationStatusTone } from '../../mappers/applicationListDisplay';
import type { AdminLoanReviewDetail } from '../../types';
import { PendingQueueNav } from './PendingQueueNav';

interface ReviewHeaderProps {
  application: AdminLoanReviewDetail;
  borrowerName: string;
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

/** Đầu trang: chỉ định danh hồ sơ (người vay, trạng thái, mã, ngày nộp); điều khoản nằm ở thẻ Khoản vay. */
export function ReviewHeader({ application, borrowerName, onCopied }: ReviewHeaderProps) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(application.applicationNumber);
      onCopied(`Đã chép mã hồ sơ ${application.applicationNumber}.`);
    } catch {
      // Trình duyệt chặn clipboard (http, quyền): báo để người dùng tự chọn và chép.
      onCopied('Trình duyệt chặn chép tự động. Hãy chọn mã hồ sơ rồi chép thủ công.');
    }
  };

  return (
    <header className="lr-heading">
      <div className="ui-title">
        <div className="lr-title-row">
          <h1>{borrowerName}</h1>
          <StatusPill tone={applicationStatusTone(application.status)}>
            {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
          </StatusPill>
        </div>
        <p className="lr-meta">
          <span className="ui-mono">{application.applicationNumber}</span>
          <button type="button" className="lr-copy" onClick={copy} aria-label="Chép mã hồ sơ" title="Chép mã hồ sơ">
            <CopyIcon />
          </button>
          <span aria-hidden="true">·</span>
          Nộp {formatDateTime(application.submittedAt)}
        </p>
      </div>
      <PendingQueueNav applicationNumber={application.applicationNumber} />
    </header>
  );
}
