import { apiFetch } from '@/lib/api/httpClient';
import type { EkycStatusType, PageResponse, RoleType, UserItem, UserStats } from '../types';

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
    filters: { role?: RoleType | 'ALL'; ekycStatus?: EkycStatusType | 'ALL' } = {}
  ): Promise<PageResponse<UserItem>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (filters.role && filters.role !== 'ALL') params.set('role', filters.role);
    if (filters.ekycStatus && filters.ekycStatus !== 'ALL') {
      params.set('ekycStatus', filters.ekycStatus);
    }
    return apiFetch<PageResponse<UserItem>>(`/api/v1/admin/users?${params}`);
  },

  /** Tổng số người dùng theo vai trò và trạng thái eKYC (đếm ở DB). */
  getStats: (): Promise<UserStats> => apiFetch<UserStats>('/api/v1/admin/users/stats'),

  getUserById: (id: number | string): Promise<UserItem> =>
    apiFetch<UserItem>(`/api/v1/admin/users/${id}`),

  lockUser: (id: number): Promise<void> =>
    apiFetch<void>(`/api/v1/admin/users/${id}/lock`, {
      method: 'POST',
    }),

  unlockUser: (id: number): Promise<void> =>
    apiFetch<void>(`/api/v1/admin/users/${id}/unlock`, {
      method: 'POST',
    }),

  assignRole: (id: number, role: RoleType): Promise<void> =>
    apiFetch<void>(`/api/v1/admin/users/${id}/roles`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
};
