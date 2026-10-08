import { StatusPill } from '@/components/StatusPill';
import { formatDate, formatDateTime } from '@/utils';
import { useCollectionActionsQuery } from '../api/servicingApi';
import { ACTION_HISTORY_SIZE, stageInfo } from '../constant';
import { money, todayIso } from '../formatters';
import { useUserLabel } from '../hooks/useUserLabel';
import type { CollectionAction, CollectionCase } from '../types';
import { CollectionActionForm } from './CollectionActionForm';
import { CollectionHistory } from './CollectionHistory';
import { SideDrawer } from './SideDrawer';

interface Props {
  item: CollectionCase;
  onClose: () => void;
  onRecorded: (message: string) => void;
}

/** Lời hẹn trả gần nhất trong lịch sử đã tải (backend trả mới nhất trước). */
function latestPromise(actions: CollectionAction[] | undefined) {
  return actions?.find((action) => action.actionType === 'PROMISE_TO_PAY' && action.promiseDate) ?? null;
}

/**
 * Ngăn chi tiết một hồ sơ thu hồi: số liệu quá hạn, ghi nhận mới và lịch sử xử lý. Ghi nhận xong
 * thì cache lịch sử của đúng hồ sơ được làm mới (tag `ACTIONS-<caseId>`).
 */
export function CollectionCaseDrawer({ item, onClose, onRecorded }: Props) {
  const borrower = useUserLabel(item.borrowerId, `Người vay #${item.borrowerId}`);
  const history = useCollectionActionsQuery({ caseId: item.caseId, page: 0, size: ACTION_HISTORY_SIZE });
  const stage = stageInfo(item.stage);
  const promise = latestPromise(history.data?.data);
  // So ngày dạng yyyy-MM-dd: chỉ để nhắc ngày hẹn đã qua, không kết luận người vay đã trả hay chưa.
  const promisePassed = promise?.promiseDate != null && promise.promiseDate < todayIso();
  const facts: Array<[string, string]> = [
    ['Số ngày quá hạn', `${item.daysPastDue} ngày`],
    ['Quá hạn từ', formatDate(item.overdueSince)],
    ['Tiền quá hạn', money(item.overdueAmount)],
    ['Tổng dư nợ', money(item.totalOutstanding)],
    ['Mở hồ sơ thu hồi', formatDate(item.openedAt)],
    ['Cập nhật số liệu', formatDateTime(item.lastObservedAt)],
  ];

  return (
    <SideDrawer
      wide={false}
      title={<h2>{borrower}</h2>}
      subtitle={<span className="ui-mono">{item.loanNumber}</span>}
      onClose={onClose}
    >
      <div>
        <div className="svc-badges">
          <StatusPill tone={stage.tone}>{stage.label}</StatusPill>
          <span className="ui-tag">Nhóm nợ {item.debtGroup}</span>
        </div>
        {promise && (
          <p className={promisePassed ? 'svc-callout danger' : 'svc-callout'}>
            Người vay hẹn trả {money(promise.promiseAmount)} ngày {formatDate(promise.promiseDate)}
            {promisePassed ? ', đã qua ngày hẹn.' : '.'}
          </p>
        )}
        <dl className="ui-rows svc-rows">
          {facts.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      </div>

      <section aria-labelledby="svc-form-title">
        <h3 id="svc-form-title">Ghi nhận mới</h3>
        <CollectionActionForm item={item} borrower={borrower} onRecorded={onRecorded} />
      </section>

      <section aria-labelledby="svc-log-title">
        <h3 id="svc-log-title">Lịch sử xử lý</h3>
        <CollectionHistory
          actions={history.data?.data}
          total={history.data?.totalElements ?? 0}
          isLoading={history.isLoading}
          error={history.error}
          onRetry={history.refetch}
        />
      </section>
    </SideDrawer>
  );
}
