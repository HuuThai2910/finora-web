import { useGetMarketListingsQuery } from '../api/investmentApi';
import { SUMMARY_SAMPLE_SIZE, type ListingTab } from '../constants';
import { isOverdue } from '../stage';
import type { MarketListing } from '../types';
import { parseDecimal } from '../formatters';

const COUNT_PAGE = { page: 0, size: 1 } as const;
const SAMPLE_PAGE = { page: 0, size: SUMMARY_SAMPLE_SIZE } as const;

/** Tổng tiền của một nhóm khoản, kèm phạm vi mẫu đã cộng. */
export interface AmountSample {
  /** Tổng số khoản ở trạng thái này trên toàn sàn. */
  total: number;
  /** Số khoản thật sự được cộng; nhỏ hơn `total` khi nhóm dài hơn một trang. */
  sampled: number;
  committed: number;
  target: number;
}

export interface FundingSummary {
  counts: Record<ListingTab, number>;
  open: AmountSample & { overdue: number };
  funded: AmountSample;
}

const sum = (items: MarketListing[], key: 'committedAmount' | 'targetAmount') =>
  items.reduce((total, item) => total + (parseDecimal(item[key]) ?? 0), 0);

function sample(items: MarketListing[], total: number): AmountSample {
  return {
    total,
    sampled: items.length,
    committed: sum(items, 'committedAmount'),
    target: sum(items, 'targetAmount'),
  };
}

/**
 * Số liệu đầu trang Gọi vốn & Notes và số đếm trên tab.
 *
 * Backend không có API đếm hay tổng hợp: số đếm đọc `totalElements` của lời gọi `size=1`;
 * tổng tiền đang gọi vốn và đã đủ vốn cộng trên tối đa {@link SUMMARY_SAMPLE_SIZE} khoản
 * (giao diện ghi rõ phạm vi khi nhóm dài hơn). Các query dùng chung tag `MarketListingList`,
 * nên duyệt, khóa vốn hay đóng khoản quá hạn đều tự làm mới số liệu.
 */
export function useFundingSummary() {
  const all = useGetMarketListingsQuery({ status: 'ALL', ...COUNT_PAGE });
  const draft = useGetMarketListingsQuery({ status: 'DRAFT', ...COUNT_PAGE });
  const closed = useGetMarketListingsQuery({ status: 'CLOSED', ...COUNT_PAGE });
  const cancelled = useGetMarketListingsQuery({ status: 'CANCELLED', ...COUNT_PAGE });
  const open = useGetMarketListingsQuery({ status: 'OPEN', ...SAMPLE_PAGE });
  const funded = useGetMarketListingsQuery({ status: 'FULLY_FUNDED', ...SAMPLE_PAGE });
  const queries = [all, draft, closed, cancelled, open, funded];

  let summary: FundingSummary | null = null;
  if (all.data && draft.data && closed.data && cancelled.data && open.data && funded.data) {
    const now = new Date();
    summary = {
      counts: {
        ALL: all.data.totalElements,
        DRAFT: draft.data.totalElements,
        OPEN: open.data.totalElements,
        FULLY_FUNDED: funded.data.totalElements,
        CLOSED: closed.data.totalElements,
        CANCELLED: cancelled.data.totalElements,
      },
      open: {
        ...sample(open.data.content, open.data.totalElements),
        overdue: open.data.content.filter((item) => isOverdue(item, now)).length,
      },
      funded: sample(funded.data.content, funded.data.totalElements),
    };
  }

  return {
    summary,
    isLoading: queries.some((query) => query.isLoading),
    error: queries.find((query) => query.error)?.error,
    refetch: () => queries.forEach((query) => void query.refetch()),
  };
}
