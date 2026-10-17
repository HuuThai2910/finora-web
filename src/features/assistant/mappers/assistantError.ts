import type { AssistantUiError } from '../types';

interface HttpErrorShape {
  status: number;
  data?: unknown;
}

function isHttpError(error: unknown): error is HttpErrorShape {
  return typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number';
}

/** Mã lỗi trong body `{ code, message }` của finora-ai (dạng `ApiErrorResponse` của Java). */
function errorCode(data: unknown): string | null {
  if (typeof data === 'object' && data !== null && 'code' in data && typeof data.code === 'string') {
    return data.code;
  }
  return null;
}

/**
 * Dịch lỗi của `POST /chat` sang lời cho quản trị viên (bảng lỗi spec mục 5). Lỗi nhà cung cấp LLM
 * không tới đây: server trả 200 với `mode = fallback`. 401 ở đây nghĩa là làm mới phiên đã thất bại;
 * `apiFetch` đã phát `auth:unauthorized` nên trang sẽ tự về màn đăng nhập.
 */
export function toAssistantError(error: unknown): AssistantUiError {
  if (!isHttpError(error)) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Chưa kết nối được trợ lý. Kiểm tra mạng rồi gửi lại.',
      retryable: true,
    };
  }
  const { status } = error;
  const code = errorCode(error.data) ?? `HTTP_${status}`;
  const base = { status, code };
  if (status === 429) {
    return { ...base, message: 'Bạn hỏi hơi nhanh, thử lại sau ít phút.', retryable: true };
  }
  if (status === 503) {
    return { ...base, message: 'Trợ lý đang tạm tắt. Bạn vẫn dùng các trang quản trị như bình thường.', retryable: false };
  }
  if (status === 403) {
    return { ...base, message: 'Tài khoản này không được dùng trợ lý trên trang quản trị.', retryable: false };
  }
  if (status === 401) {
    return { ...base, message: 'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', retryable: false };
  }
  if (status === 422) {
    return { ...base, message: 'Câu hỏi chưa hợp lệ (tối đa 1.000 ký tự). Sửa lại rồi gửi.', retryable: false };
  }
  return { ...base, message: 'Trợ lý đang gặp lỗi. Thử lại sau ít phút.', retryable: status >= 500 };
}
