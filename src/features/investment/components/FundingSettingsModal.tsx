import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import {
  useCloseExpiredListingsMutation,
  useGetFundingSettingsQuery,
  useUpdateFundingSettingsMutation,
} from '../api/investmentApi';
import { DENOMINATION_OPTIONS, FUNDING_DAYS_MAX, FUNDING_DAYS_MIN } from '../constants';
import type { FundingSettings } from '../types';
import { formatDateTime, formatMoney, parseDecimal } from '../formatters';

interface Props {
  onClose: () => void;
  /** Báo kết quả lên trang để thông báo còn thấy được sau khi đóng hộp thoại. */
  onNotice: (text: string) => void;
}

interface FormValues {
  denomination: string;
  minimum: string;
  days: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const FORM_ID = 'fundingSettingsForm';

const toForm = (settings: FundingSettings): FormValues => ({
  denomination: String(parseDecimal(settings.noteDenomination) ?? ''),
  minimum: String(parseDecimal(settings.minInvestmentAmount) ?? ''),
  days: String(settings.fundingDays),
});

/** Cùng quy tắc với backend, để báo lỗi tại ô thay vì đợi request quay về. */
function validate(form: FormValues): FormErrors {
  const errors: FormErrors = {};
  const denomination = Number(form.denomination);
  const minimum = Number(form.minimum);
  const days = Number(form.days);
  if (!(denomination >= 1000)) errors.denomination = 'Mệnh giá phải từ 1.000 đ.';
  if (!(minimum >= 1000)) errors.minimum = 'Mức tối thiểu phải từ 1.000 đ.';
  else if (denomination >= 1000 && minimum % denomination !== 0) errors.minimum = 'Phải chia hết cho mệnh giá Note.';
  if (!Number.isInteger(days) || days < FUNDING_DAYS_MIN || days > FUNDING_DAYS_MAX) {
    errors.days = `Từ ${FUNDING_DAYS_MIN} đến ${FUNDING_DAYS_MAX} ngày.`;
  }
  return errors;
}

/**
 * Tham số gọi vốn của sàn.
 *
 * Chỉ áp dụng cho khoản vay lên sàn sau khi lưu: listing và phần vốn đã tạo giữ nguyên
 * mệnh giá cũ. Khi tham số đã tải, phần biên tập dựng riêng với state khởi tạo từ bản
 * backend trả về, nên không cần effect đồng bộ.
 */
export function FundingSettingsModal({ onClose, onNotice }: Props) {
  const settings = useGetFundingSettingsQuery();

  if (settings.data) {
    return <SettingsEditor current={settings.data} onClose={onClose} onNotice={onNotice} />;
  }

  return (
    <Modal title="Tham số sàn" onClose={onClose} footer={<button type="button" className="ui-btn ghost" onClick={onClose}>Đóng</button>}>
      {settings.error ? (
        <ErrorNotice error={settings.error} onRetry={settings.refetch} />
      ) : (
        <p aria-busy="true">Đang tải tham số sàn...</p>
      )}
    </Modal>
  );
}

function SettingsEditor({ current, onClose, onNotice }: Props & { current: FundingSettings }) {
  const [form, setForm] = useState<FormValues>(() => toForm(current));
  const [touched, setTouched] = useState(false);
  const [update, updateState] = useUpdateFundingSettingsMutation();
  const [closeExpired, closeState] = useCloseExpiredListingsMutation();

  const errors = validate(form);
  const hasErrors = Object.keys(errors).length > 0;
  const show = (key: keyof FormValues) => (touched ? errors[key] : undefined);
  const busy = updateState.isLoading || closeState.isLoading;

  const set = (patch: Partial<FormValues>) => {
    setForm((value) => ({ ...value, ...patch }));
    setTouched(true);
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (hasErrors || busy) return;
    const denomination = Number(form.denomination);
    const minimum = Number(form.minimum);
    try {
      await update({
        noteDenomination: denomination.toFixed(2),
        minInvestmentAmount: minimum.toFixed(2),
        fundingDays: Number(form.days),
      }).unwrap();
      onNotice(`Đã lưu tham số sàn: mệnh giá ${formatMoney(denomination)} đ, tối thiểu ${formatMoney(minimum)} đ, gọi vốn ${form.days} ngày.`);
      onClose();
    } catch {
      // Lỗi đã nằm trong `updateState.error` và hiện ngay trong hộp thoại; giữ hộp thoại mở để không mất số đã nhập.
    }
  };

  const handleCloseExpired = async () => {
    try {
      const result = await closeExpired().unwrap();
      onNotice(
        result.closedCount === 0
          ? 'Không có khoản nào quá hạn gọi vốn.'
          : `Đã đóng ${result.closedCount} khoản quá hạn, tiền giữ chỗ được trả về ví nhà đầu tư.`,
      );
    } catch {
      // Lỗi hiện trong khối bảo trì qua `closeState.error`.
    }
  };

  return (
    <Modal
      title="Tham số sàn"
      subtitle="Áp dụng cho khoản vay lên sàn từ giờ; khoản đã niêm yết giữ nguyên."
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" form={FORM_ID} className="ui-btn primary" disabled={busy || (touched && hasErrors)}>
            {updateState.isLoading ? 'Đang lưu...' : 'Lưu tham số'}
          </button>
        </>
      )}
    >
      <form
        id={FORM_ID}
        className="fu-settings"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <fieldset className="fu-field">
          <legend>Mệnh giá Note mặc định</legend>
          <div className="fu-chips">
            {DENOMINATION_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className="fu-chip"
                aria-pressed={form.denomination === option}
                onClick={() => set({ denomination: option })}
              >
                {formatMoney(option)}
              </button>
            ))}
            <input
              className="fu-input fu-denom-input"
              type="number"
              inputMode="numeric"
              min="1000"
              step="1000"
              placeholder="Mệnh giá khác"
              aria-label="Mệnh giá khác (đ)"
              value={DENOMINATION_OPTIONS.includes(form.denomination) ? '' : form.denomination}
              aria-invalid={Boolean(show('denomination'))}
              onChange={(event) => set({ denomination: event.target.value })}
            />
          </div>
          {show('denomination') && <span className="fu-err" role="alert">{errors.denomination}</span>}
        </fieldset>

        <div className="fu-form-2">
          <label className="fu-field">
            <span>Góp tối thiểu (đ)</span>
            <input
              className="fu-input"
              type="number"
              inputMode="numeric"
              min="1000"
              step="1000"
              value={form.minimum}
              aria-invalid={Boolean(show('minimum'))}
              onChange={(event) => set({ minimum: event.target.value })}
            />
            {show('minimum') && <span className="fu-err" role="alert">{errors.minimum}</span>}
          </label>
          <label className="fu-field">
            <span>Số ngày gọi vốn</span>
            <input
              className="fu-input"
              type="number"
              inputMode="numeric"
              min={FUNDING_DAYS_MIN}
              max={FUNDING_DAYS_MAX}
              value={form.days}
              aria-invalid={Boolean(show('days'))}
              onChange={(event) => set({ days: event.target.value })}
            />
            {show('days') && <span className="fu-err" role="alert">{errors.days}</span>}
          </label>
        </div>

        <p className="fu-meta">
          Cập nhật lần cuối {formatDateTime(current.updatedAt)}
          {current.updatedBy ? ` bởi ${current.updatedBy}` : ''}
        </p>

        {updateState.error ? <ErrorNotice error={updateState.error} /> : null}

        <section className="fu-maintenance" aria-labelledby="fuMaintenanceTitle">
          <h3 id="fuMaintenanceTitle">Bảo trì</h3>
          <p>Khoản quá hạn gọi vốn được đóng tự động theo chu kỳ. Bấm để đóng ngay khi cần.</p>
          <button type="button" className="ui-btn ghost" disabled={busy} onClick={() => void handleCloseExpired()}>
            {closeState.isLoading ? 'Đang đóng...' : 'Đóng khoản quá hạn'}
          </button>
          {closeState.error ? <ErrorNotice error={closeState.error} /> : null}
        </section>
      </form>
    </Modal>
  );
}
