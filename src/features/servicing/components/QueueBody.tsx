import type { ReactNode } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { SERVICING_PAGE_SIZE } from '../constant';

interface Props {
  error: unknown;
  isLoading: boolean;
  isFetching: boolean;
  onRetry: () => void;
  total: number;
  /** Danh sách trang hiện tại rỗng: hiện câu báo hết việc thay cho bảng. */
  emptyText: string;
  page: number;
  unit: string;
  onPage: (page: number) => void;
  children: ReactNode;
}

/**
 * Khung chung của một hàng đợi: đang tải, lỗi (giữ mã lỗi và traceId), hết việc, hoặc bảng kèm
 * phân trang 10 dòng. Hàng đợi rỗng là tin tốt nên có dấu kiểm xanh như mockup.
 */
export function QueueBody({ error, isLoading, isFetching, onRetry, total, emptyText, page, unit, onPage, children }: Props) {
  if (error) return <div className="svc-pad"><ErrorNotice error={error} onRetry={onRetry} /></div>;
  if (isLoading) return <div className="ui-empty" aria-busy="true">Đang tải dữ liệu...</div>;
  if (total === 0) {
    return (
      <div className="svc-empty">
        <Icon name="checkCircle" />
        <span>{emptyText}</span>
      </div>
    );
  }
  return (
    <div className={isFetching ? 'ui-busy' : undefined}>
      {children}
      <div className="svc-pager">
        <Pager page={page} size={SERVICING_PAGE_SIZE} total={total} unit={unit} disabled={isFetching} onPage={onPage} />
      </div>
    </div>
  );
}
