import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  /** Thời gian hiển thị (ms) trước khi tự ẩn. */
  duration?: number;
}

/**
 * Thông báo ngắn sau khi thao tác thành công; tự ẩn, đọc được bằng trình đọc màn hình.
 * Vẽ qua portal ở body để nằm trên ngăn trượt và hộp thoại (cũng vẽ ở body).
 */
export function Toast({ message, onDismiss, duration = 3000 }: ToastProps) {
  // Hẹn giờ ẩn theo từng thông báo; thông báo mới thay thế thì đặt lại giờ.
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [message, duration, onDismiss]);

  return createPortal(<div className="ui-toast" role="status">{message}</div>, document.body);
}
