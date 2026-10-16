import type { EkycDraft, EkycDraftFieldKey, EkycFieldSource } from '../types';
import type { PillDisplay } from './attemptDisplay';

export interface SourceBadge extends PillDisplay {
  code: string;
}

export interface DraftFieldRow {
  key: EkycDraftFieldKey;
  label: string;
  /** `false` khi backend trả `null` cho trường: không thu thập (ví dụ quê quán khi tắt trường tuỳ chọn). */
  collected: boolean;
  value: string | null;
  sources: SourceBadge[];
  /** Chỉ có nguồn không kiểm chứng được (AI đọc hoặc người dùng sửa): người duyệt phải đối chiếu ảnh thẻ. */
  unverified: boolean;
}

/** Thứ tự trường như trên thẻ; nhãn theo cách gọi trên CCCD. */
const FIELD_ORDER: ReadonlyArray<readonly [EkycDraftFieldKey, string]> = [
  ['idNumber', 'Số định danh'],
  ['fullName', 'Họ và tên'],
  ['dateOfBirth', 'Ngày sinh'],
  ['gender', 'Giới tính'],
  ['address', 'Nơi thường trú'],
  ['placeOfOrigin', 'Quê quán'],
  ['birthRegistrationPlace', 'Nơi đăng ký khai sinh'],
  ['issueDate', 'Ngày cấp'],
  ['expiryDate', 'Có giá trị đến'],
];

/**
 * Nhãn nguồn thống nhất với màn kết quả trên mobile (EKYC-002 §7). QR và MRZ là nguồn tất định nên
 * màu xanh; AI và dữ liệu người dùng tự sửa màu cam để người duyệt chú ý đối chiếu.
 */
const SOURCE_DISPLAY: Record<EkycFieldSource, PillDisplay> = {
  QR: { label: 'Từ mã QR', tone: 'success' },
  MRZ: { label: 'Từ dòng mã máy đọc', tone: 'success' },
  OCR: { label: 'Từ chữ in trên thẻ', tone: 'info' },
  AI: { label: 'AI đọc', tone: 'warning' },
  USER: { label: 'Người dùng sửa', tone: 'warning' },
};

const UNVERIFIED_SOURCES = new Set<string>(['AI', 'USER']);

export function sourceBadge(code: string): SourceBadge {
  return { code, ...(SOURCE_DISPLAY[code as EkycFieldSource] ?? { label: code, tone: 'neutral' }) };
}

/** Dòng hiển thị của bản nháp theo thứ tự cố định; khoá lạ backend thêm sau bị bỏ qua. */
export function toDraftRows(draft: EkycDraft): DraftFieldRow[] {
  return FIELD_ORDER.map(([key, label]) => {
    const field = draft[key];
    if (!field) {
      return { key, label, collected: false, value: null, sources: [], unverified: false };
    }
    const sources = (field.sources ?? []).map(sourceBadge);
    return {
      key,
      label,
      collected: true,
      value: field.value,
      sources,
      unverified: sources.length > 0 && sources.every((source) => UNVERIFIED_SOURCES.has(source.code)),
    };
  });
}
