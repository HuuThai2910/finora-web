import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useGetEkycAttemptsQuery } from '../api/ekycReviewQueries';
import { PENDING_ATTEMPT_LOOKUP_SIZE, ekycReviewDetailPath } from '../constants';

const QUEUE_BTN =
  'ekr-queue-btn grid place-items-center size-8 border border-line-strong rounded-md bg-white text-primary [&_svg]:size-4';

/**
 * Chuyển giữa các lượt chờ duyệt tay theo đúng thứ tự hàng chờ (gửi sớm nhất trước, như backend xếp), để duyệt liền
 * một mạch. Dùng chung lời gọi {@link PENDING_ATTEMPT_LOOKUP_SIZE} lượt với trang Khách hàng (cùng tham số nên trúng
 * cache). Lượt nằm ngoài trang đó thì không đoán vị trí, chỉ ẩn bộ chuyển. Link giữ `state` của trang để nút quay lại
 * vẫn về đúng danh sách đã mở.
 */
export function PendingAttemptNav({ attemptId }: { attemptId: string }) {
  const location = useLocation();
  const { data } = useGetEkycAttemptsQuery({ status: 'MANUAL_REVIEW', page: 0, size: PENDING_ATTEMPT_LOOKUP_SIZE });
  if (!data) return null;

  const queue = data.content.map((item) => item.attemptId);
  const index = queue.indexOf(attemptId);

  if (index === -1) {
    // Lượt vừa được quyết định rời khỏi hàng chờ: mời mở lượt chờ kế tiếp.
    return queue.length > 0 ? (
      <Link className="ui-btn ghost ekr-queue-next" to={ekycReviewDetailPath(queue[0])} state={location.state}>
        Lượt chờ tiếp theo
        <Icon name="chevronRight" />
      </Link>
    ) : null;
  }

  const prev = queue[index - 1];
  const next = queue[index + 1];
  return (
    <nav className="ekr-queue flex items-center gap-1.5 flex-none" aria-label="Chuyển giữa các lượt chờ duyệt tay">
      <span className="ekr-queue-pos mr-1 text-muted text-[13px] tabular-nums">
        Chờ duyệt <b className="text-primary font-semibold">{index + 1}</b>/{data.totalElements}
      </span>
      {prev ? (
        <Link className={`${QUEUE_BTN} hover:border-[#b9cbef] hover:text-brand`} to={ekycReviewDetailPath(prev)} state={location.state} aria-label="Lượt chờ trước" title="Lượt chờ trước"><Icon name="chevronLeft" /></Link>
      ) : (
        <span className={`${QUEUE_BTN} aria-disabled:opacity-40`} aria-disabled="true"><Icon name="chevronLeft" /></span>
      )}
      {next ? (
        <Link className={`${QUEUE_BTN} hover:border-[#b9cbef] hover:text-brand`} to={ekycReviewDetailPath(next)} state={location.state} aria-label="Lượt chờ sau" title="Lượt chờ sau"><Icon name="chevronRight" /></Link>
      ) : (
        <span className={`${QUEUE_BTN} aria-disabled:opacity-40`} aria-disabled="true"><Icon name="chevronRight" /></span>
      )}
    </nav>
  );
}
