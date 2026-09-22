import { useGetMarketListingsQuery } from '../api/investmentApi';

/**
 * Số khoản vay ở từng chặng của sàn, để dải chặng hiện con số thật thay vì đếm trang
 * đang xem.
 *
 * Backend không có endpoint đếm riêng; gọi tìm kiếm với `size=1` rồi đọc `totalElements`
 * là cách rẻ nhất mà vẫn đúng trên toàn bộ dữ liệu. Bốn request nhỏ này dùng chung tag
 * `MarketListingList`, nên mọi thao tác duyệt/khóa/phát hành đều tự làm mới số đếm.
 */
const COUNT_PAGE = { page: 0, size: 1 } as const;

export interface StageCounts {
  all: number | null;
  draft: number | null;
  open: number | null;
  funded: number | null;
  isLoading: boolean;
}

export function useStageCounts(): StageCounts {
  const all = useGetMarketListingsQuery({ status: 'ALL', ...COUNT_PAGE });
  const draft = useGetMarketListingsQuery({ status: 'DRAFT', ...COUNT_PAGE });
  const open = useGetMarketListingsQuery({ status: 'OPEN', ...COUNT_PAGE });
  const funded = useGetMarketListingsQuery({ status: 'FULLY_FUNDED', ...COUNT_PAGE });

  return {
    all: all.data?.totalElements ?? null,
    draft: draft.data?.totalElements ?? null,
    open: open.data?.totalElements ?? null,
    funded: funded.data?.totalElements ?? null,
    isLoading: all.isLoading || draft.isLoading || open.isLoading || funded.isLoading,
  };
}
