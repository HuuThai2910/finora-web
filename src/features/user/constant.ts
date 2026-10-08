import type { EkycStatusType, RoleType } from './types';

export const USER_PAGE_SIZE = 20;

/** Một trang bảng người dùng trên web quản trị (quy tắc bảng: 10 dòng mỗi trang). */
export const USER_LIST_PAGE_SIZE = 10;

export const ROLE_LABELS: Record<RoleType, string> = {
  ADMIN: 'Quản trị viên',
  INVESTOR: 'Nhà đầu tư',
  BORROWER: 'Người vay',
};

export const ROLE_DESCRIPTIONS: Record<RoleType, string> = {
  BORROWER: 'Nộp hồ sơ vay và nhận giải ngân',
  INVESTOR: 'Đầu tư cho vay và quản lý danh mục Note',
  ADMIN: 'Toàn quyền quản trị hệ thống FINORA',
};

/** Thứ tự lựa chọn trong hộp thoại đổi vai trò: quyền tăng dần. */
export const ASSIGNABLE_ROLES: RoleType[] = ['BORROWER', 'INVESTOR', 'ADMIN'];

export const EKYC_DISPLAY: Record<EkycStatusType, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  VERIFIED: { label: 'Đã xác minh', tone: 'success' },
  PENDING: { label: 'Chờ xác minh', tone: 'warning' },
  MANUAL_REVIEW: { label: 'Chờ duyệt tay', tone: 'warning' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
};

export type RoleFilter = RoleType | 'ALL';
export type EkycFilter = EkycStatusType | 'ALL';

export function isRoleFilter(value: string | null): value is RoleFilter {
  return value === 'ALL' || value === 'ADMIN' || value === 'INVESTOR' || value === 'BORROWER';
}

export function isEkycFilter(value: string | null): value is EkycFilter {
  return value === 'ALL' || value === 'VERIFIED' || value === 'PENDING' || value === 'MANUAL_REVIEW' || value === 'FAILED';
}

/** Giới tính backend trả dạng mã; giá trị lạ hoặc trống hiển thị "-". */
export function formatGender(gender: string | null): string {
  if (gender === 'MALE') return 'Nam';
  if (gender === 'FEMALE') return 'Nữ';
  return '-';
}
