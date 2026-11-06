import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch } from '@/app/store';
import { logoutUser } from '../slices/authSlice';
import { ACCESS_DENIED_BUTTON_CLASS } from './accessDeniedStyles';

/**
 * Nút "Đăng xuất" của thẻ không có quyền: đăng xuất thật (xóa cookie phiên) rồi về màn đăng nhập. Link /login trơn
 * không đủ vì cookie còn, người dùng vẫn đăng nhập bằng tài khoản cũ.
 */
export function LogoutButton() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

  return (
    <button
      type="button"
      className={`${ACCESS_DENIED_BUTTON_CLASS} disabled:cursor-progress disabled:opacity-70`}
      onClick={() => void logout()}
      disabled={busy}
    >
      {busy ? 'Đang đăng xuất...' : 'Đăng xuất'}
    </button>
  );
}
