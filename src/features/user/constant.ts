import type { PillTone } from '@/components/StatusPill';
import type { EkycStatusType, InternalRoleType, RoleType } from './types';

export const USER_PAGE_SIZE = 20;

/** Một trang bảng người dùng trên web quản trị (quy tắc bảng: 10 dòng mỗi trang). */
export const USER_LIST_PAGE_SIZE = 10;

export const ROLE_LABELS: Record<RoleType, string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
  INVESTOR: 'Nhà đầu tư',
  BORROWER: 'Người vay',
};

export const ROLE_DESCRIPTIONS: Record<RoleType, string> = {
  BORROWER: 'Nộp hồ sơ vay và nhận giải ngân',
  INVESTOR: 'Đầu tư cho vay và quản lý danh mục phần vốn',
  STAFF: 'Vận hành web quản trị trong phạm vi quyền của vai trò nhân viên',
  ADMIN: 'Toàn quyền quản trị hệ thống FINORA',
};

/**
 * Vai trò tài khoản nội bộ, quyền tăng dần: lựa chọn của hộp thoại tạo nhân viên và đổi vai trò. Người vay/Nhà đầu tư
 * do khách tự chọn lúc đăng ký trên app; backend từ chối biến khách hàng thành nhân viên và ngược lại.
 */
export const ASSIGNABLE_ROLES: InternalRoleType[] = ['STAFF', 'ADMIN'];

/**
 * Nhãn trạng thái xác minh danh tính của tài khoản. `PENDING` là khách chưa làm gì (chưa gửi lượt nào) nên tông xám
 * "Chưa xác minh", tách hẳn với "Chờ duyệt tay" (cam) là việc đang chờ nhân viên xử lý. Trang Tổng quan dùng chung.
 */
export const EKYC_DISPLAY: Record<EkycStatusType, { label: string; tone: PillTone }> = {
  VERIFIED: { label: 'Đã xác minh', tone: 'success' },
  PENDING: { label: 'Chưa xác minh', tone: 'neutral' },
  MANUAL_REVIEW: { label: 'Chờ duyệt tay', tone: 'warning' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
};

/** Bộ lọc vai trò của trang Phân quyền (mọi vai trò). */
export type RoleFilter = RoleType | 'ALL';

/** Thứ tự lựa chọn vai trò trong bảng lọc trang Phân quyền. */
export const ROLE_FILTER_OPTIONS: RoleType[] = ['ADMIN', 'STAFF', 'INVESTOR', 'BORROWER'];
export type EkycFilter = EkycStatusType | 'ALL';

/** Link cũ `?role=ADMIN|STAFF|INVESTOR|BORROWER` vẫn mở đúng bộ lọc. */
export function isRoleFilter(value: string | null): value is RoleFilter {
  return value === 'ALL' || value === 'ADMIN' || value === 'STAFF' || value === 'INVESTOR' || value === 'BORROWER';
}

/** Tài khoản nội bộ: chỉ những dòng này có "Đổi vai trò" (backend từ chối đổi vai trò khách hàng). */
export function isInternalRole(role: RoleType): role is InternalRoleType {
  return role === 'ADMIN' || role === 'STAFF';
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

/**
 * Danh sách chỉ hiện 4 số cuối của số định danh (đủ để phân biệt khi gọi điện đối chiếu), số đầy đủ chỉ ở trang chi
 * tiết khách hàng: bảng hiện nhiều người một lúc nên che bớt dữ liệu định danh.
 */
export function maskIdNumber(idNumber: string | null): string | null {
  const value = idNumber?.trim();
  if (!value) return null;
  return value.length <= 4 ? value : `•••• ${value.slice(-4)}`;
}
