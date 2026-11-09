import { apiFetch } from '@/lib/api/httpClient';
import type {
  AssignRoleRequest,
  CreateStaffAccountRequest,
  CustomerLoginDevice,
  EkycStatusType,
  PageResponse,
  RoleType,
  StaffPermissionFunction,
  StaffRole,
  StaffAccountCreated,
  StaffRoleRequest,
  UserItem,
  UserAdvancedFilter,
  UserScope,
  UserStats,
} from '../types';

/**
 * API quản trị người dùng — nối thẳng tới finora-user qua API Gateway.
 *
 * Không có dữ liệu giả: lỗi mạng/403/404 được ném ra để màn hình hiển thị
 * đúng tình trạng thật thay vì âm thầm hiện danh sách bịa.
 */
export const userApi = {
  /**
   * Danh sách người dùng. Lọc vai trò/eKYC gửi xuống backend để kết quả trải
   * trên toàn bộ dữ liệu, không chỉ trang đang tải.
   */
  getUsers: (
    page = 0,
    size = 20,
    filters: {
      role?: RoleType | 'ALL';
      ekycStatus?: EkycStatusType | 'ALL';
      staffRoleCode?: string;
      q?: string;
      scope?: UserScope;
      advanced?: UserAdvancedFilter;
    } = {}
  ): Promise<PageResponse<UserItem>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.role && filters.role !== 'ALL') params.set('role', filters.role);
    if (filters.ekycStatus && filters.ekycStatus !== 'ALL') {
      params.set('ekycStatus', filters.ekycStatus);
    }
    if (filters.staffRoleCode) params.set('staffRoleCode', filters.staffRoleCode);
    // Tìm theo một phần họ tên/email hoặc đúng số điện thoại/CCCD (backend tự băm để so).
    if (filters.q) params.set('q', filters.q);
    // Nhóm tài khoản lọc ở backend để phân trang và tổng số đúng (trang Phân quyền chỉ xem tài khoản nội bộ).
    if (filters.scope) params.set('scope', filters.scope);
    // Bảng lọc nâng cao: chỉ gửi trường có giá trị.
    Object.entries(filters.advanced ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    return apiFetch<PageResponse<UserItem>>(`/api/v1/admin/users?${params}`);
  },

  /** Tổng số người dùng theo vai trò và trạng thái eKYC (đếm ở DB). */
  getStats: (): Promise<UserStats> => apiFetch<UserStats>('/api/v1/admin/users/stats'),

  getUserById: (id: number | string): Promise<UserItem> =>
    apiFetch<UserItem>(`/api/v1/admin/users/${id}`),

  /** Thiết bị khách đã đăng nhập, gần nhất trước (cùng quyền Xem với trang khách hàng). */
  getUserDevices: (id: number | string): Promise<CustomerLoginDevice[]> =>
    apiFetch<CustomerLoginDevice[]>(`/api/v1/admin/users/${id}/devices`),

  /** Khóa tài khoản: lý do bắt buộc; backend đăng xuất mọi phiên đang mở của người dùng. */
  lockUser: (id: number, reason: string): Promise<void> =>
    apiFetch<void>(`/api/v1/admin/users/${id}/lock`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  unlockUser: (id: number): Promise<void> =>
    apiFetch<void>(`/api/v1/admin/users/${id}/unlock`, {
      method: 'POST',
    }),

  /**
   * Tạo tài khoản nhân viên/quản trị viên bằng thông tin riêng (chỉ ADMIN). Phản hồi mang mật khẩu tạm đúng một lần.
   */
  createStaffAccount: (request: CreateStaffAccountRequest): Promise<StaffAccountCreated> =>
    apiFetch<StaffAccountCreated>('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  /**
   * Đổi vai trò tài khoản nội bộ (STAFF và ADMIN, đổi vai trò nhân viên); STAFF phải kèm `staffRoleCode`. Backend từ
   * chối tài khoản khách hàng và vai trò khách hàng.
   */
  assignRole: (id: number, request: AssignRoleRequest): Promise<void> =>
    apiFetch<void>(`/api/v1/admin/users/${id}/roles`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  /** Danh mục chức năng phân quyền (nguồn: `OpsFunction` ở backend), để dựng ma trận Xem/Thao tác. */
  getStaffPermissions: (): Promise<StaffPermissionFunction[]> =>
    apiFetch<StaffPermissionFunction[]>('/api/v1/admin/staff-roles/permissions'),

  getStaffRoles: (): Promise<StaffRole[]> => apiFetch<StaffRole[]>('/api/v1/admin/staff-roles'),

  createStaffRole: (request: StaffRoleRequest): Promise<StaffRole> =>
    apiFetch<StaffRole>('/api/v1/admin/staff-roles', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  updateStaffRole: (code: string, request: StaffRoleRequest): Promise<StaffRole> =>
    apiFetch<StaffRole>(`/api/v1/admin/staff-roles/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  deleteStaffRole: (code: string): Promise<void> =>
    apiFetch<void>(`/api/v1/admin/staff-roles/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    }),
};
