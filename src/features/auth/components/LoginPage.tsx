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

/**
 * Nửa giới thiệu (có video) chỉ dựng khi màn đủ rộng; màn hẹp ẩn nó nên không tải video vô ích.
 * Bố cục dùng `max-[961px]:` (bề ngang < 961px), đúng phần bù của truy vấn này.
 */
const SHOWCASE_QUERY = '(min-width: 961px)';

/*
 * Ô nhập: icon đầu ô như app mobile, viền màu nhấn và quầng nhạt khi đang chọn; ô đang chọn vẫn có viền focus chung
 * (2px màu nhấn ở :focus-visible) như giao diện đã duyệt, nên chỉ bỏ outline khi không ở :focus-visible.
 * Phông kế thừa từ form như `font: inherit` nhưng ghi từng phần: Tailwind xếp `[font:inherit]` sau `text-[14px]`
 * nên sẽ đè mất cỡ chữ.
 */
const INPUT =
  'w-full h-10 pl-9.5 border border-line-strong rounded-[10px] bg-white text-primary font-[inherit] [font-style:inherit] [font-weight:inherit] leading-[inherit] text-[14px] not-focus-visible:[outline:none] transition-[border-color,box-shadow] duration-200 placeholder:text-muted focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)]';
const INPUT_ICON =
  'login-input-icon absolute left-3 grid text-muted pointer-events-none transition-[color] duration-200 group-focus-within/input:text-brand [&_svg]:size-4';

type ReturnLocation = { pathname?: string; search?: string; hash?: string };

function returnPath(state: unknown): string {
  const from = state && typeof state === 'object' ? (state as { from?: ReturnLocation }).from : undefined;
  if (!from?.pathname || from.pathname === '/login') return '/';
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
}

