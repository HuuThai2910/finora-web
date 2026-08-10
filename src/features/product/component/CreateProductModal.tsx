import { useState } from 'react';
import type { CreateLoanProductRequest, RepaymentMethod } from '../types';

interface ProductForm {
  code: string;
  name: string;
  description: string;
  minAmount: string;
  maxAmount: string;
  minTermMonths: string;
  maxTermMonths: string;
  annualInterestRate: string;
  repaymentMethod: RepaymentMethod;
}

const EMPTY_FORM: ProductForm = {
  code: '', name: '', description: '', minAmount: '', maxAmount: '',
  minTermMonths: '', maxTermMonths: '', annualInterestRate: '', repaymentMethod: 'ANNUITY',
};

interface Props {
  saving: boolean;
  serverError?: string;
  onClose: () => void;
  onCreate: (request: CreateLoanProductRequest) => Promise<void>;
}

function validate(form: ProductForm): string | null {
  if (!form.code || !form.name || !form.minAmount || !form.maxAmount
    || !form.minTermMonths || !form.maxTermMonths || !form.annualInterestRate) {
    return 'Vui lòng điền đầy đủ các trường bắt buộc.';
  }
  if (!/^[A-Za-z][A-Za-z0-9_]{2,49}$/.test(form.code)) {
    return 'Mã phải bắt đầu bằng chữ, chỉ chứa chữ/số/_, dài 3–50 ký tự.';
  }
  if (Number(form.minAmount) > Number(form.maxAmount)) return 'Hạn mức tối thiểu không được lớn hơn tối đa.';
  if (Number(form.minTermMonths) > Number(form.maxTermMonths)) return 'Kỳ hạn tối thiểu không được lớn hơn tối đa.';
  return null;
}

export function CreateProductModal({ saving, serverError, onClose, onCreate }: Props) {
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [validationError, setValidationError] = useState('');

  async function submit() {
    const message = validate(form);
    setValidationError(message ?? '');
    if (message) return;
    await onCreate({
      code: form.code,
      name: form.name,
      description: form.description || null,
      minAmount: Number(form.minAmount),
      maxAmount: Number(form.maxAmount),
      minTermMonths: Number(form.minTermMonths),
      maxTermMonths: Number(form.maxTermMonths),
      annualInterestRate: Number(form.annualInterestRate),
      repaymentMethod: form.repaymentMethod,
    });
  }

  const update = (field: keyof ProductForm, value: string) => setForm(current => ({ ...current, [field]: value }));

  return (
    <div className="prod-modal-overlay" onClick={onClose}>
      <div className="prod-modal" onClick={event => event.stopPropagation()}>
        <div className="prod-modal-header">
          <h3>Tạo sản phẩm vay mới</h3>
          <button className="prod-modal-close" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        <div className="prod-modal-body">
          <div className="prod-field-row">
            <div className="prod-field">
              <label>Mã sản phẩm *</label>
              <input value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} placeholder="VD: PERSONAL_STANDARD" />
            </div>
            <div className="prod-field">
              <label>Cách trả nợ *</label>
              <select value={form.repaymentMethod} onChange={e => update('repaymentMethod', e.target.value)}>
                <option value="ANNUITY">Khoản trả đều</option>
                <option value="EQUAL_PRINCIPAL">Gốc trả đều</option>
              </select>
            </div>
          </div>
          <div className="prod-field">
            <label>Tên sản phẩm *</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div className="prod-field">
            <label>Mô tả</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} />
          </div>
          <div className="prod-field-row">
            <div className="prod-field"><label>Hạn mức tối thiểu *</label><input type="number" value={form.minAmount} onChange={e => update('minAmount', e.target.value)} /></div>
            <div className="prod-field"><label>Hạn mức tối đa *</label><input type="number" value={form.maxAmount} onChange={e => update('maxAmount', e.target.value)} /></div>
          </div>
          <div className="prod-field-row">
            <div className="prod-field"><label>Kỳ hạn tối thiểu (tháng) *</label><input type="number" value={form.minTermMonths} onChange={e => update('minTermMonths', e.target.value)} /></div>
            <div className="prod-field"><label>Kỳ hạn tối đa (tháng) *</label><input type="number" value={form.maxTermMonths} onChange={e => update('maxTermMonths', e.target.value)} /></div>
          </div>
          <div className="prod-field">
            <label>Lãi suất năm (%) *</label>
            <input type="number" step="0.0001" value={form.annualInterestRate} onChange={e => update('annualInterestRate', e.target.value)} />
          </div>
          {(validationError || serverError) && <div className="prod-field-error">{validationError || serverError}</div>}
        </div>
        <div className="prod-modal-footer">
          <button className="prod-btn sm prod-btn-ghost" onClick={onClose}>Hủy</button>
          <button className="prod-btn sm prod-btn-primary" onClick={submit} disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo và đồng bộ'}</button>
        </div>
      </div>
    </div>
  );
}

