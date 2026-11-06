import { hasPermission, OPS_FUNCTION_LABELS, opsAction, opsView, type CurrentUser, type OpsFunctionCode } from '@/features/auth';

export interface PermissionSummary {
  /** Tên chức năng được Xem. */
  view: string[];
  /** Tên chức năng được Thao tác (duyệt, sửa, xử lý). */
  action: string[];
}

const FUNCTIONS = Object.keys(OPS_FUNCTION_LABELS) as OpsFunctionCode[];

/**
 * Tóm tắt quyền của nhân viên theo danh mục chức năng, đọc từ `permissions` của hồ sơ đang đăng nhập (không gọi API).
 * Quản trị viên có mọi quyền nên không liệt kê; trả `null`.
 */
export function permissionSummary(profile: CurrentUser | null): PermissionSummary | null {
  if (!profile || profile.role !== 'STAFF') return null;
  return {
    view: FUNCTIONS.filter((code) => hasPermission(profile, opsView(code))).map((code) => OPS_FUNCTION_LABELS[code]),
    action: FUNCTIONS.filter((code) => hasPermission(profile, opsAction(code))).map((code) => OPS_FUNCTION_LABELS[code]),
  };
}
