import type { CreditScoreRequest } from '../types';

/** Ô số của form: để trống thì gửi undefined. */
export type TruongSo = 'person_age' | 'annual_inc' | 'loan_amnt' | 'term_months' | 'int_rate' | 'dti' | 'installment';
/** Ô chữ/chọn của form: chuỗi rỗng thì gửi undefined. */
export type TruongChu = 'so_cccd' | 'emp_length' | 'verification_status' | 'home_ownership' | 'purpose';

export type LoiHoSo = Partial<Record<keyof CreditScoreRequest, string>>;

/**
 * Kiểm tra sớm các ràng buộc chắc chắn của `CreditScoreRequest` trong
 * finora-ai (schemas/credit.py) để báo đúng ô thay vì đợi 422 tiếng Anh của Pydantic.
 * Backend vẫn là nơi quyết định; lỗi nào lọt qua sẽ hiện nguyên văn từ backend.
 */
export function kiemTraHoSo(hoSo: CreditScoreRequest): LoiHoSo {
  const loi: LoiHoSo = {};
  if (!(hoSo.annual_inc > 0)) loi.annual_inc = 'Nhập thu nhập năm lớn hơn 0.';
  if (!(hoSo.loan_amnt >= 1)) loi.loan_amnt = 'Nhập số tiền vay.';
  if (!(hoSo.installment != null && hoSo.installment > 0)) loi.installment = 'Bắt buộc: số tiền trả hàng tháng lớn hơn 0.';
  if (hoSo.so_cccd && !/^\d{12}$/.test(hoSo.so_cccd)) loi.so_cccd = 'Số CCCD gồm đúng 12 chữ số.';
  if (hoSo.person_age != null && (hoSo.person_age < 18 || hoSo.person_age > 80)) loi.person_age = 'Tuổi từ 18 đến 80.';
  if (hoSo.term_months != null && (hoSo.term_months < 1 || hoSo.term_months > 24)) loi.term_months = 'Kỳ hạn từ 1 đến 24 tháng.';
  if (hoSo.dti != null && hoSo.dti < 0) loi.dti = 'DTI không được âm.';
  if (hoSo.int_rate != null && (hoSo.int_rate < 0 || hoSo.int_rate > 100)) loi.int_rate = 'Lãi suất từ 0 đến 100.';
  return loi;
}
