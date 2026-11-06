import { useLocation, useSearchParams } from 'react-router-dom';
import { isCollectionStage, isServicingTab, type ServicingTab } from '../constant';
import type { CollectionStage } from '../types';

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
 * Nhóm việc, trang đang xem và mức độ thu hồi đang lọc nằm trên URL (`?tab=reschedule&page=2`, `?stage=NPL`) để chia sẻ
 * đường dẫn hoặc quay lại đúng chỗ. Tab trùng mặc định của route thì không ghi lên URL cho gọn. `allowed` là các tab tài
 * khoản xem được; URL trỏ tới tab ngoài quyền thì về tab mặc định. Bộ lọc mức độ chỉ thuộc hàng đợi thu hồi: đổi tab là
 * bỏ lọc, đổi mức độ là về trang đầu (số trang cũ không còn đúng với danh sách mới).
 */
export function useServicingTab(allowed: ServicingTab[]) {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const fallback = defaultTab(pathname, allowed);
  const requested = params.get('tab');
  const tab: ServicingTab = isServicingTab(requested) && allowed.includes(requested) ? requested : fallback;
  const page = readPage(params.get('page'));
  const rawStage = params.get('stage');
  const stage: CollectionStage | null = tab === 'collection' && isCollectionStage(rawStage) ? rawStage : null;

  const write = (nextTab: ServicingTab, nextPage: number, nextStage: CollectionStage | null) => {
    const query: Record<string, string> = {};
    if (nextTab !== fallback) query.tab = nextTab;
    if (nextStage && nextTab === 'collection') query.stage = nextStage;
    if (nextPage > 0) query.page = String(nextPage + 1);
    setParams(query);
  };

  return {
    tab,
    /** Trang hiện tại, tính từ 0 như backend. */
    page,
    /** Mức độ thu hồi đang lọc; `null` là xem mọi mức. */
    stage,
    setTab: (next: ServicingTab) => write(next, 0, null),
    setPage: (next: number) => write(tab, next, stage),
    /** Lọc hàng đợi thu hồi theo mức độ (mở luôn tab thu hồi nếu đang ở tab khác). */
    setStage: (next: CollectionStage | null) => write('collection', 0, next),
  };
}
