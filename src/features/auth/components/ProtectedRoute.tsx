import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'ADMIN' | 'BORROWER' | 'INVESTOR';
}

export function ProtectedRoute({ children, requiredRole = 'ADMIN' }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, profile } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a1530',
        color: '#22d3ee',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          width: 44,
          height: 44,
          border: '3px solid rgba(34, 211, 238, 0.2)',
          borderTopColor: '#22d3ee',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: 16
        }} />
        <p style={{ fontSize: 14, color: '#aeb9d4' }}>Đang xác thực phiên làm việc FINORA...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && profile && profile.role !== requiredRole) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: 24,
        textAlign: 'center'
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(225, 29, 46, 0.1)',
          color: '#e11d2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          marginBottom: 16
        }}>
          ⚠️
        </div>
        <h2 style={{ fontSize: 22, color: '#0f1b30', marginBottom: 8 }}>Từ chối quyền truy cập (403 Forbidden)</h2>
        <p style={{ fontSize: 14, color: '#4a5670', maxWidth: 460, marginBottom: 20 }}>
          Tài khoản của bạn ({profile.email}) mang vai trò <strong>{profile.role}</strong>, không đủ thẩm quyền để truy cập trang quản trị dành riêng cho <strong>{requiredRole}</strong>.
        </p>
        <button
          onClick={() => window.location.href = '/login'}
          style={{
            padding: '10px 20px',
            background: '#1d4ed8',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Đăng nhập bằng tài khoản khác
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
