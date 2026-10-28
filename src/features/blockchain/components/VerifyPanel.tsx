import { useId, useState, type FormEvent } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
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

  const verifyAutomatically = async () => {
    if (state.isLoading) return;
    setInputError(null);
    await verifyProof({ proofId });
  };

  const submitArtifact = async (event: FormEvent<HTMLFormElement>) => {
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
      <div className="bc-verify-main">
        <div>
          <h4>Kiểm tra bằng chứng hiện tại</h4>
          <p>Hệ thống sẽ tự đối chiếu bản ghi đang lưu với bằng chứng trên sổ cái. Bạn không cần nhập dữ liệu.</p>
        </div>
        <button type="button" className="ui-btn primary" disabled={state.isLoading} onClick={() => void verifyAutomatically()}>
          <Icon name="shieldCheck" />
          {state.isLoading ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
        </button>
      </div>
      {state.error && !state.isLoading && <ErrorNotice error={state.error} />}
      {state.data && !state.isLoading && !state.error && <VerifyResults result={state.data} />}

      <details className="bc-audit-tool">
        <summary>Kiểm tra chuyên sâu bằng dữ liệu nguồn</summary>
        <div className="bc-audit-tool-body">
          <p className="bc-muted">
            Chỉ dành cho kiểm toán kỹ thuật. Cần lấy đúng phần data của sự kiện nguồn; người dùng thông thường không cần thao tác này.
          </p>
          <form onSubmit={submitArtifact} noValidate>
            <label className="bc-label" htmlFor={fieldId}>JSON data của sự kiện nguồn</label>
            <textarea
              id={fieldId}
              className="bc-textarea"
              value={text}
              spellCheck={false}
              placeholder={'{ "loanApplicationId": 123, ... }'}
              aria-invalid={inputError ? true : undefined}
              aria-describedby={inputError ? `${hintId} ${errorId}` : hintId}
              onChange={(event) => {
                setText(event.target.value);
                if (inputError) setInputError(null);
              }}
            />
            <p id={hintId} className="bc-muted">Không dán toàn bộ envelope có eventId, version và occurredAt.</p>
            {inputError && <p id={errorId} className="bc-err" role="alert">{inputError}</p>}
            <button type="submit" className="ui-btn ghost" disabled={state.isLoading}>
              {state.isLoading ? 'Đang tính lại hash...' : 'Tính lại hash từ dữ liệu nguồn'}
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
