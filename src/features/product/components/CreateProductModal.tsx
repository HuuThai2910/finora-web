import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Modal } from '@/components/Modal';
import type { UiApiError } from '@/lib/api/errors';
import { MAX_TERM_MONTHS, RATE_CAP_PERCENT } from '../constants';
import { REPAYMENT_LABELS } from '../mappers/productDisplay';
import {
  EMPTY_PRODUCT_FORM,
  displayValue,
  generateProductCode,
  normalizeInput,
  validateProductForm,
  type ProductForm,
  type ProductTextField,
} from '../mappers/productForm';
import type { RepaymentMethod } from '../types';
import { ErrorToast } from '@/components/ErrorToast';

/** `create`: tạo mới (có thể điền sẵn khi tạo bản sao); `edit`: sửa bản nháp, khóa ô mã. */
export type ProductModalMode = 'create' | 'edit';

interface CreateProductModalProps {
  mode?: ProductModalMode;
  /** Giá trị điền sẵn (sửa bản nháp hoặc tạo bản sao); không có là form trống. */
  initial?: ProductForm;
  saving: boolean;
  serverError: UiApiError | null;
  onClose: () => void;
  /** Form đã hợp lệ (mã đã sinh nếu bỏ trống); trang đổi sang thân request tạo hoặc sửa. */
  onSubmit: (form: ProductForm) => Promise<void>;
}

const FORM_ID = 'createProductForm';
const REPAYMENT_METHODS: RepaymentMethod[] = ['ANNUITY', 'EQUAL_PRINCIPAL'];

/** Nhóm trường: nhóm đầu sát mép trên, các nhóm sau có vạch ngăn phía trên. */
const GROUP = 'pt-3.5 pb-0.5 [border:0] first:pt-0 [fieldset+&]:[border-top:1px_solid_var(--color-line)]';
/** Tiêu đề nhóm float trái (không nằm trên viền fieldset), nên các khối phía sau phải `clear`. */
const LEGEND = 'float-left w-full mb-2.5 text-primary text-[13px] font-semibold';
/** Hàng lưới hai hoặc ba cột; màn hẹp xếp một cột, khoảng cách dọc lấy từ lề dưới của từng trường. */
const ROW = 'prod-row grid gap-3 clear-both max-[760px]:grid-cols-1 max-[760px]:gap-0';
/**
 * Một trường: nhãn trên, ô dưới. Nằm trong hàng lưới thì không cần `clear`. Dồn lên đầu ô lưới để trường cạnh một
 * trường có dòng gợi ý (mã khi sửa) không bị giãn lệch hàng.
 */
const FIELD = 'prod-field grid [align-content:start] gap-1 mb-3 clear-both in-[.prod-row]:clear-none';
const FIELD_LABEL = 'text-secondary text-[13px] font-medium';
const REQUIRED = 'prod-required text-danger font-bold';
/**
 * Kế thừa font của form như `font: inherit`, ghi từng phần: Tailwind xếp `[font:inherit]` sau mọi utility font
 * nên nó sẽ đè mất cỡ chữ, font đơn cách, chữ số đều đặt cùng phần tử.
 */
const INHERIT_FONT = 'font-[inherit] [font-style:inherit] [font-weight:inherit] leading-[inherit]';
/** Ô nhập trong khung `.prod-in`: cỡ 14px; ô số (`num`) canh phải, ô mã (`mono`) dùng font đơn cách 13px. */
const INPUT = `w-full min-w-0 h-full px-2.5 [border:0] bg-transparent text-primary ${INHERIT_FONT} text-[14px]`
  + ' [outline:0] [&.num]:text-right [&.num]:tabular-nums [&.mono]:font-mono [&.mono]:text-[13px]';
const HINT = 'prod-hint clear-both -mt-1 mb-3 text-muted text-[12px]';

interface FieldProps {
  label: string;
  field: ProductTextField;
  form: ProductForm;
  onChange: (field: ProductTextField, raw: string) => void;
  unit?: string;
  kind?: 'text' | 'code' | 'integer' | 'decimal';
  placeholder?: string;
  required?: boolean;
  /** Chỉ đọc (mã sản phẩm khi sửa): nền xám, không nhận gõ nhưng vẫn chọn chép được. */
  readOnly?: boolean;
  hint?: string;
  onBlur?: () => void;
}

