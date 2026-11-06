import type { EkycAttemptDetail, EkycDraftFieldKey } from '../types';
import { countReasonTones, toReasonViews } from './reasonDisplay';

export interface ApprovalField {
  label: string;
  /** `null` khi bản nháp không có giá trị: hộp duyệt ghi rõ "Không có" thay vì để trống. */
  value: string | null;
}

export interface ApprovalSummary {
  /** Các trường định danh sẽ ghi vào hồ sơ khách hàng khi duyệt, lấy đúng từ bản nháp của lượt. */
  fields: ApprovalField[];
  /** Số lý do đỏ, cam của cả bước đọc giấy tờ và bước kiểm tra người thật. */
  danger: number;
  warning: number;
}

const APPROVAL_FIELDS: ReadonlyArray<readonly [EkycDraftFieldKey, string]> = [
  ['fullName', 'Họ và tên'],
  ['idNumber', 'Số định danh'],
  ['dateOfBirth', 'Ngày sinh'],
];

/**
 * Tóm tắt cho hộp Duyệt: thứ sẽ được ghi vào hồ sơ và số lý do cần chú ý, để người duyệt thấy lại ngay trước khi bấm.
 * Chỉ trình bày dữ liệu đã có trên trang, không đưa ra khuyến nghị duyệt hay từ chối.
 */
export function approvalSummary(attempt: EkycAttemptDetail): ApprovalSummary {
  const fields = APPROVAL_FIELDS.map(([key, label]) => ({ label, value: attempt.draft?.[key]?.value?.trim() || null }));
  const tones = countReasonTones([...toReasonViews(attempt.reasons), ...toReasonViews(attempt.livenessReasons)]);
  return { fields, ...tones };
}
