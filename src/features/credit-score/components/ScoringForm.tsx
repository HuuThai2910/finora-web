import type { ReactNode } from 'react';
import { KICH_BAN, MUC_DICH, NHA_O, THAM_NIEN, XAC_MINH } from '../constants';
import type { LoiHoSo, TruongChu, TruongSo } from '../schemas/scoringForm';
import type { CreditScoreRequest } from '../types';

interface ScoringFormProps {
  form: CreditScoreRequest;
  loi: LoiHoSo;
  busy: boolean;
  onSo: (khoa: TruongSo, raw: string) => void;
  onChu: (khoa: TruongChu, value: string) => void;
  onSubmit: () => void;
  onKichBan: (ghiDe: Partial<CreditScoreRequest>) => void;
}

/** Form hồ sơ vay giả định, kèm các kịch bản mẫu chấm ngay khi bấm. */
export function ScoringForm({ form, loi, busy, onSo, onChu, onSubmit, onKichBan }: ScoringFormProps) {
  const truong = (id: keyof CreditScoreRequest, nhan: ReactNode, control: ReactNode) => (
    <div className="cs-field">
      <label htmlFor={`cs-${id}`}>{nhan}</label>
      {control}
      {loi[id] && <span className="cs-field-error" id={`cs-${id}-err`}>{loi[id]}</span>}
    </div>
  );

  const oSo = (id: TruongSo, step?: string) => (
    <input
      id={`cs-${id}`}
      className="cs-input"
      type="number"
      step={step}
      value={form[id] ?? ''}
      aria-invalid={loi[id] ? true : undefined}
      aria-describedby={loi[id] ? `cs-${id}-err` : undefined}
      onChange={(e) => onSo(id, e.target.value)}
    />
  );

  const oChon = (id: TruongChu, options: [string, string][]) => (
    <select id={`cs-${id}`} className="cs-input" value={form[id] ?? ''} onChange={(e) => onChu(id, e.target.value)}>
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );

  return (
    <form
      className="ui-card cs-form"
      aria-labelledby="csFormTitle"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h2 id="csFormTitle" className="cs-card-title">Hồ sơ vay</h2>
      <span className="cs-presets-label" id="csPresetsLabel">Kịch bản mẫu</span>
      <div className="cs-presets" role="group" aria-labelledby="csPresetsLabel">
        {KICH_BAN.map((k) => (
          <button key={k.ten} type="button" className="cs-preset" title={k.mo_ta} disabled={busy} onClick={() => onKichBan(k.ghi_de)}>
            {k.ten}
          </button>
        ))}
      </div>

      {truong('so_cccd', <>Số CCCD<span className="cs-hint">bỏ trống thì không tra CIC</span></>, (
        <input
          id="cs-so_cccd"
          className="cs-input"
          inputMode="numeric"
          value={form.so_cccd ?? ''}
          aria-invalid={loi.so_cccd ? true : undefined}
          aria-describedby={loi.so_cccd ? 'cs-so_cccd-err' : undefined}
          onChange={(e) => onChu('so_cccd', e.target.value)}
        />
      ))}
      <div className="cs-row">
        {truong('person_age', 'Tuổi', oSo('person_age'))}
        {truong('emp_length', 'Thâm niên', oChon('emp_length', THAM_NIEN))}
      </div>
      {truong('annual_inc', 'Thu nhập năm (VNĐ)', oSo('annual_inc'))}
      {truong('loan_amnt', 'Số tiền vay (VNĐ)', oSo('loan_amnt'))}
      <div className="cs-row">
        {truong('term_months', 'Kỳ hạn (tháng)', oSo('term_months'))}
        {truong('int_rate', 'Lãi suất (%/năm)', oSo('int_rate', '0.1'))}
      </div>
      <div className="cs-row">
        {truong('dti', 'DTI (%)', oSo('dti', '0.1'))}
        {truong('installment', 'Trả hàng tháng', oSo('installment'))}
      </div>
      {truong('home_ownership', 'Tình trạng nhà ở', oChon('home_ownership', NHA_O))}
      {truong('purpose', 'Mục đích vay', oChon('purpose', MUC_DICH))}
      {truong('verification_status', 'Xác minh thu nhập', oChon('verification_status', XAC_MINH))}

      <button type="submit" className="ui-btn primary cs-submit" disabled={busy}>
        {busy ? 'Đang chấm điểm...' : 'Chấm điểm và giải thích'}
      </button>
    </form>
  );
}
