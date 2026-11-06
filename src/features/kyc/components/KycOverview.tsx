import type { ReactNode } from 'react';
import { useNarrowScreen } from '../hooks/useNarrowScreen';

interface KycOverviewProps {
  /** Có biểu đồ đăng ký theo tuần (cần quyền Xem thống kê) thì chia hai cột trên màn rộng. */
  twoColumns: boolean;
  children: ReactNode;
}

/**
 * Khu biểu đồ đầu trang Khách hàng. Màn rộng hiện thẳng; màn hẹp (dưới 760px) thu vào một mục gập, mặc định đóng, để
 * bảng khách hàng (việc chính của trang) nằm ngay dưới tiêu đề thay vì dưới hai biểu đồ dài.
 */
export function KycOverview({ twoColumns, children }: KycOverviewProps) {
  const narrow = useNarrowScreen();
  const grid = twoColumns
    ? 'kyc-overview grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4 max-[1000px]:grid-cols-[minmax(0,1fr)]'
    : 'kyc-overview single grid grid-cols-[minmax(0,1fr)] gap-4';

  if (!narrow) return <div className={grid}>{children}</div>;
  return (
    <details className="kyc-overview-fold group">
      <summary
        className="ui-card flex h-11 items-center justify-between gap-2 px-3.5 text-[14px] font-semibold text-primary cursor-pointer [list-style:none] [&::-webkit-details-marker]:hidden after:content-[''] after:size-2 after:border-r-[1.5px] after:border-b-[1.5px] after:border-current after:transform-[rotate(45deg)] after:transition-[transform] after:duration-150 motion-reduce:after:transition-none group-open:after:transform-[rotate(-135deg)]"
      >
        Biểu đồ đăng ký và xác minh
      </summary>
      <div className={`${grid} mt-3`}>{children}</div>
    </details>
  );
}
