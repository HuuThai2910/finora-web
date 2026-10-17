import { useLayoutEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Hành vi bàn phím của ngăn chat (giống `SideDrawer` của trang Vận hành): Esc đóng, Tab chỉ đi vòng
 * trong ngăn, khóa cuộn trang phía sau, đóng thì trả focus về nút đã mở ngăn.
 *
 * Dùng `useLayoutEffect` để ghi nhớ phần tử đang có focus TRƯỚC khi ô nhập (component con) tự lấy
 * focus trong `useEffect` của nó; nếu không, focus sẽ được "trả" về ô nhập đã bị gỡ khỏi trang.
 * Phần tử có `data-autofocus` (nút "Đã hiểu" của thông báo AI) được focus ngay khi mở.
 */
export function useDrawerFocus(panelRef: RefObject<HTMLElement>, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      const panel = panelRef.current;
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((item) => item.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [panelRef]);
}