/** Khung ô nhập (`prod-in`); ô chỉ đọc nền xám, không có viền focus màu. */
const BOX = 'prod-in flex items-center h-8.5 border border-line-strong rounded-md';
const BOX_EDIT = `${BOX} bg-white focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] focus-within:[outline:0]`;
const BOX_READONLY = `${BOX} is-readonly bg-surface-muted text-secondary`;

function Field({
  label, field, form, onChange, unit, kind = 'text', placeholder, required = false, readOnly = false, hint, onBlur,
}: FieldProps) {
  const numeric = kind === 'integer' || kind === 'decimal';
  const kindClass = numeric ? 'num' : kind === 'code' ? 'mono' : '';
  return (
    <label className={FIELD}>
      <span className={FIELD_LABEL}>
        {label}
        {required && <span className={REQUIRED} aria-hidden="true"> *</span>}
      </span>
      <div className={readOnly ? BOX_READONLY : BOX_EDIT}>
        <input
          className={kindClass ? `${kindClass} ${INPUT}` : INPUT}
          inputMode={kind === 'integer' ? 'numeric' : kind === 'decimal' ? 'decimal' : undefined}
          autoCapitalize={kind === 'code' ? 'characters' : undefined}
          value={displayValue(field, form[field])}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          aria-readonly={readOnly || undefined}
          onChange={(event) => onChange(field, event.target.value)}
          onBlur={onBlur}
        />
        {unit && <i className="pr-2.5 text-muted text-[13px] not-italic whitespace-nowrap">{unit}</i>}
      </div>
      {hint && <span className="text-muted text-[12px]">{hint}</span>}
    </label>
  );
}

/**
 * Hộp thoại tạo, tạo bản sao hoặc sửa bản nháp sản phẩm vay (một form, khác tiêu đề, nút và ô mã). Validation client
 * chỉ để báo sớm; lỗi backend hiện ở cuối form. Bấm ra nền không đóng hộp để không mất phần đã nhập.
 */
