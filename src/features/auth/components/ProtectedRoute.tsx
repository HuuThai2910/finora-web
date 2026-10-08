import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import type { CurrentUser } from '../types';
import { BrandMark } from './BrandMark';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: CurrentUser['role'];
}

const ROLE_LABELS: Record<CurrentUser['role'], string> = {
  ADMIN: 'quản trị viên',
  BORROWER: 'người vay',
  INVESTOR: 'nhà đầu tư',
};

/**
 * Chặn route theo phiên và vai trò để cải thiện trải nghiệm; backend vẫn là nơi kiểm soát quyền.
 */
export function ProtectedRoute({ children, requiredRole = 'ADMIN' }: ProtectedRouteProps) {
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

  if (requiredRole && profile && profile.role !== requiredRole) {
    return (
      <div className="auth-denied">
        <div className="auth-denied-card">
          <span className="auth-denied-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 11h14v11H5Z" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <h1>Không có quyền truy cập</h1>
          <p>
            Tài khoản {profile.email} là {ROLE_LABELS[profile.role] ?? profile.role}. Trang này chỉ dành cho{' '}
            {ROLE_LABELS[requiredRole]}.
          </p>
          {/* Tải lại toàn trang để phiên được kiểm tra lại từ đầu khi đổi tài khoản. */}
          <a className="auth-denied-btn" href="/login">Đăng nhập bằng tài khoản khác</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
