import type { ReactNode } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { formatDateTime } from '@/utils';
import { useLoanServicingStatusQuery, useReconcileLoanMutation, useReconciliationIncidentsQuery } from '../../api/servicingApi';
import { INCIDENT_LABEL, LOAN_SCOPED_SIZE, LOAN_STATUS_LABEL } from '../../constant';
import { money } from '../../formatters';
import { SVC_WRAP_CELL } from '../../styles';
import type { FinoraLoanStatus } from '../../types';
import { NothingOpen, ServicingCard, ServicingSubhead } from '../ServicingCard';

interface Props {
  loanNumber: string;
  onDone: (message: string) => void;
}

/** Loan chỉ đối soát lại khoản vay còn đang phục vụ (`LOAN_NOT_RECONCILABLE` với khoản đã đóng). */
const RECONCILABLE: ReadonlySet<FinoraLoanStatus> = new Set(['ACTIVE', 'DEFAULTED']);

/**
 * Đối soát của khoản vay: số liệu FINORA đang lưu so với lịch đồng bộ hệ thống lõi, nút "Đối soát lại" (chỉ đọc lại hệ
 * thống lõi, lặp lại an toàn, khóa trong lúc chạy) và các sai lệch đang mở cần kỹ thuật kiểm tra. Nút cần quyền Thao tác
 * "Đối soát & sự cố".
 */
export function LoanReconciliationCard({ loanNumber, onDone }: Props) {
  const canReconcile = usePermission().canAct('reconciliation');
  const status = useLoanServicingStatusQuery(loanNumber);
  const incidents = useReconciliationIncidentsQuery({ loanNumber, page: 0, size: LOAN_SCOPED_SIZE });
  const [reconcile, state] = useReconcileLoanMutation();
  const data = status.data;

  const run = async () => {
    if (state.isLoading) return;
    try {
      const result = await reconcile(loanNumber).unwrap();
      onDone(result.stale
        ? 'Đã đối soát, số liệu vẫn chưa khớp với hệ thống lõi.'
        : 'Đã đối soát, số liệu khớp với hệ thống lõi.');
    } catch {
      // Lỗi hiện ngay trong thẻ qua `state.error` (kèm mã lỗi và traceId).
    }
  };

  const button = canReconcile && data && RECONCILABLE.has(data.loanStatus) ? (
    <button type="button" className="ui-btn soft" onClick={run} disabled={state.isLoading}>
      <Icon name="refresh" />
      {state.isLoading ? 'Đang đối soát...' : 'Đối soát lại'}
    </button>
  ) : null;

  const facts: Array<[string, ReactNode]> = data ? [
    ['Số liệu so với hệ thống lõi', data.stale
      ? <StatusPill tone="warning">Đã cũ, cần đối soát</StatusPill>
      : <StatusPill tone="success">Khớp lịch đồng bộ</StatusPill>],
    ['Trạng thái khoản vay', LOAN_STATUS_LABEL[data.loanStatus] ?? data.loanStatus],
    ['Dư nợ', money(data.totalOutstanding)],
    ['Tiền quá hạn', data.overdueAmount ? money(data.overdueAmount) : 'Không có'],
    ['Số liệu tính đến', formatDateTime(data.dataAsOf)],
    ['Đồng bộ lần cuối', formatDateTime(data.lastSyncedAt)],
  ] : [];
  const openIncidents = incidents.data?.data ?? [];

  return (
    <ServicingCard title="Đối soát với hệ thống lõi" action={button}>
      {state.error ? <div className="mb-2"><ErrorNotice error={state.error} onRetry={run} /></div> : null}
      {status.error ? (
        <ErrorNotice error={status.error} onRetry={status.refetch} />
      ) : status.isLoading || !data ? (
        <p className="text-[13px] text-muted" aria-busy="true">Đang tải số liệu đối soát...</p>
      ) : (
        <dl className={`ui-rows svc-rows grid grid-cols-2 gap-x-6 max-[700px]:grid-cols-1${status.isFetching ? ' ui-busy' : ''}`}>
          {facts.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      )}

      <ServicingSubhead>Sai lệch đang mở</ServicingSubhead>
      {incidents.error ? (
        <ErrorNotice error={incidents.error} onRetry={incidents.refetch} />
      ) : incidents.isLoading ? (
        <p className="text-[13px] text-muted" aria-busy="true">Đang tải sai lệch...</p>
      ) : openIncidents.length === 0 ? (
        <NothingOpen text="Không có sai lệch đang mở." />
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Loại sai lệch</th>
                <th>Theo FINORA</th>
                <th>Theo hệ thống lõi</th>
                <th className="num">Số lần phát hiện</th>
                <th>Phát hiện lần đầu</th>
              </tr>
            </thead>
            <tbody>
              {openIncidents.map((item) => (
                <tr key={item.incidentId}>
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
      )}
    </ServicingCard>
  );
}
