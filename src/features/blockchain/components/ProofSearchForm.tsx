import { useId, useState, type FormEvent } from 'react';
import { REFERENCE_TYPES } from '../constants';
import { useLoanReferenceResolver } from '../hooks/useLoanReferenceResolver';
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
 * Tra bằng chứng theo tham chiếu nghiệp vụ, đúng hai tham số `referenceType` và `referenceId` mà explorer nhận. Bản
 * nháp là state của form; chỉ khi bấm "Tra cứu" mới ghi lên URL và gọi API. Hồ sơ vay nhận cả mã LA-… (đổi ra ID số
 * trước khi tra) lẫn ID số.
 */
export function ProofSearchForm({ applied, onSearch, onClear }: Props) {
  const [type, setType] = useState<ProofReferenceType>(applied?.type ?? 'LOAN_APPLICATION');
  const [id, setId] = useState(applied?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const placeholder = REFERENCE_TYPES.find((item) => item.value === type)?.placeholder ?? '';
  const { resolve, resolving } = useLoanReferenceResolver();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resolving) return;
    const problem = validateReference(type, id);
    setError(problem);
    if (problem) return;
    const result = await resolve({ type, id: id.trim() });
    if (result.ok) onSearch(result.reference);
    else setError(result.message);
  };

  return (
    <form
      className="bc-search flex flex-wrap items-center gap-2 max-[760px]:w-full"
      role="search"
      aria-label="Tra bằng chứng theo tham chiếu"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <label className="max-[760px]:w-full">
        <span className="ui-sr-only">Loại tham chiếu</span>
        <select
          className="ui-select max-[760px]:w-full"
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
      <label className="max-[760px]:w-full">
        <span className="ui-sr-only">Mã tham chiếu</span>
        {/* `font: inherit` của CSS cũ ghi thành từng phần (shorthand `font` sẽ ghi đè cỡ chữ). */}
        <input
          className={
            'bc-input h-8.5 w-60 rounded-md border border-line-strong bg-white px-2.5 font-[inherit] '
            + '[font-style:inherit] [font-weight:inherit] text-[14px] leading-[inherit] text-primary focus:border-brand '
            + 'focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] focus:[outline:0] aria-invalid:border-danger max-[760px]:w-full'
          }
          value={id}
          maxLength={100}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setId(event.target.value)}
        />
      </label>
      <button type="submit" className="ui-btn ghost" disabled={resolving}>{resolving ? 'Đang tìm hồ sơ...' : 'Tra cứu'}</button>
      {applied && <button type="button" className="ui-btn soft" onClick={onClear}>Xóa tra cứu</button>}
      {error && <p id={errorId} className="bc-err basis-full text-[12px] text-danger" role="alert">{error}</p>}
    </form>
  );
}
