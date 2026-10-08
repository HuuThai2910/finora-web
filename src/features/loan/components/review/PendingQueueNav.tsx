import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useGetAdminApplicationsQuery } from '../../api/loanReviewApi';
import { PENDING_SAMPLE_SIZE } from '../../hooks/usePendingReviewSummary';

const reviewPath = (applicationNumber: string) => `/loans/${encodeURIComponent(applicationNumber)}/review`;

/**
 * Lối chuyển giữa các hồ sơ chờ thẩm định, cùng thứ tự với danh sách (mới nhất trước), để thẩm định
 * liền một mạch.
 *
 * Dùng chung lời gọi tối đa {@link PENDING_SAMPLE_SIZE} hồ sơ chờ với thẻ tóm tắt ở trang danh sách
 * (cùng tham số nên trúng cache). Hồ sơ nằm ngoài mẫu đó thì không đoán vị trí, chỉ ẩn bộ chuyển.
 */
export function PendingQueueNav({ applicationNumber }: { applicationNumber: string }) {
  const { data } = useGetAdminApplicationsQuery({ status: 'PENDING_REVIEW', page: 0, size: PENDING_SAMPLE_SIZE });
  if (!data) return null;

  const queue = data.data.map((item) => item.applicationNumber);
  const index = queue.indexOf(applicationNumber);

  if (index === -1) {
    // Hồ sơ vừa được quyết định rời khỏi hàng chờ: mời mở hồ sơ chờ kế tiếp.
    return queue.length > 0 ? (
      <Link className="ui-btn ghost" to={reviewPath(queue[0])}>
        Hồ sơ chờ tiếp theo
        <Icon name="chevronRight" />
      </Link>
    ) : null;
  }

  const prev = queue[index - 1];
  const next = queue[index + 1];
  return (
    <nav className="lr-queue" aria-label="Chuyển giữa các hồ sơ chờ thẩm định">
      <span className="lr-queue-pos">Chờ thẩm định <b>{index + 1}</b>/{data.totalElements}</span>
      {prev ? (
        <Link className="lr-queue-btn" to={reviewPath(prev)} aria-label="Hồ sơ chờ trước" title="Hồ sơ chờ trước"><Icon name="chevronLeft" /></Link>
      ) : (
        <span className="lr-queue-btn" aria-disabled="true"><Icon name="chevronLeft" /></span>
      )}
      {next ? (
        <Link className="lr-queue-btn" to={reviewPath(next)} aria-label="Hồ sơ chờ sau" title="Hồ sơ chờ sau"><Icon name="chevronRight" /></Link>
      ) : (
        <span className="lr-queue-btn" aria-disabled="true"><Icon name="chevronRight" /></span>
      )}
    </nav>
  );
}
