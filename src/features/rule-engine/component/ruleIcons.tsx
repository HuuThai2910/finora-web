/**
 * Icon dùng trong bảng cấu hình luật.
 *
 * Vẽ inline SVG theo đúng quy ước sẵn có của dự án (viewBox 24, stroke
 * currentColor, strokeWidth 2, đầu nét bo tròn — bộ Lucide) thay vì thêm thư
 * viện icon: dự án chưa có dependency icon nào, thêm một gói chỉ vì bốn hình là
 * không đáng.
 *
 * Mọi icon đều `aria-hidden`: chúng luôn nằm trong nút đã có `aria-label` hoặc
 * đi kèm nhãn chữ, nên để screen reader đọc thêm là thừa.
 */

type IconProps = { className?: string };

const chung = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Thùng rác — xóa một bậc điểm hoặc một luật. */
export function IconTrash({ className }: IconProps) {
  return (
    <svg {...chung} className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

/** Dấu cộng — thêm bậc, thêm luật. */
export function IconPlus({ className }: IconProps) {
  return (
    <svg {...chung} className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

/** Mũi tên lên — đổi thứ tự luật. */
export function IconArrowUp({ className }: IconProps) {
  return (
    <svg {...chung} className={className}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

/** Mũi tên xuống — đổi thứ tự luật. */
export function IconArrowDown({ className }: IconProps) {
  return (
    <svg {...chung} className={className}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

/** Mũi tên xổ xuống — dùng làm chevron của select tự vẽ. */
export function IconChevronDown({ className }: IconProps) {
  return (
    <svg {...chung} className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Vô cực — đánh dấu bậc "mọi giá trị còn lại". */
export function IconInfinity({ className }: IconProps) {
  return (
    <svg {...chung} className={className}>
      <path d="M12 12c-2-2.7-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.3 5.5-4Z" />
      <path d="M12 12c2 2.7 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.3-5.5 4Z" />
    </svg>
  );
}

/** Dấu chấm than tròn — tooltip giải thích biến và hướng dẫn. */
export function IconAlertCircle({ className }: IconProps) {
  return (
    <svg {...chung} className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
