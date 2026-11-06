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

/**
 * Một mục của dòng thời gian: chấm tròn ở đầu (`::after`) nối với mục sau bằng vạch dọc (`::before`, mục cuối không
 * có). Thao tác do người thật thực hiện (lớp `human`) có chấm đặc màu xanh.
 */
const LOG_ITEM = 'relative pb-3.5 pl-5 last:pb-0 '
  + "before:absolute before:top-3.5 before:bottom-0 before:left-1 before:w-px before:bg-line before:content-[''] last:before:hidden "
  + "after:absolute after:top-1.25 after:left-0 after:size-2.25 after:rounded-[50%] after:border-2 after:border-line-strong after:bg-white after:content-[''] "
  + '[&.human]:after:border-brand [&.human]:after:bg-brand';

/** Người ghi nhận: tra tên theo mã; mã do hệ thống tự ghi thì hiện nguyên mã. */
function Actor({ actorId }: { actorId: string }) {
  return <span className="who mt-0.5 block text-[12px] text-muted">{useUserLabel(actorId, actorId)}</span>;
}

/** Dòng thời gian xử lý của một hồ sơ, mới nhất trước (thứ tự backend trả về). */
export function CollectionHistory({ actions, total, isLoading, error, onRetry }: Props) {
  if (error) return <ErrorNotice error={error} onRetry={onRetry} />;
  if (isLoading || !actions) return <p className="svc-muted text-muted" aria-busy="true">Đang tải lịch sử...</p>;
  if (actions.length === 0) return <p className="svc-muted text-muted">Chưa có ghi nhận nào.</p>;

  return (
    <>
      <ol className="svc-log grid">
        {actions.map((action) => (
          <li key={action.actionId} className={HUMAN_ACTIONS.has(action.actionType) ? `human ${LOG_ITEM}` : LOG_ITEM}>
            <div className="svc-log-top flex items-baseline justify-between gap-2 text-[13px]">
              <b className="font-medium">{ACTION_LABEL[action.actionType] ?? action.actionType}</b>
              <time className="flex-none text-[12px] text-muted tabular-nums" dateTime={action.createdAt}>
                {formatDateTime(action.createdAt)}
              </time>
            </div>
            {action.note && <p className="mt-0.5 text-[13px] text-secondary">{action.note}</p>}
            {action.promiseDate && (
              <span className="promise mt-1 inline-block rounded-sm bg-fill px-2 py-0.5 text-[12px] text-primary tabular-nums">
                Hẹn {formatDate(action.promiseDate)}, {money(action.promiseAmount)}
              </span>
            )}
            <Actor actorId={action.actorId} />
          </li>
        ))}
      </ol>
      {total > actions.length && (
        <p className="svc-muted text-muted">Hiển thị {actions.length} ghi nhận gần nhất trong {total}.</p>
      )}
    </>
  );
}
