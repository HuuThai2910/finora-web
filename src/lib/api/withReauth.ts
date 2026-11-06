import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { BACKGROUND_HEADER, isBackgroundRequest } from './background';
import { renewSession } from './httpClient';

type CookieBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>;

/** Gắn header chạy nền cho lượt tự làm mới (xem `background.ts`), để Nhật ký hoạt động mặc định ẩn các lượt này. */
function markBackground(args: string | FetchArgs, endpoint: string, forced: boolean | undefined): string | FetchArgs {
  if (!isBackgroundRequest(endpoint, forced)) return args;
  const request: FetchArgs = typeof args === 'string' ? { url: args } : args;
  const headers = new Headers(request.headers as HeadersInit | undefined);
  headers.set(BACKGROUND_HEADER, '1');
  return { ...request, headers };
}

/**
 * Bọc `fetchBaseQuery` của các slice đọc access token từ cookie (Loan, Investment): khi gặp 401 thì
 * làm mới phiên qua finora-user (dùng chung với `apiFetch`) rồi gửi lại một lần. Thiếu bước này thì
 * sau 5 phút cookie access token hết hạn, mọi trang dùng các slice này đều 401 cho tới khi F5.
 */
export function withReauth(baseQuery: CookieBaseQuery): CookieBaseQuery {
  return async (rawArgs, api, extraOptions) => {
    const args = markBackground(rawArgs, api.endpoint, api.forced);
    const startedAt = Date.now();
    let result = await baseQuery(args, api, extraOptions);
    if (result.error?.status === 401 && (await renewSession(startedAt))) {
      result = await baseQuery(args, api, extraOptions);
    }
    return result;
  };
}
