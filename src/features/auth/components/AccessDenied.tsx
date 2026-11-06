import type { ReactNode } from 'react';
import { ACCESS_DENIED_BUTTON_CLASS } from './accessDeniedStyles';
import { LogoutButton } from './LogoutButton';

export { ACCESS_DENIED_BUTTON_CLASS };

interface AccessDeniedProps {
  message: ReactNode;
  /** Nằm trong khung quản trị (trang con thiếu quyền) thay vì phủ cả màn hình. */
  inline?: boolean;
  /** Nút thay cho nút "Đăng xuất" mặc định. */
  action?: ReactNode;
}

const ROOT_CLASS = {
  // Phủ cả màn hình: cùng nền với vùng nội dung của trang quản trị.
  page: 'auth-denied flex flex-col items-center justify-center min-h-screen py-6 px-4 bg-page text-center',
  // Trang trong khung quản trị mà nhân viên chưa có quyền Xem: cùng thẻ, nằm giữa vùng nội dung, không tô nền.
  inline: 'auth-denied is-inline flex flex-col items-center justify-center min-h-105 py-12 px-4 text-center',
};

/** Thẻ "Không có quyền truy cập" dùng chung cho chặn theo vai trò và chặn theo quyền từng trang. */
export function AccessDenied({ message, inline = false, action }: AccessDeniedProps) {
  return (
    <div className={inline ? ROOT_CLASS.inline : ROOT_CLASS.page} role={inline ? 'alert' : undefined}>
      <div className="auth-denied-card w-full max-w-110 pt-7 px-6 pb-6 rounded-[16px] bg-card shadow-card">
        <span className="auth-denied-icon inline-grid place-items-center size-12 mb-3 rounded-[50%] bg-danger-bg text-danger">
          <svg className="size-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 11h14v11H5Z" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <h1 className="mb-1.5 text-primary text-[20px] font-bold">Không có quyền truy cập</h1>
        <p className="mb-5 text-secondary text-[14px] leading-[1.55]">{message}</p>
        <div className="auth-denied-actions flex flex-wrap justify-center gap-2">
          {/* Mặc định đăng xuất hẳn để đăng nhập bằng tài khoản khác (cookie phiên cũ bị xóa). */}
          {action ?? <LogoutButton />}
        </div>
      </div>
    </div>
  );
}
