import { useId, useState, type FormEvent } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { useVerifyProofMutation } from '../api/proofApi';
import { parseArtifact } from '../schemas/proofInputs';
import { BC_DETAILS, BC_DETAILS_SUMMARY, BC_MUTED, BC_VERIFY_MAIN } from '../styles';
import type { Proof } from '../types';
import { VerifyResults } from './VerifyResults';

/**
 * Kiểm toàn vẹn một proof (`POST /verify`). Dán dữ liệu gốc là tùy chọn: có thì backend tính lại hash theo đúng cách
 * tính đã dùng và so với hash đã neo; luôn đối chiếu bản ghi cơ sở dữ liệu với Fabric. JSON được kiểm ở trình duyệt
 * trước khi gửi; lỗi của backend (ví dụ `PROOF_ARTIFACT_INVALID`) hiện kèm mã lỗi. Kết quả chỉ để xem, không sửa
 * dữ liệu phía nào. Trang cha đặt `key` theo proof để kết quả của proof trước không lẫn sang.
 */
export function VerifyPanel({ proof }: { proof: Proof }) {
  const { proofId } = proof;
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
    <div className="bc-verify grid gap-3">
      <div className={BC_VERIFY_MAIN}>
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
      {state.data && !state.isLoading && !state.error && <VerifyResults result={state.data} proof={proof} />}

      <details className={`bc-audit-tool ${BC_DETAILS}`}>
        <summary className={BC_DETAILS_SUMMARY}>Kiểm tra chuyên sâu bằng dữ liệu nguồn</summary>
        <div className="bc-audit-tool-body p-3">
          <p className={`${BC_MUTED} mb-2.5`}>
            Chỉ dành cho kiểm toán kỹ thuật. Cần lấy đúng phần data của sự kiện nguồn; người dùng thông thường không cần thao tác này.
          </p>
          <form className="grid justify-items-start gap-2" onSubmit={submitArtifact} noValidate>
            <label className="bc-label text-[13px] font-medium text-primary" htmlFor={fieldId}>JSON data của sự kiện nguồn</label>
            <textarea
              id={fieldId}
              className={
                'bc-textarea min-h-30 w-full resize-y rounded-md border border-line-strong bg-white px-2.5 py-2 font-mono '
                + 'text-[12px] leading-normal text-primary focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] '
                + 'focus:[outline:0] aria-invalid:border-danger'
              }
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
            <p id={hintId} className={BC_MUTED}>Không dán toàn bộ envelope có eventId, version và occurredAt.</p>
            {inputError && <p id={errorId} className="bc-err basis-full text-[12px] text-danger" role="alert">{inputError}</p>}
            <button type="submit" className="ui-btn ghost" disabled={state.isLoading}>
              {state.isLoading ? 'Đang tính lại hash...' : 'Tính lại hash từ dữ liệu nguồn'}
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
