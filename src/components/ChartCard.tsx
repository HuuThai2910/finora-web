import type { ReactNode } from 'react';
import { ErrorNotice } from './ErrorNotice';

/** Câu hiển thị khi API trả về khoảng không có số liệu (mọi cột bằng 0 hoặc danh sách rỗng). */
export const CHART_EMPTY_TEXT = 'Chưa có dữ liệu trong khoảng này.';

interface ChartCardProps {
  /** id của tiêu đề, gắn vào `aria-labelledby` của thẻ. */
  id: string;
  title: string;
  /** Nhãn phạm vi bên phải tiêu đề: "30 ngày", "Hiện tại". */
  aside?: ReactNode;
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  /** Đã tải xong nhưng không có gì để vẽ. */
  isEmpty?: boolean;
  emptyText?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Khung thẻ biểu đồ dùng chung: tiêu đề, nhãn phạm vi và bốn trạng thái tải, lỗi (giữ mã lỗi), rỗng,
 * có dữ liệu. Lỗi của một thẻ không làm hỏng các thẻ khác trên trang.
 */
export function ChartCard({
  id, title, aside, isLoading, error, onRetry, isEmpty = false, emptyText = CHART_EMPTY_TEXT, className, children,
}: ChartCardProps) {
  return (
    <section className={['ui-card', 'ui-chart-card', className].filter(Boolean).join(' ')} aria-labelledby={id}>
      <div className="ui-chart-head">
        <h2 id={id}>{title}</h2>
        {aside && <span className="ui-tag">{aside}</span>}
      </div>
      {error ? (
        <div className="ui-chart-state"><ErrorNotice error={error} onRetry={onRetry} /></div>
      ) : isLoading ? (
        <div className="ui-chart-state" aria-busy="true">
          <span className="ui-skeleton ui-chart-skel-line" />
          <span className="ui-skeleton ui-chart-skel-plot" />
        </div>
      ) : isEmpty ? (
        <p className="ui-chart-empty">{emptyText}</p>
      ) : (
        children
      )}
    </section>
  );
}

interface ChartDataTableProps {
  headers: string[];
  rows: string[][];
  caption?: string;
}

/** Bảng số liệu thay thế cho biểu đồ, gập trong "Xem số liệu". Cột đầu là nhãn, các cột sau là số. */
export function ChartDataTable({ headers, rows, caption }: ChartDataTableProps) {
  return (
    <details className="ui-chart-data">
      <summary>Xem số liệu</summary>
      <div className="ui-table-wrap">
        <table>
          {caption && <caption className="ui-sr-only">{caption}</caption>}
          <thead>
            <tr>{headers.map((header, index) => <th key={header} className={index ? 'num' : undefined}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => <td key={index} className={index ? 'num' : undefined}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
