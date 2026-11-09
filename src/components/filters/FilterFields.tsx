import { useId, type ReactNode } from 'react';

/** Nhãn mục lọc, đặt phía trên ô nhập. */
const LABEL = 'text-secondary text-[12.5px] font-medium';
/** Hai ô "Từ | Đến" liền nhau như một khối. */
const PAIR = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*:first-child_input]:rounded-r-none [&>*:last-child_input]:rounded-l-none [&>*:last-child_input]:-ml-px';
const ERROR = 'text-danger text-[12px]';

interface FilterFieldProps {
  label: string;
  /** Lỗi của mục (ví dụ "từ" lớn hơn "đến"). */
  error?: string | null;
  children: ReactNode;
}

/** Một mục của bảng lọc: nhãn trên, ô nhập dưới, lỗi (nếu có) dưới cùng. */
export function FilterField({ label, error, children }: FilterFieldProps) {
  const id = useId();
  return (
    <div className="ui-filter-field grid gap-1" role="group" aria-labelledby={id}>
      <span id={id} className={LABEL}>{label}</span>
      {children}
      {error ? <small className={ERROR} role="alert">{error}</small> : null}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  /** Số đếm hiện cạnh nhãn (nếu có sẵn). */
  count?: number;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Chữ của lựa chọn "không lọc", ví dụ "Tất cả trạng thái". */
  allLabel: string;
}

/** Ô chọn xổ xuống "Tất cả …" + danh sách lựa chọn; giá trị rỗng là không lọc. */
export function SelectField({ label, value, onChange, options, allLabel }: SelectFieldProps) {
  return (
    <FilterField label={label}>
      <select className="ui-select w-full" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.count != null ? `${option.label} (${option.count})` : option.label}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

interface ToggleGroupFieldProps {
  label: string;
  /** Các giá trị đang chọn; rỗng là không lọc. */
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
}

/** Chọn nhiều bằng các nút bật/tắt nhỏ (ví dụ hạng tín dụng A, B, C…). */
export function ToggleGroupField({ label, values, onChange, options }: ToggleGroupFieldProps) {
  const toggle = (value: string) =>
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  return (
    <FilterField label={label}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const pressed = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              className="min-w-9 h-8 px-2.5 rounded-md border border-line-strong bg-white text-primary text-[13px] hover:bg-surface-muted aria-pressed:border-brand aria-pressed:bg-brand-50 aria-pressed:text-brand aria-pressed:font-semibold"
              onClick={() => toggle(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </FilterField>
  );
}

/** Kiểu ô của khoảng số: số thường, số tiền (phân cách hàng nghìn, đuôi "đ") hoặc phần trăm. */
export type RangeKind = 'number' | 'money' | 'percent';

interface RangeFieldProps {
  label: string;
  /** Giá trị thô dạng chuỗi (số tiền chỉ gồm chữ số); rỗng là bỏ trống. */
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
  kind?: RangeKind;
  /** Cho phép số lẻ (lãi suất, điểm). */
  decimal?: boolean;
  error?: string | null;
}

const groupDigits = (digits: string) => (digits ? Number(digits).toLocaleString('vi-VN') : '');

/** Chuẩn hoá chữ gõ vào: số tiền chỉ giữ chữ số; số lẻ nhận dấu phẩy hoặc chấm làm dấu thập phân. */
function clean(raw: string, kind: RangeKind, decimal: boolean): string {
  if (kind === 'money') return raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15);
  if (!decimal) return raw.replace(/\D/g, '').slice(0, 6);
  const normalized = raw.replace(',', '.').replace(/[^\d.]/g, '');
  const [whole, ...rest] = normalized.split('.');
  return rest.length > 0 ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

/** Khoảng "Từ | Đến" hai ô liền nhau; số tiền hiện phân cách hàng nghìn và đuôi "đ" như các ô tiền khác. */
export function RangeField({ label, min, max, onChange, kind = 'number', decimal = false, error }: RangeFieldProps) {
  const suffix = kind === 'money' ? 'đ' : kind === 'percent' ? '%' : null;
  const input = (value: string, placeholder: string, update: (next: string) => void) => (
    <div className="relative">
      <input
        className={`ui-input tabular-nums ${suffix ? 'pr-7' : ''}`}
        inputMode={decimal ? 'decimal' : 'numeric'}
        aria-label={`${label} ${placeholder.toLowerCase()}`}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        value={kind === 'money' ? groupDigits(value) : value}
        onChange={(event) => update(clean(event.target.value, kind, decimal))}
      />
      {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-[13px]">{suffix}</span>}
    </div>
  );
  return (
    <FilterField label={label} error={error}>
      <div className={PAIR}>
        {input(min, 'Từ', (next) => onChange(next, max))}
        {input(max, 'Đến', (next) => onChange(min, next))}
      </div>
    </FilterField>
  );
}

interface DateRangeFieldProps {
  label: string;
  /** Ngày dạng `YYYY-MM-DD`; rỗng là bỏ trống. */
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  error?: string | null;
}

/** Khoảng ngày "Từ ngày → Đến ngày" bằng ô chọn ngày sẵn có của trình duyệt (có biểu tượng lịch). */
export function DateRangeField({ label, from, to, onChange, error }: DateRangeFieldProps) {
  return (
    <FilterField label={label} error={error}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <input
          type="date"
          className="ui-input"
          aria-label={`${label} từ ngày`}
          value={from}
          max={to || undefined}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value, to)}
        />
        <span className="text-muted" aria-hidden="true">→</span>
        <input
          type="date"
          className="ui-input"
          aria-label={`${label} đến ngày`}
          value={to}
          min={from || undefined}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(from, event.target.value)}
        />
      </div>
    </FilterField>
  );
}
