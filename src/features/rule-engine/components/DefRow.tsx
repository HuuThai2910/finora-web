import type { ReactNode } from 'react';

interface DefRowProps {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
}

/** Một dòng "nhãn: giá trị, ghi chú" trong khối định nghĩa của trang chính sách. */
export function DefRow({ label, value, note }: DefRowProps) {
  return (
    <div className="aip-def-row">
      <dt>{label}</dt>
      <dd className="aip-def-value">{value}</dd>
      {note && <dd className="aip-def-note">{note}</dd>}
    </div>
  );
}
