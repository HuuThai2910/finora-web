import { useLocation, useSearchParams } from 'react-router-dom';
import { isServicingTab, type ServicingTab } from '../constant';

/**
 * Ba route cùng mở trang này; route cho biết nhóm việc mặc định khi URL chưa có `?tab=`.
 * `/loans/overdue` vào thẳng thu hồi, `/reconciliation` vào đối soát.
 */
function defaultTab(pathname: string, allowed: ServicingTab[]): ServicingTab {
  const preferred: ServicingTab = pathname.endsWith('/reconciliation') ? 'reconciliation' : 'collection';
  return allowed.includes(preferred) ? preferred : allowed[0] ?? preferred;
}

/** Số trang trên URL tính từ 1; giá trị lạ coi như trang đầu. */
function readPage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed - 1 : 0;
}

/**
 * Nhóm việc và trang đang xem nằm trên URL (`?tab=reschedule&page=2`) để chia sẻ đường dẫn hoặc
 * quay lại đúng chỗ. Tab trùng mặc định của route thì không ghi lên URL cho gọn. `allowed` là các tab tài khoản
 * xem được; URL trỏ tới tab ngoài quyền thì về tab mặc định.
 */
export function useServicingTab(allowed: ServicingTab[]) {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const fallback = defaultTab(pathname, allowed);
  const requested = params.get('tab');
  const tab: ServicingTab = isServicingTab(requested) && allowed.includes(requested) ? requested : fallback;
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
