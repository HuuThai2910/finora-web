import type { RoleType, StaffPermissionFunction } from '../types';

export interface StaffRoleAccess {
  /** Tên chức năng được Xem, theo thứ tự danh mục của backend. */
  view: string[];
  /** Tên chức năng được Thao tác (thêm, sửa, duyệt, xử lý, lưu cấu hình). */
  action: string[];
}

/**
 * Đổi bộ quyền `ops:<mã>:view|action` của một vai trò nhân viên thành tên chức năng để người gán vai trò đọc được.
 * Quyền không còn trong danh mục (chức năng đã bỏ) không hiện vì nhân viên cũng không dùng được.
 */
export function staffRoleAccess(permissions: readonly string[], catalog: readonly StaffPermissionFunction[]): StaffRoleAccess {
  const granted = new Set(permissions);
  return {
    view: catalog.filter((item) => granted.has(item.view)).map((item) => item.label),
    action: catalog.filter((item) => item.action != null && granted.has(item.action)).map((item) => item.label),
  };
}

const CUSTOMER_ROLES: ReadonlySet<RoleType> = new Set(['BORROWER', 'INVESTOR']);
const BACK_OFFICE_ROLES: ReadonlySet<RoleType> = new Set(['STAFF', 'ADMIN']);

/**
 * Hệ quả của việc đổi vai trò, đúng theo backend: lưu xong thì mọi phiên của tài khoản bị đăng xuất (token cũ mang quyền
 * cũ); khách hàng chuyển sang tài khoản quản trị thì không còn là người vay/nhà đầu tư trên app; Quản trị viên có mọi
 * quyền kể cả phân quyền. Chỉ trình bày, không khuyên chọn vai trò nào.
 */
export function roleChangeConsequences(from: RoleType, to: RoleType): string[] {
  const lines = ['Tài khoản bị đăng xuất khỏi mọi phiên và phải đăng nhập lại để nhận quyền mới.'];
  if (CUSTOMER_ROLES.has(from) && BACK_OFFICE_ROLES.has(to)) {
    lines.push('Tài khoản không còn dùng được ứng dụng khách hàng (vay, đầu tư) với vai trò cũ.');
  }
  if (to === 'ADMIN') {
    lines.push('Quản trị viên có toàn quyền trên web quản trị, kể cả phân quyền và đổi vai trò của người khác.');
  }
  return lines;
}
