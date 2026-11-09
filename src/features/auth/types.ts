export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface CurrentUser {
  id: number;
  email: string;
  fullName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  placeOfOrigin: string | null;
  address: string | null;
  idNumber: string | null;
  phone: string | null;
  role: 'ADMIN' | 'STAFF' | 'BORROWER' | 'INVESTOR';
  ekycStatus: 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';
  documentVerified: boolean;
  profileCompleted: boolean;
  ekycCompletedAt?: string | null;
  createdAt?: string | null;
  /** Trạng thái khóa từ Keycloak — null với API hồ sơ cá nhân */
  locked?: boolean | null;
  /** Quyền `ops:<chức năng>:view|action` của nhân viên; ADMIN có mọi quyền dù danh sách trống. */
  permissions?: string[];
  /** Vai trò nhân viên đang gán; null với tài khoản không phải STAFF. */
  staffRole?: StaffRoleRef | null;
  /** Bản phẳng của `staffRole` (backend trả cả hai). */
  staffRoleCode?: string | null;
  staffRoleName?: string | null;
  /** Đang dùng mật khẩu tạm do quản trị viên cấp: phải đổi mật khẩu trước khi vào trang quản trị. */
  mustChangePassword?: boolean;
}

/** Tự đổi mật khẩu (`POST /api/v1/users/me/change-password`). */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface StaffRoleRef {
  code: string;
  name: string;
}

export interface AuthState {
  user: AuthResponse | null;
  profile: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Phiên đang dùng bị mất (làm mới token thất bại): màn đăng nhập báo hết hạn thay vì im lặng. */
  sessionExpired: boolean;
}
