import { toUiApiError, type UiApiError } from '@/lib/api/errors';

interface FastApiValidationItem {
  loc?: unknown[];
  msg?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Ghép lỗi kiểm tra của Pydantic thành một câu: "installment: Field required". */
function joinValidation(items: unknown[]): string {
  return items
    .filter(isRecord)
    .map((item: FastApiValidationItem) => {
      const field = (item.loc ?? []).filter((part) => part !== 'body').join('.');
      return field ? `${field}: ${item.msg ?? ''}` : item.msg ?? '';
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Lỗi từ finora-ai sang lỗi giao diện.
 *
 * finora-ai là FastAPI nên không trả envelope `{code, message, traceId}` như các
 * service Java mà trả `{detail}`: chuỗi (lỗi nghiệp vụ 422 tự ném), mảng (lỗi
 * kiểm tra Pydantic) hoặc object `{code, message}` (503 khi chưa nạp được model).
 * Hàm này giữ `toUiApiError` làm gốc (status, code, traceId nếu Gateway bọc lại)
 * rồi chỉ thay câu thông báo bằng `detail` để admin thấy đúng lý do backend từ chối.
 */
export function toAiUiError(error: unknown): UiApiError {
  const base = toUiApiError(error);
  const data = isRecord(error) && isRecord(error.data) ? error.data : undefined;
  const detail = data?.detail;

  if (typeof detail === 'string' && detail) return { ...base, message: detail };
  if (Array.isArray(detail)) {
    const message = joinValidation(detail);
    return message ? { ...base, code: 'VALIDATION_ERROR', message: `Dữ liệu chưa hợp lệ: ${message}` } : base;
  }
  if (isRecord(detail)) {
    return {
      ...base,
      code: typeof detail.code === 'string' ? detail.code : base.code,
      message: typeof detail.message === 'string' ? detail.message : base.message,
    };
  }
  return base;
}
