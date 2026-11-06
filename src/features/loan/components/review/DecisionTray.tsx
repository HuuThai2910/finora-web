import { useState, type ReactNode } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { toUiApiError } from '@/lib/api/errors';
import { APPLICATION_STATUS_LABELS } from '../../formatters';
import type { AdminLoanReviewDetail } from '../../types';
import { ApproveForm, DECIDE_ROW, RejectForm } from './DecisionForms';
import { DecisionOutcome } from './DecisionOutcome';

// Khay nối dưới phiếu điểm: bỏ viền trên và bo góc trên, nền xám nhạt (nền trắng khi đang mở form duyệt/từ chối).
// Dưới 1180px khay thành thẻ riêng, đủ viền, bo đủ bốn góc và xuống cuối trang (order 2).
const TRAY =
  'ui-card lr-slip-card lr-slip-decide py-4 px-4.5 [border-top:0] rounded-t-none bg-surface-muted [&.rejecting]:bg-card [&.confirming]:bg-card max-[1180px]:[border:1px_solid_var(--color-line)] max-[1180px]:rounded-lg max-[1180px]:order-2';

const TRAY_NOTE = 'lr-tray-note mb-2.5 text-secondary text-[13px] leading-normal';

type TrayForm = 'none' | 'approve' | 'reject';

interface DecisionTrayProps {
  application: AdminLoanReviewDetail;
  /** Lý do chưa duyệt được (chưa có lần chấm thành công mới nhất); `null` khi duyệt được. */
  approveBlockedReason: string | null;
  /** Hồ sơ đang chờ thẩm định: từ chối được kể cả khi lần chấm gần nhất lỗi. */
  canReject: boolean;
  /** Có quyền Thao tác "Hồ sơ vay"; không có thì khay chỉ hiện trạng thái, không có nút duyệt/từ chối. */
  canAct: boolean;
  approving: boolean;
  rejecting: boolean;
  error: unknown;
  displayName: (actorId: string | null | undefined) => string;
  /** Trả về true khi duyệt thành công để khay đóng form. */
  onApprove: (reasonDetail?: string) => Promise<boolean>;
  /** Tải lại chi tiết hồ sơ khi version đã đổi (người khác vừa xử lý). */
  onReload: () => void;
  /** Trả về true khi từ chối thành công để khay đóng form. */
  onReject: (reasonCode: string, reasonDetail?: string) => Promise<boolean>;
}

/** Lời dẫn trên hai nút khi hồ sơ chờ thẩm định. */
function pendingNote(application: AdminLoanReviewDetail, approveBlockedReason: string | null): string {
  if (approveBlockedReason == null) {
    return 'Duyệt theo điều khoản sau định giá. Nếu điều khoản bất lợi hơn lúc nộp, hệ thống chờ người vay xác nhận rồi mới tạo hợp đồng.';
  }
  // Phiếu điểm phía trên đã nói lý do chưa có điểm (lý do đủ nằm ở title của nút Duyệt), ở đây chỉ nói việc làm được.
  // Lần chấm lỗi còn có nút "Yêu cầu chấm lại" ở phiếu điểm.
  const retry = application.assessment?.status === 'FAILED' ? ' hoặc yêu cầu chấm lại' : '';
  return `Cần kết quả chấm điểm thành công mới duyệt được. Vẫn có thể từ chối hồ sơ${retry}.`;
}

/**
 * Khay quyết định nối dưới phiếu điểm. Hồ sơ PENDING_REVIEW có nút duyệt/từ chối, mỗi nút mở form xác nhận ngay trong
 * khay; trạng thái cuối hiện kết quả và người quyết định. Form đang mở là state cục bộ của khay.
 */
export function DecisionTray(props: DecisionTrayProps) {
  const { application, approveBlockedReason, canReject, canAct, approving, rejecting, error } = props;
  const [form, setForm] = useState<TrayForm>('none');
  const busy = approving || rejecting;
  const canApprove = canReject && approveBlockedReason == null;
  const pending = application.status === 'PENDING_REVIEW';
  const closeForm = () => setForm('none');

  let body: ReactNode;
  if (pending && !canAct) {
    body = (
      <p className={TRAY_NOTE}>
        Hồ sơ đang chờ thẩm định. Vai trò của bạn chỉ được xem; cần quyền Sửa "Hồ sơ vay" để duyệt hoặc từ chối.
      </p>
    );
  } else if (pending && form === 'reject') {
    body = <RejectForm canReject={canReject} rejecting={rejecting} busy={busy} onCancel={closeForm} onReject={props.onReject} />;
  } else if (pending && form === 'approve') {
    body = (
      <ApproveForm
        application={application}
        canApprove={canApprove}
        approving={approving}
        busy={busy}
        onCancel={closeForm}
        onApprove={props.onApprove}
      />
    );
  } else if (pending) {
    body = (
      <>
        <p className={TRAY_NOTE}>{pendingNote(application, approveBlockedReason)}</p>
        <div className={DECIDE_ROW}>
          <button
            type="button"
            className="ui-btn lr-btn-danger-outline bg-white border-danger text-danger hover:not-disabled:bg-danger-bg"
            disabled={!canReject || busy}
            onClick={() => setForm('reject')}
          >
            Từ chối
          </button>
          <button
            type="button"
            className="ui-btn primary lr-grow flex-1"
            disabled={!canApprove || busy}
            title={approveBlockedReason ?? undefined}
            onClick={() => setForm('approve')}
          >
            Duyệt hồ sơ
          </button>
        </div>
      </>
    );
  } else if (application.status === 'APPROVED' || application.status === 'REJECTED') {
    body = <DecisionOutcome application={application} displayName={props.displayName} />;
  } else {
    body = (
      <p className={TRAY_NOTE}>
        {application.status === 'WITHDRAWN'
          ? 'Người vay đã rút hồ sơ.'
          : `Hồ sơ đang ở bước ${(APPLICATION_STATUS_LABELS[application.status] ?? application.status).toLocaleLowerCase('vi-VN')}.`}
        {' '}Chỉ hồ sơ chờ thẩm định mới duyệt hoặc từ chối được.
      </p>
    );
  }

  // Lớp `rejecting`/`confirming` cho biết đang mở form nào (nền trắng); chỉ tính khi form thật sự hiện.
  const open = pending && canAct ? form : 'none';
  const trayClass = open === 'reject' ? `${TRAY} rejecting` : open === 'approve' ? `${TRAY} confirming` : TRAY;

  return (
    <section className={trayClass} aria-label="Quyết định thẩm định">
      {error ? (
        <div className="lr-tray-error grid gap-2 justify-items-start mb-2.5 [&_.ui-alert]:w-full">
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
