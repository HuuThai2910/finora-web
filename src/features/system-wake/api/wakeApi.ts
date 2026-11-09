import type { WakeStartResult, WakeStatus } from '../types';

const WAKE_URL = '/api/wake';

/** Lỗi từ hàm /api/wake, giữ HTTP status và mã lỗi để màn hình chọn thông báo phù hợp. */
export class WakeApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'WakeApiError';
  }
}

async function readError(res: Response): Promise<WakeApiError> {
  // Thân lỗi không phải JSON (vd. trang lỗi của Vercel) thì dùng mã HTTP làm mã lỗi.
  const body: unknown = await res.json().catch(() => null);
  const code = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
    ? body.error
    : `HTTP_${res.status}`;
  return new WakeApiError(res.status, code);
}

/** Trạng thái VM backend và các dịch vụ trên đó. */
export async function fetchWakeStatus(signal?: AbortSignal): Promise<WakeStatus> {
  const res = await fetch(WAKE_URL, { cache: 'no-store', signal });
  if (!res.ok) throw await readError(res);
  return (await res.json()) as WakeStatus;
}

/** Gửi lệnh bật VM. Hàm trả về ngay; VM cần thêm vài phút mới chạy xong. */
export async function requestWake(code: string | null, signal?: AbortSignal): Promise<WakeStartResult> {
  const res = await fetch(WAKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    signal,
  });
  if (!res.ok) throw await readError(res);
  return (await res.json()) as WakeStartResult;
}
