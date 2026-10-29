import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AccessDenied, OPS_FUNCTION_LABELS, usePermission, type PageAccess } from '@/features/auth';
import { firstAccessiblePath } from './adminNavigation';

function deniedMessage(access: PageAccess): string {
  if ('adminOnly' in access) return 'Trang này chỉ dành cho quản trị viên.';
  const labels = access.anyView.map((code) => `"${OPS_FUNCTION_LABELS[code]}"`).join(' hoặc ');
  return `Vai trò nhân viên của bạn chưa có quyền Xem ${labels}. Liên hệ quản trị viên để được cấp quyền.`;
}

/**
 * Chặn trang trong khung quản trị theo quyền Xem của chức năng. Chỉ để trải nghiệm: API vẫn trả 403
 * `ACCESS_DENIED` hoặc `PERMISSION_REQUIRED` khi thiếu quyền.
 */
export function RequirePageAccess({ access, children }: { access: PageAccess; children: ReactNode }) {
  const { canAccess } = usePermission();
  if (canAccess(access)) return <>{children}</>;

  const home = firstAccessiblePath(canAccess);
  return (
    <AccessDenied
      inline
      message={deniedMessage(access)}
      action={home ? <Link className="auth-denied-btn" to={home}>Về trang được phép xem</Link> : undefined}
    />
  );
}

/** Trang mặc định sau đăng nhập: Tổng quan nếu xem được, không thì trang đầu tiên của menu theo quyền. */
export function AdminHomeRedirect() {
  const { canAccess } = usePermission();
  const home = firstAccessiblePath(canAccess);
  if (!home) {
    return (
      <AccessDenied
        inline
        message="Vai trò nhân viên của bạn chưa được cấp quyền Xem chức năng nào. Liên hệ quản trị viên để được cấp quyền."
      />
    );
  }
  return <Navigate to={home} replace />;
}
