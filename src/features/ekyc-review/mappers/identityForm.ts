import type { EkycAttemptDetail, EkycStaffIdentity } from '../types';

/**
 * Form thông tin định danh nhân viên nhập khi duyệt, hai chế độ:
 * - `fill`: hệ thống xác minh (AI) gặp sự cố, không đọc được thẻ — chỉ hiện trường còn trống, backend quyết định trường
 *   bắt buộc (`requiredIdentityFields`);
 * - `correct`: người dùng chụp lại nhiều lần mà vẫn báo thông tin đọc từ thẻ chưa đúng — hiện mọi trường, điền sẵn bản
 *   nháp, chỉ gửi trường nhân viên đã sửa.
 * Backend kiểm luật nghiệp vụ (đủ 18 tuổi, thẻ còn hạn, trùng số…); web chỉ kiểm định dạng để báo lỗi sớm.
 */
export type IdentityFormMode = 'fill' | 'correct';

export type IdentityFieldKey = Exclude<keyof EkycStaffIdentity, 'noExpiry'>;

export type IdentityFieldKind = 'cardType' | 'idNumber' | 'text' | 'date' | 'gender';

export interface IdentityFieldMeta {
  key: IdentityFieldKey;
  label: string;
  kind: IdentityFieldKind;
}

/** Thứ tự như trên thẻ; nhãn theo cách gọi trên CCCD, giống phần giấy tờ của màn duyệt. */
const FIELDS: readonly IdentityFieldMeta[] = [
  { key: 'cardType', label: 'Loại thẻ', kind: 'cardType' },
  { key: 'idNumber', label: 'Số định danh', kind: 'idNumber' },
  { key: 'fullName', label: 'Họ và tên', kind: 'text' },
  { key: 'dateOfBirth', label: 'Ngày sinh', kind: 'date' },
  { key: 'gender', label: 'Giới tính', kind: 'gender' },
  { key: 'placeOfOrigin', label: 'Quê quán', kind: 'text' },
  { key: 'birthRegistrationPlace', label: 'Nơi đăng ký khai sinh', kind: 'text' },
  { key: 'address', label: 'Nơi thường trú', kind: 'text' },
  { key: 'issueDate', label: 'Ngày cấp', kind: 'date' },
  { key: 'expiryDate', label: 'Có giá trị đến', kind: 'date' },
];

/** Trường không bắt buộc nhưng nhân viên được bổ sung khi bản nháp còn trống. */
const OPTIONAL_KEYS = new Set<IdentityFieldKey>(['placeOfOrigin', 'birthRegistrationPlace', 'address']);

/** Trường bắt buộc khi sửa hồ sơ báo sai — cùng danh sách backend kiểm sau khi áp chỗ sửa. */
const REQUIRED_WHEN_CORRECTING = new Set<IdentityFieldKey>([
  'cardType', 'idNumber', 'fullName', 'dateOfBirth', 'gender', 'issueDate', 'expiryDate',
]);

/** Chữ bản nháp ghi cho thẻ "không thời hạn" (trùng backend). */
const NO_EXPIRY_TEXT = 'Không thời hạn';

/** Loại thẻ nhận khi duyệt (backend không nhận CMND). */
export const STAFF_CARD_TYPES = ['CCCD_CHIP_2021', 'CAN_CUOC_2024', 'CCCD_CHIP_UNKNOWN', 'CCCD_BARCODE'] as const;

export const GENDER_OPTIONS = ['Nam', 'Nữ'] as const;

export interface IdentityFormField extends IdentityFieldMeta {
  required: boolean;
}

export type IdentityValues = Partial<Record<IdentityFieldKey, string>>;
export type IdentityErrors = Partial<Record<IdentityFieldKey, string>>;

/** Giá trị form lúc mở hộp thoại: rỗng khi điền chỗ trống, bản nháp khi sửa hồ sơ báo sai. */
export interface IdentityInitial {
  values: IdentityValues;
  noExpiry: boolean;
}

/**
 * Chế độ form khi duyệt, hoặc `null` nếu không cần nhân viên nhập gì. Hồ sơ AI gặp sự cố xét trước (backend cũng vậy):
 * AI chỉ lỗi ở bước so mặt thì bản nháp đã đủ, không cần form.
 */
export function identityFormMode(attempt: EkycAttemptDetail): IdentityFormMode | null {
  if (attempt.aiUnavailable) return (attempt.requiredIdentityFields?.length ?? 0) > 0 ? 'fill' : null;
  return attempt.userReportedIncorrect ? 'correct' : null;
}

