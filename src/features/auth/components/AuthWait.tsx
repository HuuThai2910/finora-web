import { useEffect, useState } from 'react';
import { BrandMark } from './BrandMark';

/** Quá lâu chưa kiểm xong phiên (máy chủ đang khởi động, mạng chập chờn): cho người dùng tự thử lại. */
const SLOW_AFTER_MS = 15_000;

/**
 * Màn chờ kiểm tra phiên: cùng nền với vùng nội dung của trang quản trị (không nháy nền tối trước khi vào trang),
 * vòng xoay màu nhấn. Sau 15 giây chưa xong thì hiện nút "Thử lại" tải lại trang.
 */
export function AuthWait() {
  const [slow, setSlow] = useState(false);

  // Hẹn giờ một lần khi màn chờ hiện; rời màn chờ (kiểm xong) thì hủy.
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className="auth-wait flex flex-col items-center justify-center gap-3.5 min-h-screen p-6 bg-page text-secondary text-[14px] text-center"
      role="status"
      aria-live="polite"
    >
      <span className="auth-wait-logo grid place-items-center size-10 rounded-md bg-brand text-white [&_svg]:size-5.5"><BrandMark /></span>
      <span
        className="auth-wait-spinner size-7 border-3 border-line-strong border-t-brand rounded-[50%] animate-[auth-spin_0.8s_linear_infinite]"
        aria-hidden="true"
      />
      <p>Đang kiểm tra phiên đăng nhập...</p>
      {slow && (
        <div className="auth-wait-slow grid justify-items-center gap-2.5">
          <p className="text-[13px] text-muted">Máy chủ phản hồi chậm hơn thường lệ.</p>
          <button type="button" className="ui-btn ghost" onClick={() => window.location.reload()}>
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
