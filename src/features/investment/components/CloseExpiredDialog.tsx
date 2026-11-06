import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { formatNumber } from '@/utils';
import { useCloseExpiredListingsMutation, useGetMarketListingsQuery } from '../api/investmentApi';
import { SUMMARY_SAMPLE_SIZE } from '../constants';
import { formatDateTime, formatPercent } from '../formatters';
import { isOverdue } from '../stage';
import { ErrorToast } from '@/components/ErrorToast';

/** Backend đóng tối đa chừng này khoản mỗi lần gọi (`closeExpiredListings(50)` của InvestmentAdminController). */
const CLOSE_BATCH = 50;

interface Props {
  onClose: () => void;
  /** Câu báo kết quả, trang hiện bằng Toast sau khi hộp đóng. */
  onDone: (message: string) => void;
}

/**
 * Xác nhận đóng các khoản quá hạn gọi vốn (`POST /investments/admin/listings/close-expired`).
 *
 * Lệnh của backend đóng mọi khoản quá hạn chứ không theo từng khoản, nên hộp liệt kê đúng những khoản sẽ bị đóng để
 * người bấm biết phạm vi. Danh sách lấy từ mẫu khoản đang gọi vốn (cùng tham số với dải số liệu đầu trang nên dùng
 * chung cache); mẫu chưa phủ hết thì ghi rõ. Đang gửi thì khóa nút và không cho đóng hộp để chống bấm lặp.
 */
export function CloseExpiredDialog({ onClose, onDone }: Props) {
  const open = useGetMarketListingsQuery({ status: 'OPEN', page: 0, size: SUMMARY_SAMPLE_SIZE });
  const [closeExpired, state] = useCloseExpiredListingsMutation();
  // Mốc giờ cố định cho cả lần mở hộp: danh sách không nhảy khi đồng hồ qua hạn của một khoản giữa chừng.
  const [now] = useState(() => new Date());
  const overdue = (open.data?.content ?? []).filter((item) => isOverdue(item, now));
  const partial = open.data != null && open.data.content.length < open.data.totalElements;

  const submit = async () => {
    if (state.isLoading) return;
    try {
      const { closedCount } = await closeExpired().unwrap();
      onDone(closedCount === 0
        ? 'Không có khoản nào quá hạn gọi vốn, không đóng khoản nào.'
        : `Đã đóng ${formatNumber(closedCount)} khoản quá hạn, tiền giữ chỗ đã trả về ví nhà đầu tư.`);
      onClose();
    } catch {
      // Lỗi nằm trong `state.error` và hiện ngay trong hộp; giữ hộp mở để thử lại.
    }
  };

  let body;
  if (open.error) {
    body = <ErrorNotice error={open.error} onRetry={open.refetch} />;
  } else if (!open.data) {
    body = <p className="text-secondary text-[13px]" aria-busy="true">Đang tải danh sách khoản quá hạn...</p>;
  } else if (overdue.length === 0) {
    body = <p className="text-secondary text-[13px]">Hiện không có khoản nào quá hạn gọi vốn.</p>;
  } else {
    body = (
      <>
        <p className="text-secondary text-[13px]">
          Đóng {formatNumber(overdue.length)} khoản đã quá hạn mà chưa gọi đủ vốn. Tiền giữ chỗ của nhà đầu tư được trả
          về ví; khoản đã đóng không mở lại được.
        </p>
        <ul className="fu-expired-list grid max-h-65 overflow-y-auto border border-line rounded-md" aria-label="Khoản sẽ bị đóng">
          {overdue.map((item) => (
            <li key={item.listingId} className="grid gap-0.5 py-2 px-3 border-b border-b-divider text-[13px] last:[border-bottom:0]">
              <span className="font-medium text-primary">
                <span className="ui-mono text-[12px] text-secondary">#{item.loanId}</span> {item.purpose}
              </span>
              <span className="text-muted text-[12px] tabular-nums">
                Hết hạn {formatDateTime(item.fundingClosesAt)}, đã góp {formatPercent(item.fundedPercent)}
              </span>
            </li>
          ))}
        </ul>
        {(partial || overdue.length > CLOSE_BATCH) && (
          <p className="text-muted text-[12px]">
            {partial ? `Danh sách tính trên ${formatNumber(open.data.content.length)} khoản đang gọi vốn mới nhất. ` : ''}
            Mỗi lần hệ thống đóng tối đa {CLOSE_BATCH} khoản; còn sót thì bấm lại.
          </p>
        )}
      </>
    );
  }

  return (
    <Modal
      title="Đóng khoản quá hạn"
      subtitle="Khoản quá hạn cũng được đóng tự động theo chu kỳ."
      onClose={onClose}
      busy={state.isLoading}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={state.isLoading}>Hủy</button>
          <button
            type="button"
            className="ui-btn danger fu-close-expired"
            disabled={state.isLoading || overdue.length === 0}
            onClick={() => void submit()}
          >
            {state.isLoading ? 'Đang đóng...' : overdue.length > 0 ? `Đóng ${formatNumber(overdue.length)} khoản` : 'Đóng khoản quá hạn'}
          </button>
        </>
      )}
    >
      <div className="fu-expired grid gap-3">
        {body}
        {state.error ? <ErrorToast error={state.error} /> : null}
      </div>
    </Modal>
  );
}
