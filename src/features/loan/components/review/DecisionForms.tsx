import { useState } from 'react';
import { formatMoney, formatPercent } from '../../formatters';
import type { AdminLoanReviewDetail } from '../../types';
import { APPROVE_NOTE_MAX, REJECT_DETAIL_MAX, REJECT_REASONS } from '../../mappers/reviewDisplay';
import { SPINNER } from './reviewClassNames';

/*
 * Hai form xác nhận nằm ngay trong khay quyết định (không mở hộp thoại): người thẩm định vẫn thấy phiếu điểm
 * phía trên khi xác nhận. State nhập liệu là cục bộ của form; khay chỉ biết đang mở form nào.
 */

// Nút trong hàng quyết định cao 36px, lớn hơn nút thường.
export const DECIDE_ROW = 'lr-decide-row flex gap-2 [&_.ui-btn]:h-9 [&_.ui-btn]:px-3.5';

const FIELD = 'grid gap-1 text-[13px] font-medium';

const TEXTAREA =
  'w-full min-h-18 py-1.5 px-2.5 border border-line-strong rounded-md bg-white text-primary font-[inherit] [font-weight:inherit] [font-style:inherit] text-[14px] leading-[1.45] resize-y focus:[outline:0] focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)]';

// Tóm tắt điều khoản sẽ duyệt: nhãn trái, giá trị phải, cùng khuôn với các dòng số liệu của phiếu điểm.
const SUMMARY =
  'lr-approve-summary grid gap-1.5 py-2.5 px-3 rounded-md bg-surface-muted [&_div]:flex [&_div]:justify-between [&_div]:items-baseline [&_div]:gap-3 [&_div]:text-[13px] [&_dt]:text-muted [&_dd]:font-medium [&_dd]:tabular-nums [&_dd]:text-right';

interface ApproveFormProps {
  application: AdminLoanReviewDetail;
  /** Có lần chấm điểm thành công mới nhất; thiếu thì không gửi được (form chỉ mở khi đã duyệt được). */
  canApprove: boolean;
  approving: boolean;
  busy: boolean;
  onCancel: () => void;
  /** Trả về true khi duyệt thành công để khay đóng form. */
  onApprove: (reasonDetail?: string) => Promise<boolean>;
}

/**
 * Form xác nhận duyệt: tóm tắt đúng điều khoản sau định giá mà backend đã tính (frontend không tự tính lại), ghi chú
 * tùy chọn gửi vào `decisionReasonDetail`.
 */
