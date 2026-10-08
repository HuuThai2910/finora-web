import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/app/store';
import { loginUser, clearError } from '../slices/authSlice';
import { BrandMark } from './BrandMark';
import './LoginPage.css';

/**
 * Tài khoản mẫu đã seed sẵn ở môi trường phát triển (máy chủ xác thực + user_profiles).
 * Bấm để điền nhanh vào form, người dùng vẫn có thể tự nhập tài khoản khác.
 *
 * Chỉ hiển thị khi chạy dev (`import.meta.env.DEV`), nên mật khẩu không đi vào
 * bản build phát hành.
 */
const DEMO_ACCOUNTS = [
  { email: 'admin@finora.vn', password: 'Finora@12345', label: 'Quản trị viên' },
  { email: 'investor@finora.vn', password: 'Finora@12345', label: 'Nhà đầu tư' },
  { email: 'le.thu.thao@gmail.com', password: 'Finora@12345', label: 'Người vay' },
] as const;

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Phân biệt lần bấm đăng nhập với lần kiểm tra phiên lúc mở trang (cùng dùng cờ isLoading của auth).
  const [submitting, setSubmitting] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  // Trang quay lại sau khi đăng nhập: trang bị chặn trước đó, mặc định danh sách hồ sơ vay.
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    dispatch(clearError());
    setSubmitting(true);
    const result = await dispatch(loginUser({ email: email.trim(), password }));
    setSubmitting(false);
    if (loginUser.fulfilled.match(result)) {
      navigate(from, { replace: true });
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    dispatch(clearError());
  };

  const passwordLabel = showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';

  return (
    <div className="login-wrapper">
      <div className="login-brand">
        <span className="login-logo"><BrandMark /></span>
        <span className="login-wordmark">FINORA<span>Quản trị</span></span>
      </div>

      <main className="login-card">
        <h1 className="login-title">Đăng nhập</h1>
        <p className="login-subtitle">Dùng tài khoản quản trị viên được cấp.</p>

        {error && (
          <div className="login-error-banner" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              required
              className="login-input"
              placeholder="admin@finora.vn"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Mật khẩu</label>
            <div className="login-input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                className="login-input has-toggle"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={passwordLabel}
                title={passwordLabel}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={isLoading}>
            {submitting ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>

        {import.meta.env.DEV && (
          <div className="login-demo">
            <div className="login-demo-title">Tài khoản dùng thử</div>
            <p className="login-demo-hint">Bấm một dòng để điền sẵn email và mật khẩu.</p>
            <div className="login-demo-list">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className="login-demo-row"
                  onClick={() => handleQuickFill(acc.email, acc.password)}
                >
                  <span className="login-demo-email">{acc.email}</span>
                  <span className="login-demo-role">{acc.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
