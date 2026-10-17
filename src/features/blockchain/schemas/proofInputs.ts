import type { ProofReferenceType } from '../types';

/** Backend nhận `referenceId` tối đa 100 ký tự (`@Size(max = 100)`). */
const REFERENCE_MAX_LENGTH = 100;

/**
 * Kiểm nhanh mã tham chiếu trước khi tra. Chỉ giúp báo lỗi sớm; backend vẫn kiểm lại và trả
 * `PROOF_REFERENCE_INVALID` nếu sai. Trả câu lỗi hoặc `null` khi hợp lệ.
 */
export function validateReference(type: ProofReferenceType, raw: string): string | null {
  const id = raw.trim();
  if (!id) return 'Nhập mã tham chiếu cần tra.';
  if (id.length > REFERENCE_MAX_LENGTH) return `Mã tham chiếu dài tối đa ${REFERENCE_MAX_LENGTH} ký tự.`;
  // Backend tra hồ sơ vay theo ID số (`loan_application_id`), không theo mã hồ sơ dạng LA-...
  if (type === 'LOAN_APPLICATION' && !/^[1-9]\d{0,18}$/.test(id)) {
    return 'ID hồ sơ vay là số nguyên dương, ví dụ 123 (không phải mã hồ sơ dạng LA-...).';
  }
  return null;
}

/** Kết quả đọc ô "dữ liệu gốc": rỗng nghĩa là chỉ đối chiếu cơ sở dữ liệu với sổ cái. */
export type ArtifactInput =
  | { kind: 'empty' }
  | { kind: 'valid'; artifact: Record<string, unknown> }
  | { kind: 'invalid'; message: string };

/**
 * Đọc dữ liệu gốc người kiểm toán dán vào. Artifact là object `data` của event nguồn nên phải là JSON hợp lệ và là
 * object. Quy tắc chuẩn hóa thật (chỉ số nguyên, bỏ null, sắp key) do backend áp dụng khi tính lại hash; artifact
 * không chuẩn hóa được thì backend trả `PROOF_ARTIFACT_INVALID`.
 */
export function parseArtifact(text: string): ArtifactInput {
  const trimmed = text.trim();
  if (!trimmed) return { kind: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Thông điệp của trình duyệt là tiếng Anh và khác nhau giữa các trình duyệt nên không đưa ra giao diện.
    return {
      kind: 'invalid',
      message: 'Dữ liệu gốc không phải JSON hợp lệ. Kiểm tra dấu ngoặc, dấu phẩy và dấu nháy kép.',
    };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { kind: 'invalid', message: 'Dữ liệu gốc phải là một object JSON: phần data của event nguồn.' };
  }
  return { kind: 'valid', artifact: parsed as Record<string, unknown> };
}
