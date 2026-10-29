import { useId, useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
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
      // Lỗi còn lại hiện qua `state.error` bên dưới; giữ ghi chú để bấm gửi lại.
      return;
    }
    onDone(isReject
      ? `Đã từ chối lượt eKYC của ${attempt.email}. Người dùng có thể xác minh lại.`
      : `Đã duyệt lượt eKYC của ${attempt.email}. Hồ sơ chuyển sang đã xác minh.`);
  };

  const errorId = `${fieldId}-err`;

  return (
    <Modal
      title={isReject ? 'Từ chối lượt eKYC' : 'Duyệt lượt eKYC'}
      subtitle={attempt.email}
      onClose={onClose}
      busy={state.isLoading}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={state.isLoading}>Hủy</button>
          <button type="button" className={isReject ? 'ui-btn danger' : 'ui-btn primary'} onClick={submit} disabled={state.isLoading}>
            {state.isLoading ? 'Đang gửi...' : isReject ? 'Từ chối lượt này' : 'Duyệt lượt này'}
          </button>
        </>
      )}
    >
      <div className="ekr-modal-body">
        <p>
          {isReject
            ? 'Hồ sơ khách hàng chuyển sang xác minh thất bại. Người dùng có thể làm lại eKYC từ đầu.'
            : 'Hồ sơ khách hàng chuyển sang đã xác minh, các trường định danh được ghi theo bản nháp của lượt này.'}
        </p>
        <div>
          <label className="ekr-label" htmlFor={fieldId}>{isReject ? 'Lý do từ chối' : 'Ghi chú (không bắt buộc)'}</label>
          <textarea
            id={fieldId}
            className="ekr-textarea"
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
          <div className="ekr-field-foot">
            {fieldError ? <span id={errorId} className="ekr-err" role="alert">{fieldError}</span> : null}
            <span className="ekr-count">{note.length}/{REVIEW_NOTE_MAX}</span>
          </div>
        </div>
        {isReject ? (
          <div className="ekr-chips" aria-label="Lý do gợi ý">
            {REJECT_NOTE_SUGGESTIONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className="ekr-chip"
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
        {state.error && !isAttemptAlreadyDecided(state.error) ? <ErrorNotice error={state.error} /> : null}
      </div>
    </Modal>
  );
}
