import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useGetAdminApplicationsQuery } from '../../api/loanReviewApi';
import { PENDING_SAMPLE_SIZE } from '../../hooks/usePendingReviewSummary';
import { nextInQueue, oldestFirst } from '../../mappers/pendingQueue';

const reviewPath = (applicationNumber: string) => `/loans/${encodeURIComponent(applicationNumber)}/review`;

const QUEUE_BTN =
  'lr-queue-btn grid place-items-center size-8 border border-line-strong rounded-md bg-white text-primary [&_svg]:size-4';

interface PendingQueueNavProps {
  applicationNumber: string;
  /** Ngày nộp của hồ sơ đang xem, để tìm hồ sơ kế tiếp khi hồ sơ này vừa rời hàng chờ. */
  submittedAt: string;
}

/**
 * Lối chuyển giữa các hồ sơ chờ thẩm định theo thứ tự nộp (cũ nhất trước, hồ sơ chờ lâu được xử lý trước), để
 * thẩm định liền một mạch.
 *
 * Dùng chung lời gọi tối đa {@link PENDING_SAMPLE_SIZE} hồ sơ chờ mới nhất với thẻ tóm tắt ở trang danh sách (cùng
 * tham số nên trúng cache), rồi sắp lại trong mẫu đó. Hồ sơ cũ hơn mẫu đứng trước mẫu nên vị trí cộng thêm phần đó.
 * Liên kết mang theo `state` để từ hồ sơ nào cũng quay về đúng danh sách đã mở.
 */
export function PendingQueueNav({ applicationNumber, submittedAt }: PendingQueueNavProps) {
  const location = useLocation();
  const { data } = useGetAdminApplicationsQuery({ status: 'PENDING_REVIEW', page: 0, size: PENDING_SAMPLE_SIZE });
  if (!data) return null;

  const queue = oldestFirst(data.data);
  const index = queue.findIndex((item) => item.applicationNumber === applicationNumber);

  if (index === -1) {
    // Hồ sơ vừa được quyết định rời khỏi hàng chờ: mời mở hồ sơ kế vị trí của nó, không quay về đầu hàng.
    const next = nextInQueue(queue, { applicationNumber, submittedAt });
    return next ? (
      <Link className="ui-btn ghost" to={reviewPath(next.applicationNumber)} state={location.state}>
        Hồ sơ chờ tiếp theo
        <Icon name="chevronRight" />
      </Link>
    ) : null;
  }

  const prev = queue[index - 1];
  const next = queue[index + 1];
  // Mẫu là các hồ sơ mới nhất; hồ sơ cũ hơn nằm ngoài mẫu đứng trước trong hàng chờ.
  const position = data.totalElements - queue.length + index + 1;
  return (
    <nav className="lr-queue flex items-center gap-1.5 flex-none" aria-label="Chuyển giữa các hồ sơ chờ thẩm định">
      <span className="lr-queue-pos mr-1 text-muted text-[13px] tabular-nums">
        Chờ thẩm định <b className="text-primary font-semibold">{position}</b>/{data.totalElements}
      </span>
      {prev ? (
        <Link
          className={`${QUEUE_BTN} hover:border-[#b9cbef] hover:text-brand`}
          to={reviewPath(prev.applicationNumber)}
          state={location.state}
          aria-label="Hồ sơ chờ trước (nộp sớm hơn)"
          title="Hồ sơ chờ trước (nộp sớm hơn)"
        >
          <Icon name="chevronLeft" />
        </Link>
      ) : (
        <span className={`${QUEUE_BTN} aria-disabled:opacity-40`} aria-disabled="true"><Icon name="chevronLeft" /></span>
      )}
      {next ? (
        <Link
          className={`${QUEUE_BTN} hover:border-[#b9cbef] hover:text-brand`}
          to={reviewPath(next.applicationNumber)}
          state={location.state}
          aria-label="Hồ sơ chờ sau (nộp muộn hơn)"
          title="Hồ sơ chờ sau (nộp muộn hơn)"
        >
          <Icon name="chevronRight" />
        </Link>
      ) : (
        <span className={`${QUEUE_BTN} aria-disabled:opacity-40`} aria-disabled="true"><Icon name="chevronRight" /></span>
      )}
    </nav>
  );
}
