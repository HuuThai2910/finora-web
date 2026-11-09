/**
 * Chuẩn hóa chuỗi để so khớp ô tìm ở client: chữ thường, bỏ dấu tiếng Việt (đ → d), gộp khoảng trắng. Nhờ vậy gõ
 * "phe duyet" vẫn khớp "Phê duyệt".
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Từ khóa rỗng thì khớp mọi dòng; còn lại khớp khi một trong các trường chứa từ khóa (đã chuẩn hóa). */
export function matchesSearch(query: string, ...fields: Array<string | null | undefined>): boolean {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  return fields.some((field) => field != null && normalizeSearchText(field).includes(needle));
}
