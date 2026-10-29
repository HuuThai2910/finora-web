import { userServiceApi } from '@/lib/api/userServiceApi';
import type {
  AssignRoleRequest,
  EkycStatusType,
  PageResponse,
  RoleType,
  StaffPermissionFunction,
  StaffRole,
  StaffRoleRequest,
  UserItem,
  UserStats,
} from '../types';
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
    // Đổi vai trò làm đổi số đếm theo vai trò và số thành viên của vai trò nhân viên, nên làm mới cả ba.
    assignUserRole: builder.mutation<void, { id: number } & AssignRoleRequest>({
      queryFn: ({ id, ...request }) => run(() => userApi.assignRole(id, request)),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'UserList', id: 'LIST' }, 'UserStats', { type: 'User', id: String(id) }, { type: 'StaffRole', id: 'LIST' },
      ],
    }),
    // Khóa/mở khóa không đổi số đếm, chỉ đổi cờ `locked` trên dòng.
    setUserLocked: builder.mutation<void, { id: number; locked: boolean }>({
      queryFn: ({ id, locked }) => run(() => (locked ? userApi.lockUser(id) : userApi.unlockUser(id))),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'UserList', id: 'LIST' }, { type: 'User', id: String(id) }],
    }),
    // Danh mục chức năng cố định trong code backend nên giữ cache lâu.
    getStaffPermissions: builder.query<StaffPermissionFunction[], void>({
      queryFn: () => run(() => userApi.getStaffPermissions()),
      keepUnusedDataFor: 3600,
    }),
    getStaffRoles: builder.query<StaffRole[], void>({
      queryFn: () => run(() => userApi.getStaffRoles()),
      providesTags: [{ type: 'StaffRole', id: 'LIST' }],
    }),
    createStaffRole: builder.mutation<StaffRole, StaffRoleRequest>({
      queryFn: (request) => run(() => userApi.createStaffRole(request)),
      invalidatesTags: [{ type: 'StaffRole', id: 'LIST' }],
    }),
    // Sửa vai trò đổi tên hiển thị trên dòng người dùng, nên làm mới cả danh sách người dùng.
    updateStaffRole: builder.mutation<StaffRole, { code: string; request: StaffRoleRequest }>({
      queryFn: ({ code, request }) => run(() => userApi.updateStaffRole(code, request)),
      invalidatesTags: [{ type: 'StaffRole', id: 'LIST' }, { type: 'UserList', id: 'LIST' }],
    }),
    deleteStaffRole: builder.mutation<void, string>({
      queryFn: (code) => run(() => userApi.deleteStaffRole(code)),
      invalidatesTags: [{ type: 'StaffRole', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useGetUserStatsQuery,
  useAssignUserRoleMutation,
  useSetUserLockedMutation,
  useGetStaffPermissionsQuery,
  useGetStaffRolesQuery,
  useCreateStaffRoleMutation,
  useUpdateStaffRoleMutation,
  useDeleteStaffRoleMutation,
} = userQueries;
