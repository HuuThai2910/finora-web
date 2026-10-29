import type { ReactNode } from 'react';
import './ProtectedRoute.css';

interface AccessDeniedProps {
  message: ReactNode;
  /** Nằm trong khung quản trị (trang con thiếu quyền) thay vì phủ cả màn hình. */
  inline?: boolean;
  /** Nút thay cho "Đăng nhập bằng tài khoản khác". */
  action?: ReactNode;
}

/** Thẻ "Không có quyền truy cập" dùng chung cho chặn theo vai trò và chặn theo quyền từng trang. */
export function AccessDenied({ message, inline = false, action }: AccessDeniedProps) {
  return (
    <div className={inline ? 'auth-denied inline' : 'auth-denied'} role={inline ? 'alert' : undefined}>
      <div className="auth-denied-card">
        <span className="auth-denied-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 11h14v11H5Z" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <h1>Không có quyền truy cập</h1>
        <p>{message}</p>
        <div className="auth-denied-actions">
          {/* Tải lại toàn trang để phiên được kiểm tra lại từ đầu khi đổi tài khoản. */}
          {action ?? <a className="auth-denied-btn" href="/login">Đăng nhập bằng tài khoản khác</a>}
        </div>
      </div>
    </div>
  );
}
