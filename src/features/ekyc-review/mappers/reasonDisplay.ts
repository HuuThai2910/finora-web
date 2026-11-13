import type { EkycReasonEntry } from '../types';

export type FaceMatchZone = 'HIGH' | 'GRAY' | 'LOW';

/**
 * Vùng điểm so mặt lấy từ mã lý do liveness AI trả (`FACE_MATCH_HIGH`, `FACE_MATCH_GRAY`, `FACE_MISMATCH`), khi
 * finora-user chưa trả sẵn `faceMatchZone`. Không tự so điểm với ngưỡng: ngưỡng là cấu hình của finora-ai và có thể đổi
 * theo phiên bản. Gặp nhiều mã thì lấy vùng thận trọng nhất; không có mã nào thì trả `null` (chỉ hiện điểm).
 */
export function faceMatchZone(entries: readonly EkycReasonEntry[] | null | undefined): FaceMatchZone | null {
  const codes = new Set((entries ?? []).map((entry) => (typeof entry === 'string' ? entry : entry.code)));
  if (codes.has('FACE_MISMATCH')) return 'LOW';
  if (codes.has('FACE_MATCH_GRAY')) return 'GRAY';
  if (codes.has('FACE_MATCH_HIGH')) return 'HIGH';
  return null;
}
