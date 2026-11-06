import { useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';

interface ErrorToastProps {
  /** Lỗi của một thao tác (mutation); đổi sang lỗi mới thì báo thêm một toast. */
  error: unknown;
  /** Câu dùng khi lỗi không có câu báo đọc được. */
  fallback?: string;
}

/**
 * Báo lỗi thao tác bằng toast thay cho khối lỗi trong trang/hộp thoại: đặt đúng chỗ khối `ErrorNotice` cũ, không vẽ gì.
 * Toast có câu báo và "Mã tra cứu" như `ErrorNotice`. Lỗi tải dữ liệu của trang vẫn dùng `ErrorNotice` trong trang.
 */
export function ErrorToast({ error, fallback }: ErrorToastProps) {
  const reported = useRef<unknown>(null);
  useEffect(() => {
    if (error && error !== reported.current) {
      reported.current = error;
      toast.error(error, fallback);
    }
  }, [error, fallback]);
  return null;
}
