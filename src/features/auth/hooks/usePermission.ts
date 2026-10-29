import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { canAccessPage, hasPermission, opsAction, opsView, type OpsFunctionCode, type PageAccess } from '../permissions';

/**
 * Quyền của tài khoản đang đăng nhập, để ẩn mục menu, thẻ số liệu và nút thao tác không dùng được.
 * Chỉ phục vụ trải nghiệm; backend vẫn kiểm từng API và trả 403 khi thiếu quyền, mã `ACCESS_DENIED` (tầng URL) hoặc
 * `PERMISSION_REQUIRED` (tầng service). Hai mã như nhau với giao diện: `ErrorNotice` hiện thông báo của backend.
 */
export function usePermission() {
  const profile = useSelector((state: RootState) => state.auth.profile);

  return useMemo(() => ({
    isAdmin: profile?.role === 'ADMIN',
    can: (permission: string) => hasPermission(profile, permission),
    canView: (code: OpsFunctionCode) => hasPermission(profile, opsView(code)),
    canAct: (code: OpsFunctionCode) => hasPermission(profile, opsAction(code)),
    canAccess: (access: PageAccess) => canAccessPage(profile, access),
  }), [profile]);
}

export type Permissions = ReturnType<typeof usePermission>;
