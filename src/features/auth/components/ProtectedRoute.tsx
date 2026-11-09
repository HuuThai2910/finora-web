import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { ADMIN_APP_ROLES } from '../permissions';
import type { CurrentUser } from '../types';
import { AccessDenied } from './AccessDenied';
import { AuthWait } from './AuthWait';
import { ForcePasswordChange } from './ForcePasswordChange';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Vai trò được vào; mặc định là quản trị viên và nhân viên vận hành. */
  allowedRoles?: ReadonlyArray<CurrentUser['role']>;
}

const ROLE_LABELS: Record<CurrentUser['role'], string> = {
  ADMIN: 'quản trị viên',
  STAFF: 'nhân viên vận hành',
  BORROWER: 'người vay',
  INVESTOR: 'nhà đầu tư',
};

/**
 * Chặn route theo phiên và vai trò để cải thiện trải nghiệm; backend vẫn là nơi kiểm soát quyền.
 * Quyền Xem của từng trang do `RequirePageAccess` kiểm bên trong khung quản trị.
 */
export function ProtectedRoute({ children, allowedRoles = ADMIN_APP_ROLES }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, profile } = useSelector((state: RootState) => state.auth);

  if (isLoading) return <AuthWait />;

  if (!isAuthenticated) {
    // `location` gồm cả pathname và search: đăng nhập lại thì về đúng trang, đúng bộ lọc.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Tài khoản nhân viên mới còn mật khẩu tạm: đổi mật khẩu trước khi vào bất kỳ trang nào (URL đang mở giữ nguyên,
  // đổi xong là vào đúng trang đó).
  if (profile?.mustChangePassword) {
    return <ForcePasswordChange />;
  }

  if (profile && !allowedRoles.includes(profile.role)) {
    const allowed = allowedRoles.map((role) => ROLE_LABELS[role]).join(' hoặc ');
    return (
      <AccessDenied
        message={(
          <>
            Tài khoản {profile.email} là {ROLE_LABELS[profile.role] ?? profile.role}. Trang này chỉ dành cho {allowed}.
          </>
        )}
      />
    );
  }

  return <>{children}</>;
}
