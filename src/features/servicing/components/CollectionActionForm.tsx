import { useId, useState, type FormEvent } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { formatDate, formatNumber } from '@/utils';
import { useRecordCollectionActionMutation } from '../api/servicingApi';
import { MANUAL_ACTION_TYPES } from '../constant';
import { money, todayIso } from '../formatters';
import { useIntentKey } from '../hooks/useIntentKey';
import type { CollectionActionType, CollectionCase, CreateCollectionActionRequest } from '../types';

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

/**
 * Ghi nhận liên hệ, lời hẹn trả hoặc ghi chú cho một hồ sơ thu hồi.
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
  const [amount, setAmount] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [record, state] = useRecordCollectionActionMutation();
  const intent = useIntentKey('collection-action');
  const isPromise = type === 'PROMISE_TO_PAY';
  const submitLabel = MANUAL_ACTION_TYPES.find((option) => option.type === type)?.submit ?? 'Ghi nhận';

  const validate = (): string => {
    if (isPromise && (!date || !amount || Number(amount) <= 0)) return 'Nhập ngày hẹn trả và số tiền.';
    if (isPromise && date < todayIso()) return 'Ngày hẹn trả không được trước hôm nay.';
    if (type === 'NOTE' && !note.trim()) return 'Nhập nội dung ghi chú.';
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
    setAmount('');
    onRecorded(isPromise
      ? `Đã ghi nhận lời hẹn trả ${money(body.promiseAmount)} ngày ${formatDate(body.promiseDate)}.`
      : type === 'NOTE' ? 'Đã lưu ghi chú.' : `Đã ghi nhận liên hệ với ${borrower}.`);
  };

  return (
    <form className="svc-form" onSubmit={submit} noValidate>
      <div className="svc-seg" role="group" aria-label="Loại ghi nhận">
        {MANUAL_ACTION_TYPES.map((option) => (
          <button
            key={option.type}
            type="button"
            aria-pressed={type === option.type}
            onClick={() => { setType(option.type); setFieldError(''); }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isPromise && (
        <div className="svc-form-2">
          <div>
            <label className="svc-label" htmlFor={`${ids}-date`}>Ngày hẹn trả</label>
            <input
              id={`${ids}-date`}
              className="svc-input"
              type="date"
              min={todayIso()}
              value={date}
              aria-invalid={Boolean(fieldError) && !date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <label className="svc-label" htmlFor={`${ids}-amount`}>Số tiền hẹn trả (đ)</label>
            <input
              id={`${ids}-amount`}
              className="svc-input num"
              type="text"
              inputMode="numeric"
              placeholder={formatNumber(item.overdueAmount)}
              value={amount ? formatNumber(Number(amount)) : ''}
              aria-invalid={Boolean(fieldError) && !amount}
              onChange={(event) => setAmount(digitsOf(event.target.value))}
            />
          </div>
        </div>
      )}

      <div>
        <label className="svc-label" htmlFor={`${ids}-note`}>{type === 'NOTE' ? 'Nội dung ghi chú' : 'Nội dung trao đổi'}</label>
        <textarea
          id={`${ids}-note`}
          className="svc-input"
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          placeholder={type === 'NOTE' ? 'Ví dụ: đã gửi thư nhắc qua bưu điện' : 'Ví dụ: gọi điện, người vay xác nhận sẽ trả trong tuần'}
          aria-invalid={Boolean(fieldError) && type === 'NOTE' && !note.trim()}
          aria-describedby={fieldError ? `${ids}-err` : undefined}
          onChange={(event) => setNote(event.target.value)}
        />
        {fieldError && <p id={`${ids}-err`} className="svc-err" role="alert">{fieldError}</p>}
      </div>

      {state.error && <ErrorNotice error={state.error} />}

      <button type="submit" className="ui-btn primary svc-block" disabled={state.isLoading}>
        {state.isLoading ? 'Đang ghi nhận...' : submitLabel}
      </button>
    </form>
  );
}
