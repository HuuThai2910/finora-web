import { Icon } from './Icon';

interface PagerProps {
  /** Trang hiện tại, tính từ 0 như backend. */
  page: number;
  size: number;
  total: number;
  /** Danh từ đếm, ví dụ "hồ sơ", "người dùng". */
  unit: string;
  onPage: (page: number) => void;
  /** Khóa nút khi đang tải trang mới để không gửi lệnh chồng nhau. */
  disabled?: boolean;
}

/**
 * Danh sách số trang cần vẽ; `null` là chỗ rút gọn "…".
 * Ít trang thì hiện đủ; nhiều trang thì giữ trang đầu, cuối và hai trang kề trang hiện tại.
 */
export function visiblePages(current: number, count: number): Array<number | null> {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index);
  const pages = new Set([0, count - 1, current - 1, current, current + 1]);
  if (current <= 2) [1, 2, 3].forEach((index) => pages.add(index));
  if (current >= count - 3) [count - 4, count - 3, count - 2].forEach((index) => pages.add(index));
  const sorted = [...pages].filter((index) => index >= 0 && index < count).sort((a, b) => a - b);
  const result: Array<number | null> = [];
  sorted.forEach((index, position) => {
    if (position > 0 && index - sorted[position - 1] > 1) result.push(null);
    result.push(index);
  });
  return result;
}

/** Chân bảng dùng chung: "Hiển thị a đến b trong N …" và nút số trang. */
export function Pager({ page, size, total, unit, onPage, disabled = false }: PagerProps) {
  const count = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(0, page), count - 1);
  const from = total === 0 ? 0 : current * size + 1;
  const to = Math.min(total, (current + 1) * size);

  return (
    <footer className="ui-pager">
      <span>Hiển thị {from} đến {to} trong {total} {unit}</span>
      {count > 1 && (
        <nav aria-label="Phân trang">
          <button type="button" aria-label="Trang trước" disabled={disabled || current === 0} onClick={() => onPage(current - 1)}>
            <Icon name="chevronLeft" />
          </button>
          {visiblePages(current, count).map((index, position) =>
            index === null ? (
              <span key={`gap-${position}`} className="gap" aria-hidden="true">…</span>
            ) : (
              <button
                key={index}
                type="button"
                aria-current={index === current ? 'page' : undefined}
                disabled={disabled}
                onClick={() => onPage(index)}
              >
                {index + 1}
              </button>
            ),
          )}
          <button type="button" aria-label="Trang sau" disabled={disabled || current >= count - 1} onClick={() => onPage(current + 1)}>
            <Icon name="chevronRight" />
          </button>
        </nav>
      )}
    </footer>
  );
}
