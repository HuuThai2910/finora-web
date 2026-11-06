import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from '@/components/Drawer';
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
  onClose: () => void;
  onRecorded: (message: string) => void;
}

/** Lời hẹn trả gần nhất trong lịch sử đã tải (backend trả mới nhất trước). */
function latestPromise(actions: CollectionAction[] | undefined) {
  return actions?.find((action) => action.actionType === 'PROMISE_TO_PAY' && action.promiseDate) ?? null;
}

const CONTACT_LINK = 'ui-link tabular-nums';

/**
 * Ngăn chi tiết một hồ sơ thu hồi: liên hệ người vay, số liệu quá hạn, ghi nhận mới và lịch sử xử lý. Ghi nhận xong
 * thì cache lịch sử của đúng hồ sơ được làm mới (tag `ACTIONS-<caseId>`).
 *
 * Số điện thoại, email và liên kết sang trang khách hàng đọc từ bản ghi người dùng (cùng lời gọi lấy tên), nên chỉ có
 * khi tài khoản có quyền Xem "Khách hàng"; không có quyền thì ẩn hẳn phần liên hệ.
 */
export function CollectionCaseDrawer({ item, onClose, onRecorded }: Props) {
  const { label: borrower, user, canLookup } = useUserRecord(item.borrowerId, `Người vay #${item.borrowerId}`);
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
    ...contact,
    ['Số ngày quá hạn', `${item.daysPastDue} ngày`],
    ['Quá hạn từ', formatDate(item.overdueSince)],
    ['Tiền quá hạn', money(item.overdueAmount)],
    ['Tổng dư nợ', money(item.totalOutstanding)],
    ['Mở hồ sơ thu hồi', formatDate(item.openedAt)],
    ['Cập nhật số liệu', formatDateTime(item.lastObservedAt)],
  ];

  return (
    <Drawer
      wide={false}
      title={(
        <h2>
          {canLookup ? (
            <Link
              className="svc-dr-name text-primary underline decoration-line-strong decoration-dotted underline-offset-4 hover:text-brand hover:decoration-solid"
              to={`/customers/kyc/${item.borrowerId}`}
              title="Mở hồ sơ khách hàng"
            >
              {borrower}
            </Link>
          ) : borrower}
        </h2>
      )}
      subtitle={<span className="ui-mono">{item.loanNumber}</span>}
      onClose={onClose}
    >
      {/* Drawer dùng chung chưa nhận className: lớp svc-dr-panel giữ làm mốc cho kịch bản kiểm thử cũ
          (`.svc-dr-panel .svc-log`) đặt trên lớp bọc `contents`, không tạo hộp nên bố cục lưới của ngăn không đổi. */}
      <div className="svc-dr-panel contents">
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
          <dl className="ui-rows svc-rows mt-1.5">
            {facts.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </div>

        {/* Ghi nhận thu hồi cần quyền Thao tác "Thu hồi nợ"; chỉ có quyền Xem thì chỉ xem lịch sử. */}
        {canRecord && (
          <section aria-labelledby="svc-form-title">
            <h3 id="svc-form-title">Ghi nhận mới</h3>
            <CollectionActionForm item={item} borrower={borrower} onRecorded={onRecorded} />
          </section>
        )}

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
      </div>
    </Drawer>
  );
}
