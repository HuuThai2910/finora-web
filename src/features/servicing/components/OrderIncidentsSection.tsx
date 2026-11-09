import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { toast } from '@/lib/toast';
import { formatDateTime } from '@/utils';
import { useOrderIncidentsQuery, useRetryOrderIncidentMutation } from '../api/investmentIncidentApi';
import { SERVICING_PAGE_SIZE } from '../constant';
import { money } from '../formatters';
import { SVC_ACT_CELL, SVC_ACT_HEAD } from '../styles';
import type { OrderIncident } from '../types';
import { ErrorCell } from './ErrorCell';
import { QueueBody } from './QueueBody';
import { ServicingCard } from './ServicingCard';
import { UserName } from './UserName';

interface Props {
  /** Không có lệnh nào cần xử lý thì không vẽ gì (trang danh sách gọi vốn), thay cho dòng "Không có". */
  hideWhenEmpty?: boolean;
}

function OrderIncidentIssue({ item }: { item: OrderIncident }) {
  if (item.issue === 'RELEASE_BLOCKED') return <StatusPill tone="danger">Dừng nhả tiền giữ</StatusPill>;
  if (item.issue === 'RELEASE_RETRYING') return <StatusPill tone="warning">Đang thử nhả tiền giữ</StatusPill>;
  return <StatusPill tone="info">Chưa rõ đã giữ tiền</StatusPill>;
}

/** Khoản gọi vốn của lệnh: liên kết sang trang chi tiết khi tài khoản xem được, nếu không thì chỉ là chữ. */
function ListingRef({ listingId }: { listingId: number }) {
  const label = `Khoản gọi vốn #${listingId}`;
  if (!usePermission().canView('funding')) return <>{label}</>;
  return <Link className="ui-link" to={`/investments/funding/${listingId}`}>{label}</Link>;
}

/**
 * Lệnh góp vốn chưa khớp với ví (Investment, R3): tiền giữ của nhà đầu tư chưa xử lý xong. Nằm ở trang danh sách Gọi vốn
 * & Notes vì lệnh lỗi thuộc nhiều khoản gọi vốn khác nhau, có khi khoản đã đóng: vận hành cần thấy ngay từ danh sách
 * thay vì mở từng khoản. "Thử lại" hẹn worker làm tiếp ngay sau khi đã xử lý nguyên nhân; một lệnh một lúc. Xem cần
 * quyền Xem "Đối soát & sự cố", thử lại cần quyền Thao tác như trước.
 */
export function OrderIncidentsSection({ hideWhenEmpty = false }: Props) {
  const canFix = usePermission().canAct('reconciliation');
  const [page, setPage] = useState(0);
  const orders = useOrderIncidentsQuery({ page, size: SERVICING_PAGE_SIZE });
  const [retry] = useRetryOrderIncidentMutation();
  const [running, setRunning] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ item: OrderIncident; error: unknown } | null>(null);
  const total = orders.data?.totalElements ?? 0;

  const run = async (item: OrderIncident) => {
    if (running) return;
    setRunning(item.orderReference);
    setFailed(null);
    try {
      await retry(item.orderReference).unwrap();
      toast.success('Đã hẹn thử lại lệnh góp vốn; kết quả cập nhật sau lượt xử lý kế tiếp của hệ thống.');
    } catch (error) {
      setFailed({ item, error });
    } finally {
      setRunning(null);
    }
  };

  if (hideWhenEmpty && !orders.error && !failed && total === 0) return null;

  return (
    <ServicingCard title="Lệnh góp vốn chưa khớp với ví" aside={total > 0 ? `${total} lệnh, tiền giữ của nhà đầu tư chưa xử lý xong` : undefined}>
      {failed && <div className="mb-2"><ErrorNotice error={failed.error} onRetry={() => run(failed.item)} /></div>}
      <QueueBody
        error={orders.error}
        isLoading={orders.isLoading}
        isFetching={orders.isFetching}
        onRetry={orders.refetch}
        total={total}
        emptyText="Không có lệnh góp vốn cần xử lý."
        compactEmpty
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
                    <ListingRef listingId={item.listingId} />
                    <span className="ui-sub">Đặt lúc {formatDateTime(item.createdAt)}</span>
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
                      <button type="button" className="ui-btn soft" disabled={running != null} onClick={() => run(item)}>
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
    </ServicingCard>
  );
}
