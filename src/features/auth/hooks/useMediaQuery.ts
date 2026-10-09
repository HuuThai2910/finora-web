import { useCallback, useSyncExternalStore } from 'react';

/**
 * Theo dõi một media query CSS (bề rộng màn, giảm chuyển động...) và render lại khi kết quả đổi.
 * Dùng `useSyncExternalStore` vì `matchMedia` là nguồn dữ liệu bên ngoài React; hàm đăng ký trả về
 * hàm huỷ để gỡ listener khi component unmount hoặc query đổi.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

/** Người dùng bật "giảm chuyển động" trong hệ điều hành: tắt mọi hoạt ảnh tự chạy. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
