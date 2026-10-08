import { ErrorNotice } from '@/components/ErrorNotice';
import { formatDate, formatDateTime } from '@/utils';
import { ACTION_LABEL, HUMAN_ACTIONS } from '../constant';
import { money } from '../formatters';
import { useUserLabel } from '../hooks/useUserLabel';
import type { CollectionAction } from '../types';

interface Props {
  actions: CollectionAction[] | undefined;
  total: number;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** Người ghi nhận: tra tên theo mã; mã do hệ thống tự ghi thì hiện nguyên mã. */
function Actor({ actorId }: { actorId: string }) {
  return <span className="who">{useUserLabel(actorId, actorId)}</span>;
}

/** Dòng thời gian xử lý của một hồ sơ, mới nhất trước (thứ tự backend trả về). */
export function CollectionHistory({ actions, total, isLoading, error, onRetry }: Props) {
  if (error) return <ErrorNotice error={error} onRetry={onRetry} />;
  if (isLoading || !actions) return <p className="svc-muted" aria-busy="true">Đang tải lịch sử...</p>;
  if (actions.length === 0) return <p className="svc-muted">Chưa có ghi nhận nào.</p>;

  return (
    <>
      <ol className="svc-log">
        {actions.map((action) => (
          <li key={action.actionId} className={HUMAN_ACTIONS.has(action.actionType) ? 'human' : undefined}>
            <div className="svc-log-top">
              <b>{ACTION_LABEL[action.actionType] ?? action.actionType}</b>
              <time dateTime={action.createdAt}>{formatDateTime(action.createdAt)}</time>
            </div>
            {action.note && <p>{action.note}</p>}
            {action.promiseDate && (
              <span className="promise">Hẹn {formatDate(action.promiseDate)}, {money(action.promiseAmount)}</span>
            )}
            <Actor actorId={action.actorId} />
          </li>
        ))}
      </ol>
      {total > actions.length && (
        <p className="svc-muted">Hiển thị {actions.length} ghi nhận gần nhất trong {total}.</p>
      )}
    </>
  );
}
