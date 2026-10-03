import type { PageResponse } from '../types';

interface Props {
  page: PageResponse<unknown>;
  /** Đơn vị đếm hiển thị cạnh tổng số, như "khoản vay" hay "lần khớp". */
  unit: string;
  busy: boolean;
  onPage: (page: number) => void;
}

/** Thanh chuyển trang dưới bảng, cùng dáng trang Gọi vốn. Ẩn khi không có dòng nào. */
export function Pager({ page, unit, busy, onPage }: Props) {
  if (page.totalElements === 0) return null;
  return (
    <div className="inv-pager">
      <span className="inv-muted">
        Trang {page.page + 1} / {Math.max(page.totalPages, 1)}
        <span className="inv-dot" aria-hidden="true" />
        {page.totalElements} {unit}
      </span>
      <div className="inv-actions">
        <button
          type="button"
          className="inv-btn sm inv-btn-ghost"
          disabled={page.page === 0 || busy}
          onClick={() => onPage(Math.max(page.page - 1, 0))}
        >
          Trang trước
        </button>
        <button
          type="button"
          className="inv-btn sm inv-btn-ghost"
          disabled={page.last || busy}
          onClick={() => onPage(page.page + 1)}
        >
          Trang sau
        </button>
      </div>
    </div>
  );
}
