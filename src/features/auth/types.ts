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
  role: 'ADMIN' | 'BORROWER' | 'INVESTOR';
  ekycStatus: 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';
  documentVerified: boolean;
  profileCompleted: boolean;
  ekycCompletedAt?: string | null;
  createdAt?: string | null;
  /** Trạng thái khóa từ Keycloak — null với API hồ sơ cá nhân */
  locked?: boolean | null;
}

export interface AuthState {
  user: AuthResponse | null;
  profile: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
