import { useId, useState, type FormEvent } from 'react';
import { REFERENCE_TYPES } from '../constants';
import type { ProofReference } from '../hooks/useProofFilters';
import { validateReference } from '../schemas/proofInputs';
import type { ProofReferenceType } from '../types';

interface Props {
  /** Tham chiếu đang áp dụng trên URL; trang cha đặt `key` theo giá trị này để nạp lại bản nháp khi URL đổi. */
  applied: ProofReference | null;
  onSearch: (reference: ProofReference) => void;
  onClear: () => void;
}

/**
 * Tra proof theo tham chiếu nghiệp vụ, đúng hai tham số `referenceType` và `referenceId` mà explorer nhận. Bản nháp
 * là state của form; chỉ khi bấm "Tra cứu" mới ghi lên URL và gọi API.
 */
export function ProofSearchForm({ applied, onSearch, onClear }: Props) {
  const [type, setType] = useState<ProofReferenceType>(applied?.type ?? 'LOAN_APPLICATION');
  const [id, setId] = useState(applied?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const placeholder = REFERENCE_TYPES.find((item) => item.value === type)?.placeholder ?? '';

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validateReference(type, id);
    setError(problem);
    if (!problem) onSearch({ type, id: id.trim() });
  };

  return (
    <form className="bc-search" role="search" aria-label="Tra bằng chứng theo tham chiếu" onSubmit={submit} noValidate>
      <label>
        <span className="ui-sr-only">Loại tham chiếu</span>
        <select
          className="ui-select"
          value={type}
          onChange={(event) => {
            const next = REFERENCE_TYPES.find((item) => item.value === event.target.value);
            if (next) setType(next.value);
            setError(null);
          }}
        >
          {REFERENCE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label>
        <span className="ui-sr-only">Mã tham chiếu</span>
        <input
          className="bc-input"
          value={id}
          maxLength={100}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setId(event.target.value)}
        />
      </label>
      <button type="submit" className="ui-btn ghost">Tra cứu</button>
      {applied && <button type="button" className="ui-btn soft" onClick={onClear}>Xóa tra cứu</button>}
      {error && <p id={errorId} className="bc-err" role="alert">{error}</p>}
    </form>
  );
}
