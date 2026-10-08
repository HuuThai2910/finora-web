import './GradeBadge.css';

/**
 * Nhãn hạng tín dụng. Màu theo chữ cái A đến E (A tốt nhất); hạng khác để trung
 * tính vì bảng hạng là cấu hình động, backend có thể thêm hạng mới.
 */
export function GradeBadge({ grade }: { grade: string }) {
  return <span className={`aig-grade g-${grade.toLowerCase()}`}>{grade}</span>;
}
