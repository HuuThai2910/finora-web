import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Modal } from '@/components/Modal';
import type { UiApiError } from '@/lib/api/errors';
import { MAX_TERM_MONTHS, RATE_CAP_PERCENT } from '../constants';
import { REPAYMENT_LABELS } from '../mappers/productDisplay';
import {
  EMPTY_PRODUCT_FORM,
  displayValue,
  normalizeInput,
  toCreateRequest,
  validateProductForm,
  type ProductForm,
  type ProductTextField,
} from '../mappers/productForm';
import type { CreateLoanProductRequest, RepaymentMethod } from '../types';
import { ActionError } from './ActionError';

interface CreateProductModalProps {
  saving: boolean;
  serverError: UiApiError | null;
  onClose: () => void;
  onCreate: (request: CreateLoanProductRequest) => Promise<void>;
}

const FORM_ID = 'createProductForm';
const REPAYMENT_METHODS: RepaymentMethod[] = ['ANNUITY', 'EQUAL_PRINCIPAL'];

interface FieldProps {
  label: string;
  field: ProductTextField;
  form: ProductForm;
  onChange: (field: ProductTextField, raw: string) => void;
  unit?: string;
  kind?: 'text' | 'code' | 'integer' | 'decimal';
  placeholder?: string;
}

function Field({ label, field, form, onChange, unit, kind = 'text', placeholder }: FieldProps) {
  const numeric = kind === 'integer' || kind === 'decimal';
  return (
    <label className="prod-field">
      <span>{label}</span>
      <div className="prod-in">
        <input
          className={numeric ? 'num' : kind === 'code' ? 'mono' : undefined}
          inputMode={kind === 'integer' ? 'numeric' : kind === 'decimal' ? 'decimal' : undefined}
          autoCapitalize={kind === 'code' ? 'characters' : undefined}
          value={displayValue(field, form[field])}
          placeholder={placeholder}
          onChange={(event) => onChange(field, event.target.value)}
        />
        {unit && <i>{unit}</i>}
      </div>
    </label>
  );
}

/** Hộp thoại tạo sản phẩm vay. Validation client chỉ để báo sớm; lỗi backend hiện ở cuối form. */
export function CreateProductModal({ saving, serverError, onClose, onCreate }: CreateProductModalProps) {
  const [form, setForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  const update = (field: ProductTextField, raw: string) => {
    setForm((current) => ({ ...current, [field]: normalizeInput(field, raw) }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const message = validateProductForm(form);
    setValidationError(message);
    if (!message) void onCreate(toCreateRequest(form));
  };

  const fieldProps = { form, onChange: update };
  const alertRef = useRef<HTMLDivElement>(null);

  // Lỗi nằm cuối form dài: cuộn tới để người dùng thấy ngay sau khi bấm gửi.
  useEffect(() => {
    if (validationError || serverError) alertRef.current?.scrollIntoView({ block: 'nearest' });
  }, [validationError, serverError]);

  return (
    <Modal
      title="Tạo sản phẩm vay"
      wide
      onClose={onClose}
      busy={saving}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="submit" form={FORM_ID} className="ui-btn primary" disabled={saving}>
            {saving ? 'Đang tạo...' : 'Tạo và đồng bộ'}
          </button>
        </>
      )}
    >
      <form id={FORM_ID} className="prod-form" onSubmit={submit} noValidate>
        <fieldset>
          <legend>Thông tin</legend>
          <div className="prod-row">
            <Field label="Tên sản phẩm *" field="name" placeholder="Vay tiêu dùng cá nhân" {...fieldProps} />
            <Field label="Mã sản phẩm *" field="code" kind="code" placeholder="PERSONAL_STANDARD" {...fieldProps} />
          </div>
          <label className="prod-field">
            <span>Mô tả</span>
            <textarea
              value={form.description}
              placeholder="Đối tượng vay, mục đích, điều kiện riêng"
              onChange={(event) => update('description', event.target.value)}
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>Hạn mức và kỳ hạn</legend>
          <div className="prod-row">
            <Field label="Hạn mức tối thiểu *" field="minAmount" kind="integer" unit="đ" {...fieldProps} />
            <Field label="Hạn mức tối đa *" field="maxAmount" kind="integer" unit="đ" {...fieldProps} />
          </div>
          <div className="prod-row">
            <Field label="Kỳ hạn tối thiểu *" field="minTermMonths" kind="integer" unit="tháng" {...fieldProps} />
            <Field label="Kỳ hạn tối đa *" field="maxTermMonths" kind="integer" unit="tháng" {...fieldProps} />
          </div>
          <p className="prod-hint">Kỳ hạn tối đa {MAX_TERM_MONTHS} tháng.</p>
        </fieldset>
        <fieldset>
          <legend>Lãi suất năm</legend>
          <div className="prod-row three">
            <Field label="Tối thiểu *" field="minAnnualInterestRate" kind="decimal" unit="%" {...fieldProps} />
            <Field label="Cơ sở *" field="annualInterestRate" kind="decimal" unit="%" {...fieldProps} />
            <Field label="Tối đa *" field="maxAnnualInterestRate" kind="decimal" unit="%" {...fieldProps} />
          </div>
          <p className="prod-hint">Lãi cơ sở dùng tính lịch trả ban đầu trước thẩm định. Trần {RATE_CAP_PERCENT}%/năm.</p>
        </fieldset>
        <fieldset>
          <legend>Cách trả nợ</legend>
          <div className="prod-pick" role="radiogroup" aria-label="Cách trả nợ">
            {REPAYMENT_METHODS.map((method) => (
              <label key={method}>
                <input
                  type="radio"
                  name="repaymentMethod"
                  value={method}
                  checked={form.repaymentMethod === method}
                  onChange={() => setForm((current) => ({ ...current, repaymentMethod: method }))}
                />
                <b>{REPAYMENT_LABELS[method].label}</b>
                <span>{REPAYMENT_LABELS[method].hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div ref={alertRef}>
          {validationError && <div className="ui-alert" role="alert"><div>{validationError}</div></div>}
          {!validationError && serverError && <ActionError error={serverError} />}
        </div>
      </form>
    </Modal>
  );
}
