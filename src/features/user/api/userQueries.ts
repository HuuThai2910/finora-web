import { userServiceApi } from '@/lib/api/userServiceApi';
import type { EkycStatusType, PageResponse, RoleType, UserItem, UserStats } from '../types';
import { userApi } from './userApi';

export interface UserListArgs {
  page: number;
  size: number;
  role: RoleType | 'ALL';
  ekycStatus: EkycStatusType | 'ALL';
}

/**
 * Bọc lời gọi `userApi` thành kết quả RTK Query. Lỗi giữ nguyên dạng `ApiError` của `apiFetch`
 * để `toUiApiError` lấy được thông báo và traceId của backend.
 */
async function run<T>(call: () => Promise<T>): Promise<{ data: T } | { error: unknown }> {
  try {
    return { data: await call() };
  } catch (error) {
    return { error };
  }
}

const userQueries = userServiceApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<PageResponse<UserItem>, UserListArgs>({
      queryFn: ({ page, size, role, ekycStatus }) => run(() => userApi.getUsers(page, size, { role, ekycStatus })),
      providesTags: [{ type: 'UserList', id: 'LIST' }],
    }),
    /** Hồ sơ một người dùng; trang chi tiết khách hàng dùng, nên đổi vai trò/khóa phải làm mới cả tag này. */
    getUser: builder.query<UserItem, string>({
      queryFn: (id) => run(() => userApi.getUserById(id)),
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    getUserStats: builder.query<UserStats, void>({
      queryFn: () => run(() => userApi.getStats()),
      providesTags: ['UserStats'],
    }),
    // Đổi vai trò làm đổi số đếm theo vai trò, nên làm mới cả danh sách lẫn thống kê.
    assignUserRole: builder.mutation<void, { id: number; role: RoleType }>({
      queryFn: ({ id, role }) => run(() => userApi.assignRole(id, role)),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'UserList', id: 'LIST' }, 'UserStats', { type: 'User', id: String(id) }],
    }),
    // Khóa/mở khóa không đổi số đếm, chỉ đổi cờ `locked` trên dòng.
    setUserLocked: builder.mutation<void, { id: number; locked: boolean }>({
      queryFn: ({ id, locked }) => run(() => (locked ? userApi.lockUser(id) : userApi.unlockUser(id))),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'UserList', id: 'LIST' }, { type: 'User', id: String(id) }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useGetUserStatsQuery,
  useAssignUserRoleMutation,
  useSetUserLockedMutation,
} = userQueries;
