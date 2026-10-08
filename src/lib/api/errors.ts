import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export interface ApiErrorEnvelope {
  code?: string;
  message?: string;
  traceId?: string;
  fieldErrors?: Record<string, string>;
}

export interface UiApiError {
  status?: number | string;
  code: string;
  message: string;
  traceId?: string;
  fieldErrors?: Record<string, string>;
}

export function toUiApiError(error: unknown): UiApiError {
  const fallback: UiApiError = {
    code: 'NETWORK_ERROR',
    message: 'Không thể kết nối hệ thống. Vui lòng thử lại sau.',
  };

  if (!error || typeof error !== 'object') return fallback;

  // Đã là lỗi giao diện (vd lệnh nghiệp vụ trả kết quả thất bại với HTTP 200): giữ nguyên mã lỗi.
  if ('code' in error && typeof error.code === 'string' && 'message' in error && typeof error.message === 'string') {
    return error as UiApiError;
  }

  if (!('status' in error)) return fallback;

  // Lỗi do `apiFetch` (finora-user) ném ra: đã có sẵn message, envelope gốc nằm trong `data`.
  if ('message' in error && typeof error.message === 'string') {
    const raw = 'data' in error && typeof error.data === 'object' && error.data !== null
      ? error.data as ApiErrorEnvelope
      : undefined;
    return {
      status: typeof error.status === 'number' ? error.status : undefined,
      code: raw?.code ?? 'REQUEST_FAILED',
      message: error.message,
      traceId: raw?.traceId,
      fieldErrors: raw?.fieldErrors,
    };
  }

  const fetchError = error as FetchBaseQueryError;
  const data = typeof fetchError.data === 'object' && fetchError.data !== null
    ? fetchError.data as ApiErrorEnvelope
    : undefined;

  return {
    status: fetchError.status,
    code: data?.code ?? 'REQUEST_FAILED',
    message: data?.message ?? `Hệ thống chưa thể xử lý yêu cầu (${String(fetchError.status)}).`,
    traceId: data?.traceId,
    fieldErrors: data?.fieldErrors,
  };
}
