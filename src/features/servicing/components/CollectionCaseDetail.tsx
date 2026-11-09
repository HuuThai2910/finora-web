import type { ReactNode } from 'react';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { formatDate, formatDateTime } from '@/utils';
import { useCollectionActionsQuery } from '../api/servicingApi';
import { ACTION_HISTORY_SIZE, stageInfo } from '../constant';
import { money, todayIso } from '../formatters';
import { useUserRecord } from '../hooks/useUserLabel';
import type { CollectionAction, CollectionCase } from '../types';
import { CollectionActionForm } from './CollectionActionForm';
import { CollectionHistory } from './CollectionHistory';

interface Props {
  item: CollectionCase;
  onRecorded: (message: string) => void;
}

/** Lời hẹn trả gần nhất trong lịch sử đã tải (backend trả mới nhất trước). */
function latestPromise(actions: CollectionAction[] | undefined) {
  return actions?.find((action) => action.actionType === 'PROMISE_TO_PAY' && action.promiseDate) ?? null;
}

const CONTACT_LINK = 'ui-link tabular-nums';

const SECTION_TITLE = 'mb-2 text-[13px] font-semibold text-secondary';

/**
 * Hồ sơ thu hồi đang mở của khoản vay, nằm thẳng trong tab "Sau giải ngân": mức quá hạn, liên hệ người vay, ghi nhận
 * mới (gồm ba loại leo thang) và lịch sử xử lý. Ghi nhận xong thì cache lịch sử của đúng hồ sơ được làm mới
 * (tag `ACTIONS-<caseId>`).
 *
 * Số điện thoại, email đọc từ bản ghi người dùng nên chỉ có khi tài khoản có quyền Xem "Khách hàng"; ghi nhận cần quyền
 * Thao tác "Thu hồi nợ", chỉ có quyền Xem thì chỉ đọc lịch sử.
 */
export function CollectionCaseDetail({ item, onRecorded }: Props) {
  const { label: borrower, user } = useUserRecord(item.borrowerId, `Người vay #${item.borrowerId}`);
  const canRecord = usePermission().canAct('collection');
  const history = useCollectionActionsQuery({ caseId: item.caseId, page: 0, size: ACTION_HISTORY_SIZE });
  const stage = stageInfo(item.stage);
  const promise = latestPromise(history.data?.data);
  // So ngày dạng yyyy-MM-dd: chỉ để nhắc ngày hẹn đã qua, không kết luận người vay đã trả hay chưa.
  const promisePassed = promise?.promiseDate != null && promise.promiseDate < todayIso();
  const contact: Array<[string, ReactNode]> = user
    ? [
      ['Điện thoại', user.phone
        ? <a className={CONTACT_LINK} href={`tel:${user.phone.replace(/\s+/g, '')}`}>{user.phone}</a>
        : <span className="font-normal text-muted">Chưa có</span>],
      ['Email', <a className={`${CONTACT_LINK} break-all`} href={`mailto:${user.email}`}>{user.email}</a>],
    ]
    : [];
  const facts: Array<[string, ReactNode]> = [
    ['Số ngày quá hạn', `${item.daysPastDue} ngày`],
    ['Quá hạn từ', formatDate(item.overdueSince)],
    ['Tiền quá hạn', money(item.overdueAmount)],
    ['Tổng dư nợ', money(item.totalOutstanding)],
    ['Mở hồ sơ thu hồi', formatDate(item.openedAt)],
    ['Cập nhật số liệu', formatDateTime(item.lastObservedAt)],
    ...contact,
  ];

  return (
    <div className="svc-case grid gap-4">
      <div>
        <div className="svc-badges flex flex-wrap gap-1.5">
          <StatusPill tone={stage.tone}>{stage.label}</StatusPill>
          <span className="ui-tag">Nhóm nợ {item.debtGroup}</span>
        </div>
        {promise && (
          <p
            className={`${promisePassed ? 'svc-callout danger' : 'svc-callout'} mt-2.5 rounded-md bg-brand-50 px-2.5 py-2 text-[13px] `
              + 'text-brand [&.danger]:bg-danger-bg [&.danger]:text-danger'}
          >
            Người vay hẹn trả {money(promise.promiseAmount)} ngày {formatDate(promise.promiseDate)}
            {promisePassed ? ', đã qua ngày hẹn.' : '.'}
          </p>
        )}
        <dl className="ui-rows svc-rows mt-1.5 grid grid-cols-2 gap-x-6 max-[700px]:grid-cols-1">
          {facts.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      </div>

      {/* Hai cột khi đủ rộng: ghi nhận mới bên trái, lịch sử bên phải; màn hẹp xếp dọc. */}
      <div className={canRecord ? 'grid grid-cols-2 gap-5 max-[900px]:grid-cols-1' : 'grid'}>
        {canRecord && (
          <section aria-labelledby={`svc-form-${item.caseId}`}>
            <h3 id={`svc-form-${item.caseId}`} className={SECTION_TITLE}>Ghi nhận mới</h3>
            <CollectionActionForm item={item} borrower={borrower} onRecorded={onRecorded} />
          </section>
        )}
        <section aria-labelledby={`svc-log-${item.caseId}`}>
          <h3 id={`svc-log-${item.caseId}`} className={SECTION_TITLE}>Lịch sử xử lý</h3>
          <CollectionHistory
            actions={history.data?.data}
            total={history.data?.totalElements ?? 0}
            isLoading={history.isLoading}
            error={history.error}
            onRetry={history.refetch}
          />
        </section>
      </div>
    </div>
  );
}
