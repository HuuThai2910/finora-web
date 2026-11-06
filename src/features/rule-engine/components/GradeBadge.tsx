/** Màu theo mức rủi ro của chữ cái hạng; hạng không có ở đây để trung tính. */
const MAU_HANG = new Map([
  ['a', 'bg-success-bg text-success'],
  ['b', 'bg-brand-50 text-brand'],
  ['c', 'bg-warning-bg text-warning'],
  ['d', 'bg-danger-bg text-danger'],
  ['e', 'bg-danger-bg text-danger'],
]);

/**
 * Nhãn hạng tín dụng. Màu theo chữ cái A đến E (A tốt nhất); hạng khác để trung
 * tính vì bảng hạng là cấu hình động, backend có thể thêm hạng mới.
 */
export function GradeBadge({ grade }: { grade: string }) {
  const g = grade.toLowerCase();
  return (
    <span
      className={`aig-grade g-${g} inline-grid place-items-center min-w-6.5 h-6.5 px-1.5 rounded-sm text-[13px] font-semibold ${
        MAU_HANG.get(g) ?? 'bg-fill text-secondary'
      }`}
    >
      {grade}
    </span>
  );
}
