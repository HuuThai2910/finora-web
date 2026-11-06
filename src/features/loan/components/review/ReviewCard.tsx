import type { ReactNode } from 'react';
import { VAL_HINT } from './reviewClassNames';

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
    <article
      className={['ui-card lr-card pt-3.5 px-4.5 pb-4 max-[600px]:px-3.5 max-[600px]:pb-3.5', className].filter(Boolean).join(' ')}
    >
      {/* Dưới 600px chú thích xuống dòng dưới tiêu đề, căn trái. */}
      <div className="lr-card-head flex items-baseline justify-between gap-3 mb-2 max-[600px]:flex-col max-[600px]:gap-0.5">
        <h2 className="text-[15px] font-semibold leading-[1.4]">{title}</h2>
        {aside ? <span className="lr-card-aside text-muted text-[12px] text-right max-[600px]:text-left">{aside}</span> : null}
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

const ROW =
  'lr-row grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center min-h-9 py-1.5 border-b border-b-divider last:[border-bottom:0] last:pb-0';

const VALUE = 'lr-val text-[14px] font-medium tabular-nums text-right wrap-anywhere';

/** Danh sách nhãn trái, giá trị phải; dùng cho các thẻ căn cứ thẩm định. */
export function ReviewRows({ rows }: { rows: ReviewRow[] }) {
  return (
    <dl className="lr-rows">
      {rows.map((row) => (
        <div key={row.key} className={ROW}>
          <dt className="text-secondary text-[13px]">{row.label}</dt>
          {row.missing ? (
            <dd className={`${VALUE} missing text-warning`}>Chưa tra được</dd>
          ) : (
            <dd className={VALUE}>
              {row.value}
              {row.hint ? <span className={VAL_HINT}>{row.hint}</span> : null}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
