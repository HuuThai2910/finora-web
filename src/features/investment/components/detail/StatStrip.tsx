import type { ReactNode } from 'react';

export interface Stat {
  key: string;
  label: string;
  value: ReactNode;
  /** Dòng nhỏ dưới giá trị. */
  hint?: ReactNode;
}

/**
 * Dải số liệu đầu thẻ (Ký hợp đồng, Kết quả gọi vốn, Trả nợ): nhãn nhỏ, số đậm, vạch ngăn giữa các ô; dưới 600px còn
 * hai cột. Số ô theo dữ liệu có thật, thiếu ô nào thì dải co lại chứ không để ô trống.
 */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <dl
      className="fd-stats grid gap-y-3 max-[600px]:grid-cols-2!"
      style={{ gridTemplateColumns: `repeat(${Math.max(stats.length, 1)}, minmax(0, 1fr))` }}
    >
      {stats.map((stat, index) => (
        <div
          key={stat.key}
          className={`min-w-0 px-4 py-0.5 ${index === 0 ? 'pl-0' : 'border-l border-l-divider'} max-[600px]:odd:pl-0 max-[600px]:odd:border-l-0`}
        >
          <dt className="text-muted text-[12px]">{stat.label}</dt>
          <dd className="mt-0.5 text-[17px] font-semibold tabular-nums wrap-anywhere">
            {stat.value}
            {stat.hint ? <small className="block text-muted text-[12px] font-normal">{stat.hint}</small> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
