import { apiFetch, type ApiError } from '@/lib/api/httpClient';
import { BACKGROUND_HEADER } from '@/lib/api/background';
import type { OrderBookSnapshot } from '../types';

/** Cùng base URL với slice Investment: lấy vé đi qua Gateway (rewrite `/api/v1` của Vercel) như mọi API khác. */
const API_BASE_URL = import.meta.env.VITE_INVESTMENT_API_URL ?? '/api/v1';

/** Vé bắt tay WebSocket do Investment cấp: dùng một lần, hết hạn sau khoảng 30 giây, chỉ cho đúng sổ đã xin. */
interface OrderBookStreamTicket {
  ticket: string;
  /** Đường dẫn bắt tay, ví dụ `/ws/order-books/12`. */
  path: string;
  expiresAt: string;
}

/** Tin server gửi trên kênh; hiện chỉ có `snapshot` (cả ảnh sổ, giống `GET /investments/order-books/{id}`). */
interface OrderBookStreamMessage {
  type: string;
  data?: OrderBookSnapshot;
}

/** Mã đóng riêng của Investment: sổ không tồn tại (không nối lại) và phiên hết thời hạn (lấy vé mới, nối lại ngay). */
const CLOSE_LISTING_NOT_FOUND = 4404;
const CLOSE_SESSION_EXPIRED = 4000;

const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 30_000;

/**
 * Địa chỉ gốc WebSocket. Bản deploy đặt `VITE_WS_BASE_URL=wss://<domain VM>`: rewrite của Vercel không chuyển tiếp
 * WebSocket nên phải nối thẳng Caddy trên VM. Bỏ trống thì dùng chính origin của trang (máy dev: proxy `/ws` của Vite
 * chuyển tới Investment).
 */
function webSocketBase(): string {
  const configured = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  const { protocol, host } = window.location;
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}`;
}

/** Lỗi lấy vé không nên thử lại: hết phiên (đã thử làm mới), thiếu quyền, sổ không còn. */
function isFatalTicketError(error: unknown): boolean {
  const status = (error as Partial<ApiError> | null)?.status;
  return status === 401 || status === 403 || status === 404;
}

/**
 * Mở kênh WebSocket nhận ảnh sổ lệnh; trả về hàm đóng kênh.
 *
 * Mỗi lần nối (kể cả nối lại) đều xin vé mới qua REST bằng cookie phiên, vì cookie không đi theo WebSocket tới domain
 * VM. Rớt kết nối thì nối lại sau 1, 2, 4… tối đa 30 giây (có nhiễu ngẫu nhiên để nhiều tab không nối cùng lúc); nhận
 * được ảnh là đặt lại nhịp chờ. Server gửi lại cả ảnh ngay khi nối, nên không mất cập nhật trong lúc rớt.
 */
export function openOrderBookSocket(listingId: number, onSnapshot: (snapshot: OrderBookSnapshot) => void): () => void {
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  let stopped = false;

  const scheduleReconnect = (delayMs?: number) => {
    if (stopped) return;
    const backoff = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempt);
    attempt += 1;
    retryTimer = setTimeout(connect, delayMs ?? backoff * (0.5 + Math.random() / 2));
  };

  async function connect() {
    if (stopped) return;
    let ticket: OrderBookStreamTicket;
    try {
      ticket = await apiFetch<OrderBookStreamTicket>(
        `${API_BASE_URL}/investments/order-books/${listingId}/stream-ticket`,
        // Lượt chạy nền: Nhật ký hoạt động mặc định ẩn.
        { method: 'POST', headers: { [BACKGROUND_HEADER]: '1' } },
      );
    } catch (error) {
      if (!isFatalTicketError(error)) scheduleReconnect();
      return;
    }
    if (stopped) return;

    const ws = new WebSocket(`${webSocketBase()}${ticket.path}?ticket=${encodeURIComponent(ticket.ticket)}`);
    socket = ws;
    ws.onmessage = (event) => {
      let message: OrderBookStreamMessage;
      try {
        message = JSON.parse(String(event.data)) as OrderBookStreamMessage;
      } catch {
        return;
      }
      if (message.type === 'snapshot' && message.data) {
        attempt = 0;
        onSnapshot(message.data);
      }
    };
    // Lỗi đường truyền luôn đi kèm `close` ngay sau, nên chỉ xử lý nối lại ở `onclose`.
    ws.onclose = (event) => {
      if (socket === ws) socket = null;
      if (stopped || event.code === CLOSE_LISTING_NOT_FOUND) return;
      scheduleReconnect(event.code === CLOSE_SESSION_EXPIRED ? 0 : undefined);
    };
  }

  void connect();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    socket?.close(1000, 'Rời trang');
    socket = null;
  };
}
