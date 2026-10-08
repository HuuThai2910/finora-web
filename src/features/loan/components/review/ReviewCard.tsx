import type { ReactNode } from 'react';

interface ReviewCardProps {
  title: string;
  /** Chú thích nhỏ căn phải ở đầu thẻ (nguồn dữ liệu, thời điểm). */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Thẻ nội dung của trang chi tiết hồ sơ: tiêu đề 15px, chú thích nguồn bên phải. */
export function ReviewCard({ title, aside, className, children }: ReviewCardProps) {
  return (
    <article className={['ui-card', 'lr-card', className].filter(Boolean).join(' ')}>
      <div className="lr-card-head">
        <h2>{title}</h2>
        {aside ? <span className="lr-card-aside">{aside}</span> : null}
      </div>
      {children}
    </article>
  );
}

export interface ReviewRow {
  key: string;
  label: string;
  value: ReactNode;
  hint?: string | null;
  /** Dữ liệu không tra được lúc chấm: hiện chữ cảnh báo thay cho giá trị. */
  missing?: boolean;
}

/** Danh sách nhãn trái, giá trị phải; dùng cho các thẻ căn cứ thẩm định. */
export function ReviewRows({ rows }: { rows: ReviewRow[] }) {
  return (
    <dl className="lr-rows">
      {rows.map((row) => (
        <div key={row.key} className="lr-row">
          <dt>{row.label}</dt>
          {row.missing ? (
            <dd className="lr-val missing">Chưa tra được</dd>
          ) : (
            <dd className="lr-val">
              {row.value}
              {row.hint ? <span className="lr-val-hint">{row.hint}</span> : null}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
