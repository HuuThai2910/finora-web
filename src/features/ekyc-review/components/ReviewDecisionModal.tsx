import { useId, useState } from 'react';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';
import { isAttemptAlreadyDecided } from '../api/ekycReviewApi';
import { useDecideEkycAttemptMutation } from '../api/ekycReviewQueries';
import { REJECT_NOTE_SUGGESTIONS, REVIEW_NOTE_MAX } from '../constants';
import { approvalSummary } from '../mappers/decisionDisplay';
import type { EkycAttemptDetail, EkycReviewDecision } from '../types';

interface ReviewDecisionModalProps {
  attempt: EkycAttemptDetail;
  decision: EkycReviewDecision;
  onClose: () => void;
  onDone: (message: string) => void;
  /** Quản trị viên khác đã quyết định trước (409): trang đóng hộp thoại và báo, dữ liệu tự tải lại. */
  onConflict: () => void;
}

const FACT_ROW = 'grid grid-cols-[110px_minmax(0,1fr)] gap-2 py-1.5 border-b border-b-divider last:[border-bottom:0]';

/** Hộp Duyệt: các trường sẽ ghi vào hồ sơ và số lý do đỏ/cam của lượt. Chỉ trình bày, không khuyên. */
function ApprovalFacts({ attempt }: { attempt: EkycAttemptDetail }) {
  const summary = approvalSummary(attempt);
  return (
    <div className="ekr-approve-facts rounded-md border border-line px-3 py-1 text-[13px]">
      <dl>
        {summary.fields.map((field) => (
          <div key={field.label} className={FACT_ROW}>
            <dt className="text-muted">{field.label}</dt>
            <dd className={field.value ? 'text-primary font-medium wrap-anywhere' : 'text-muted'}>{field.value ?? 'Không có'}</dd>
          </div>
        ))}
        <div className={FACT_ROW}>
          <dt className="text-muted">Lý do cần chú ý</dt>
          <dd className="text-primary">
            <span className={summary.danger > 0 ? 'text-danger font-semibold' : undefined}>{summary.danger} đỏ</span>
            {', '}
            <span className={summary.warning > 0 ? 'text-warning font-semibold' : undefined}>{summary.warning} cam</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Duyệt hoặc từ chối một lượt eKYC kèm ghi chú.
 *
 * Từ chối bắt buộc có ghi chú (backend cũng kiểm). Nút gửi khoá trong lúc chạy và hộp thoại không đóng
 * giữa chừng, nên không gửi trùng. Backend khoá lạc quan bằng `@Version`: bên bấm sau nhận
 * `ATTEMPT_ALREADY_DECIDED`, khi đó không gửi lại mà để trang tải trạng thái mới. Lỗi khác (mạng, quyền,
 * số định danh đã thuộc tài khoản khác…) hiện ngay trong hộp thoại kèm mã lỗi để người duyệt xử lý.
 */
export function ReviewDecisionModal({ attempt, decision, onClose, onDone, onConflict }: ReviewDecisionModalProps) {
  const fieldId = useId();
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [decide, state] = useDecideEkycAttemptMutation();
  const isReject = decision === 'reject';

  const submit = async () => {
    if (state.isLoading) return;
    const trimmed = note.trim();
    if (isReject && !trimmed) {
      setFieldError('Nhập lý do từ chối.');
      return;
    }
    setFieldError('');
    try {
      await decide({ attemptId: attempt.attemptId, decision, note: trimmed, userProfileId: attempt.userProfileId }).unwrap();
    } catch (error) {
      if (isAttemptAlreadyDecided(error)) onConflict();
      // Lỗi còn lại báo bằng toast; hộp vẫn mở và giữ ghi chú để bấm gửi lại.
      else toast.error(error);
      return;
    }
    onDone(isReject
      ? `Đã từ chối lượt xác minh của ${attempt.email}. Người dùng có thể xác minh lại.`
      : `Đã duyệt lượt xác minh của ${attempt.email}. Hồ sơ chuyển sang đã xác minh.`);
  };

  const errorId = `${fieldId}-err`;
  const hintId = `${fieldId}-hint`;

  return (
    <Modal
      title={isReject ? 'Từ chối lượt xác minh' : 'Duyệt lượt xác minh'}
      subtitle={attempt.email}
      onClose={onClose}
      busy={state.isLoading}
      dismissOnBackdrop={false}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={state.isLoading}>Hủy</button>
          <button type="button" className={isReject ? 'ui-btn danger' : 'ui-btn primary'} onClick={submit} disabled={state.isLoading}>
            {state.isLoading ? 'Đang gửi...' : isReject ? 'Từ chối lượt này' : 'Duyệt lượt này'}
          </button>
        </>
      )}
    >
      <div className="ekr-modal-body grid gap-3">
        <p>
          {isReject
            ? 'Hồ sơ khách hàng chuyển sang xác minh thất bại. Người dùng có thể xác minh lại từ đầu.'
            : 'Hồ sơ khách hàng chuyển sang đã xác minh, các trường định danh được ghi theo bản nháp của lượt này.'}
        </p>
        {isReject ? null : <ApprovalFacts attempt={attempt} />}
        <div>
          <label className="ekr-label block mb-1.5 text-primary text-[13px] font-medium" htmlFor={fieldId}>
            {isReject ? 'Lý do từ chối' : 'Ghi chú (không bắt buộc)'}
          </label>
          {/* Lý do từ chối được trả cho app khách (GET /users/me/ekyc-status); ghi chú khi duyệt chỉ để nội bộ. */}
          <p id={hintId} className="ekr-note-hint -mt-1 mb-1.5 text-muted text-[12px]">
            {isReject
              ? 'Khách sẽ thấy lý do này trên app để biết cần làm lại gì. Viết ngắn, lịch sự, không ghi thông tin nội bộ.'
              : 'Chỉ nhân viên xem lại được.'}
          </p>
          {/* Font lấy theo hộp thoại thay cho font mặc định của textarea (ghi từng thuộc tính: `font: inherit` sẽ đè cỡ chữ). */}
          <textarea
            id={fieldId}
            className="ekr-textarea w-full min-h-24 py-2 px-2.5 border border-line-strong rounded-md bg-white text-primary font-[inherit] [font-style:inherit] [font-weight:inherit] text-[13px] leading-normal resize-y focus:[outline:0] focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] aria-invalid:border-danger"
            rows={4}
            maxLength={REVIEW_NOTE_MAX}
            value={note}
            disabled={state.isLoading}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? `${hintId} ${errorId}` : hintId}
            onChange={(event) => {
              setNote(event.target.value);
              if (fieldError) setFieldError('');
            }}
          />
          <div className="ekr-field-foot flex justify-between gap-2 mt-1 text-[12px]">
            {fieldError ? <span id={errorId} className="ekr-err text-danger" role="alert">{fieldError}</span> : null}
            <span className="ekr-count ml-auto text-muted [font-variant-numeric:tabular-nums]">{note.length}/{REVIEW_NOTE_MAX}</span>
          </div>
        </div>
        {isReject ? (
          <div className="ekr-chips flex flex-wrap gap-1.5" aria-label="Lý do gợi ý">
            {REJECT_NOTE_SUGGESTIONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className="ekr-chip py-1 px-2 border border-line-strong rounded-sm bg-white text-secondary text-[12px] text-left hover:not-disabled:border-brand hover:not-disabled:text-primary"
                disabled={state.isLoading}
                onClick={() => {
                  setNote(reason);
                  setFieldError('');
                }}
              >
                {reason}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
