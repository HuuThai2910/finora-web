import { useLocation, useSearchParams } from 'react-router-dom';
import { isServicingTab, type ServicingTab } from '../constant';

/**
 * Ba route cùng mở trang này; route cho biết nhóm việc mặc định khi URL chưa có `?tab=`.
 * `/loans/overdue` vào thẳng thu hồi, `/reconciliation` vào đối soát.
 */
function defaultTab(pathname: string): ServicingTab {
  if (pathname.endsWith('/reconciliation')) return 'reconciliation';
  return 'collection';
}

/** Số trang trên URL tính từ 1; giá trị lạ coi như trang đầu. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/**
 * Nhóm việc và trang đang xem nằm trên URL (`?tab=reschedule&page=2`) để chia sẻ đường dẫn hoặc
 * quay lại đúng chỗ. Tab trùng mặc định của route thì không ghi lên URL cho gọn.
 */
export function useServicingTab() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const fallback = defaultTab(pathname);
  const requested = params.get('tab');
  const tab: ServicingTab = isServicingTab(requested) ? requested : fallback;
  const page = readPage(params.get('page'));

  const write = (nextTab: ServicingTab, nextPage: number) => {
    const query: Record<string, string> = {};
    if (nextTab !== fallback) query.tab = nextTab;
    if (nextPage > 0) query.page = String(nextPage + 1);
    setParams(query);
  };

  return {
    tab,
    /** Trang hiện tại, tính từ 0 như backend. */
    page,
    setTab: (next: ServicingTab) => write(next, 0),
    setPage: (next: number) => write(tab, next),
  };
}
