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
}
