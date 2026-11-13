import { useId, useState } from 'react';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';
import { isAttemptAlreadyDecided } from '../api/ekycReviewApi';
import { useDecideEkycAttemptMutation } from '../api/ekycReviewQueries';
import { REJECT_NOTE_SUGGESTIONS, REVIEW_NOTE_MAX } from '../constants';
import type { EkycAttemptDetail, EkycReviewDecision } from '../types';

interface ReviewDecisionModalProps {
  attempt: EkycAttemptDetail;
  decision: EkycReviewDecision;
  onClose: () => void;
  onDone: (message: string) => void;
  /** Quản trị viên khác đã quyết định trước (409): trang đóng hộp thoại và báo, dữ liệu tự tải lại. */
  onConflict: () => void;
  /** Họ tên khách nếu đã có, để tiêu đề phụ và thông báo gọi đúng người; không có thì dùng email của lượt. */
  displayName?: string | null;
}

/**
 * Duyệt hoặc từ chối một lượt eKYC kèm ghi chú.
 *
 * Từ chối bắt buộc có ghi chú (backend cũng kiểm). Nút gửi khoá trong lúc chạy và hộp thoại không đóng
 * giữa chừng, nên không gửi trùng. Backend khoá lạc quan bằng `@Version`: bên bấm sau nhận
 * `ATTEMPT_ALREADY_DECIDED`, khi đó không gửi lại mà để trang tải trạng thái mới. Lỗi khác (mạng, quyền,
 * số định danh đã thuộc tài khoản khác…) hiện ngay trong hộp thoại kèm mã lỗi để người duyệt xử lý.
 */
export function ReviewDecisionModal({ attempt, decision, onClose, onDone, onConflict, displayName }: ReviewDecisionModalProps) {
  const fieldId = useId();
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [decide, state] = useDecideEkycAttemptMutation();
  const isReject = decision === 'reject';
  const name = displayName || attempt.email;

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
    onDone(isReject ? `Đã từ chối xác minh của ${name}.` : `Đã duyệt xác minh của ${name}.`);
  };

  const errorId = `${fieldId}-err`;

  return (
    <Modal
      title={isReject ? 'Từ chối xác minh' : 'Duyệt xác minh'}
      subtitle={name}
      onClose={onClose}
      busy={state.isLoading}
      dismissOnBackdrop={false}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={state.isLoading}>Hủy</button>
          <button type="button" className={isReject ? 'ui-btn danger' : 'ui-btn primary'} onClick={submit} disabled={state.isLoading}>
            {state.isLoading ? 'Đang gửi...' : isReject ? 'Từ chối' : 'Duyệt'}
          </button>
        </>
      )}
    >
      <div className="ekr-modal-body grid gap-2">
        {/* Lý do từ chối được trả cho app khách (GET /users/me/ekyc-status); ghi chú khi duyệt chỉ để nội bộ. */}
        <label className="ekr-label block text-primary text-[13px] font-semibold" htmlFor={fieldId}>
          {isReject ? 'Lý do gửi cho khách' : 'Ghi chú nội bộ (không bắt buộc)'}
        </label>
        {isReject ? (
          <div className="ekr-chips flex flex-wrap gap-1.5" aria-label="Lý do gợi ý">
            {REJECT_NOTE_SUGGESTIONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className="ekr-chip py-1 px-2.5 rounded-full bg-[#eef2fa] text-secondary text-[12px] text-left hover:not-disabled:bg-[#e3e9f6] hover:not-disabled:text-primary"
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
        {/* Font lấy theo hộp thoại thay cho font mặc định của textarea (ghi từng thuộc tính: `font: inherit` sẽ đè cỡ chữ). */}
        <textarea
          id={fieldId}
          className="ekr-textarea w-full min-h-24 py-2 px-2.5 border border-line-strong rounded-md bg-white text-primary font-[inherit] [font-style:inherit] [font-weight:inherit] text-[14px] leading-normal resize-y focus:[outline:0] focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] aria-invalid:border-danger"
          rows={4}
          maxLength={REVIEW_NOTE_MAX}
          value={note}
          disabled={state.isLoading}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? errorId : undefined}
          onChange={(event) => {
            setNote(event.target.value);
            if (fieldError) setFieldError('');
          }}
        />
        {fieldError ? <span id={errorId} className="ekr-err text-[12px] text-danger" role="alert">{fieldError}</span> : null}
      </div>
    </Modal>
  );
}
