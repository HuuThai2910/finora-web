import { useId, useState, type FormEvent } from 'react';
import { formatDate, formatNumber } from '@/utils';
import { useRecordCollectionActionMutation } from '../api/servicingApi';
import { MANUAL_ACTION_TYPES } from '../constant';
import { money, todayIso } from '../formatters';
import { useIntentKey } from '../hooks/useIntentKey';
import { SVC_FIELD_ERROR, SVC_INPUT, SVC_LABEL, SVC_TEXTAREA } from '../styles';
import type { CollectionActionType, CollectionCase, CreateCollectionActionRequest } from '../types';
import { ErrorToast } from '@/components/ErrorToast';

interface Props {
  item: CollectionCase;
  borrower: string;
  onRecorded: (message: string) => void;
}

/** Giới hạn của `CreateCollectionActionRequest`: ghi chú 500 ký tự, số tiền tối đa 16 chữ số phần nguyên. */
const NOTE_MAX = 500;
const AMOUNT_DIGITS = 16;
const DEFAULT_CONTACT_NOTE = 'Đã liên hệ người vay từ trang quản trị.';

const digitsOf = (value: string) => value.replace(/\D/g, '').slice(0, AMOUNT_DIGITS);

/**
 * Số tiền điền sẵn khi chọn "Hẹn trả": tiền quá hạn hiện tại, làm tròn xuống đồng (ô chỉ nhận số nguyên). Điền giá trị
 * thật thay cho placeholder: placeholder trông như đã điền nhưng gửi đi lại là ô trống.
 */
const defaultPromiseAmount = (item: CollectionCase) =>
  item.overdueAmount > 0 ? digitsOf(String(Math.floor(item.overdueAmount))) : '';

/** Dựng body đúng contract: chỉ PROMISE_TO_PAY mang ngày và số tiền hẹn trả. */
function buildRequest(type: CollectionActionType, note: string, date: string, amount: string): CreateCollectionActionRequest {
  const trimmed = note.trim();
  return {
    actionType: type,
    note: trimmed || (type === 'BORROWER_CONTACTED' ? DEFAULT_CONTACT_NOTE : null),
    promiseDate: type === 'PROMISE_TO_PAY' ? date : null,
    promiseAmount: type === 'PROMISE_TO_PAY' ? Number(amount) : null,
  };
}

function noteLabel(type: CollectionActionType, isEscalation: boolean): string {
  if (type === 'NOTE') return 'Nội dung ghi chú';
  return isEscalation ? 'Lý do và việc đã làm' : 'Nội dung trao đổi';
}

function notePlaceholder(type: CollectionActionType, isEscalation: boolean): string {
  if (type === 'NOTE') return 'Ví dụ: đã gửi thư nhắc qua bưu điện';
  if (isEscalation) return 'Ví dụ: đã gọi 5 lần trong 2 tuần, người vay không nghe máy, lỡ hai lần hẹn trả';
  return 'Ví dụ: gọi điện, người vay xác nhận sẽ trả trong tuần';
}

function successMessage(
  type: CollectionActionType, body: CreateCollectionActionRequest, borrower: string, label: string | undefined,
): string {
  if (type === 'PROMISE_TO_PAY') return `Đã ghi nhận lời hẹn trả ${money(body.promiseAmount)} ngày ${formatDate(body.promiseDate)}.`;
  if (type === 'NOTE') return 'Đã lưu ghi chú.';
  if (type === 'BORROWER_CONTACTED') return `Đã ghi nhận liên hệ với ${borrower}.`;
  return `Đã ghi nhận "${label ?? type}" cho hồ sơ của ${borrower}.`;
}

/**
 * Ghi nhận liên hệ, lời hẹn trả, ghi chú hoặc một bước leo thang (chuyển pháp lý, thu hồi tại địa chỉ, đề xuất xóa nợ)
 * cho một hồ sơ thu hồi.
 *
 * Kiểm tra phía trình duyệt chỉ để báo lỗi sớm; Loan Service vẫn là nơi quyết định. Mỗi lần gửi dùng
 * idempotency key của đúng nội dung đang nhập (xem `useIntentKey`), nên bấm gửi lại sau lỗi mạng không
 * tạo hai bản ghi.
 */
