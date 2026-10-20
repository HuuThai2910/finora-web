import { useId, useState, type FormEvent } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { useVerifyProofMutation } from '../api/proofApi';
import { parseArtifact } from '../schemas/proofInputs';
import { VerifyResults } from './VerifyResults';

/**
 * Kiểm toàn vẹn một proof (`POST /verify`). Dán dữ liệu gốc là tùy chọn: có thì backend tính lại hash theo đúng cách
 * tính đã dùng và so với hash đã neo; luôn đối chiếu bản ghi cơ sở dữ liệu với Fabric. JSON được kiểm ở trình duyệt
 * trước khi gửi; lỗi của backend (ví dụ `PROOF_ARTIFACT_INVALID`) hiện kèm mã lỗi. Kết quả chỉ để xem, không sửa
 * dữ liệu phía nào. Trang cha đặt `key` theo proof để kết quả của proof trước không lẫn sang.
 */
export function VerifyPanel({ proofId }: { proofId: string }) {
  const [text, setText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [verifyProof, state] = useVerifyProofMutation();
  const fieldId = useId();
  const hintId = useId();
  const errorId = useId();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.isLoading) return;
    const input = parseArtifact(text);
    if (input.kind === 'invalid') {
      setInputError(input.message);
      return;
    }
    setInputError(null);
    // Không `unwrap`: kết quả và lỗi nằm trong `state` của mutation để hiển thị ngay dưới form.
    await verifyProof({ proofId, artifact: input.kind === 'valid' ? input.artifact : undefined });
  };

  return (
    <div className="bc-verify">
      <form onSubmit={submit} noValidate>
        <label className="bc-label" htmlFor={fieldId}>Dữ liệu gốc của event (không bắt buộc)</label>
        <textarea
          id={fieldId}
          className="bc-textarea"
          value={text}
          spellCheck={false}
          placeholder="{ ... }"
          aria-invalid={inputError ? true : undefined}
          aria-describedby={inputError ? `${hintId} ${errorId}` : hintId}
          onChange={(event) => {
            setText(event.target.value);
            if (inputError) setInputError(null);
          }}
        />
        <p id={hintId} className="bc-muted">
          Dán object data của event nguồn (không phải cả envelope). Bỏ trống thì chỉ đối chiếu cơ sở dữ liệu với sổ cái.
        </p>
        {inputError && <p id={errorId} className="bc-err" role="alert">{inputError}</p>}
        <button type="submit" className="ui-btn primary" disabled={state.isLoading}>
          {state.isLoading ? 'Đang kiểm tra...' : 'Kiểm tra'}
        </button>
      </form>
      {state.error && !state.isLoading && <ErrorNotice error={state.error} />}
      {state.data && !state.isLoading && !state.error && <VerifyResults result={state.data} />}
    </div>
  );
}
