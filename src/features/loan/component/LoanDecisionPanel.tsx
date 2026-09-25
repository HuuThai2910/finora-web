import { useState } from 'react';

type Props = {
  enabled: boolean;
  approveLoading: boolean;
  rejectLoading: boolean;
  onApprove: () => Promise<void>;
  onReject: (reasonCode: string, reasonDetail?: string) => Promise<void>;
};

/** Chỉ được gắn vào hồ sơ PENDING_REVIEW; trạng thái cuối không còn hiển thị hành động quyết định. */
export default function LoanDecisionPanel({ enabled, approveLoading, rejectLoading, onApprove, onReject }: Props) {
  const [reasonCode, setReasonCode] = useState('INSUFFICIENT_REPAYMENT_CAPACITY');
  const [reasonDetail, setReasonDetail] = useState('');
  const busy = approveLoading || rejectLoading;

  return (
    <article className="review-card review-decision">
      <div className="review-card-heading">
        <div>
          <span className="review-eyebrow">Hành động dành cho chuyên viên</span>
          <h2>Quyết định thẩm định</h2>
        </div>
      </div>
      {!enabled ? (
        <p className="review-explanation">Cần đợi kết quả đánh giá hoàn tất trước khi duyệt hoặc từ chối hồ sơ.</p>
      ) : (
        <p className="review-explanation">
          Khi duyệt, hệ thống dùng đúng lãi suất và lịch trả sau thẩm định hiển thị phía trên.
          Điều khoản không bất lợi sẽ tự tiếp tục theo chấp thuận lúc nộp; điều khoản bất lợi phải chờ người vay xác nhận rồi mới tạo hợp đồng.
        </p>
      )}
      <div className="review-form-row">
        <label>
          <span>Lý do khi từ chối</span>
          <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} disabled={!enabled || busy}>
            <option value="INSUFFICIENT_REPAYMENT_CAPACITY">Khả năng trả nợ chưa đạt</option>
            <option value="IDENTITY_OR_KYC_NOT_ELIGIBLE">KYC không đủ điều kiện</option>
            <option value="INCONSISTENT_DECLARED_INFORMATION">Thông tin khai báo không nhất quán</option>
            <option value="POLICY_NOT_SATISFIED">Không đạt chính sách</option>
            <option value="OTHER_MANUAL_REVIEW">Lý do thẩm định khác</option>
          </select>
        </label>
        <label>
          <span>Giải thích thêm</span>
          <input value={reasonDetail} onChange={(event) => setReasonDetail(event.target.value)} placeholder="Nhập nội dung để người kiểm tra sau hiểu quyết định" disabled={!enabled || busy} />
        </label>
      </div>
      <div className="review-actions">
        <button className="review-button danger" disabled={!enabled || busy} onClick={() => onReject(reasonCode, reasonDetail || undefined)}>
          {rejectLoading ? 'Đang từ chối...' : 'Từ chối'}
        </button>
        <button className="review-button primary" disabled={!enabled || busy} onClick={onApprove}>
          {approveLoading ? 'Đang duyệt...' : 'Phê duyệt điều khoản cuối'}
        </button>
      </div>
    </article>
  );
}
