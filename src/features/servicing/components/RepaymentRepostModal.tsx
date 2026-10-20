import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { formatDate } from '@/utils';
import { useRepostRepaymentMutation } from '../api/paymentIncidentApi';
import { REPAYMENT_TYPE_LABEL } from '../constant';
import { money } from '../formatters';
import type { RepaymentIncident } from '../types';

interface Props {
  item: RepaymentIncident;
  onClose: () => void;
  onDone: (message: string) => void;
}

/**
 * Ghi lại vào hệ thống lõi một khoản trả nợ chờ đối soát (B32).
 *
 * Payment tra Fineract theo mã giao dịch trước: core đã có thì chỉ ghi nhận kết quả. Chưa có thì ghi với đúng mã, số tiền
 * và ngày ghi nhận ban đầu, nên không thể thành hai giao dịch. Fineract từ chối và tra lại vẫn không có thì tiền hoàn về ví
 * người vay. Không cần idempotency key: thao tác chỉ chạy từ trạng thái chờ đối soát, bấm lại sẽ nhận 409.
 */
export function RepaymentRepostModal({ item, onClose, onDone }: Props) {
  const [repost, state] = useRepostRepaymentMutation();
  const typeLabel = REPAYMENT_TYPE_LABEL[item.repaymentType] ?? item.repaymentType;

  const submit = async () => {
    if (state.isLoading) return;
    try {
      const result = await repost(item.repaymentId).unwrap();
      if (result.status === 'FAILED') {
        onDone(`Hệ thống lõi từ chối giao dịch ${item.repaymentId} và không có bản ghi nào; tiền đã hoàn về ví người vay.`);
      } else if (result.status === 'RECONCILIATION_REQUIRED') {
        onDone(`Chưa xác định được kết quả ghi giao dịch ${item.repaymentId}; giao dịch vẫn chờ đối soát.`);
      } else {
        onDone(`Đã ghi giao dịch ${item.repaymentId} vào hệ thống lõi; tiền sẽ được chia cho nhà đầu tư ở lượt xử lý kế tiếp.`);
      }
    } catch {
      // Lỗi hiện trong hộp thoại qua `state.error` (kèm traceId).
    }
  };

  return (
    <Modal
      title="Ghi lại vào hệ thống lõi"
      subtitle={`${typeLabel}, hồ sơ #${item.loanApplicationId}, ${money(item.amount)}`}
      onClose={onClose}
      busy={state.isLoading}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={state.isLoading}>Hủy</button>
          <button type="button" className="ui-btn primary" onClick={submit} disabled={state.isLoading}>
            {state.isLoading ? 'Đang ghi...' : 'Tra cứu rồi ghi lại'}
          </button>
        </>
      )}
    >
      <div className="svc-modal-body">
        <p>
          FINORA tra Fineract theo mã giao dịch trước. Nếu hệ thống lõi đã có giao dịch, FINORA chỉ ghi nhận kết quả. Nếu chưa
          có, FINORA ghi với đúng mã, số tiền và ngày ghi nhận {formatDate(item.corePostingDate)}, nên không thể thành hai giao dịch.
        </p>
        <p>Nếu Fineract từ chối và tra lại vẫn không có giao dịch, tiền được hoàn về ví người vay.</p>
        {state.error && <ErrorNotice error={state.error} />}
      </div>
    </Modal>
  );
}
