import { useId, useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { useRequeueSagaMutation } from '../api/servicingApi';
import { money } from '../formatters';
import type { DisbursementSagaRepair } from '../types';

interface Props {
  saga: DisbursementSagaRepair;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** `AdminDisbursementSagaRequeueRequest.note`: bắt buộc, tối đa 500 ký tự. */
const NOTE_MAX = 500;

/**
 * Đưa một saga `REPAIR_REQUIRED` về hàng chờ ghi Fineract sau khi vận hành đã xử lý nguyên nhân.
 *
 * Tiền đã chuyển cho người vay; thao tác chỉ chạy lại bước ghi khoản vay vào hệ thống lõi. Booking đối chiếu
 * theo số hợp đồng (externalId) nên không tạo khoản vay thứ hai. Ghi chú bắt buộc vì Loan lưu lại ai sửa,
 * lúc nào và đã làm gì; bấm lại sau khi saga đã rời `REPAIR_REQUIRED` sẽ nhận lỗi 409 và danh sách tự làm mới.
 */
export function SagaRequeueModal({ saga, onClose, onDone }: Props) {
  const fieldId = useId();
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [requeue, state] = useRequeueSagaMutation();

  const submit = async () => {
    if (state.isLoading) return;
    const trimmed = note.trim();
    if (!trimmed) {
      setFieldError('Ghi lại đã kiểm tra gì và xử lý nguyên nhân ra sao.');
      return;
    }
    setFieldError('');
    try {
      await requeue({ sagaId: saga.sagaId, note: trimmed }).unwrap();
    } catch {
      // Lỗi hiện trong hộp thoại qua `state.error` (kèm traceId).
      return;
    }
    onDone(`Đã đưa hợp đồng ${saga.contractNumber} về hàng chờ ghi vào hệ thống lõi.`);
  };

  return (
    <Modal
      title="Ghi lại khoản vay vào hệ thống lõi"
      subtitle={`Hợp đồng ${saga.contractNumber}, ${money(saga.amount)}`}
      onClose={onClose}
      busy={state.isLoading}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={state.isLoading}>Hủy</button>
          <button type="button" className="ui-btn primary" onClick={submit} disabled={state.isLoading}>
            {state.isLoading ? 'Đang gửi...' : 'Đưa về hàng chờ ghi lại'}
          </button>
        </>
      )}
    >
      <div className="svc-modal-body">
        <p>
          Tiền đã chuyển cho người vay nhưng hệ thống lõi chưa ghi nhận khoản vay. Trước khi chạy lại, tra Fineract theo số
          hợp đồng và xử lý nguyên nhân lỗi. Hệ thống đối chiếu theo số hợp đồng nên không tạo khoản vay thứ hai.
        </p>
        {saga.lastErrorCode && (
          <p className="svc-muted">
            Lỗi gần nhất: <span className="ui-mono">{saga.lastErrorCode}</span>
            {saga.lastErrorDetail ? `. ${saga.lastErrorDetail}` : ''}
          </p>
        )}
        <div>
          <label className="svc-label" htmlFor={fieldId}>Ghi chú xử lý</label>
          <textarea
            id={fieldId}
            className="svc-input"
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? `${fieldId}-err` : undefined}
            onChange={(event) => setNote(event.target.value)}
          />
          {fieldError && <p id={`${fieldId}-err`} className="svc-err" role="alert">{fieldError}</p>}
        </div>
        {state.error && <ErrorNotice error={state.error} />}
      </div>
    </Modal>
  );
}
