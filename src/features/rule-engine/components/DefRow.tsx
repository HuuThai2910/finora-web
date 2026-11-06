import type { ReactNode } from 'react';

interface DefRowProps {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
}

/** Một dòng "nhãn: giá trị, ghi chú" trong khối định nghĩa của trang chính sách. */
export function DefRow({ label, value, note }: DefRowProps) {
  return (
    // Màn hẹp: nhãn và giá trị chung một hàng, ghi chú xuống hàng dưới.
    <div className="aip-def-row grid grid-cols-[168px_128px_minmax(0,1fr)] items-center gap-3 min-h-12 py-2 px-4 border-b border-b-divider last:[border-bottom:0] max-[700px]:grid-cols-[1fr_auto]">
      <dt className="text-secondary text-[13px]">{label}</dt>
      <dd className="aip-def-value text-[14px] font-semibold [font-variant-numeric:tabular-nums] whitespace-nowrap">{value}</dd>
      {note && <dd className="aip-def-note text-muted text-[12px] leading-[1.45] max-[700px]:col-span-full">{note}</dd>}
    </div>
  );
}
