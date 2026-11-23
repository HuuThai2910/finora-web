import { useId, useState } from 'react';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';
import { isAttemptAlreadyDecided, isAttemptWithdrawn } from '../api/ekycReviewApi';
import { useDecideEkycAttemptMutation } from '../api/ekycReviewQueries';
import { FACE_REJECT_NOTE_SUGGESTIONS, REJECT_NOTE_SUGGESTIONS, REVIEW_NOTE_MAX } from '../constants';
import { hasFaceEvidence } from '../mappers/evidenceDisplay';
import {
  identityFormFields,
  identityFormMode,
  initialIdentity,
  toStaffCorrections,
  toStaffIdentity,
  validateIdentity,
  type IdentityErrors,
  type IdentityFormMode,
  type IdentityValues,
} from '../mappers/identityForm';
import type { EkycAttemptDetail, EkycReviewDecision } from '../types';
import { StaffIdentityForm } from './StaffIdentityForm';

/** Vì sao quyết định không thực hiện được do người khác: quản trị viên khác đã xử lý, hoặc người dùng đã rút lại. */
export type DecisionConflict = 'decided' | 'withdrawn';

/** Câu báo đầu form nhập thông tin, theo chế độ. */
const IDENTITY_NOTICE: Record<IdentityFormMode, string> = {
  fill: 'Hệ thống không đọc được thẻ của hồ sơ này. Nhập thông tin theo ảnh thẻ trước khi duyệt.',
  correct: 'Người dùng báo thông tin đọc từ thẻ chưa đúng. Đối chiếu từng trường với ảnh thẻ, sửa trường sai rồi duyệt.',
};

const IDENTITY_LEGEND: Record<IdentityFormMode, string> = {
  fill: 'Đối chiếu ảnh hai mặt thẻ rồi nhập đúng như in trên thẻ.',
  correct: 'Sửa trường sai cho đúng như in trên thẻ; trường đúng giữ nguyên.',
};

interface ReviewDecisionModalProps {
  attempt: EkycAttemptDetail;
  decision: EkycReviewDecision;
  onClose: () => void;
  onDone: (message: string) => void;
  /** Quản trị viên khác đã quyết định trước, hoặc người dùng đã rút lại (409): trang đóng hộp thoại và báo, dữ liệu tự tải lại. */
  onConflict: (reason: DecisionConflict) => void;
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
 *
 * Hồ sơ AI gặp sự cố (không đọc được thẻ): duyệt phải kèm các trường định danh còn trống, nhân viên đọc từ ảnh thẻ
 * ({@link StaffIdentityForm}); backend kiểm lại toàn bộ (đủ 18 tuổi, thẻ còn hạn, trùng số).
 *
 * Hồ sơ người dùng báo thông tin sai: form điền sẵn bản nháp, nhân viên sửa trường sai, chỉ trường đã đổi được gửi
 * (không sửa gì thì duyệt nguyên bản nháp).
 */
export function ReviewDecisionModal({ attempt, decision, onClose, onDone, onConflict, displayName }: ReviewDecisionModalProps) {
  const fieldId = useId();
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [decide, state] = useDecideEkycAttemptMutation();
  const isReject = decision === 'reject';
  const name = displayName || attempt.email;
  const mode = isReject ? null : identityFormMode(attempt);
  const identityFields = mode ? identityFormFields(attempt, mode) : [];
  // Giá trị điền sẵn lấy một lần lúc mở hộp thoại; so với nó để biết nhân viên đã sửa trường nào.
  const [initial] = useState(() => initialIdentity(attempt, mode));
  const [identity, setIdentity] = useState<IdentityValues>(initial.values);
  const [identityErrors, setIdentityErrors] = useState<IdentityErrors>({});
  const [noExpiry, setNoExpiry] = useState(initial.noExpiry);

  const submit = async () => {
    if (state.isLoading) return;
    const trimmed = note.trim();
    if (isReject && !trimmed) {
      setFieldError('Nhập lý do từ chối.');
      return;
    }
    setFieldError('');
    if (mode) {
      const errors = validateIdentity(identityFields, identity, noExpiry);
      setIdentityErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }
    try {
      await decide({
        attemptId: attempt.attemptId,
        decision,
        note: trimmed,
        userProfileId: attempt.userProfileId,
        identity: mode === 'fill'
          ? toStaffIdentity(identityFields, identity, noExpiry)
          : mode === 'correct'
            ? toStaffCorrections(identityFields, identity, noExpiry, initial)
            : undefined,
      }).unwrap();
    } catch (error) {
      if (isAttemptAlreadyDecided(error)) onConflict('decided');
      else if (isAttemptWithdrawn(error)) onConflict('withdrawn');
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
      wide={mode !== null}
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
        {mode ? (
          <div className="mb-2 grid gap-2 border-b border-b-divider pb-3.5">
            <p className="py-2 px-3 rounded-md bg-warning-bg text-warning text-[13px] font-medium">
              {IDENTITY_NOTICE[mode]}
            </p>
            <StaffIdentityForm
              legend={IDENTITY_LEGEND[mode]}
              fields={identityFields}
              values={identity}
              errors={identityErrors}
              noExpiry={noExpiry}
              disabled={state.isLoading}
              onChange={(key, value) => {
                setIdentity((current) => ({ ...current, [key]: value }));
                if (identityErrors[key]) setIdentityErrors((current) => ({ ...current, [key]: undefined }));
              }}
              onNoExpiryChange={(value) => {
                setNoExpiry(value);
                if (value) setIdentityErrors((current) => ({ ...current, expiryDate: undefined }));
              }}
            />
          </div>
        ) : null}
        {/* Lý do từ chối được trả cho app khách (GET /users/me/ekyc-status); ghi chú khi duyệt chỉ để nội bộ. */}
        <label className="ekr-label block text-primary text-[13px] font-semibold" htmlFor={fieldId}>
          {isReject ? 'Lý do gửi cho khách' : 'Ghi chú nội bộ (không bắt buộc)'}
        </label>
        {isReject ? (
          <div className="ekr-chips flex flex-wrap gap-1.5" aria-label="Lý do gợi ý">
            {[...REJECT_NOTE_SUGGESTIONS, ...(hasFaceEvidence(attempt.evidence) ? FACE_REJECT_NOTE_SUGGESTIONS : [])].map((reason) => (
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