/**
 * Màn đăng nhập quản trị: trái là video giới thiệu (LoginShowcase), phải là form; nền xanh nhạt có sóng
 * (LoginBackdrop) trải cả trang. Mọi thứ nằm phẳng trên nền: không đổ bóng, không nhấc nổi khi rê chuột.
 * Mascot robot FINORA (MascotPeek) ló đầu sau mép thẻ form, đổi dáng theo ô đang gõ, có bong bóng thoại.
 * Màn hẹp chỉ còn form + mascot.
 */
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

  const error = useSelector((state: RootState) => state.auth.error);
  const sessionExpired = useSelector((state: RootState) => state.auth.sessionExpired);

  // Trang quay lại sau khi đăng nhập: trang bị chặn trước đó, gồm cả query (tab, bộ lọc, trang) để về đúng chỗ đang
  // xem; mặc định trang đầu tiên tài khoản xem được (Tổng quan với quản trị viên, nhân viên thiếu quyền Tổng quan được
  // đưa tới mục đầu tiên của menu).
  const from = returnPath(location.state);

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
    // Giảm chuyển động: tắt mọi hoạt ảnh và chuyển tiếp trong trang, trừ vòng xoay đang đăng nhập.
    <div className="login-wrapper relative isolate grid grid-cols-[minmax(0,1.25fr)_minmax(440px,1fr)] min-h-screen overflow-hidden bg-[linear-gradient(165deg,#f6f9ff_0%,#e9f1fd_52%,#dce8fb_100%)] max-[961px]:grid-cols-[1fr] max-[961px]:[&>.ls]:hidden motion-reduce:[&_*:not(.login-spinner)]:animate-none! motion-reduce:**:[transition:none]! motion-reduce:[&_*::after]:animate-none! motion-reduce:[&_*::after]:[transition:none]!">
      <LoginBackdrop />
      {wide && <LoginShowcase />}

      <main className="login-panel relative flex flex-col items-center justify-center pt-8 px-6 pb-13">
        {/* Logo trên form chỉ hiện khi nửa minh hoạ bị ẩn (màn hẹp). */}
        <div className="login-brand hidden items-center gap-2.5 w-full max-w-100 mb-2 max-[961px]:flex">
          <span className="login-logo grid place-items-center flex-none size-8 rounded-md bg-brand text-white [&_svg]:size-4.5"><BrandMark /></span>
          <span className="login-wordmark text-primary text-[15px] font-bold">FINORA<span className="ml-1.5 text-secondary font-normal">Quản trị</span></span>
        </div>

        {/* --peek-w: bề rộng khung mascot; ảnh mascot 240 x 132 (MascotPeek), mép dưới ảnh trùng mép trên thẻ. */}
        <div className="login-stack relative w-full max-w-100 [--peek-w:210px] pt-[calc(var(--peek-w)*132/240)]" data-mood={mood}>
          <MascotPeek focus={focus} showPassword={showPassword} mood={mood} />

          {/* Thẻ và nội dung thẻ hiện lần lượt (login-rise, độ trễ tăng dần). */}
          <section className="login-card relative z-1 w-full pt-7 px-7 pb-6 border border-line rounded-[20px] bg-card animate-[login-rise_0.7s_var(--ease-soft)_0.15s_both] max-[480px]:pt-5.5 max-[480px]:px-4.5 max-[480px]:pb-5">
            <h1 className="login-title text-primary text-[22px] font-bold leading-[1.3] animate-[login-rise_0.6s_var(--ease-soft)_0.3s_both]">Đăng nhập</h1>
            <p className="login-subtitle mt-1 mb-5.5 text-secondary text-[13px] animate-[login-rise_0.6s_var(--ease-soft)_0.36s_both]">Dùng tài khoản quản trị viên hoặc nhân viên được cấp.</p>

            {/* Hết phiên giữa chừng: nói rõ lý do bị đưa về đây; cam (cảnh báo), không đỏ như lỗi đăng nhập. */}
            {sessionExpired && !error && (
              <div
                className="login-expired flex items-start gap-2 mb-4 py-2.5 px-3 rounded-[10px] bg-warning-bg text-warning text-[13px] [&_svg]:flex-none [&_svg]:size-4 [&_svg]:mt-0.5"
                role="status"
              >
                <Icon name="clock" />
                <span>Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.</span>
              </div>
            )}

            {error && (
              <div
                className="login-error-banner flex items-start gap-2 mb-4 py-2.5 px-3 rounded-[10px] bg-danger-bg text-danger text-[13px] animate-[login-rise_0.6s_var(--ease-soft)_both] [&_svg]:flex-none [&_svg]:size-4 [&_svg]:mt-0.5"
                role="alert"
              >
                <Icon name="alert" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form flex flex-col gap-4 animate-[login-rise_0.6s_var(--ease-soft)_both]">
              <div className="login-field flex flex-col gap-1.5 animate-[login-rise_0.6s_var(--ease-soft)_0.44s_both]">
                <label className="login-label text-primary text-[13px] font-semibold" htmlFor="login-email">Email</label>
                <div className="login-input-wrap group/input relative flex items-center">
                  <span className={INPUT_ICON}><Icon name="mail" /></span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    className={`login-input pr-3 ${INPUT}`}
                    placeholder="ten@finora.vn"
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

              <div className="login-field flex flex-col gap-1.5 animate-[login-rise_0.6s_var(--ease-soft)_0.52s_both]">
                <label className="login-label text-primary text-[13px] font-semibold" htmlFor="login-password">Mật khẩu</label>
                <div className="login-input-wrap group/input relative flex items-center">
                  <span className={INPUT_ICON}><Icon name="lock" /></span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    // Chừa chỗ bên phải cho nút hiện/ẩn mật khẩu.
                    className={`login-input has-toggle pr-10 ${INPUT}`}
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
                    className="login-toggle absolute top-1.5 right-1.5 grid place-items-center size-7 rounded-sm text-muted hover:bg-surface-muted hover:text-primary focus-visible:outline-offset-0 [&_svg]:size-4"
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

              {/* Rê chuột chỉ đậm màu và đẩy mũi tên, nút không nổi lên. */}
              <button
                type="submit"
                className="login-submit flex items-center justify-center gap-2 w-full h-10 mt-1 rounded-[10px] bg-brand text-white text-[14px] font-semibold transition-[background] duration-200 animate-[login-rise_0.6s_var(--ease-soft)_0.6s_both] hover:not-disabled:bg-brand-600 disabled:opacity-70 disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:transition-[transform] [&_svg]:duration-200 [&_svg]:ease-soft hover:not-disabled:[&_svg]:transform-[translateX(3px)]"
                // Chỉ khóa khi đang gửi; lần kiểm tra phiên lúc mở trang không được khóa nút (người dùng đã gõ xong).
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span
                      className="login-spinner size-3.5 border-2 border-[rgba(255,255,255,0.4)] border-t-white rounded-[50%] animate-[login-spin_0.8s_linear_infinite] motion-reduce:animate-[login-spin_0.8s_linear_infinite]!"
                      aria-hidden="true"
                    />
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

        <p className="login-foot absolute bottom-4.5 left-0 w-full text-secondary text-[12px] text-center">© {new Date().getFullYear()} FINORA</p>
      </main>
    </div>
  );
}
