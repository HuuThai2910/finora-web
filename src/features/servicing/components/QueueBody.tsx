import type { ReactNode } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Pager } from '@/components/Pager';
import { SERVICING_PAGE_SIZE } from '../constant';
import { NothingOpen } from './ServicingCard';

interface Props {
  error: unknown;
  isLoading: boolean;
  isFetching: boolean;
  onRetry: () => void;
  total: number;
  /** Danh sách trang hiện tại rỗng: hiện câu báo hết việc thay cho bảng. */
  emptyText: string;
  /** Hết việc chỉ là một dòng chữ gọn (khối nằm trong trang chi tiết), không có biểu tượng lớn. */
  compactEmpty?: boolean;
  page: number;
  unit: string;
  onPage: (page: number) => void;
  children: ReactNode;
}

/** Hàng đợi hết việc: là tin tốt nên có dấu kiểm xanh. */
export function QueueEmpty({ text }: { text: string }) {
  return (
    <div className="svc-empty grid justify-items-center gap-1.5 px-4 py-8 text-center text-[13px] text-muted [&_svg]:size-5 [&_svg]:text-success">
      <Icon name="checkCircle" />
      <span>{text}</span>
    </div>
  );
}

/**
 * Khung chung của một hàng đợi: đang tải, lỗi (giữ mã lỗi và traceId), hết việc, hoặc bảng kèm
 * phân trang 10 dòng.
 */
export function QueueBody({
  error, isLoading, isFetching, onRetry, total, emptyText, compactEmpty = false, page, unit, onPage, children,
}: Props) {
  if (error) return <div className="svc-pad px-0.5 pb-3"><ErrorNotice error={error} onRetry={onRetry} /></div>;
  if (isLoading) return <p className="text-[13px] text-muted" aria-busy="true">Đang tải dữ liệu...</p>;
  if (total === 0) return compactEmpty ? <NothingOpen text={emptyText} /> : <QueueEmpty text={emptyText} />;
  return (
    <div className={isFetching ? 'ui-busy' : undefined}>
      {children}
      {total > SERVICING_PAGE_SIZE && (
        <div className="svc-pager">
          <Pager page={page} size={SERVICING_PAGE_SIZE} total={total} unit={unit} disabled={isFetching} onPage={onPage} />
        </div>
      )}
    </div>
  );
}
