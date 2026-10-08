import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import { useReconcileLoanMutation, useReconciliationIncidentsQuery, useStaleLoansQuery } from '../api/servicingApi';
import { INCIDENT_LABEL, LOAN_STATUS_LABEL, SERVICING_PAGE_SIZE } from '../constant';
import { money } from '../formatters';
import { QueueBody } from './QueueBody';

interface Props {
  page: number;
  onPage: (page: number) => void;
  onDone: (message: string) => void;
}

/**
 * Đối soát: khoản vay có số liệu lưu lại đã cũ hơn lịch đồng bộ (backend chỉ trả các khoản `stale`),
 * và các sai lệch đang mở cần kỹ thuật kiểm tra. "Đối soát lại" chỉ đọc lại hệ thống lõi, lặp lại an
 * toàn; nút khóa trong lúc chạy để không gửi chồng.
 */
export function ReconciliationPanel({ page, onPage, onDone }: Props) {
  const stale = useStaleLoansQuery({ page, size: SERVICING_PAGE_SIZE });
  const [incidentPage, setIncidentPage] = useState(0);
  const incidents = useReconciliationIncidentsQuery({ page: incidentPage, size: SERVICING_PAGE_SIZE });
  const [reconcile, state] = useReconcileLoanMutation();
  const [running, setRunning] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ loanNumber: string; error: unknown } | null>(null);

  const run = async (loanNumber: string) => {
    if (running) return;
    setRunning(loanNumber);
    setFailed(null);
    try {
      const result = await reconcile(loanNumber).unwrap();
      onDone(result.stale
        ? `Đã đối soát ${loanNumber}, số liệu vẫn chưa khớp với hệ thống lõi.`
        : `Đã đối soát ${loanNumber}, số liệu khớp với hệ thống lõi.`);
    } catch (error) {
      setFailed({ loanNumber, error });
    } finally {
      setRunning(null);
    }
  };

  return (
    <>
      <p className="svc-note">Số liệu FINORA lưu lại từ hệ thống lõi đã cũ hơn lịch đồng bộ. Đối soát lại để lấy số mới nhất.</p>
      {failed && (
        <div className="svc-pad">
          <ErrorNotice error={failed.error} onRetry={() => run(failed.loanNumber)} />
        </div>
      )}
      <QueueBody
        error={stale.error}
        isLoading={stale.isLoading}
        isFetching={stale.isFetching}
        onRetry={stale.refetch}
        total={stale.data?.totalElements ?? 0}
        emptyText="Mọi khoản vay đã khớp với hệ thống lõi."
        page={page}
        unit="khoản vay"
        onPage={onPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Khoản vay</th>
                <th>Trạng thái khoản vay</th>
                <th className="num">Dư nợ</th>
                <th className="num">Quá hạn</th>
                <th>Đồng bộ lần cuối</th>
                <th>Tình trạng</th>
                <th className="act"><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(stale.data?.data ?? []).map((item) => (
                <tr key={item.loanNumber}>
                  <td><span className="ui-code">{item.loanNumber}</span><span className="ui-sub ui-mono">{item.applicationNumber}</span></td>
                  <td>{LOAN_STATUS_LABEL[item.loanStatus] ?? item.loanStatus}</td>
                  <td className="num">{money(item.totalOutstanding)}</td>
                  <td className={item.overdueAmount ? 'num' : 'num svc-muted'}>{money(item.overdueAmount)}</td>
                  <td>{formatDateTime(item.lastSyncedAt)}</td>
                  <td>{item.stale ? <StatusPill tone="warning">Cần đối soát</StatusPill> : <StatusPill tone="success">Đã khớp</StatusPill>}</td>
                  <td className="act">
                    <button
                      type="button"
                      className="ui-btn soft"
                      disabled={running != null || state.isLoading}
                      onClick={() => run(item.loanNumber)}
                    >
                      {running === item.loanNumber ? 'Đang đối soát...' : 'Đối soát lại'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueueBody>

      <div className="svc-subhead">
        <h2>Sai lệch đang mở</h2>
        {incidents.data && incidents.data.totalElements > 0 && (
          <span>{incidents.data.totalElements} sai lệch, cần kỹ thuật kiểm tra</span>
        )}
      </div>
      <QueueBody
        error={incidents.error}
        isLoading={incidents.isLoading}
        isFetching={incidents.isFetching}
        onRetry={incidents.refetch}
        total={incidents.data?.totalElements ?? 0}
        emptyText="Không có sai lệch đang mở."
        page={incidentPage}
        unit="sai lệch"
        onPage={setIncidentPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Khoản vay</th>
                <th>Loại sai lệch</th>
                <th>Theo FINORA</th>
                <th>Theo hệ thống lõi</th>
                <th className="num">Số lần phát hiện</th>
                <th>Phát hiện lần đầu</th>
              </tr>
            </thead>
            <tbody>
              {(incidents.data?.data ?? []).map((item) => (
                <tr key={item.incidentId}>
                  <td><span className="ui-code">{item.loanNumber}</span></td>
                  <td>{INCIDENT_LABEL[item.type] ?? item.type}</td>
                  <td className="svc-wrap">{item.expectedValue}</td>
                  <td className="svc-wrap">{item.actualValue}</td>
                  <td className="num">{item.occurrenceCount}</td>
                  <td>{formatDateTime(item.firstDetectedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueueBody>
    </>
  );
}
