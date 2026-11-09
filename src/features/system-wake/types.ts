/** Trạng thái nguồn của VM backend theo Azure (PowerState/<giá trị>). */
export type VmPowerState =
  | 'running'
  | 'starting'
  | 'stopping'
  | 'stopped'
  | 'deallocating'
  | 'deallocated'
  | 'unknown';

/**
 * Trạng thái một container do VM ghi ra: `healthy`, `running` (không có healthcheck), `starting`,
 * `unhealthy`, `missing` (chưa tạo) hoặc trạng thái Docker khác như `exited`, `restarting`.
 */
export type ServiceState = string;

/** Phản hồi GET /api/wake (hàm Vercel trong `api/wake.js`). */
export interface WakeStatus {
  vm: VmPowerState;
  ready: boolean;
  services: Record<string, ServiceState> | null;
  codeRequired: boolean;
}

/** Phản hồi POST /api/wake khi mã hợp lệ. */
export interface WakeStartResult {
  vm: VmPowerState;
}

/** Các giai đoạn của màn đánh thức. */
export type WakePhase =
  | { kind: 'checking' }
  | { kind: 'ready' }
  | { kind: 'off'; codeRequired: boolean }
  | { kind: 'starting'; status: WakeStatus | null; since: number }
  | { kind: 'error'; message: string };
