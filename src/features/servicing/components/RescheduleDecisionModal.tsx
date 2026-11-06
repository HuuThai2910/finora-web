import { useId, useState } from 'react';
import { Modal } from '@/components/Modal';
import { useDecideRescheduleMutation } from '../api/servicingApi';
import { REJECT_REASON_SUGGESTIONS, RESCHEDULE_TYPE_LABEL } from '../constant';
import { useIntentKey } from '../hooks/useIntentKey';
import { rescheduleChangeText } from '../mappers/rescheduleDisplay';
import { SVC_FIELD_ERROR, SVC_LABEL, SVC_TEXTAREA } from '../styles';
import type { RescheduleDecision, RescheduleRequest } from '../types';
import { ErrorToast } from '@/components/ErrorToast';

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
 * lý do (backend cũng kiểm tra `REJECTION_REASON_REQUIRED`). Hộp nhắc lại nội dung xin thay đổi và lý do người vay nêu
 * để người duyệt viết lý do đúng với đề nghị, không phải quay lại bảng.
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
      : `Đã thẩm định đạt yêu cầu của khoản vay ${request.loanNumber}. Đang chờ toàn bộ nhà đầu tư đồng ý.`);
  };

  return (
    <Modal
      title={isReject ? 'Từ chối yêu cầu cơ cấu' : 'Xác nhận thẩm định đạt'}
      subtitle={`Khoản vay ${request.loanNumber}, ${typeLabel.toLowerCase()}`}
      onClose={onClose}
      busy={state.isLoading}
      dismissOnBackdrop={false}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={state.isLoading}>Hủy</button>
          <button type="button" className={isReject ? 'ui-btn danger' : 'ui-btn primary'} onClick={submit} disabled={state.isLoading}>
            {state.isLoading ? 'Đang gửi...' : isReject ? 'Từ chối yêu cầu' : 'Chuyển nhà đầu tư đồng ý'}
          </button>
        </>
      )}
    >
      <div className="svc-modal-body grid gap-3">
        <dl className="svc-request ui-rows rounded-md bg-surface-muted px-3 py-0.5 [&_dd]:text-left [&_dd]:font-normal [&_dd]:text-primary [&_div]:grid [&_div]:grid-cols-[136px_minmax(0,1fr)] [&_div]:items-start max-[480px]:[&_div]:grid-cols-[minmax(0,1fr)] max-[480px]:[&_div]:gap-1">
          <div><dt>Người vay xin</dt><dd>{rescheduleChangeText(request)}</dd></div>
          <div><dt>Lý do người vay nêu</dt><dd className="whitespace-pre-line">{request.reasonComment}</dd></div>
        </dl>
        {!isReject && (
          <p>FINORA chỉ xác nhận đề nghị đạt điều kiện. Lịch cũ vẫn có hiệu lực; hệ thống chỉ gửi sang hệ thống lõi sau khi toàn bộ nhà đầu tư còn nắm dư nợ đồng ý.</p>
        )}
        <div>
          <label className={SVC_LABEL} htmlFor={fieldId}>{isReject ? 'Lý do từ chối' : 'Ghi chú (không bắt buộc)'}</label>
          <textarea
            id={fieldId}
            className={SVC_TEXTAREA}
            rows={3}
            maxLength={COMMENT_MAX}
            value={comment}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? `${fieldId}-err` : undefined}
            onChange={(event) => setComment(event.target.value)}
          />
          {fieldError && <p id={`${fieldId}-err`} className={SVC_FIELD_ERROR} role="alert">{fieldError}</p>}
        </div>
        {isReject && (
          <div className="svc-chips flex flex-wrap gap-1.5" aria-label="Lý do gợi ý">
            {REJECT_REASON_SUGGESTIONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className={
                  'svc-chip rounded-sm border border-line-strong bg-white px-2 py-1 text-left text-[12px] text-secondary '
                  + 'hover:border-brand hover:text-primary'
                }
                onClick={() => { setComment(reason); setFieldError(''); }}
              >
                {reason}
              </button>
            ))}
          </div>
        )}
        {state.error && <ErrorToast error={state.error} />}
      </div>
    </Modal>
  );
}
