import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { ADMIN_APP_ROLES } from '../permissions';
import type { CurrentUser } from '../types';
import { AccessDenied } from './AccessDenied';
import { BrandMark } from './BrandMark';
import './ProtectedRoute.css';

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

  if (isLoading) {
    return (
      <div className="auth-wait" role="status" aria-live="polite">
        <span className="auth-wait-logo"><BrandMark /></span>
        <span className="auth-wait-spinner" aria-hidden="true" />
        <p>Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
