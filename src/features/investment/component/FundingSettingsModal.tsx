import { useEffect, useState } from 'react';
import { toUiApiError } from '@/lib/api/errors';
import {
  useCloseExpiredListingsMutation,
  useGetFundingSettingsQuery,
  useUpdateFundingSettingsMutation,
} from '../api/investmentApi';
import { DENOMINATION_OPTIONS } from '../constant';
import type { FundingSettings } from '../types';
import { formatDateTime, formatMoney, parseDecimal } from '../formatters';

interface Props {
  onClose: () => void;
  /** Báo kết quả lên trang sau khi lưu, để thông báo còn thấy được sau khi đóng modal. */
  onNotice: (text: string) => void;
}

interface FormValues {
  denomination: string;
  minimum: string;
  days: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

function toForm(settings: FundingSettings): FormValues {
  return {
    denomination: String(parseDecimal(settings.noteDenomination) ?? ''),
    minimum: String(parseDecimal(settings.minInvestmentAmount) ?? ''),
    days: String(settings.fundingDays),
  };
}

/** Cùng quy tắc với backend, để báo lỗi tại ô thay vì đợi request quay về. */
function validate(form: FormValues): FormErrors {
  const errors: FormErrors = {};
  const denomination = Number(form.denomination);
  const minimum = Number(form.minimum);
  const days = Number(form.days);

  if (!(denomination >= 1000)) errors.denomination = 'Mệnh giá phải từ 1.000 đ.';
  if (!(minimum >= 1000)) {
    errors.minimum = 'Mức tối thiểu phải từ 1.000 đ.';
  } else if (denomination >= 1000 && minimum % denomination !== 0) {
    errors.minimum = 'Mức tối thiểu phải chia hết cho mệnh giá Note.';
  }
  if (!Number.isInteger(days) || days < 1 || days > 90) errors.days = 'Số ngày gọi vốn từ 1 đến 90.';
  return errors;
}

/**
 * Tham số gọi vốn của sàn.
 *
 * Chỉ áp dụng cho khoản vay lên sàn sau khi lưu: listing và phần vốn đã tạo giữ nguyên
 * mệnh giá cũ, nên cam kết của nhà đầu tư không bị tính lại. Mục bảo trì đóng các khoản
 * hết hạn cũng đặt ở đây vì cùng là việc vận hành sàn, không thuộc về một khoản cụ thể.
 */
export function FundingSettingsModal({ onClose, onNotice }: Props) {
  const settings = useGetFundingSettingsQuery();
  const [closeExpired, closeState] = useCloseExpiredListingsMutation();
  const [maintenance, setMaintenance] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCloseExpired = async () => {
    setMaintenance(null);
    try {
      const result = await closeExpired().unwrap();
      setMaintenance(
        result.closedCount === 0
          ? 'Không có khoản nào quá hạn gọi vốn.'
          : `Đã đóng ${result.closedCount} khoản hết hạn; tiền giữ chỗ được trả về ví nhà đầu tư.`,
      );
    } catch (error) {
      setMaintenance(toUiApiError(error).message);
    }
  };

  return (
    <div className="inv-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="inv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="inv-eyebrow">Vận hành sàn</span>
        <h2 id="inv-settings-title" className="inv-modal-title">Tham số gọi vốn</h2>
        <p className="inv-modal-note">
          Áp dụng cho khoản vay lên sàn từ giờ trở đi. Khoản đã niêm yết và phần vốn đã cam kết
          giữ nguyên mệnh giá cũ.
        </p>

        {settings.isLoading && <div className="inv-empty">Đang tải tham số&hellip;</div>}
        {settings.isError && (
          <div className="inv-error" role="alert">
            Không tải được tham số sàn.{' '}
            <button type="button" className="inv-link" onClick={() => settings.refetch()}>Thử lại</button>
          </div>
        )}
        {settings.data && (
          // `key` theo thời điểm cập nhật: lưu xong thì form dựng lại từ bản mới thay vì giữ
          // state cũ, không cần effect đồng bộ.
          <SettingsForm
            key={settings.data.updatedAt}
            current={settings.data}
            onSaved={(text) => {
              onNotice(text);
              onClose();
            }}
          />
        )}

        <section className="inv-maintenance" aria-labelledby="inv-maintenance-title">
          <h3 id="inv-maintenance-title" className="inv-detail-heading">Bảo trì</h3>
          <p className="inv-muted">
            Khoản đang gọi vốn mà quá hạn sẽ được worker đóng định kỳ. Bấm để đóng ngay khi cần.
          </p>
          <div className="inv-actions">
            <button
              type="button"
              className="inv-btn inv-btn-ghost"
              disabled={closeState.isLoading}
              onClick={handleCloseExpired}
            >
              {closeState.isLoading ? 'Đang đóng…' : 'Đóng khoản hết hạn'}
            </button>
            {maintenance && <span className="inv-muted" role="status">{maintenance}</span>}
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsForm({ current, onSaved }: { current: FundingSettings; onSaved: (text: string) => void }) {
  const [form, setForm] = useState<FormValues>(() => toForm(current));
  const [touched, setTouched] = useState(false);
  const [update, updateState] = useUpdateFundingSettingsMutation();
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = validate(form);
  const hasErrors = Object.keys(errors).length > 0;
  const denomination = Number(form.denomination);
  const minimum = Number(form.minimum);
  const minimumNotes =
    denomination >= 1000 && minimum >= 1000 && minimum % denomination === 0
      ? minimum / denomination
      : null;

  const set = (patch: Partial<FormValues>) => {
    setForm((value) => ({ ...value, ...patch }));
    setTouched(true);
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (hasErrors) return;
    setServerError(null);
    try {
      await update({
        noteDenomination: denomination.toFixed(2),
        minInvestmentAmount: minimum.toFixed(2),
        fundingDays: Number(form.days),
      }).unwrap();
      onSaved(
        `Đã lưu tham số sàn: mệnh giá ${formatMoney(denomination)} đ, tối thiểu ${formatMoney(minimum)} đ, gọi vốn ${form.days} ngày.`,
      );
    } catch (error) {
      setServerError(toUiApiError(error).message);
    }
  };

  const show = (key: keyof FormValues) => (touched ? errors[key] : undefined);

  return (
    <>
      <div className="inv-field-block">
        <span className="inv-field-label">Mệnh giá Note mặc định (đ)</span>
        <div className="inv-chips" role="group" aria-label="Mệnh giá thường dùng">
          {DENOMINATION_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`inv-chip${form.denomination === option ? ' is-active' : ''}`}
              onClick={() => set({ denomination: option })}
            >
              {formatMoney(option)}
            </button>
          ))}
        </div>
        <input
          className="inv-input"
          type="number"
          inputMode="numeric"
          min="1000"
          step="1000"
          aria-label="Mệnh giá Note mặc định"
          value={form.denomination}
          onChange={(event) => set({ denomination: event.target.value })}
        />
        {show('denomination') && <div className="inv-field-error">{errors.denomination}</div>}
      </div>

      <div className="inv-form-grid">
        <label className="inv-field">
          <span>Đầu tư tối thiểu (đ)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1000"
            step="1000"
            value={form.minimum}
            onChange={(event) => set({ minimum: event.target.value })}
          />
          {show('minimum') ? (
            <span className="inv-field-error">{errors.minimum}</span>
          ) : (
            <span className="inv-field-help">
              {minimumNotes != null ? `= ${minimumNotes} Note mỗi lệnh` : 'Phải là bội số của mệnh giá'}
            </span>
          )}
        </label>
        <label className="inv-field">
          <span>Số ngày gọi vốn (1–90)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="90"
            value={form.days}
            onChange={(event) => set({ days: event.target.value })}
          />
          {show('days') ? (
            <span className="inv-field-error">{errors.days}</span>
          ) : (
            <span className="inv-field-help">Quá hạn chưa đủ vốn thì khoản bị đóng, tiền trả về ví</span>
          )}
        </label>
      </div>

      <p className="inv-settings-meta">
        Cập nhật lần cuối {formatDateTime(current.updatedAt)}
        {current.updatedBy ? ` bởi ${current.updatedBy}` : ''}
      </p>

      {serverError && <div className="inv-error" role="alert">{serverError}</div>}

      <div className="inv-modal-actions">
        <button
          type="button"
          className="inv-btn inv-btn-brand"
          disabled={updateState.isLoading || (touched && hasErrors)}
          onClick={handleSubmit}
        >
          {updateState.isLoading ? 'Đang lưu…' : 'Lưu tham số'}
        </button>
      </div>
    </>
  );
}
