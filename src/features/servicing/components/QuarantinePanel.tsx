import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { usePermission } from '@/features/auth';
import { ApplicationRef } from '@/features/loan';
import { formatDateTime } from '@/utils';
import { useQuarantinedEventsQuery, useReplayQuarantineMutation } from '../api/servicingApi';
import { SERVICING_PAGE_SIZE, quarantineReasonLabel } from '../constant';
import { SVC_ACT_CELL, SVC_ACT_HEAD, SVC_NOTE } from '../styles';
import { QueueBody } from './QueueBody';

interface Props {
  page: number;
  onPage: (page: number) => void;
  onDone: (message: string) => void;
}

/**
 * Sự kiện trả nợ đã vào hệ thống lõi nhưng chưa ghép được với khoản vay FINORA. Backend chỉ trả các sự kiện `PENDING`
 * nên bảng không có cột tình trạng (mọi dòng như nhau). "Chạy lại" xử lý lại đúng sự kiện đó; nút khóa trong lúc chạy
 * để không gửi chồng.
 */
export function QuarantinePanel({ page, onPage, onDone }: Props) {
  const query = useQuarantinedEventsQuery({ page, size: SERVICING_PAGE_SIZE });
  const [replay, state] = useReplayQuarantineMutation();
  const canReplay = usePermission().canAct('reconciliation');
  const [running, setRunning] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ eventId: string; error: unknown } | null>(null);

  const run = async (eventId: string) => {
    if (running) return;
    setRunning(eventId);
    setFailed(null);
    try {
      const result = await replay(eventId).unwrap();
      onDone(result.status === 'RESOLVED'
        ? `Đã ghép giao dịch ${result.repaymentId} vào khoản vay của hồ sơ #${result.loanApplicationId}.`
        : `Đã chạy lại giao dịch ${result.repaymentId}, vẫn chưa ghép được với khoản vay.`);
    } catch (error) {
      setFailed({ eventId, error });
    } finally {
      setRunning(null);
    }
  };

  return (
    <>
      <p className={SVC_NOTE}>
        Tiền trả nợ đã vào hệ thống lõi nhưng chưa ghép được với khoản vay trên FINORA. Kiểm tra liên kết hồ sơ rồi chạy lại.
      </p>
      {failed && (
        <div className="svc-pad px-0.5 pb-3">
          <ErrorNotice error={failed.error} onRetry={() => run(failed.eventId)} />
        </div>
      )}
      <QueueBody
        error={query.error}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRetry={query.refetch}
        total={query.data?.totalElements ?? 0}
        emptyText="Không có sự kiện trả nợ chờ ghép."
        page={page}
        unit="sự kiện"
        onPage={onPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Giao dịch trả nợ</th>
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
                  <td><span className="ui-mono">{item.repaymentId}</span></td>
                  <td><ApplicationRef id={item.loanApplicationId} applicationNumber={item.applicationNumber} /></td>
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
    </>
  );
}
