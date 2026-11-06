import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { formatDateTime } from '@/utils';
import { useOrderIncidentsQuery } from '../api/investmentIncidentApi';
import { SERVICING_PAGE_SIZE } from '../constant';
import { money } from '../formatters';
import { SVC_ACT_CELL, SVC_ACT_HEAD, SVC_SUBHEAD } from '../styles';
import type { OrderIncident } from '../types';
import { ErrorCell } from './ErrorCell';
import { QueueBody } from './QueueBody';
import { UserName } from './UserName';

interface Props {
  /** Mã của thao tác đang chạy trên cả tab; một thao tác một lúc để không gửi chồng. */
  running: string | null;
  /** Có quyền Thao tác "Đối soát & sự cố". */
  canFix: boolean;
  onRetry: (item: OrderIncident) => void;
}

function OrderIncidentIssue({ item }: { item: OrderIncident }) {
  if (item.issue === 'RELEASE_BLOCKED') return <StatusPill tone="danger">Dừng nhả tiền giữ</StatusPill>;
  if (item.issue === 'RELEASE_RETRYING') return <StatusPill tone="warning">Đang thử nhả tiền giữ</StatusPill>;
  return <StatusPill tone="info">Chưa rõ đã giữ tiền</StatusPill>;
}

/** Khoản gọi vốn của lệnh: liên kết sang trang gọi vốn khi tài khoản xem được, nếu không thì chỉ là chữ. */
function ListingRef({ listingId }: { listingId: number }) {
  const label = `Gọi vốn #${listingId}`;
  if (!usePermission().canView('funding')) return <>{label}</>;
  return <Link className="ui-link" to={`/investments/funding/${listingId}`}>{label}</Link>;
}

/**
 * Lệnh góp vốn chưa khớp với ví (Investment, R3): tiền giữ của nhà đầu tư chưa xử lý xong. "Thử lại" hẹn worker làm
 * tiếp ngay sau khi vận hành đã xử lý nguyên nhân. Hàng đợi tự giữ trang của mình; thao tác đi qua `onRetry` để cả tab
 * chỉ chạy một việc một lúc. Nhà đầu tư hiện bằng tên (tra theo mã người dùng) thay cho mã thô.
 */
export function OrderIncidentsSection({ running, canFix, onRetry }: Props) {
  const [page, setPage] = useState(0);
  const orders = useOrderIncidentsQuery({ page, size: SERVICING_PAGE_SIZE });

  return (
    <>
      <div className={SVC_SUBHEAD}>
        <h2>Lệnh góp vốn chưa khớp với ví</h2>
        {orders.data && orders.data.totalElements > 0 && <span>Tiền giữ của nhà đầu tư chưa xử lý xong</span>}
      </div>
      <QueueBody
        error={orders.error}
        isLoading={orders.isLoading}
        isFetching={orders.isFetching}
        onRetry={orders.refetch}
        total={orders.data?.totalElements ?? 0}
        emptyText="Không có lệnh góp vốn cần xử lý."
        page={page}
        unit="lệnh"
        onPage={setPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Lệnh góp vốn</th>
                <th>Nhà đầu tư</th>
                <th className="num">Số tiền</th>
                <th>Lỗi gần nhất</th>
                <th className="num">Lần thử</th>
                <th>Tình trạng</th>
                <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(orders.data?.content ?? []).map((item) => (
                <tr key={item.orderReference}>
                  <td>
                    <span className="ui-mono">{item.orderReference}</span>
                    <span className="ui-sub"><ListingRef listingId={item.listingId} /></span>
                  </td>
                  <td><UserName userId={item.investorId} fallback={`Nhà đầu tư #${item.investorId}`} /></td>
                  <td className="num">{money(item.amount)}</td>
                  <ErrorCell code={item.releaseErrorCode ?? item.rejectedReasonCode} detail={null} />
                  <td className="num">{item.issue === 'HOLD_PENDING' ? item.pendingAttemptCount : item.releaseAttemptCount}</td>
                  <td>
                    <OrderIncidentIssue item={item} />
                    {(item.releaseNextAttemptAt ?? item.pendingNextAttemptAt) && item.issue !== 'RELEASE_BLOCKED' && (
                      <span className="ui-sub">Lượt sau {formatDateTime(item.releaseNextAttemptAt ?? item.pendingNextAttemptAt)}</span>
                    )}
                  </td>
                  <td className={SVC_ACT_CELL}>
                    {canFix && (
                      <button type="button" className="ui-btn soft" disabled={running != null} onClick={() => onRetry(item)}>
                        {running === item.orderReference ? 'Đang gửi...' : 'Thử lại'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueueBody>
    </>
  );
}
