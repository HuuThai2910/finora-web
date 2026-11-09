/**
 * Mã thiết bị của trình duyệt gửi kèm request tới finora-user (`X-Device-Id`) để ghi "Thiết bị đăng nhập"
 * (LOGIN-DEVICE-001). Tên và hệ điều hành không gửi: server tự suy từ User-Agent ("Chrome trên Windows"), vì header có
 * chữ tiếng Việt bị trình duyệt từ chối.
 *
 * Mã lưu localStorage để lần đăng nhập sau của cùng trình duyệt cập nhật đúng dòng cũ. Không đọc/ghi được (chế độ ẩn
 * danh chặn lưu trữ) thì dùng mã trong bộ nhớ cho phiên này; mã không phải bí mật và không cấp quyền gì.
 */
const DEVICE_ID_KEY = 'finora.device.id';

let memoryId: string | null = null;

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `w-${crypto.randomUUID()}`;
  } catch {
    // Trình duyệt cũ hoặc trang không an toàn (http): dùng cách dưới.
  }
  let value = '';
  for (let i = 0; i < 32; i += 1) value += Math.floor(Math.random() * 16).toString(16);
  return `w-${value}`;
}

export function getDeviceId(): string {
  if (memoryId) return memoryId;
  try {
    const saved = window.localStorage.getItem(DEVICE_ID_KEY);
    if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) {
      memoryId = saved;
      return saved;
    }
    const created = randomId();
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    memoryId = created;
    return created;
  } catch {
    memoryId = randomId();
    return memoryId;
  }
}

/** Header thiết bị cho mọi request tới finora-user. */
export function deviceHeaders(): Record<string, string> {
  return { 'X-Device-Id': getDeviceId() };
}
