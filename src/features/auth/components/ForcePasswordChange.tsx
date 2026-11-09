import { useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/app/store';
import { ErrorToast } from '@/components/ErrorToast';
import { Icon } from '@/components/Icon';
import { toast } from '@/lib/toast';
import { authApi } from '../api/authApi';
import { logoutUser, passwordChanged } from '../slices/authSlice';
import { BrandMark } from './BrandMark';

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;

const FIELD = 'grid gap-1 text-left';
const FIELD_LABEL = 'text-primary text-[13px] font-semibold';
/** Cùng kiểu ô nhập của form quản trị; nhập sai (`aria-invalid`) thì viền đỏ. */
const INPUT = 'w-full h-10 px-3 border border-line-strong rounded-[10px] bg-white text-primary text-[14px]'
  + ' focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] focus:[outline:0] aria-invalid:border-danger';
const ERROR = 'text-danger text-[12px]';

/**
 * Màn đổi mật khẩu bắt buộc: tài khoản nhân viên mới đăng nhập bằng mật khẩu tạm (cờ `mustChangePassword`) phải đổi
 * trước khi vào trang quản trị. Không dùng required action của Keycloak vì đăng nhập đi qua direct grant sẽ bị chặn.
 * Đổi xong phiên đang dùng giữ nguyên, cờ tắt và người dùng vào thẳng trang đang mở.
 */
export function ForcePasswordChange() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const email = useSelector((state: RootState) => state.auth.profile?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const currentError = currentPassword ? null : 'Nhập mật khẩu tạm được cấp.';
  const newError = newPassword.length < PASSWORD_MIN || newPassword.length > PASSWORD_MAX
    ? `Mật khẩu mới dài từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự.`
    : newPassword === currentPassword ? 'Mật khẩu mới phải khác mật khẩu tạm.' : null;
  const confirmError = confirm === newPassword ? null : 'Nhập lại chưa khớp mật khẩu mới.';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (currentError || newError || confirmError || busy) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      dispatch(passwordChanged());
      toast.success('Đã đổi mật khẩu. Lần sau hãy đăng nhập bằng mật khẩu mới.');
    } catch (failure) {
      setError(failure);
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

  const type = show ? 'text' : 'password';
  return (
    <div className="force-password flex flex-col items-center justify-center min-h-screen py-6 px-4 bg-page">
      <section className="w-full max-w-110 pt-7 px-6 pb-6 rounded-[16px] bg-card shadow-card max-[480px]:px-4.5" aria-labelledby="force-password-title">
        <span className="inline-grid place-items-center size-10 mb-3 rounded-md bg-brand text-white [&_svg]:size-5.5"><BrandMark /></span>
        <h1 id="force-password-title" className="mb-1 text-primary text-[20px] font-bold">Đổi mật khẩu lần đầu</h1>
        <p className="mb-5 text-secondary text-[14px] leading-[1.55]">
          Tài khoản <strong className="text-primary wrap-anywhere">{email}</strong> đang dùng mật khẩu tạm do quản trị viên
          cấp. Hãy đặt mật khẩu của riêng bạn để tiếp tục.
        </p>

        <form className="grid gap-3.5" onSubmit={submit} noValidate>
          <input type="email" value={email} autoComplete="username" readOnly hidden />
          <label className={FIELD}>
            <span className={FIELD_LABEL}>Mật khẩu tạm</span>
            <input
              className={INPUT}
              type={type}
              value={currentPassword}
              autoComplete="current-password"
              aria-invalid={touched && currentError != null}
              disabled={busy}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoFocus
            />
            {touched && currentError && <small className={ERROR} role="alert">{currentError}</small>}
          </label>
          <label className={FIELD}>
            <span className={FIELD_LABEL}>Mật khẩu mới</span>
            <input
              className={INPUT}
              type={type}
              value={newPassword}
              maxLength={PASSWORD_MAX}
              autoComplete="new-password"
              aria-invalid={touched && newError != null}
              disabled={busy}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            {touched && newError
              ? <small className={ERROR} role="alert">{newError}</small>
              : <small className="text-muted text-[12px]">Ít nhất {PASSWORD_MIN} ký tự; nên có chữ hoa, chữ thường, số và ký tự đặc biệt.</small>}
          </label>
          <label className={FIELD}>
            <span className={FIELD_LABEL}>Nhập lại mật khẩu mới</span>
            <input
              className={INPUT}
              type={type}
              value={confirm}
              maxLength={PASSWORD_MAX}
              autoComplete="new-password"
              aria-invalid={touched && confirmError != null}
              disabled={busy}
              onChange={(event) => setConfirm(event.target.value)}
            />
            {touched && confirmError && <small className={ERROR} role="alert">{confirmError}</small>}
          </label>
          <label className="flex items-center gap-2 text-secondary text-[13px] cursor-pointer">
            <input type="checkbox" className="accent-brand" checked={show} onChange={(event) => setShow(event.target.checked)} />
            Hiện mật khẩu
          </label>

          <div className="flex flex-wrap justify-end gap-2 mt-1">
            <button type="button" className="ui-btn ghost" onClick={() => void logout()} disabled={busy}>
              <Icon name="logout" />
              Đăng xuất
            </button>
            <button type="submit" className="ui-btn primary" disabled={busy}>
              {busy ? 'Đang lưu...' : 'Đổi mật khẩu'}
            </button>
          </div>
          {error ? <ErrorToast error={error} /> : null}
        </form>
      </section>
    </div>
  );
}
