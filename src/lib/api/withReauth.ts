import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { renewSession } from './httpClient';

type CookieBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>;

/**
 * Bọc `fetchBaseQuery` của các slice đọc access token từ cookie (Loan, Investment): khi gặp 401 thì
 * làm mới phiên qua finora-user (dùng chung với `apiFetch`) rồi gửi lại một lần. Thiếu bước này thì
 * sau 5 phút cookie access token hết hạn, mọi trang dùng các slice này đều 401 cho tới khi F5.
 */
export function withReauth(baseQuery: CookieBaseQuery): CookieBaseQuery {
  return async (args, api, extraOptions) => {
    const startedAt = Date.now();
    let result = await baseQuery(args, api, extraOptions);
    if (result.error?.status === 401 && (await renewSession(startedAt))) {
      result = await baseQuery(args, api, extraOptions);
    }
    return result;
  };
}
