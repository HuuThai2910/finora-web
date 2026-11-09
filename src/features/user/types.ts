export type RoleType = 'ADMIN' | 'STAFF' | 'BORROWER' | 'INVESTOR';

/** Vai trò tài khoản nội bộ (trang Phân quyền); khách hàng chỉ tự đăng ký trên app. */
export type InternalRoleType = 'ADMIN' | 'STAFF';

/**
 * Nhóm tài khoản lọc ở backend (`scope`): `STAFF` = quản trị viên + nhân viên, `CUSTOMER` = người vay + nhà đầu tư.
 * Lọc ở DB nên phân trang và tổng số đúng theo nhóm.
 */
export type UserScope = 'STAFF' | 'CUSTOMER';

/**
 * Bộ lọc nâng cao của `GET /api/v1/admin/users` (bảng lọc trang Phân quyền và Khách hàng). Ngày dạng `YYYY-MM-DD` theo
 * giờ Việt Nam, gồm cả hai đầu; trường bỏ trống là không lọc.
 */
export interface UserAdvancedFilter {
  createdFrom?: string;
  createdTo?: string;
  /** `true` chỉ tài khoản đang khóa, `false` chỉ tài khoản đang hoạt động. */
  locked?: boolean;
  ageMin?: number;
  ageMax?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  /** Lần đăng nhập gần nhất trên mọi thiết bị. */
  lastLoginFrom?: string;
  lastLoginTo?: string;
}
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
  /** Lý do khóa do nhân viên nhập; null khi không khóa hoặc khóa từ trước khi có lý do. */
  lockReason?: string | null;
  lockedAt?: string | null;
  /** Vai trò nhân viên đang gán; chỉ có với tài khoản STAFF. */
  staffRoleCode?: string | null;
  staffRoleName?: string | null;
  /** Tài khoản nhân viên mới chưa đổi mật khẩu tạm. */
  mustChangePassword?: boolean;
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
  role: InternalRoleType;
  /** Bắt buộc khi `role` là STAFF. */
  staffRoleCode?: string;
}

/** Tạo tài khoản nội bộ (`POST /api/v1/admin/users`): hệ thống tự sinh mật khẩu tạm. */
export interface CreateStaffAccountRequest {
  fullName: string;
  email: string;
  /** Tùy chọn, 10 chữ số bắt đầu bằng 0. */
  phone?: string;
  role: InternalRoleType;
  /** Bắt buộc khi `role` là STAFF. */
  staffRoleCode?: string;
}

/** Kết quả tạo tài khoản: mật khẩu tạm chỉ trả đúng một lần, không có API đọc lại. */
export interface StaffAccountCreated {
  id: number;
  email: string;
  fullName: string;
  role: InternalRoleType;
  staffRoleCode: string | null;
  staffRoleName: string | null;
  temporaryPassword: string;
  /** Đã chuyển email thông tin đăng nhập sang dịch vụ gửi email (gửi không đảm bảo tới hộp thư). */
  credentialsEmailSent: boolean;
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

/** Một thiết bị khách đã đăng nhập (`GET /api/v1/admin/users/{id}/devices`); không có mã thiết bị. */
export interface CustomerLoginDevice {
  id: number;
  /** Tên client tự khai hoặc suy từ trình duyệt, ví dụ "samsung SM-S918B", "Chrome trên Windows". */
  deviceName: string;
  osName: string | null;
  clientType: 'MOBILE' | 'WEB';
  appVersion: string | null;
  /** IP lần đăng nhập cuối (đầy đủ, như Nhật ký hoạt động). */
  ipAddress: string | null;
  firstLoginAt: string;
  lastLoginAt: string;
  loginCount: number;
}
