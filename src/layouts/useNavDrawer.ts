import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@/features/auth';

/**
 * Dưới 1024px sidebar thành ngăn trượt: màn 820px (máy tính bảng dọc) cần đủ bề ngang cho bảng hơn là menu cố định.
 * Cùng ngưỡng với các utility `max-[1024px]:` của khung trang (Tailwind hiểu là width < 1024px).
 */
export const NAV_DRAWER_QUERY = '(width < 1024px)';

/**
 * Trạng thái ngăn menu ở màn hẹp và hành vi bàn phím đi kèm.
 *
 * - Mở thì focus mục menu đầu tiên; Esc hoặc nút đóng thì đóng và trả focus về nút mở ở header.
 * - Ngăn đóng ở màn hẹp thì `inert`: các link nằm ngoài màn hình không nhận Tab, trình đọc màn hình không đọc.
 * - Đổi trang hoặc màn rộng ra (sidebar cố định lại) thì tự đóng.
 */
export function useNavDrawer(pathname: string) {
  const narrow = useMediaQuery(NAV_DRAWER_QUERY);
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  };

  // Đổi trang: ngăn che mất nội dung vừa mở nên đóng (focus đã theo link vừa bấm, không trả về nút mở).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!narrow) setOpen(false);
  }, [narrow]);

  // `inert` đặt qua DOM: kiểu JSX của React 18 chưa có thuộc tính này.
  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.inert = narrow && !open;
  }, [narrow, open]);

  // Mở: focus mục đầu tiên và bắt Esc ở cấp trang; gỡ ngay khi đóng.
  useEffect(() => {
    if (!open) return;
    sidebarRef.current?.querySelector<HTMLElement>('.sidebar-nav a')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return { narrow, open, toggle: () => setOpen((value) => !value), close, sidebarRef, toggleRef };
}
