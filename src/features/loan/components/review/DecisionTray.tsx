import { useState, type ReactNode } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { toUiApiError } from '@/lib/api/errors';
import { APPLICATION_STATUS_LABELS, formatBusinessLabel, formatDateTime } from '../../formatters';
import { applicationStatusTone } from '../../mappers/applicationListDisplay';
import type { AdminLoanReviewDetail, TermsConfirmationStatus } from '../../types';
import { REJECT_DETAIL_MAX, REJECT_REASONS } from '../../mappers/reviewDisplay';

interface DecisionTrayProps {
  application: AdminLoanReviewDetail;
  canDecide: boolean;
  approving: boolean;
  rejecting: boolean;
  error: unknown;
  displayName: (actorId: string | null | undefined) => string;
  onApprove: () => void;
  /** Tải lại chi tiết hồ sơ khi version đã đổi (người khác vừa xử lý). */
  onReload: () => void;
  /** Trả về true khi từ chối thành công để khay đóng form. */
  onReject: (reasonCode: string, reasonDetail?: string) => Promise<boolean>;
}

const TERMS_COPY: Record<TermsConfirmationStatus, string> = {
  AUTO_AUTHORIZED: 'Tự tiếp tục vì điều khoản cuối không bất lợi hơn và người vay đã chấp thuận cơ chế này lúc nộp hồ sơ.',
  PENDING: 'Đang chờ người vay xác nhận điều khoản cuối trước khi tạo hợp đồng.',
  ACCEPTED: 'Người vay đã chấp nhận điều khoản cuối, hợp đồng đã được tạo.',
  DECLINED: 'Người vay đã từ chối điều khoản cuối, không tạo hợp đồng.',
  EXPIRED: 'Đã hết hạn phản hồi điều khoản, không tạo hợp đồng.',
};

function Outcome({ application, displayName }: Pick<DecisionTrayProps, 'application' | 'displayName'>) {
  const who = application.adminDecidedBy
    ? `${displayName(application.adminDecidedBy)}, ${formatDateTime(application.adminDecidedAt)}`
    : application.decisionSource ? formatBusinessLabel(application.decisionSource) : '';
  const last = application.recentHistory.find((item) => item.toStatus === application.status);
  const terms = application.termsConfirmationStatus;
  return (
    <>
      <div className="lr-outcome">
        <StatusPill tone={applicationStatusTone(application.status)}>{APPLICATION_STATUS_LABELS[application.status]}</StatusPill>
        {who ? <span>{who}</span> : null}
      </div>
      {application.status === 'REJECTED' && last?.reasonDetail ? <p className="lr-outcome-reason">{last.reasonDetail}</p> : null}
      {application.status === 'APPROVED' && terms ? (
        <p className="lr-tray-note lr-tray-terms">
          {TERMS_COPY[terms] ?? formatBusinessLabel(terms)}
          {terms === 'PENDING' && application.termsExpiresAt ? ` Hạn ${formatDateTime(application.termsExpiresAt)}.` : ''}
        </p>
      ) : null}
    </>
  );
}

/**
 * Khay quyết định nối dưới phiếu điểm. Chỉ hồ sơ PENDING_REVIEW có nút duyệt/từ chối; trạng thái
 * cuối hiện kết quả và người quyết định. Form lý do từ chối là state cục bộ của khay.
 */
export function DecisionTray(props: DecisionTrayProps) {
  const { application, canDecide, approving, rejecting, error, onApprove, onReject } = props;
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState(REJECT_REASONS[0].code);
  const [reasonDetail, setReasonDetail] = useState('');
  const busy = approving || rejecting;
  const disabled = !canDecide || busy;

  let body: ReactNode;
  if (application.status === 'PENDING_REVIEW' && rejectOpen) {
    body = (
      <form
        className="lr-reject-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const done = await onReject(reasonCode, reasonDetail.trim() || undefined);
          if (done) setRejectOpen(false);
        }}
      >
        <label>
          <span>Lý do từ chối</span>
          <select className="ui-select" value={reasonCode} disabled={disabled} onChange={(event) => setReasonCode(event.target.value)} autoFocus>
            {REJECT_REASONS.map((reason) => <option key={reason.code} value={reason.code}>{reason.label}</option>)}
          </select>
        </label>
        <label>
          <span>Giải thích thêm</span>
          <textarea
            value={reasonDetail}
            maxLength={REJECT_DETAIL_MAX}
            placeholder="Ghi rõ để người kiểm tra sau hiểu quyết định"
            disabled={disabled}
            onChange={(event) => setReasonDetail(event.target.value)}
          />
        </label>
        <div className="lr-decide-row">
          <button type="button" className="ui-btn ghost" disabled={busy} onClick={() => setRejectOpen(false)}>Hủy</button>
          <button type="submit" className="ui-btn danger lr-grow" disabled={disabled}>
            {rejecting ? <><span className="lr-spinner" aria-hidden="true" />Đang từ chối...</> : 'Xác nhận từ chối'}
          </button>
        </div>
      </form>
    );
  } else if (application.status === 'PENDING_REVIEW') {
    body = (
      <>
        <p className="lr-tray-note">
          {canDecide
            ? 'Duyệt theo điều khoản sau định giá. Nếu điều khoản bất lợi hơn lúc nộp, hệ thống chờ người vay xác nhận rồi mới tạo hợp đồng.'
            : 'Cần có kết quả chấm điểm trước khi duyệt hoặc từ chối.'}
        </p>
        <div className="lr-decide-row">
          <button type="button" className="ui-btn lr-btn-danger-outline" disabled={disabled} onClick={() => setRejectOpen(true)}>Từ chối</button>
          <button type="button" className="ui-btn primary lr-grow" disabled={disabled} onClick={onApprove}>
            {approving ? <><span className="lr-spinner" aria-hidden="true" />Đang duyệt...</> : 'Duyệt hồ sơ'}
          </button>
        </div>
      </>
    );
  } else if (application.status === 'APPROVED' || application.status === 'REJECTED') {
    body = <Outcome application={application} displayName={props.displayName} />;
  } else {
    body = (
      <p className="lr-tray-note">
        {application.status === 'WITHDRAWN'
          ? 'Người vay đã rút hồ sơ.'
          : `Hồ sơ đang ở bước ${(APPLICATION_STATUS_LABELS[application.status] ?? application.status).toLocaleLowerCase('vi-VN')}.`}
        {' '}Chỉ hồ sơ chờ thẩm định mới duyệt hoặc từ chối được.
      </p>
    );
  }

  return (
    <section className={`ui-card lr-slip-card lr-slip-decide${rejectOpen ? ' rejecting' : ''}`} aria-label="Quyết định thẩm định">
      {error ? (
        <div className="lr-tray-error">
          <ErrorNotice error={error} />
          {/* 409: hồ sơ đã đổi version (người khác vừa xử lý). Không tự gửi lại, chỉ mời tải bản mới. */}
          {toUiApiError(error).status === 409 ? (
            <button type="button" className="ui-btn soft" onClick={props.onReload}>Tải lại hồ sơ</button>
          ) : null}
        </div>
      ) : null}
      {body}
    </section>
  );
}
