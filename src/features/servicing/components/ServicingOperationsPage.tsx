import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  useCollectionCasesQuery, useDecideRescheduleMutation, useQuarantinedEventsQuery,
  useRecordCollectionActionMutation,
  useReconciliationIncidentsQuery, useReconcileLoanMutation, useReplayQuarantineMutation,
  useRescheduleRequestsQuery, useStaleLoansQuery,
} from '../api/servicingApi';
import './ServicingOperationsPage.css';

type Tab = 'collection' | 'reschedule' | 'reconciliation' | 'quarantine';
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date(value)) : '—';

export default function ServicingOperationsPage() {
  const [tab, setTab] = useState<Tab>('collection');
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState('');
  const collection = useCollectionCasesQuery({ page, status: 'OPEN' }, { skip: tab !== 'collection' });
  const reschedules = useRescheduleRequestsQuery(
    { page, status: 'PENDING_REVIEW' },
    { skip: tab !== 'reschedule' },
  );
  const stale = useStaleLoansQuery({ page }, { skip: tab !== 'reconciliation' });
  const incidents = useReconciliationIncidentsQuery({ page: 0 }, { skip: tab !== 'reconciliation' });
  const quarantine = useQuarantinedEventsQuery({ page }, { skip: tab !== 'quarantine' });
  const [decide, decisionState] = useDecideRescheduleMutation();
  const [recordCollectionAction, collectionActionState] = useRecordCollectionActionMutation();
  const [reconcile, reconcileState] = useReconcileLoanMutation();
  const [replay, replayState] = useReplayQuarantineMutation();

  const changeTab = (next: Tab) => { setTab(next); setPage(0); setNotice(''); };
  const action = async (run: () => Promise<unknown>, success: string) => {
    setNotice('');
    try { await run(); setNotice(success); }
    catch { setNotice('Không thể hoàn tất thao tác. Kiểm tra trạng thái mới nhất hoặc traceId trong phản hồi API.'); }
  };
  const current = tab === 'collection' ? collection : tab === 'reschedule' ? reschedules
    : tab === 'quarantine' ? quarantine : stale;
  const total = current.data?.totalElements ?? 0;
  const loading = current.isLoading;
  const error = current.isError;

  return (
    <section className="ops-page">
      <header className="ops-heading">
        <div><span className="ops-eyebrow">LOAN SERVICING</span><h1>Vận hành khoản vay</h1>
          <p>Theo dõi quá hạn, duyệt cơ cấu và xử lý các sự cố đối soát từ một nơi.</p></div>
        <button className="ops-button secondary" onClick={() => current.refetch()}>Làm mới</button>
      </header>

      <nav className="ops-tabs" aria-label="Nhóm công việc servicing">
        {([['collection', 'Quá hạn & thu hồi'], ['reschedule', 'Yêu cầu cơ cấu'],
          ['reconciliation', 'Đối soát'], ['quarantine', 'Event chờ mapping']] as const).map(([key, label]) => (
          <button key={key} className={tab === key ? 'active' : ''} onClick={() => changeTab(key)}>{label}</button>
        ))}
      </nav>
      {notice && <div className="ops-notice" role="status">{notice}</div>}
      {loading && <div className="ops-state">Đang tải dữ liệu vận hành…</div>}
      {error && <div className="ops-state error">Không tải được dữ liệu. Hãy kiểm tra Loan Service và đăng nhập quản trị.</div>}

      {!loading && !error && tab === 'collection' && (
        <Table empty="Không có hồ sơ thu hồi đang mở." headers={['Khoản vay', 'Mức độ', 'Quá hạn', 'Dư nợ', 'Cập nhật', 'Thao tác']}>
          {collection.data?.data.map((item) => <tr key={item.caseId}>
            <td><strong>{item.loanNumber}</strong><small>{item.borrowerId}</small></td>
            <td><Status value={item.stage} /><small>Nhóm nợ {item.debtGroup}</small></td>
            <td><strong>{item.daysPastDue} ngày</strong><small>{money(item.overdueAmount)}</small></td>
            <td>{money(item.totalOutstanding)}</td><td>{dateTime(item.lastObservedAt)}</td>
            <td><button disabled={collectionActionState.isLoading} onClick={() => action(
              () => recordCollectionAction({
                caseId: item.caseId,
                note: 'Đã liên hệ người vay từ web quản trị',
                key: `collection-contact-${item.caseId}-${new Date().toISOString().slice(0, 10)}`,
              }).unwrap(), `Đã ghi nhận liên hệ cho ${item.loanNumber}.`)}>Đã liên hệ</button></td>
          </tr>)}
        </Table>
      )}

      {!loading && !error && tab === 'reschedule' && (
        <Table empty="Không có yêu cầu cơ cấu chờ duyệt." headers={['Khoản vay', 'Đề nghị', 'Lý do', 'Thời điểm', 'Thao tác']}>
          {reschedules.data?.data.map((item) => <tr key={item.requestId}>
            <td><strong>{item.loanNumber}</strong><small>{item.termsVersion}</small></td>
            <td><Status value={item.requestType} /><small>{item.extraTerms ? `Thêm ${item.extraTerms} kỳ` : item.adjustedDueDate ?? '—'}</small></td>
            <td className="ops-wrap">{item.reasonComment}</td><td>{dateTime(item.createdAt)}</td>
            <td><div className="ops-actions">
              <button disabled={decisionState.isLoading} onClick={() => action(() => decide({
                requestId: item.requestId, decision: 'approve', comment: 'Đã kiểm tra trên web quản trị',
                key: `reschedule-approve-${item.requestId}`,
              }).unwrap(), `Đã duyệt yêu cầu cơ cấu của ${item.loanNumber}.`)}>Duyệt</button>
              <button className="danger" disabled={decisionState.isLoading} onClick={() => action(() => decide({
                requestId: item.requestId, decision: 'reject', comment: 'Không đáp ứng chính sách cơ cấu hiện hành',
                key: `reschedule-reject-${item.requestId}`,
              }).unwrap(), `Đã từ chối yêu cầu cơ cấu của ${item.loanNumber}.`)}>Từ chối</button>
            </div></td>
          </tr>)}
        </Table>
      )}

      {!loading && !error && tab === 'reconciliation' && <>
        <Table empty="Không có projection stale cần đối soát." headers={['Khoản vay', 'Core', 'Dư nợ', 'Độ mới', 'Thao tác']}>
          {stale.data?.data.map((item) => <tr key={item.loanNumber}>
            <td><strong>{item.loanNumber}</strong><small>{item.applicationNumber}</small></td>
            <td>#{item.fineractLoanId}<small>{item.fineractStatusCode}</small></td>
            <td>{money(item.totalOutstanding)}<small>Quá hạn: {money(item.overdueAmount)}</small></td>
            <td><Status value={item.stale ? 'STALE' : 'CURRENT'} /><small>{dateTime(item.lastSyncedAt)}</small></td>
            <td><button disabled={reconcileState.isLoading} onClick={() => action(
              () => reconcile(item.loanNumber).unwrap(), `Đã đối soát ${item.loanNumber}.`)}>Đối soát lại</button></td>
          </tr>)}
        </Table>
        <h2 className="ops-subtitle">Sai lệch đang mở</h2>
        <Table empty="Không có sai lệch tài chính/định danh đang mở." headers={['Khoản vay', 'Loại', 'Kỳ vọng', 'Thực tế', 'Số lần']}>
          {incidents.data?.data.map((item) => <tr key={item.incidentId}>
            <td>{item.loanNumber}</td><td><Status value={item.type} /></td>
            <td className="ops-wrap">{item.expectedValue}</td><td className="ops-wrap">{item.actualValue}</td>
            <td>{item.occurrenceCount}</td>
          </tr>)}
        </Table>
      </>}

      {!loading && !error && tab === 'quarantine' && (
        <Table empty="Không có event repayment chờ mapping." headers={['Event', 'Hồ sơ vay', 'Lý do', 'Nhận lúc', 'Thao tác']}>
          {quarantine.data?.data.map((item) => <tr key={item.eventId}>
            <td><strong>{item.repaymentId}</strong><small>{item.eventId}</small></td>
            <td>#{item.loanApplicationId}</td><td><Status value={item.reasonCode} /><small>Đã thử {item.attemptCount} lần</small></td>
            <td>{dateTime(item.receivedAt)}</td><td><button disabled={replayState.isLoading} onClick={() => action(
              () => replay(item.eventId).unwrap(), 'Đã replay event sau khi kiểm tra mapping.')}>Replay</button></td>
          </tr>)}
        </Table>
      )}

      {!loading && !error && <footer className="ops-pagination"><span>Trang {page + 1} · {total} bản ghi</span>
        <div><button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Trang trước</button>
          <button disabled={(page + 1) * 20 >= total} onClick={() => setPage((value) => value + 1)}>Trang sau</button></div>
      </footer>}
    </section>
  );
}

function Status({ value }: { value: string }) { return <span className="ops-status">{value.split('_').join(' ')}</span>; }
function Table({ headers, empty, children }: { headers: string[]; empty: string; children: ReactNode }) {
  const rows = Array.isArray(children) ? children.filter(Boolean).length : children ? 1 : 0;
  return <div className="ops-table-card"><div className="ops-table-wrap"><table><thead><tr>{headers.map((value) => <th key={value}>{value}</th>)}</tr></thead>
    <tbody>{rows ? children : <tr><td colSpan={headers.length} className="ops-empty">{empty}</td></tr>}</tbody></table></div></div>;
}
