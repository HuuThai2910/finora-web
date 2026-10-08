import { useId, useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { useDecideRescheduleMutation } from '../api/servicingApi';
import { REJECT_REASON_SUGGESTIONS, RESCHEDULE_TYPE_LABEL } from '../constant';
import { useIntentKey } from '../hooks/useIntentKey';
import type { RescheduleDecision, RescheduleRequest } from '../types';

interface Props {
  request: RescheduleRequest;
  decision: RescheduleDecision;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** `AdminLoanRescheduleDecisionRequest.comment` tối đa 500 ký tự. */
const COMMENT_MAX = 500;

/**
 * Duyệt hoặc từ chối một yêu cầu cơ cấu.
 *
 * Idempotency key gắn với ý định "quyết định này cho yêu cầu này" và giữ suốt lúc hộp thoại mở, kể cả
 * khi sửa lời nhắn rồi gửi lại: Loan Service trả lại kết quả cũ khi gặp đúng key quyết định đã ghi,
 * nên lỗi mạng sau khi backend đã xử lý không biến thành lỗi "không còn chờ duyệt". Từ chối bắt buộc có
 * lý do (backend cũng kiểm tra `REJECTION_REASON_REQUIRED`).
 */
export function RescheduleDecisionModal({ request, decision, onClose, onDone }: Props) {
  const fieldId = useId();
  const [comment, setComment] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [decide, state] = useDecideRescheduleMutation();
  const intent = useIntentKey(`reschedule-${decision}`);
  const isReject = decision === 'reject';
  const typeLabel = RESCHEDULE_TYPE_LABEL[request.requestType] ?? request.requestType;

  const submit = async () => {
    if (state.isLoading) return;
    const trimmed = comment.trim();
    if (isReject && !trimmed) {
      setFieldError('Nhập lý do từ chối.');
      return;
    }
    setFieldError('');
    const key = intent.keyFor(`${request.requestId}:${decision}`);
    try {
      await decide({ requestId: request.requestId, decision, comment: trimmed || null, key }).unwrap();
    } catch {
      // Lỗi hiện trong hộp thoại qua `state.error` (kèm traceId); giữ key để bấm gửi lại.
      return;
    }
    onDone(isReject
      ? `Đã từ chối yêu cầu cơ cấu của khoản vay ${request.loanNumber}.`
      : `Đã duyệt yêu cầu của khoản vay ${request.loanNumber}. Lịch trả nợ mới đang được lập.`);
  };

  return (
    <Modal
      title={isReject ? 'Từ chối yêu cầu cơ cấu' : 'Duyệt yêu cầu cơ cấu'}
      subtitle={`Khoản vay ${request.loanNumber}, ${typeLabel.toLowerCase()}`}
      onClose={onClose}
      busy={state.isLoading}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={state.isLoading}>Hủy</button>
          <button type="button" className={isReject ? 'ui-btn danger' : 'ui-btn primary'} onClick={submit} disabled={state.isLoading}>
            {state.isLoading ? 'Đang gửi...' : isReject ? 'Từ chối yêu cầu' : 'Duyệt yêu cầu'}
          </button>
        </>
      )}
    >
      <div className="svc-modal-body">
        {!isReject && (
          <p>Sau khi duyệt, hệ thống lập lịch trả nợ mới theo đề nghị của người vay; yêu cầu rời khỏi hàng chờ.</p>
        )}
        <div>
          <label className="svc-label" htmlFor={fieldId}>{isReject ? 'Lý do từ chối' : 'Ghi chú (không bắt buộc)'}</label>
          <textarea
            id={fieldId}
            className="svc-input"
            rows={3}
            maxLength={COMMENT_MAX}
            value={comment}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? `${fieldId}-err` : undefined}
            onChange={(event) => setComment(event.target.value)}
          />
          {fieldError && <p id={`${fieldId}-err`} className="svc-err" role="alert">{fieldError}</p>}
        </div>
        {isReject && (
          <div className="svc-chips" aria-label="Lý do gợi ý">
            {REJECT_REASON_SUGGESTIONS.map((reason) => (
              <button key={reason} type="button" className="svc-chip" onClick={() => { setComment(reason); setFieldError(''); }}>
                {reason}
              </button>
            ))}
          </div>
        )}
        {state.error && <ErrorNotice error={state.error} />}
      </div>
    </Modal>
  );
}