export function ApproveForm({ application, canApprove, approving, busy, onCancel, onApprove }: ApproveFormProps) {
  const [note, setNote] = useState('');
  const disabled = !canApprove || busy;
  // Lịch sau định giá là cơ sở lập hợp đồng; khi chưa có (không xảy ra với hồ sơ duyệt được) lùi về lịch đang áp dụng.
  const firstInstallment = (application.finalSchedule ?? application.schedule).firstInstallment;

  return (
    <form
      className="lr-approve-form grid gap-2.5"
      aria-label="Xác nhận duyệt hồ sơ"
      onSubmit={async (event) => {
        event.preventDefault();
        if (disabled) return;
        const done = await onApprove(note.trim() || undefined);
        if (done) onCancel();
      }}
    >
      <h3 className="text-[14px] font-semibold">Xác nhận duyệt hồ sơ</h3>
      <dl className={SUMMARY}>
        <div><dt>Số tiền vay</dt><dd>{formatMoney(application.requestedAmount)}</dd></div>
        <div><dt>Kỳ hạn</dt><dd>{application.requestedTermMonths} tháng</dd></div>
        <div>
          <dt>Lãi suất sau định giá</dt>
          <dd>{application.finalAnnualInterestRate != null ? `${formatPercent(application.finalAnnualInterestRate)}/năm` : '-'}</dd>
        </div>
        <div><dt>Kỳ trả đầu</dt><dd>{formatMoney(firstInstallment)}</dd></div>
      </dl>
      <p className="lr-tray-note text-secondary text-[13px] leading-normal">
        Nếu điều khoản bất lợi hơn lúc nộp, hệ thống chờ người vay xác nhận rồi mới tạo hợp đồng.
      </p>
      {/*
        Chưa duyệt được số tiền thấp hơn số đề nghị: lịch trả và điều khoản người vay đồng ý được chốt theo số đề nghị
        lúc chấm điểm (xem báo cáo đợt 2). Hướng dẫn cách làm hiện có thay cho ô số tiền duyệt.
      */}
      <p className="lr-tray-note lr-lower-amount text-muted text-[12px] leading-normal">
        Duyệt đúng số tiền người vay đề nghị. Muốn cho vay ít hơn: từ chối với lý do "Khả năng trả nợ chưa đạt" và ghi số
        đề xuất trong ghi chú để người vay nộp hồ sơ mới.
      </p>
      <label className={FIELD}>
        <span>Ghi chú (không bắt buộc)</span>
        <textarea
          className={TEXTAREA}
          value={note}
          maxLength={APPROVE_NOTE_MAX}
          placeholder="Căn cứ duyệt để người kiểm tra sau đối chiếu"
          disabled={busy}
          aria-describedby="lr-approve-note-count"
          onChange={(event) => setNote(event.target.value)}
          autoFocus
        />
        <span id="lr-approve-note-count" className="lr-note-count justify-self-end text-muted text-[12px] font-normal tabular-nums">
          {note.length}/{APPROVE_NOTE_MAX}
        </span>
      </label>
      <div className={DECIDE_ROW}>
        <button type="button" className="ui-btn ghost" disabled={busy} onClick={onCancel}>Hủy</button>
        <button type="submit" className="ui-btn primary lr-grow flex-1" disabled={disabled}>
          {approving ? <><span className={SPINNER} aria-hidden="true" />Đang duyệt...</> : 'Xác nhận duyệt'}
        </button>
      </div>
    </form>
  );
}

interface RejectFormProps {
  canReject: boolean;
  rejecting: boolean;
  busy: boolean;
  onCancel: () => void;
  /** Trả về true khi từ chối thành công để khay đóng form. */
  onReject: (reasonCode: string, reasonDetail?: string) => Promise<boolean>;
}

/** Form lý do từ chối: mã lý do chuẩn của backend và phần giải thích tự do (tối đa 1000 ký tự). */
export function RejectForm({ canReject, rejecting, busy, onCancel, onReject }: RejectFormProps) {
  const [reasonCode, setReasonCode] = useState(REJECT_REASONS[0].code);
  const [reasonDetail, setReasonDetail] = useState('');
  const disabled = !canReject || busy;

  return (
    <form
      className="lr-reject-form grid gap-2.5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (disabled) return;
        const done = await onReject(reasonCode, reasonDetail.trim() || undefined);
        if (done) onCancel();
      }}
    >
      <label className={FIELD}>
        <span>Lý do từ chối</span>
        <select className="ui-select w-full" value={reasonCode} disabled={disabled} onChange={(event) => setReasonCode(event.target.value)} autoFocus>
          {REJECT_REASONS.map((reason) => <option key={reason.code} value={reason.code}>{reason.label}</option>)}
        </select>
      </label>
      <label className={FIELD}>
        <span>Giải thích thêm</span>
        <textarea
          className={TEXTAREA}
          value={reasonDetail}
          maxLength={REJECT_DETAIL_MAX}
          placeholder="Ghi rõ để người kiểm tra sau hiểu quyết định"
          disabled={disabled}
          onChange={(event) => setReasonDetail(event.target.value)}
        />
      </label>
      <div className={DECIDE_ROW}>
        <button type="button" className="ui-btn ghost" disabled={busy} onClick={onCancel}>Hủy</button>
        <button type="submit" className="ui-btn danger lr-grow flex-1" disabled={disabled}>
          {rejecting ? <><span className={SPINNER} aria-hidden="true" />Đang từ chối...</> : 'Xác nhận từ chối'}
        </button>
      </div>
    </form>
  );
}
