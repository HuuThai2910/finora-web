import { toUiApiError } from '@/lib/api/errors';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  /** Dòng phụ, ví dụ "Mã tra cứu …" của lỗi thao tác. */
  detail?: string;
  /** Thời gian tự đóng (ms); lỗi để lâu hơn để kịp đọc và chép mã tra cứu. */
  duration: number;
}

export interface ToastOptions {
  detail?: string;
  duration?: number;
}

/** Số toast chồng tối đa; cái cũ nhất bị đẩy ra khi có cái mới. */
export const MAX_TOASTS = 3;

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 4500,
  info: 4500,
  warning: 6000,
  error: 8000,
};

/*
 * Kho toast nằm ngoài React (cùng kiểu external store) để gọi được từ cả component lẫn hàm thường; `Toaster` đọc
 * bằng `useSyncExternalStore`. Không đưa vào Redux vì toast là trạng thái hiển thị tạm, không cần qua devtools.
 */
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): ToastItem[] {
  return items;
}

export function dismissToast(id: number) {
  const next = items.filter((item) => item.id !== id);
  if (next.length !== items.length) {
    items = next;
    emit();
  }
}

function push(kind: ToastKind, message: string, options: ToastOptions = {}): number {
  const id = nextId++;
  const item: ToastItem = {
    id,
    kind,
    message,
    detail: options.detail,
    duration: options.duration ?? DEFAULT_DURATION[kind],
  };
  // Cùng một câu đang hiện thì thay bằng bản mới (đặt lại giờ) thay vì chồng hai cái giống hệt.
  items = [...items.filter((existing) => existing.message !== message || existing.kind !== kind), item].slice(-MAX_TOASTS);
  emit();
  return id;
}

/**
 * Lỗi thao tác: câu báo của backend kèm "Mã tra cứu" (traceId) như `ErrorNotice`, không hiện mã lỗi nội bộ.
 * `fallback` là câu dùng khi lỗi không có câu báo đọc được (ví dụ mất mạng đã có câu riêng của `toUiApiError`).
 */
function pushError(error: unknown, fallback?: string): number {
  if (typeof error === 'string') return push('error', error);
  const uiError = toUiApiError(error);
  const message = uiError.message || fallback || 'Thao tác chưa thành công. Vui lòng thử lại.';
  return push('error', message, { detail: uiError.traceId ? `Mã tra cứu ${uiError.traceId}` : undefined });
}

export const toast = {
  success: (message: string, options?: ToastOptions) => push('success', message, options),
  info: (message: string, options?: ToastOptions) => push('info', message, options),
  warning: (message: string, options?: ToastOptions) => push('warning', message, options),
  /** Nhận chuỗi, hoặc lỗi RTK Query / `ApiError` để tự lấy câu báo và mã tra cứu. */
  error: (error: unknown, fallback?: string) => pushError(error, fallback),
  dismiss: dismissToast,
};

export type ToastApi = typeof toast;

/** Hook cho component; trả cùng một đối tượng `toast` nên dùng trong dependency của hook khác không gây chạy lại. */
export function useToast(): ToastApi {
  return toast;
}

/** Chỉ dùng trong test: xoá sạch toast đang có. */
export function resetToastsForTest() {
  items = [];
  emit();
}
