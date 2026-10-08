import { MAX_TERM_MONTHS, RATE_CAP_PERCENT } from '../constants';
import type { CreateLoanProductRequest, RepaymentMethod } from '../types';

/** Giá trị thô người dùng nhập: tiền và kỳ hạn chỉ giữ chữ số, lãi suất dùng dấu chấm thập phân. */
export interface ProductForm {
  code: string;
  name: string;
  description: string;
  minAmount: string;
  maxAmount: string;
  minTermMonths: string;
  maxTermMonths: string;
  minAnnualInterestRate: string;
  annualInterestRate: string;
  maxAnnualInterestRate: string;
  repaymentMethod: RepaymentMethod;
}

export type ProductTextField = Exclude<keyof ProductForm, 'repaymentMethod'>;

export const EMPTY_PRODUCT_FORM: ProductForm = {
  code: '',
  name: '',
  description: '',
  minAmount: '',
  maxAmount: '',
  minTermMonths: '',
  maxTermMonths: '',
  minAnnualInterestRate: '',
  annualInterestRate: '',
  maxAnnualInterestRate: '',
  repaymentMethod: 'ANNUITY',
};

const MONEY_FIELDS: ProductTextField[] = ['minAmount', 'maxAmount'];
const INTEGER_FIELDS: ProductTextField[] = ['minAmount', 'maxAmount', 'minTermMonths', 'maxTermMonths'];
const RATE_FIELDS: ProductTextField[] = ['minAnnualInterestRate', 'annualInterestRate', 'maxAnnualInterestRate'];
const MONEY = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** Chuẩn hóa chuỗi gõ vào thành giá trị thô lưu trong form. */
export function normalizeInput(field: ProductTextField, raw: string): string {
  // Mã sản phẩm theo mẫu backend `[A-Za-z][A-Za-z0-9_]{2,49}`: viết hoa, khoảng trắng thành gạch dưới.
  if (field === 'code') return raw.toUpperCase().replace(/\s/g, '_');
  if (INTEGER_FIELDS.includes(field)) return raw.replace(/\D/g, '');
  if (RATE_FIELDS.includes(field)) return raw.replace(',', '.').replace(/[^\d.]/g, '');
  return raw;
}

/** Giá trị hiển thị trong ô: tiền có dấu chấm ngăn nghìn, lãi suất dùng dấu phẩy thập phân. */
export function displayValue(field: ProductTextField, value: string): string {
  if (MONEY_FIELDS.includes(field) && value) return MONEY.format(Number(value));
  if (RATE_FIELDS.includes(field)) return value.replace('.', ',');
  return value;
}

/** Kiểm tra phía client cho trải nghiệm; backend vẫn kiểm tra lại toàn bộ. */
export function validateProductForm(form: ProductForm): string | null {
  const required: ProductTextField[] = ['code', 'name', 'minAmount', 'maxAmount', 'minTermMonths', 'maxTermMonths', ...RATE_FIELDS];
  if (required.some((field) => !form[field].trim())) return 'Vui lòng điền đầy đủ các trường bắt buộc.';
  if (!/^[A-Za-z][A-Za-z0-9_]{2,49}$/.test(form.code)) {
    return 'Mã phải bắt đầu bằng chữ, chỉ chứa chữ, số và dấu _, dài 3 đến 50 ký tự.';
  }
  if (Number(form.minAmount) <= 0) return 'Hạn mức tối thiểu phải lớn hơn 0.';
  if (Number(form.minAmount) > Number(form.maxAmount)) return 'Hạn mức tối thiểu không được lớn hơn tối đa.';
  if (Number(form.minTermMonths) <= 0) return 'Kỳ hạn tối thiểu phải lớn hơn 0.';
  if (Number(form.minTermMonths) > Number(form.maxTermMonths)) return 'Kỳ hạn tối thiểu không được lớn hơn tối đa.';
  if (Number(form.maxTermMonths) > MAX_TERM_MONTHS) return `Kỳ hạn tối đa của FINORA hiện không vượt quá ${MAX_TERM_MONTHS} tháng.`;
  const minRate = Number(form.minAnnualInterestRate);
  const baseRate = Number(form.annualInterestRate);
  const maxRate = Number(form.maxAnnualInterestRate);
  if (![minRate, baseRate, maxRate].every(Number.isFinite)) return 'Lãi suất không hợp lệ.';
  if (!(minRate > 0 && minRate <= baseRate && baseRate <= maxRate)) {
    return 'Lãi suất phải theo thứ tự: tối thiểu ≤ cơ sở ≤ tối đa.';
  }
  if (maxRate > RATE_CAP_PERCENT) return `Lãi suất tối đa không được vượt quá ${RATE_CAP_PERCENT}%/năm.`;
  return null;
}

export function toCreateRequest(form: ProductForm): CreateLoanProductRequest {
  return {
    code: form.code,
    name: form.name.trim(),
    description: form.description.trim() || null,
    minAmount: Number(form.minAmount),
    maxAmount: Number(form.maxAmount),
    minTermMonths: Number(form.minTermMonths),
    maxTermMonths: Number(form.maxTermMonths),
    minAnnualInterestRate: Number(form.minAnnualInterestRate),
    annualInterestRate: Number(form.annualInterestRate),
    maxAnnualInterestRate: Number(form.maxAnnualInterestRate),
    repaymentMethod: form.repaymentMethod,
  };
}