export function CollectionActionForm({ item, borrower, onRecorded }: Props) {
  const ids = useId();
  const [type, setType] = useState<CollectionActionType>('BORROWER_CONTACTED');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState(() => defaultPromiseAmount(item));
  const [fieldError, setFieldError] = useState('');
  const [record, state] = useRecordCollectionActionMutation();
  const intent = useIntentKey('collection-action');
  const isPromise = type === 'PROMISE_TO_PAY';
  const option = MANUAL_ACTION_TYPES.find((candidate) => candidate.type === type);
  const submitLabel = option?.submit ?? 'Ghi nhận';
  const isEscalation = option?.escalation ?? false;
  // Ghi chú và ba loại leo thang phải có nội dung; liên hệ và hẹn trả thì không bắt buộc.
  const noteRequired = type === 'NOTE' || isEscalation;

  const validate = (): string => {
    if (isPromise && (!date || !amount || Number(amount) <= 0)) return 'Nhập ngày hẹn trả và số tiền.';
    if (isPromise && date < todayIso()) return 'Ngày hẹn trả không được trước hôm nay.';
    if (type === 'NOTE' && !note.trim()) return 'Nhập nội dung ghi chú.';
    if (isEscalation && !note.trim()) return 'Ghi lý do và những gì đã làm trước khi leo thang.';
    return '';
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state.isLoading) return;
    const problem = validate();
    setFieldError(problem);
    if (problem) return;
    const body = buildRequest(type, note, date, amount);
    const key = intent.keyFor(JSON.stringify({ caseId: item.caseId, body }));
    try {
      await record({ caseId: item.caseId, body, key }).unwrap();
    } catch {
      // Lỗi đã nằm trong `state.error` và hiện bằng ErrorNotice (kèm traceId); giữ key để gửi lại.
      return;
    }
    intent.reset();
    state.reset();
    setNote('');
    setDate('');
    setAmount(defaultPromiseAmount(item));
    onRecorded(successMessage(type, body, borrower, option?.label));
  };

  return (
    <form className="svc-form grid gap-3 rounded-lg border border-line bg-surface-muted p-3" onSubmit={submit} noValidate>
      <div
        className="svc-seg grid grid-cols-3 gap-0.5 rounded-md border border-line bg-white p-0.75"
        role="group"
        aria-label="Loại ghi nhận"
      >
        {MANUAL_ACTION_TYPES.map((choice) => (
          <button
            key={choice.type}
            type="button"
            className={
              'min-h-7 rounded-sm px-2 py-1 text-[13px] leading-tight font-medium text-secondary hover:text-primary '
              + 'aria-pressed:bg-brand-50 aria-pressed:text-brand aria-pressed:shadow-[0_0_0_1px_var(--color-brand)]'
            }
            aria-pressed={type === choice.type}
            onClick={() => { setType(choice.type); setFieldError(''); }}
          >
            {choice.label}
          </button>
        ))}
      </div>

      {isEscalation && (
        <p className="svc-escalation-note -mt-1 text-[12px] text-muted">
          Chỉ lưu vào lịch sử xử lý để theo dõi, không đổi trạng thái hồ sơ hay khoản vay.
        </p>
      )}

      {isPromise && (
        <div className="svc-form-2 grid grid-cols-2 gap-2.5 max-[760px]:grid-cols-[minmax(0,1fr)]">
          <div>
            <label className={SVC_LABEL} htmlFor={`${ids}-date`}>Ngày hẹn trả</label>
            <input
              id={`${ids}-date`}
              className={SVC_INPUT}
              type="date"
              min={todayIso()}
              value={date}
              aria-invalid={Boolean(fieldError) && !date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <label className={SVC_LABEL} htmlFor={`${ids}-amount`}>Số tiền hẹn trả (đ)</label>
            <input
              id={`${ids}-amount`}
              className={`${SVC_INPUT} num text-right tabular-nums`}
              type="text"
              inputMode="numeric"
              value={amount ? formatNumber(Number(amount)) : ''}
              aria-invalid={Boolean(fieldError) && !amount}
              aria-describedby={`${ids}-amount-hint`}
              onChange={(event) => setAmount(digitsOf(event.target.value))}
            />
            <p id={`${ids}-amount-hint`} className="mt-1 text-[12px] text-muted">Điền sẵn bằng tiền quá hạn, sửa nếu người vay hẹn số khác.</p>
          </div>
        </div>
      )}

      <div>
        <label className={SVC_LABEL} htmlFor={`${ids}-note`}>{noteLabel(type, isEscalation)}</label>
        <textarea
          id={`${ids}-note`}
          className={SVC_TEXTAREA}
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          placeholder={notePlaceholder(type, isEscalation)}
          aria-invalid={Boolean(fieldError) && noteRequired && !note.trim()}
          aria-describedby={fieldError ? `${ids}-err` : undefined}
          onChange={(event) => setNote(event.target.value)}
        />
        {fieldError && <p id={`${ids}-err`} className={SVC_FIELD_ERROR} role="alert">{fieldError}</p>}
      </div>

      {state.error && <ErrorToast error={state.error} />}

      <button type="submit" className="ui-btn primary svc-block h-9 w-full" disabled={state.isLoading}>
        {state.isLoading ? 'Đang ghi nhận...' : submitLabel}
      </button>
    </form>
  );
}