/**
 * Trường hiện trên form. `fill`: trường backend yêu cầu, cộng trường tuỳ chọn mà bản nháp còn trống. `correct`: mọi
 * trường, trường bắt buộc có dấu "*".
 */
export function identityFormFields(attempt: EkycAttemptDetail, mode: IdentityFormMode): IdentityFormField[] {
  if (mode === 'correct') {
    return FIELDS.map((field) => ({ ...field, required: REQUIRED_WHEN_CORRECTING.has(field.key) }));
  }
  const required = new Set(attempt.requiredIdentityFields ?? []);
  return FIELDS.flatMap((field): IdentityFormField[] => {
    if (required.has(field.key)) return [{ ...field, required: true }];
    const draftField = field.key === 'cardType' ? null : attempt.draft?.[field.key];
    if (OPTIONAL_KEYS.has(field.key) && !draftField?.value) return [{ ...field, required: false }];
    return [];
  });
}

/** Giá trị ban đầu: `correct` điền sẵn bản nháp, hạn "Không thời hạn" thành ô tick; chế độ khác để trống. */
export function initialIdentity(attempt: EkycAttemptDetail, mode: IdentityFormMode | null): IdentityInitial {
  if (mode !== 'correct') return { values: {}, noExpiry: false };
  const values: IdentityValues = {};
  if (attempt.cardType && (STAFF_CARD_TYPES as readonly string[]).includes(attempt.cardType)) {
    values.cardType = attempt.cardType;
  }
  let noExpiry = false;
  FIELDS.forEach((field) => {
    const draftField = field.key === 'cardType' ? null : attempt.draft?.[field.key];
    const value = draftField?.value?.trim();
    if (!value) return;
    if (field.key === 'expiryDate' && value === NO_EXPIRY_TEXT) {
      noExpiry = true;
      return;
    }
    values[field.key] = value;
  });
  return { values, noExpiry };
}

const DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Ngày dd/mm/yyyy có thật (không nắn 31/02 thành 03/03). */
function isRealDate(raw: string): boolean {
  const match = DATE.exec(raw);
  if (!match) return false;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Kiểm định dạng; trường "Có giá trị đến" được bỏ trống khi thẻ ghi "Không thời hạn". */
export function validateIdentity(fields: readonly IdentityFormField[], values: IdentityValues, noExpiry: boolean): IdentityErrors {
  const errors: IdentityErrors = {};
  fields.forEach((field) => {
    const value = values[field.key]?.trim() ?? '';
    const exempt = field.key === 'expiryDate' && noExpiry;
    if (!value) {
      if (field.required && !exempt) errors[field.key] = `Nhập ${field.label.toLowerCase()}.`;
      return;
    }
    if (field.kind === 'idNumber' && !/^\d{12}$/.test(value)) errors[field.key] = 'Số định danh gồm đúng 12 chữ số.';
    if (field.kind === 'date' && !exempt && !isRealDate(value)) errors[field.key] = 'Ngày theo dạng dd/mm/yyyy, ví dụ 05/09/1995.';
  });
  return errors;
}

/** Thân `identity` khi điền chỗ trống: chỉ trường đã nhập (đã cắt khoảng trắng). */
export function toStaffIdentity(fields: readonly IdentityFormField[], values: IdentityValues, noExpiry: boolean): EkycStaffIdentity {
  const identity: EkycStaffIdentity = {};
  fields.forEach((field) => {
    const value = values[field.key]?.trim();
    if (!value || (field.key === 'expiryDate' && noExpiry)) return;
    identity[field.key] = value;
  });
  if (noExpiry) identity.noExpiry = true;
  return identity;
}

/**
 * Thân `identity` khi sửa hồ sơ báo sai: chỉ trường khác giá trị điền sẵn; `undefined` khi nhân viên không sửa gì
 * (duyệt nguyên bản nháp). Mới tick "Không thời hạn" thì gửi `noExpiry`; bỏ tick thì gửi ngày hết hạn vừa nhập.
 */
export function toStaffCorrections(
  fields: readonly IdentityFormField[],
  values: IdentityValues,
  noExpiry: boolean,
  initial: IdentityInitial,
): EkycStaffIdentity | undefined {
  const identity: EkycStaffIdentity = {};
  fields.forEach((field) => {
    if (field.key === 'expiryDate' && noExpiry) return;
    const value = values[field.key]?.trim() ?? '';
    if (value && value !== (initial.values[field.key] ?? '')) identity[field.key] = value;
  });
  if (noExpiry && !initial.noExpiry) identity.noExpiry = true;
  return Object.keys(identity).length > 0 ? identity : undefined;
}
