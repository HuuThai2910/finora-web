import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Cache RTK Query cho finora-user.
 *
 * Không dùng fetchBaseQuery như loanApi: các endpoint finora-user gọi qua `apiFetch`, nơi đã có
 * cơ chế làm mới phiên khi gặp 401 và phát sự kiện `auth:unauthorized`. Feature tự khai báo
 * endpoint bằng `queryFn` gọi `apiFetch`, lỗi giữ nguyên dạng `ApiError` để `toUiApiError` đọc.
 */
export const userServiceApi = createApi({
  reducerPath: 'userServiceApi',
  baseQuery: fakeBaseQuery<unknown>(),
  tagTypes: ['UserList', 'UserStats', 'User'],
  endpoints: () => ({}),
});