export function CreateProductModal({
  mode = 'create', initial, saving, serverError, onClose, onSubmit,
}: CreateProductModalProps) {
  const editing = mode === 'edit';
  const [form, setForm] = useState<ProductForm>(initial ?? EMPTY_PRODUCT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);

  const update = (field: ProductTextField, raw: string) => {
    setForm((current) => ({ ...current, [field]: normalizeInput(field, raw) }));
  };

  const fillCodeFromName = () => {
    setForm((current) => current.code.trim()
      ? current
      : { ...current, code: generateProductCode(current.name) });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const effectiveForm = form.code.trim()
      ? form
      : { ...form, code: generateProductCode(form.name) };
    if (effectiveForm !== form) setForm(effectiveForm);
    const message = validateProductForm(effectiveForm);
    setValidationError(message);
    if (!message) void onSubmit(effectiveForm);
  };

  const fieldProps = { form, onChange: update };
  const alertRef = useRef<HTMLDivElement>(null);

  // Lỗi nằm cuối form dài: cuộn tới để người dùng thấy ngay sau khi bấm gửi.
  useEffect(() => {
    if (validationError || serverError) alertRef.current?.scrollIntoView({ block: 'nearest' });
  }, [validationError, serverError]);

  return (
    <Modal
      title={editing ? 'Sửa sản phẩm vay' : initial ? 'Tạo bản sao sản phẩm' : 'Tạo sản phẩm vay'}
      subtitle={editing
        ? 'Lưu xong bản nháp cần đồng bộ lại trước khi kích hoạt.'
        : initial ? 'Đã điền sẵn cấu hình của sản phẩm gốc; đặt tên và mã mới.' : undefined}
      wide
      onClose={onClose}
      busy={saving}
      dismissOnBackdrop={false}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="submit" form={FORM_ID} className="ui-btn primary" disabled={saving}>
            {editing ? (saving ? 'Đang lưu...' : 'Lưu thay đổi') : saving ? 'Đang tạo...' : 'Tạo và đồng bộ'}
          </button>
        </>
      )}
    >
      <form id={FORM_ID} className="prod-form" onSubmit={submit} noValidate>
        <fieldset className={GROUP}>
          <legend className={LEGEND}>Thông tin</legend>
          <div className={`${ROW} grid-cols-2`}>
            <Field
              label="Tên sản phẩm" field="name" placeholder="Vay tiêu dùng cá nhân" required
              onBlur={editing ? undefined : fillCodeFromName} {...fieldProps}
            />
            {/* Mã là khóa nghiệp vụ của sản phẩm (backend không cho sửa), nên khi sửa chỉ hiện để đọc. */}
            <Field
              label="Mã sản phẩm" field="code" kind="code" placeholder="vay_tieu_dung_ca_nhan" required={!editing}
              readOnly={editing} hint={editing ? 'Mã không đổi được sau khi tạo.' : undefined} {...fieldProps}
            />
          </div>
          <label className={FIELD}>
            <span className={FIELD_LABEL}>Mô tả</span>
            <textarea
              className={`min-h-15 py-2 px-2.5 border border-line-strong rounded-md text-primary ${INHERIT_FONT} text-[14px]
                resize-y focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] focus:[outline:0]`}
              value={form.description}
              placeholder="Đối tượng vay, mục đích, điều kiện riêng"
              onChange={(event) => update('description', event.target.value)}
            />
          </label>
        </fieldset>
        <fieldset className={GROUP}>
          <legend className={LEGEND}>Hạn mức và kỳ hạn</legend>
          <div className={`${ROW} grid-cols-2`}>
            <Field label="Hạn mức tối thiểu" field="minAmount" kind="integer" unit="đ" required {...fieldProps} />
            <Field label="Hạn mức tối đa" field="maxAmount" kind="integer" unit="đ" required {...fieldProps} />
          </div>
          <div className={`${ROW} grid-cols-2`}>
            <Field label="Kỳ hạn tối thiểu" field="minTermMonths" kind="integer" unit="tháng" required {...fieldProps} />
            <Field label="Kỳ hạn tối đa" field="maxTermMonths" kind="integer" unit="tháng" required {...fieldProps} />
          </div>
          <p className={HINT}>Kỳ hạn tối đa {MAX_TERM_MONTHS} tháng.</p>
        </fieldset>
        <fieldset className={GROUP}>
          <legend className={LEGEND}>Lãi suất năm</legend>
          <div className={`${ROW} three grid-cols-3`}>
            <Field label="Tối thiểu" field="minAnnualInterestRate" kind="decimal" unit="%" required {...fieldProps} />
            <Field label="Cơ sở" field="annualInterestRate" kind="decimal" unit="%" required {...fieldProps} />
            <Field label="Tối đa" field="maxAnnualInterestRate" kind="decimal" unit="%" required {...fieldProps} />
          </div>
          <p className={HINT}>Lãi cơ sở dùng tính lịch trả ban đầu trước thẩm định. Trần {RATE_CAP_PERCENT}%/năm.</p>
        </fieldset>
        <fieldset className={GROUP}>
          <legend className={LEGEND}>Cách trả nợ</legend>
          <div className="prod-pick grid grid-cols-2 gap-2 clear-both mb-3 max-[760px]:grid-cols-1" role="radiogroup" aria-label="Cách trả nợ">
            {REPAYMENT_METHODS.map((method) => (
              // Ô radio ẩn, cả thẻ là vùng bấm; đang chọn thì viền và nền xanh, focus bàn phím thì viền focus quanh thẻ.
              <label
                key={method}
                className="relative grid gap-0.5 py-2.5 px-3 border border-line-strong rounded-md cursor-pointer
                  has-[input:checked]:border-brand has-[input:checked]:bg-brand-50
                  has-[input:focus-visible]:[outline:2px_solid_var(--color-brand)] has-[input:focus-visible]:outline-offset-1"
              >
                <input
                  className="absolute opacity-0 pointer-events-none"
                  type="radio"
                  name="repaymentMethod"
                  value={method}
                  checked={form.repaymentMethod === method}
                  onChange={() => setForm((current) => ({ ...current, repaymentMethod: method }))}
                />
                <b className="text-primary text-[13px] font-semibold">{REPAYMENT_LABELS[method].label}</b>
                <span className="text-muted text-[12px]">{REPAYMENT_LABELS[method].hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div ref={alertRef}>
          {validationError && <div className="ui-alert" role="alert"><div>{validationError}</div></div>}
          {!validationError && serverError && <ErrorToast error={serverError} />}
        </div>
      </form>
    </Modal>
  );
}
