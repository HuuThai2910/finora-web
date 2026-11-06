import { useLocation } from 'react-router-dom';

/**
 * Trạng thái điều hướng khi mở trang chi tiết từ một danh sách: nhớ URL của danh sách (gồm tab, bộ lọc, trang) để nút
 * quay lại và breadcrumb đưa người dùng về đúng chỗ đang xem, thay vì về trang đầu không lọc.
 */
export interface FromListState {
  from?: string;
}

/** `state` truyền cho `<Link>` hoặc `navigate()` khi mở chi tiết từ danh sách đang hiển thị. */
export function fromListState(location: { pathname: string; search: string }): FromListState {
  return { from: `${location.pathname}${location.search}` };
}

/**
 * URL quay về danh sách `listPath`: dùng URL đã nhớ khi nó đúng là danh sách đó (có thể kèm query), nếu không thì
 * `listPath` trơn. So khớp đường dẫn để state cũ của một luồng khác không đưa người dùng sang nhầm trang.
 */
export function backToListUrl(state: unknown, listPath: string): string {
  const from = state && typeof state === 'object' ? (state as FromListState).from : undefined;
  if (typeof from !== 'string') return listPath;
  return from === listPath || from.startsWith(`${listPath}?`) ? from : listPath;
}

/** Hook gọn cho trang chi tiết: URL nút "Về danh sách". */
export function useBackToList(listPath: string): string {
  return backToListUrl(useLocation().state, listPath);
}
