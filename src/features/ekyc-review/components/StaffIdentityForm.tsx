import { useId } from 'react';
import { cardTypeLabel } from '../mappers/attemptDisplay';
import {
  GENDER_OPTIONS,
  STAFF_CARD_TYPES,
  type IdentityErrors,
  type IdentityFieldKey,
  type IdentityFormField,
  type IdentityValues,
} from '../mappers/identityForm';

interface StaffIdentityFormProps {
  /** Câu hướng dẫn đầu form, theo chế độ điền chỗ trống hay sửa bản nháp. */
  legend: string;
  fields: readonly IdentityFormField[];
  values: IdentityValues;
  errors: IdentityErrors;
  noExpiry: boolean;
  disabled: boolean;
  onChange: (key: IdentityFieldKey, value: string) => void;
  onNoExpiryChange: (value: boolean) => void;
}

const LABEL = 'block text-primary text-[13px] font-semibold';

/**
 * Các trường định danh nhân viên đọc từ ảnh thẻ: điền chỗ trống (hồ sơ AI gặp sự cố) hoặc sửa bản nháp đã điền sẵn (hồ sơ
 * người dùng báo sai). Trường bắt buộc có dấu "*". Lỗi định dạng hiện dưới từng ô, lỗi nghiệp vụ do backend trả qua toast.
 */
export function StaffIdentityForm({ legend, fields, values, errors, noExpiry, disabled, onChange, onNoExpiryChange }: StaffIdentityFormProps) {
  const baseId = useId();
  const hasExpiry = fields.some((field) => field.key === 'expiryDate');

  return (
    <fieldset className="grid grid-cols-2 gap-x-3 gap-y-2.5 max-[600px]:grid-cols-1" disabled={disabled}>
      <legend className="mb-2 text-[13px] text-secondary">{legend}</legend>
      {fields.map((field) => {
        const id = `${baseId}-${field.key}`;
        const errorId = `${id}-err`;
        const error = errors[field.key];
        const value = values[field.key] ?? '';
        const describedBy = error ? errorId : undefined;
        const wide = field.kind === 'text';
        const expiryLocked = field.key === 'expiryDate' && noExpiry;
        return (
          <div key={field.key} className={wide ? 'col-span-2 grid gap-1 max-[600px]:col-span-1' : 'grid gap-1'}>
            <label className={LABEL} htmlFor={id}>
              {field.label}
              {field.required && !expiryLocked ? <span className="text-danger"> *</span> : null}
            </label>
            {field.kind === 'cardType' || field.kind === 'gender' ? (
              <select
                id={id}
                className="ui-select w-full"
                value={value}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                onChange={(event) => onChange(field.key, event.target.value)}
              >
                <option value="">Chọn</option>
                {(field.kind === 'cardType' ? STAFF_CARD_TYPES : GENDER_OPTIONS).map((option) => (
                  <option key={option} value={option}>{field.kind === 'cardType' ? cardTypeLabel(option) : option}</option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                className="ui-input"
                value={expiryLocked ? '' : value}
                disabled={expiryLocked}
                inputMode={field.kind === 'idNumber' ? 'numeric' : undefined}
                maxLength={field.kind === 'idNumber' ? 12 : field.kind === 'date' ? 10 : 255}
                placeholder={field.kind === 'date' ? 'dd/mm/yyyy' : undefined}
                autoComplete="off"
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            )}
            {error ? <span id={errorId} className="text-[12px] text-danger" role="alert">{error}</span> : null}
          </div>
        );
      })}
      {hasExpiry ? (
        <label className="col-span-2 flex items-center gap-2 text-[13px] text-primary max-[600px]:col-span-1">
          <input type="checkbox" className="accent-brand" checked={noExpiry} onChange={(event) => onNoExpiryChange(event.target.checked)} />
          Thẻ ghi "Không thời hạn"
        </label>
      ) : null}
    </fieldset>
  );
}
