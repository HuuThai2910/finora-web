import type { ReactNode } from 'react';

export type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusPillProps {
  tone: PillTone;
  children: ReactNode;
  /** Chấm tròn trước chữ, dùng cho cột trạng thái; nhãn phụ cạnh tên thì bỏ. */
  dot?: boolean;
  small?: boolean;
}

/** Nhãn trạng thái viên thuốc. Luôn có chữ, màu chỉ bổ trợ. */
export function StatusPill({ tone, children, dot = false, small = false }: StatusPillProps) {
  const className = ['ui-pill', tone === 'neutral' ? '' : tone, small ? 'sm' : ''].filter(Boolean).join(' ');
  return (
    <span className={className}>
      {dot && <i aria-hidden="true" />}
      {children}
    </span>
  );
}
