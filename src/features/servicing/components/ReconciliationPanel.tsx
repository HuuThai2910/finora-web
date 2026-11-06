import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { usePermission } from '@/features/auth';
import { fromListState } from '@/lib/navigation';
import { formatDateTime } from '@/utils';
import { useReconcileLoanMutation, useReconciliationIncidentsQuery, useStaleLoansQuery } from '../api/servicingApi';
import { INCIDENT_LABEL, LOAN_STATUS_LABEL, SERVICING_PAGE_SIZE } from '../constant';
import { money } from '../formatters';
import { SVC_ACT_CELL, SVC_ACT_HEAD, SVC_NOTE, SVC_SUBHEAD, SVC_WRAP_CELL } from '../styles';
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
  const { canAct, canView } = usePermission();
  const canReconcile = canAct('reconciliation');
  // Mã hồ sơ mở trang thẩm định khi tài khoản xem được hồ sơ vay; quay lại thì về đúng tab đối soát đang xem.
  const canOpenApplication = canView('loan-application');
  const location = useLocation();
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
      <p className={SVC_NOTE}>Số liệu FINORA lưu lại từ hệ thống lõi đã cũ hơn lịch đồng bộ. Đối soát lại để lấy số mới nhất.</p>
      {failed && (
        <div className="svc-pad px-0.5 pb-3">
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
                <th>Trạng thái</th>
                <th className="num">Dư nợ</th>
                <th className="num">Quá hạn</th>
                <th>Đồng bộ lần cuối</th>
                <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(stale.data?.data ?? []).map((item) => (
                <tr key={item.loanNumber}>
                  <td>
                    <span className="ui-code">{item.loanNumber}</span>
                    <span className="ui-sub">
                      {canOpenApplication ? (
                        <Link
                          className="ui-link"
                          to={`/loans/${item.applicationNumber}/review`}
                          state={fromListState(location)}
                          aria-label={`Mở hồ sơ vay ${item.applicationNumber}`}
                        >
                          {item.applicationNumber}
                        </Link>
                      ) : item.applicationNumber}
                    </span>
                  </td>
                  <td>{LOAN_STATUS_LABEL[item.loanStatus] ?? item.loanStatus}</td>
                  <td className="num">{money(item.totalOutstanding)}</td>
                  <td className={item.overdueAmount ? 'num' : 'num svc-muted text-muted'}>{money(item.overdueAmount)}</td>
                  <td>{formatDateTime(item.lastSyncedAt)}</td>
                  <td className={SVC_ACT_CELL}>
                    {canReconcile && (
                      <button
                        type="button"
                        className="ui-btn soft"
                        disabled={running != null || state.isLoading}
                        onClick={() => run(item.loanNumber)}
                      >
                        {running === item.loanNumber ? 'Đang đối soát...' : 'Đối soát lại'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueueBody>

      <div className={SVC_SUBHEAD}>
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
                  <td className={SVC_WRAP_CELL}>{item.expectedValue}</td>
                  <td className={SVC_WRAP_CELL}>{item.actualValue}</td>
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
