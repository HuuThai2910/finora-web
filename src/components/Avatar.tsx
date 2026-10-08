/** Chữ cái đầu của họ và tên (hoặc email) làm avatar, ví dụ "Phạm Thu Hà" thành "PH". */
export function initials(name: string): string {
  const parts = name.trim().split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toLocaleUpperCase('vi-VN');
}

/** Avatar chữ cái một tông, không gán màu theo người (màu chỉ để mang nghĩa). */
export function Avatar({ name }: { name: string }) {
  return <span className="ui-avatar" aria-hidden="true">{initials(name)}</span>;
}
