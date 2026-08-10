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

  if (!error || typeof error !== 'object' || !('status' in error)) return fallback;

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
