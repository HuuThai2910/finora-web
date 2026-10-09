import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/app/store';
import { Icon } from '@/components/Icon';
import { loginUser, clearError } from '../slices/authSlice';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BrandMark } from './BrandMark';
import { DemoAccounts } from './DemoAccounts';
import { LoginBackdrop } from './LoginBackdrop';
import { LoginShowcase } from './LoginShowcase';
import { MascotPeek, type LoginFocus } from './MascotPeek';
import './LoginPage.css';

/** Nửa giới thiệu (có video) chỉ dựng khi màn đủ rộng; màn hẹp ẩn nó nên không tải video vô ích. */
const SHOWCASE_QUERY = '(min-width: 961px)';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Ô đang được chọn: mascot ló đầu đổi dáng theo ô email/mật khẩu.
  const [focus, setFocus] = useState<LoginFocus>('none');
  const wide = useMediaQuery(SHOWCASE_QUERY);
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

  // Sửa lại email/mật khẩu sau lần sai thì bỏ thông báo lỗi cũ, để form và mascot về trạng thái thường.
  const clearStaleError = () => {
    if (error) dispatch(clearError());
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    dispatch(clearError());
  };

  const passwordLabel = showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
  const mood = submitting ? 'busy' : error ? 'error' : 'idle';
  const leaveField = () => setFocus('none');

  return (
    <div className="login-wrapper">
      <LoginBackdrop />
      {wide && <LoginShowcase />}

      <main className="login-panel">
        <div className="login-brand">
          <span className="login-logo"><BrandMark /></span>
          <span className="login-wordmark">FINORA<span>Quản trị</span></span>
        </div>

        <div className="login-stack" data-mood={mood}>
          <MascotPeek focus={focus} showPassword={showPassword} mood={mood} />

          <section className="login-card">
            <h1 className="login-title">Đăng nhập</h1>
            <p className="login-subtitle">Dùng tài khoản quản trị viên được cấp.</p>

            {error && (
              <div className="login-error-banner" role="alert">
                <Icon name="alert" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label className="login-label" htmlFor="login-email">Email</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><Icon name="mail" /></span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    className="login-input"
                    placeholder="admin@finora.vn"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearStaleError();
                    }}
                    onFocus={() => setFocus('email')}
                    onBlur={leaveField}
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label" htmlFor="login-password">Mật khẩu</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><Icon name="lock" /></span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="login-input has-toggle"
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearStaleError();
                    }}
                    onFocus={() => setFocus('password')}
                    onBlur={leaveField}
                  />
                  <button
                    type="button"
                    className="login-toggle"
                    onClick={() => setShowPassword((value) => !value)}
                    onFocus={() => setFocus('password')}
                    onBlur={leaveField}
                    aria-label={passwordLabel}
                    title={passwordLabel}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} />
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
                  <>
                    <span>Đăng nhập</span>
                    <Icon name="arrowRight" />
                  </>
                )}
              </button>
            </form>

            {import.meta.env.DEV && <DemoAccounts currentEmail={email} onPick={handleQuickFill} />}
          </section>
        </div>

        <p className="login-foot">© {new Date().getFullYear()} FINORA</p>
      </main>
    </div>
  );
}
