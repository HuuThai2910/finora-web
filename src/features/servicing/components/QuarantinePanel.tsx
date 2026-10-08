import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import { useQuarantinedEventsQuery, useReplayQuarantineMutation } from '../api/servicingApi';
import { SERVICING_PAGE_SIZE, quarantineReasonLabel } from '../constant';
import { QueueBody } from './QueueBody';

interface Props {
  page: number;
  onPage: (page: number) => void;
  onDone: (message: string) => void;
}

/**
 * Sự kiện trả nợ đã vào hệ thống lõi nhưng chưa ghép được với khoản vay FINORA (backend chỉ trả các
 * sự kiện `PENDING`). "Chạy lại" xử lý lại đúng sự kiện đó; nút khóa trong lúc chạy để không gửi chồng.
 */
export function QuarantinePanel({ page, onPage, onDone }: Props) {
  const query = useQuarantinedEventsQuery({ page, size: SERVICING_PAGE_SIZE });
  const [replay, state] = useReplayQuarantineMutation();
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
      <p className="svc-note">
        Tiền trả nợ đã vào hệ thống lõi nhưng chưa ghép được với khoản vay trên FINORA. Kiểm tra liên kết hồ sơ rồi chạy lại.
      </p>
      {failed && (
        <div className="svc-pad">
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
                <th>Tình trạng</th>
                <th className="act"><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.data ?? []).map((item) => (
                <tr key={item.eventId}>
                  <td><span className="ui-mono">{item.repaymentId}</span></td>
                  <td>Hồ sơ #{item.loanApplicationId}</td>
                  <td>{quarantineReasonLabel(item.reasonCode)}</td>
                  <td className="num">{item.attemptCount}</td>
                  <td>{formatDateTime(item.receivedAt)}</td>
                  <td>
                    {item.status === 'PENDING'
                      ? <StatusPill tone="warning">Chờ ghép</StatusPill>
                      : <StatusPill tone="success">Đã ghép</StatusPill>}
                  </td>
                  <td className="act">
                    {item.status === 'PENDING' && (
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
