import { useId, useState } from 'react';
import { ErrorToast } from '@/components/ErrorToast';
import { Modal } from '@/components/Modal';
import { useRecoverRescheduleMutation } from '../api/servicingApi';
import { useIntentKey } from '../hooks/useIntentKey';
import { SVC_FIELD_ERROR, SVC_LABEL, SVC_TEXTAREA } from '../styles';
import type { RescheduleRecoveryAction, RescheduleRequest } from '../types';

interface Props {
  request: RescheduleRequest;
  action: RescheduleRecoveryAction;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Xử lý yêu cầu cơ cấu đã hết retry: chạy lại idempotent hoặc đóng và mở khóa lịch cũ. */
export function RescheduleRecoveryModal({ request, action, onClose, onDone }: Props) {
  const fieldId = useId();
  const [comment, setComment] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [recover, state] = useRecoverRescheduleMutation();
  const intent = useIntentKey(`reschedule-${action}`);
  const cancelling = action === 'cancel';

  const submit = async () => {
    if (state.isLoading) return;
    const trimmed = comment.trim();
    if (cancelling && !trimmed) {
      setFieldError('Nhập lý do đóng yêu cầu.');
      return;
    }
    try {
      await recover({
        requestId: request.requestId,
        action,
        comment: trimmed || undefined,
        key: cancelling ? intent.keyFor(`${request.requestId}:cancel`) : undefined,
      }).unwrap();
    } catch {
      return;
    }
    onDone(cancelling
      ? `Đã đóng yêu cầu lỗi của khoản vay ${request.loanNumber}; lịch cũ tiếp tục có hiệu lực.`
      : `Đã đưa yêu cầu của khoản vay ${request.loanNumber} về hàng chờ xử lý lại.`);
  };

  return (
    <Modal
      title={cancelling ? 'Đóng yêu cầu cơ cấu lỗi' : 'Chạy lại yêu cầu cơ cấu'}
      subtitle={`Khoản vay ${request.loanNumber}`}
      onClose={onClose}
      busy={state.isLoading}
      dismissOnBackdrop={false}
      footer={<>
        <button type="button" className="ui-btn ghost" onClick={onClose} disabled={state.isLoading}>Hủy</button>
        <button type="button" className={cancelling ? 'ui-btn danger' : 'ui-btn primary'} onClick={submit} disabled={state.isLoading}>
          {state.isLoading ? 'Đang gửi...' : cancelling ? 'Đóng yêu cầu' : 'Chạy lại'}
        </button>
      </>}
    >
      <div className="svc-modal-body grid gap-3">
        <p>{cancelling
          ? 'Thao tác này giữ lịch cũ và mở lại việc thanh toán. Chỉ đóng khi đã xác nhận không tiếp tục áp dụng lịch mới.'
          : 'Hệ thống đối chiếu marker cũ trên Fineract trước khi gửi lại nên không tạo hai yêu cầu cơ cấu.'}</p>
        {request.lastErrorCode && <p className="svc-muted">Lỗi gần nhất: <span className="ui-mono">{request.lastErrorCode}</span></p>}
        {cancelling && <div>
          <label className={SVC_LABEL} htmlFor={fieldId}>Lý do đóng yêu cầu</label>
          <textarea id={fieldId} className={SVC_TEXTAREA} rows={3} maxLength={500} value={comment}
            aria-invalid={Boolean(fieldError)} onChange={(event) => { setComment(event.target.value); setFieldError(''); }} />
          {fieldError && <p className={SVC_FIELD_ERROR} role="alert">{fieldError}</p>}
        </div>}
        {state.error && <ErrorToast error={state.error} />}
      </div>
    </Modal>
  );
}
