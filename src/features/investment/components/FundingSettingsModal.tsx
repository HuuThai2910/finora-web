import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { usePermission } from '@/features/auth';
import { useActorNames } from '@/features/loan';
import { useGetFundingSettingsQuery, useUpdateFundingSettingsMutation } from '../api/investmentApi';
import { DENOMINATION_OPTIONS, FUNDING_DAYS_MAX, FUNDING_DAYS_MIN } from '../constants';
import type { FundingSettings } from '../types';
import { formatDateTime, formatMoney, parseDecimal } from '../formatters';
import { INPUT } from '../styles';
import { ErrorToast } from '@/components/ErrorToast';

interface Props {
  onClose: () => void;
  /** Báo kết quả lên trang để thông báo còn thấy được sau khi đóng hộp thoại. */
  onNotice: (text: string) => void;
  /** Mở hộp xác nhận đóng khoản quá hạn (trang đóng hộp này trước); không có thì ẩn khối Bảo trì. */
  onCloseExpired?: () => void;
}

interface FormValues {
  denomination: string;
  minimum: string;
  days: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const FORM_ID = 'fundingSettingsForm';

/** Một tham số: nhãn (span con trực tiếp hoặc legend) đậm vừa, cách ô 6px. */
const FIELD = 'fu-field grid gap-1.5 min-w-0 [border:0] text-[13px]';
const FIELD_LABEL = 'mb-1.5 font-medium';
/** Dòng lỗi dưới ô; là span con trực tiếp của `fu-field` nên cũng đậm vừa như nhãn. */
const FIELD_ERROR = `fu-err text-danger text-[12px] ${FIELD_LABEL}`;
const FIELD_INPUT = `fu-input ${INPUT} w-full h-8.5`;
/** Nút chọn nhanh mệnh giá; đang chọn thì nền xanh nhạt, viền đậm thêm một vòng 1px. */
const CHIP =
  'fu-chip min-w-22 h-8 px-2.5 border border-line-strong rounded-[999px] bg-white text-[13px] font-medium tabular-nums ' +
  'hover:border-brand aria-pressed:border-brand aria-pressed:bg-brand-50 aria-pressed:text-brand ' +
  'aria-pressed:shadow-[0_0_0_1px_var(--color-brand)]';

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
  else if (denomination >= 1000 && minimum % denomination !== 0) errors.minimum = 'Phải chia hết cho mệnh giá mỗi phần vốn.';
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
export function FundingSettingsModal({ onClose, onNotice, onCloseExpired }: Props) {
  // Form chỉ lấy giá trị một lần lúc dựng: phải chờ bản mới nhất, không dùng bản cache cũ (mở lại ngay sau khi lưu
  // sẽ hiện số cũ, bấm Lưu tiếp là ghi đè).
  const settings = useGetFundingSettingsQuery(undefined, { refetchOnMountOrArgChange: true });

  if (settings.data && !settings.isFetching) {
    return <SettingsEditor current={settings.data} onClose={onClose} onNotice={onNotice} onCloseExpired={onCloseExpired} />;
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

function SettingsEditor({ current, onClose, onNotice, onCloseExpired }: Props & { current: FundingSettings }) {
  const [form, setForm] = useState<FormValues>(() => toForm(current));
  const [touched, setTouched] = useState(false);
  const [update, updateState] = useUpdateFundingSettingsMutation();
  const { canAct } = usePermission();
  // Investment chỉ lưu mã người cập nhật; tra họ tên hoặc email từ finora-user. SYSTEM là giá trị khởi tạo.
  const updatedBy = current.updatedBy === 'SYSTEM' ? null : current.updatedBy;
  const { displayName } = useActorNames([updatedBy]);
  // Lưu tham số cần quyền Thao tác "Cấu hình gọi vốn"; đóng khoản quá hạn (quyền "Gọi vốn & Notes") do trang quyết định.
  const canSave = canAct('funding-settings');

  const errors = validate(form);
  const hasErrors = Object.keys(errors).length > 0;
  const show = (key: keyof FormValues) => (touched ? errors[key] : undefined);
  const busy = updateState.isLoading;

  const set = (patch: Partial<FormValues>) => {
    setForm((value) => ({ ...value, ...patch }));
    setTouched(true);
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (hasErrors || busy || !canSave) return;
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

  return (
    <Modal
      title="Tham số sàn"
      subtitle="Áp dụng cho khoản vay lên sàn từ giờ; khoản đã niêm yết giữ nguyên."
      onClose={onClose}
      busy={busy}
      dismissOnBackdrop={false}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={busy}>{canSave ? 'Hủy' : 'Đóng'}</button>
          {canSave && (
            <button type="submit" form={FORM_ID} className="ui-btn primary" disabled={busy || (touched && hasErrors)}>
              {updateState.isLoading ? 'Đang lưu...' : 'Lưu tham số'}
            </button>
          )}
        </>
      )}
    >
      <form
        id={FORM_ID}
        className="fu-settings grid gap-3.5 text-primary"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        {/* Chỉ có quyền Xem thì xem được tham số hiện hành, không sửa: khóa cả nhóm ô, bố cục form giữ nguyên. */}
        <fieldset className="fu-settings-fields grid gap-3.5 min-w-0 m-0 p-0 [border:0]" disabled={!canSave}>
          <fieldset className={FIELD}>
            <legend className={FIELD_LABEL}>Mệnh giá mỗi phần vốn mặc định</legend>
            <div className="fu-chips flex flex-wrap gap-1.5">
              {DENOMINATION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={CHIP}
                  aria-pressed={form.denomination === option}
                  onClick={() => set({ denomination: option })}
                >
                  {formatMoney(option)}
                </button>
              ))}
              <input
                className={`fu-input fu-denom-input ${INPUT} w-35 h-8`}
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
            {show('denomination') && <span className={FIELD_ERROR} role="alert">{errors.denomination}</span>}
          </fieldset>

          <div className="fu-form-2 grid grid-cols-2 gap-3 max-[760px]:grid-cols-[minmax(0,1fr)]">
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Góp tối thiểu (đ)</span>
              <input
                className={FIELD_INPUT}
                type="number"
                inputMode="numeric"
                min="1000"
                step="1000"
                value={form.minimum}
                aria-invalid={Boolean(show('minimum'))}
                onChange={(event) => set({ minimum: event.target.value })}
              />
              {show('minimum') && <span className={FIELD_ERROR} role="alert">{errors.minimum}</span>}
            </label>
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Số ngày gọi vốn</span>
              <input
                className={FIELD_INPUT}
                type="number"
                inputMode="numeric"
                min={FUNDING_DAYS_MIN}
                max={FUNDING_DAYS_MAX}
                value={form.days}
                aria-invalid={Boolean(show('days'))}
                onChange={(event) => set({ days: event.target.value })}
              />
              {show('days') && <span className={FIELD_ERROR} role="alert">{errors.days}</span>}
            </label>
          </div>
        </fieldset>

        <p className="fu-meta text-muted text-[12px]">
          Cập nhật lần cuối {formatDateTime(current.updatedAt)}
          {current.updatedBy === 'SYSTEM' ? ' bởi hệ thống' : updatedBy ? ` bởi ${displayName(updatedBy)}` : ''}
        </p>

        {updateState.error ? <ErrorToast error={updateState.error} /> : null}

        {onCloseExpired && (
          <section
            className="fu-maintenance grid justify-items-start gap-2 pt-3.5 border-t border-t-divider [&_.ui-alert]:justify-self-stretch"
            aria-labelledby="fuMaintenanceTitle"
          >
            <h3 id="fuMaintenanceTitle" className="text-[14px] font-semibold">Bảo trì</h3>
            <p className="text-secondary text-[13px]">Khoản quá hạn gọi vốn được đóng tự động theo chu kỳ. Bấm để đóng ngay khi cần.</p>
            <button type="button" className="ui-btn ghost" disabled={busy} onClick={onCloseExpired}>Đóng khoản quá hạn</button>
          </section>
        )}
      </form>
    </Modal>
  );
}
