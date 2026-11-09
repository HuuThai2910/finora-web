import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { usePermission } from '@/features/auth';
import { ApplicationRef } from '@/features/loan';
import { toast } from '@/lib/toast';
import { formatDateTime } from '@/utils';
import { useQuarantinedEventsQuery, useReplayQuarantineMutation } from '../api/servicingApi';
import { SERVICING_PAGE_SIZE, quarantineReasonLabel } from '../constant';
import { SVC_ACT_CELL, SVC_ACT_HEAD } from '../styles';
import { QueueBody } from './QueueBody';
import { ServicingCard } from './ServicingCard';

/**
 * Sự kiện trả nợ đã vào hệ thống lõi nhưng chưa ghép được với khoản vay FINORA (chưa gắn được hồ sơ nào, nên nằm ở trang
 * Sự cố hệ thống). Backend chỉ trả các sự kiện `PENDING` nên bảng không có cột tình trạng. "Chạy lại" xử lý lại đúng sự
 * kiện đó, cần quyền Thao tác "Đối soát & sự cố"; nút khóa trong lúc chạy để không gửi chồng.
 */
export function QuarantinePanel() {
  const [page, setPage] = useState(0);
  const query = useQuarantinedEventsQuery({ page, size: SERVICING_PAGE_SIZE });
  const [replay, state] = useReplayQuarantineMutation();
  const canReplay = usePermission().canAct('reconciliation');
  const [running, setRunning] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ eventId: string; error: unknown } | null>(null);
  const total = query.data?.totalElements ?? 0;

  const run = async (eventId: string) => {
    if (running) return;
    setRunning(eventId);
    setFailed(null);
    try {
      const result = await replay(eventId).unwrap();
      toast.success(result.status === 'RESOLVED'
        ? 'Đã ghép giao dịch trả nợ vào khoản vay.'
        : 'Đã chạy lại, giao dịch trả nợ vẫn chưa ghép được với khoản vay.');
    } catch (error) {
      setFailed({ eventId, error });
    } finally {
      setRunning(null);
    }
  };

  return (
    <ServicingCard
      title="Sự kiện trả nợ chờ ghép"
      aside={total > 0 ? 'Tiền đã vào hệ thống lõi, chưa ghép được với khoản vay' : undefined}
    >
      {failed && <div className="mb-2"><ErrorNotice error={failed.error} onRetry={() => run(failed.eventId)} /></div>}
      <QueueBody
        error={query.error}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRetry={query.refetch}
        total={total}
        emptyText="Không có sự kiện trả nợ chờ ghép."
        compactEmpty
        page={page}
        unit="sự kiện"
        onPage={setPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Hồ sơ vay</th>
                <th>Lý do</th>
                <th className="num">Số lần thử</th>
                <th>Nhận lúc</th>
                <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.data ?? []).map((item) => (
                <tr key={item.eventId}>
                  <td><ApplicationRef id={item.loanApplicationId} applicationNumber={item.applicationNumber} applicationCode={item.applicationCode} /></td>
                  <td>{quarantineReasonLabel(item.reasonCode)}</td>
                  <td className="num">{item.attemptCount}</td>
                  <td>{formatDateTime(item.receivedAt)}</td>
                  <td className={SVC_ACT_CELL}>
                    {item.status === 'PENDING' && canReplay && (
                      <button
                        type="button"
                        className="ui-btn soft"
                        disabled={running != null || state.isLoading}
                        onClick={() => run(item.eventId)}
                      >
                        {running === item.eventId ? 'Đang chạy...' : 'Chạy lại'}
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
