import { StatusPill } from '@/components/StatusPill';
import { APPLICATION_STATUS_LABELS, formatBusinessLabel, formatDateTime } from '../../formatters';
import { applicationStatusTone } from '../../mappers/applicationListDisplay';
import { AI_POLICY_REJECTED, policyRejectionLabels, reasonLabel } from '../../mappers/reviewDisplay';
import type { AdminLoanReviewDetail, LoanApplicationHistoryItem, TermsConfirmationStatus } from '../../types';

const TERMS_COPY: Record<TermsConfirmationStatus, string> = {
  AUTO_AUTHORIZED: 'Tự tiếp tục vì điều khoản cuối không bất lợi hơn và người vay đã chấp thuận cơ chế này lúc nộp hồ sơ.',
  PENDING: 'Đang chờ người vay xác nhận điều khoản cuối trước khi tạo hợp đồng.',
  ACCEPTED: 'Người vay đã chấp nhận điều khoản cuối, hợp đồng đã được tạo.',
  DECLINED: 'Người vay đã từ chối điều khoản cuối, không tạo hợp đồng.',
  EXPIRED: 'Đã hết hạn phản hồi điều khoản, không tạo hợp đồng.',
};

// Lý do và ghi chú của quyết định: thụt sau vạch dọc như một trích dẫn.
const WHY = 'lr-outcome-reason grid gap-1 mt-2 pl-2.5 border-l-2 border-l-line-strong text-[13px] leading-[1.55]';

/**
 * Phần giải thích của quyết định. Khi chính sách chấm điểm tự từ chối, Loan ghi danh sách mã loại trực tiếp vào
 * `reasonDetail` nên phải dịch từng mã; các trường hợp khác là chữ người quyết định tự nhập.
 */
function DecisionDetail({ decision }: { decision: LoanApplicationHistoryItem }) {
  if (!decision.reasonDetail) return null;
  if (decision.reasonCode === AI_POLICY_REJECTED) {
    return (
      <ul className="lr-outcome-detail grid gap-0.5 pl-4.5 list-disc text-secondary">
        {policyRejectionLabels(decision.reasonDetail).map((label) => <li key={label}>{label}</li>)}
      </ul>
    );
  }
  return <p className="lr-outcome-detail text-secondary whitespace-pre-line wrap-anywhere">{decision.reasonDetail}</p>;
}

interface DecisionOutcomeProps {
  application: AdminLoanReviewDetail;
  displayName: (actorId: string | null | undefined) => string;
}

/**
 * Kết quả của hồ sơ đã có quyết định: trạng thái, người quyết định, lý do chuẩn kèm giải thích (từ chối) hoặc ghi chú,
 * số hợp đồng và bước xác nhận điều khoản (đã duyệt).
 */
export function DecisionOutcome({ application, displayName }: DecisionOutcomeProps) {
  const who = application.adminDecidedBy
    ? `${displayName(application.adminDecidedBy)}, ${formatDateTime(application.adminDecidedAt)}`
    : application.decisionSource ? formatBusinessLabel(application.decisionSource) : '';
  // Lịch sử trả mới nhất trước: mốc đầu tiên chuyển sang trạng thái hiện tại là quyết định đang có hiệu lực.
  const decision = application.recentHistory.find((item) => item.toStatus === application.status);
  const rejected = application.status === 'REJECTED';
  const terms = application.termsConfirmationStatus;

  return (
    <>
      <div className="lr-outcome flex items-center gap-2 flex-wrap text-secondary text-[13px]">
        <StatusPill tone={applicationStatusTone(application.status)}>{APPLICATION_STATUS_LABELS[application.status]}</StatusPill>
        {who ? <span>{who}</span> : null}
      </div>
      {decision && (rejected ? decision.reasonCode || decision.reasonDetail : decision.reasonDetail) ? (
        <div className={WHY}>
          {/* Duyệt chỉ có một mã chuẩn nên không nhắc lại; từ chối thì nêu lý do chuẩn trước phần giải thích. */}
          {rejected && decision.reasonCode ? <p className="lr-outcome-code font-medium">{reasonLabel(decision.reasonCode)}</p> : null}
          <DecisionDetail decision={decision} />
        </div>
      ) : null}
      {application.status === 'APPROVED' && application.contractNumber ? (
        <p className="lr-outcome-contract mt-2.5 text-[13px]">
          Hợp đồng <span className="ui-mono text-[12px] font-medium">{application.contractNumber}</span>
        </p>
      ) : null}
      {application.status === 'APPROVED' && terms ? (
        <p className="lr-tray-note lr-tray-terms mt-2.5 text-secondary text-[13px] leading-normal">
          {TERMS_COPY[terms] ?? formatBusinessLabel(terms)}
          {terms === 'PENDING' && application.termsExpiresAt ? ` Hạn ${formatDateTime(application.termsExpiresAt)}.` : ''}
        </p>
      ) : null}
    </>
  );
}
