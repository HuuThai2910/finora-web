import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/app/store';
import { loginUser, clearError } from '../slices/authSlice';
import './LoginPage.css';

/**
 * Tài khoản mẫu đã seed sẵn trong Keycloak + user_profiles (môi trường phát triển).
 * Bấm để điền nhanh vào form, người dùng vẫn có thể tự nhập tài khoản khác.
 *
 * Chỉ hiển thị khi chạy dev (`import.meta.env.DEV`), nên mật khẩu không đi vào
 * bản build phát hành.
 */
const DEMO_ACCOUNTS = [
  { email: 'admin@finora.vn', password: 'Finora@12345', label: 'Quản trị viên (ADMIN)' },
  { email: 'investor@finora.vn', password: 'Finora@12345', label: 'Nhà đầu tư (INVESTOR)' },
  { email: 'le.thu.thao@gmail.com', password: 'Finora@12345', label: 'Người vay (BORROWER)' },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  // Fallback destination after login
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/loans';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    dispatch(clearError());
    const result = await dispatch(loginUser({ email: email.trim(), password }));
    if (loginUser.fulfilled.match(result)) {
      navigate(from, { replace: true });
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    dispatch(clearError());
  };

  return (
    <div className="login-wrapper">
      <div className="login-bg-glow" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 3 7v10l9 5 9-5V7l-9-5z" />
              <path d="M12 22V12" />
              <path d="m3 7 9 5 9-5" />
            </svg>
          </div>
          <h1 className="login-title">FINORA Admin</h1>
          <p className="login-subtitle">Cổng Quản Trị Hệ Thống Tín Dụng P2P</p>
        </div>

        {error && (
          <div className="login-error-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email quản trị viên</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="login-email"
                type="email"
                required
                className="form-input"
                placeholder="admin@finora.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Mật khẩu</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="login-spinner" />
                <span>Đang xác thực Keycloak...</span>
              </>
            ) : (
              <span>Đăng nhập hệ thống</span>
            )}
          </button>
        </form>

        {import.meta.env.DEV && (
        <div className="login-demo-helper">
          <div className="demo-helper-title">Tài khoản thử nghiệm nhanh</div>
          <div className="demo-chip-group">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="demo-chip"
                onClick={() => handleQuickFill(acc.email, acc.password)}
              >
                <span>{acc.email}</span>
                <span className="demo-chip-badge">{acc.label}</span>
              </button>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
