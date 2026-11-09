import type { PropsWithChildren } from 'react';
import { useSystemWake } from '../hooks/useSystemWake';
import { WakeScreen } from './WakeScreen';

/**
 * Chỉ dựng ứng dụng khi backend trên Azure đã sẵn sàng. Backend chạy trên một VM tự tắt khi
 * không ai dùng; nếu dựng App ngay, các request kiểm tra phiên sẽ treo tới khi hết giờ chờ.
 */
export function SystemWakeGate({ children }: PropsWithChildren) {
  const wake = useSystemWake();
  if (wake.phase.kind === 'ready') return <>{children}</>;
  return <WakeScreen {...wake} />;
}
