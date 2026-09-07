export type RoleType = 'ADMIN' | 'BORROWER' | 'INVESTOR';
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
