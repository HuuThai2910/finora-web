export type RoleType = 'ADMIN' | 'STAFF' | 'BORROWER' | 'INVESTOR';
export type EkycStatusType = 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';

/**
 * Hồ sơ người dùng — khớp `UserProfileResponse` của finora-user.
 */
export interface UserItem {
  id: number;
  email: string;
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  placeOfOrigin: string | null;
  address: string | null;
  idNumber: string | null;
  phone: string | null;
  role: RoleType;
  profileCompleted: boolean;
  ekycStatus: EkycStatusType;
  documentVerified: boolean;
  ekycCompletedAt: string | null;
  createdAt: string | null;
  /** Trạng thái khóa đọc từ Keycloak — null khi không tra cứu được */
  locked: boolean | null;
  /** Vai trò nhân viên đang gán; chỉ có với tài khoản STAFF. */
  staffRoleCode?: string | null;
  staffRoleName?: string | null;
}

/** Một chức năng trong danh mục phân quyền (`OpsFunction`): quyền Xem luôn có, quyền Thao tác có thể không. */
export interface StaffPermissionFunction {
  code: string;
  label: string;
  /** Nhóm hiển thị trong ma trận quyền, ví dụ "Cho vay", "Đầu tư". */
  group: string;
  view: string;
  action: string | null;
}

/** Vai trò nhân viên: realm role composite trên Keycloak gom các quyền `ops:*`. */
export interface StaffRole {
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
  memberCount: number;
  /** Vai trò mặc định do hệ thống tạo: không xóa được. */
  builtIn: boolean;
}

export interface StaffRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface AssignRoleRequest {
  role: RoleType;
  /** Bắt buộc khi `role` là STAFF. */
  staffRoleCode?: string;
}

/** Thống kê tổng số người dùng — khớp `UserStatsResponse` của finora-user. */
export interface UserStats {
  total: number;
  byRole: Partial<Record<RoleType, number>>;
  byEkycStatus: Partial<Record<EkycStatusType, number>>;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
