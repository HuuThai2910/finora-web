import type { CurrentUser } from './types';

/**
 * Mã chức năng quản trị, khớp `OpsFunction` của finora-common. Mỗi chức năng ứng với một màn của web quản trị và có
 * quyền Xem (`ops:<mã>:view`), phần lớn có thêm quyền Thao tác (`ops:<mã>:action`).
 */
export type OpsFunctionCode =
  | 'dashboard'
  | 'loan-application'
  | 'collection'
  | 'reschedule'
  | 'withdrawal'
  | 'reconciliation'
  | 'funding'
  | 'funding-settings'
  | 'secondary-market'
  | 'loan-product'
  | 'customer'
  | 'ekyc'
  | 'blockchain'
  | 'ai-policy'
  | 'ai-scoring';

/** Tên chức năng để báo thiếu quyền; danh mục đầy đủ (kèm nhóm) lấy từ API khi cấu hình vai trò. */
export const OPS_FUNCTION_LABELS: Record<OpsFunctionCode, string> = {
  dashboard: 'Tổng quan & thống kê',
  'loan-application': 'Hồ sơ vay',
  collection: 'Thu hồi nợ',
  reschedule: 'Cơ cấu nợ',
  withdrawal: 'Rút tiền',
  reconciliation: 'Đối soát & sự cố',
  funding: 'Gọi vốn & Notes',
  'funding-settings': 'Cấu hình gọi vốn',
  'secondary-market': 'Chợ thứ cấp',
  'loan-product': 'Sản phẩm vay',
  customer: 'Khách hàng',
  ekyc: 'Duyệt eKYC',
  blockchain: 'Bằng chứng blockchain',
  'ai-policy': 'Chính sách AI',
  'ai-scoring': 'Chấm thử AI',
};

export const opsView = (code: OpsFunctionCode) => `ops:${code}:view`;
export const opsAction = (code: OpsFunctionCode) => `ops:${code}:action`;

/** Vai trò được vào web quản trị: ADMIN có mọi quyền, STAFF theo quyền của vai trò nhân viên được gán. */
export const ADMIN_APP_ROLES: ReadonlyArray<CurrentUser['role']> = ['ADMIN', 'STAFF'];

/**
 * Điều kiện mở một trang quản trị: `adminOnly` chỉ cho ADMIN (cấu hình vai trò, gán vai trò), `anyView` cho ai có
 * quyền Xem ít nhất một chức năng trong danh sách (trang gom nhiều hàng đợi như Vận hành khoản vay).
 */
export type PageAccess = { adminOnly: true } | { anyView: OpsFunctionCode[] };

/** Có quyền `permission` không. ADMIN luôn có; người vay, nhà đầu tư không có quyền quản trị nào. */
export function hasPermission(profile: CurrentUser | null | undefined, permission: string): boolean {
  if (!profile) return false;
  if (profile.role === 'ADMIN') return true;
  if (profile.role !== 'STAFF') return false;
  return profile.permissions?.includes(permission) ?? false;
}

export function canAccessPage(profile: CurrentUser | null | undefined, access: PageAccess): boolean {
  if (!profile) return false;
  if ('adminOnly' in access) return profile.role === 'ADMIN';
  return access.anyView.some((code) => hasPermission(profile, opsView(code)));
}
