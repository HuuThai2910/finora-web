import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { RowMenu } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { formatDate, formatDateTime } from '@/utils';
import {
  useDisbursementIncidentsQuery, useRecheckDisbursementMutation, useRecheckWithdrawalMutation,
  useReconcileRepaymentMutation, useRepaymentIncidentsQuery,
} from '../api/paymentIncidentApi';
import { useOrderIncidentsQuery, useRetryOrderIncidentMutation } from '../api/investmentIncidentApi';
import { useRepairSagasQuery } from '../api/servicingApi';
import { REPAYMENT_TYPE_LABEL, SERVICING_PAGE_SIZE } from '../constant';
import { money } from '../formatters';
import type {
  DisbursementIncident, DisbursementSagaRepair, OrderIncident, RepaymentIncident, WithdrawalIncident,
} from '../types';
import { ErrorCell } from './ErrorCell';
import { QueueBody } from './QueueBody';
import { RepaymentRepostModal } from './RepaymentRepostModal';
import { SagaRequeueModal } from './SagaRequeueModal';
import { WithdrawalIncidentsSection } from './WithdrawalIncidentsSection';

interface Props {
  page: number;
  onPage: (page: number) => void;
  onDone: (message: string) => void;
}

function RepaymentStatus({ item }: { item: RepaymentIncident }) {
  if (item.status === 'CORE_POSTING') return <StatusPill tone="info">Đang ghi vào hệ thống lõi</StatusPill>;
  if (item.status === 'RECONCILIATION_REQUIRED') return <StatusPill tone="warning">Cần đối soát</StatusPill>;
  return <StatusPill tone="danger">Lõi từ chối, đã hoàn ví</StatusPill>;
}

/** Lần ghi core gần nhất chưa đủ khoảng an toàn (backend cũng chặn `REPAYMENT_REPOST_TOO_EARLY`). */
function repostLockedUntil(item: RepaymentIncident, now: number): string | null {
  if (!item.coreRepostAvailableAt) return null;
  return new Date(item.coreRepostAvailableAt).getTime() > now ? item.coreRepostAvailableAt : null;
}

function DisbursementStatus({ item }: { item: DisbursementIncident }) {
  if (item.status === 'PROCESSING') return <StatusPill tone="info">Đang chuyển tiền</StatusPill>;
  if (item.status === 'RETRY_PENDING') return <StatusPill tone="neutral">Chờ gửi lại</StatusPill>;
  // Hết lượt tra cứu tự động thì backend bỏ lịch hẹn (`nextAttemptAt = null`) và chờ vận hành.
  return item.nextAttemptAt == null
    ? <StatusPill tone="danger">Hết lượt tra cứu tự động</StatusPill>
    : <StatusPill tone="warning">Đang tra cứu lại</StatusPill>;
}

function OrderIncidentIssue({ item }: { item: OrderIncident }) {
  if (item.issue === 'RELEASE_BLOCKED') return <StatusPill tone="danger">Dừng nhả tiền giữ</StatusPill>;
  if (item.issue === 'RELEASE_RETRYING') return <StatusPill tone="warning">Đang thử nhả tiền giữ</StatusPill>;
  return <StatusPill tone="info">Chưa rõ đã giữ tiền</StatusPill>;
}

/**
 * Sự cố giao dịch (R2): tiền đã đi nhưng một bên chưa ghi xong. Các hàng đợi đều chỉ tra cứu hoặc chạy lại đúng
 * bước còn dở theo mã tham chiếu đã gửi, không bao giờ trừ tiền hay chuyển tiền lần hai:
 * - trả nợ đã trừ ví người vay, Fineract chưa ghi xong (Payment): "Đối soát" đọc Fineract theo mã giao dịch; "Ghi lại"
 *   (B32) dành cho khoản Fineract chưa từng nhận, tra cứu trước rồi ghi với đúng mã nên không thành hai giao dịch;
 * - lệnh giải ngân chưa có kết quả cuối từ đối tác chuyển tiền (Payment): "Tra cứu lại" hẹn lượt hỏi đối tác;
 * - lệnh rút tiền đã trừ ví nhưng chưa có kết quả cuối từ provider (Payment, R4): "Tra cứu lại" chỉ dành cho lệnh đã
 *   hết lượt tra cứu tự động, hẹn worker hỏi provider theo mã lệnh, không gửi lệnh chi mới;
 * - giải ngân xong nhưng Fineract chưa ghi khoản vay (Loan): "Ghi lại" đưa bước ghi lõi về hàng chờ, kèm ghi chú;
 * - lệnh góp vốn chưa khớp với ví (Investment, R3): "Thử lại" hẹn worker làm tiếp ngay sau khi đã xử lý nguyên nhân.
 * Một thao tác chạy tại một thời điểm để không gửi chồng.
 */
export function IncidentsPanel({ page, onPage, onDone }: Props) {
  const repayments = useRepaymentIncidentsQuery({ page, size: SERVICING_PAGE_SIZE });
  const [disbursementPage, setDisbursementPage] = useState(0);
  const disbursements = useDisbursementIncidentsQuery({ page: disbursementPage, size: SERVICING_PAGE_SIZE });
  const [sagaPage, setSagaPage] = useState(0);
  const sagas = useRepairSagasQuery({ page: sagaPage, size: SERVICING_PAGE_SIZE });
  const [orderPage, setOrderPage] = useState(0);
  const orders = useOrderIncidentsQuery({ page: orderPage, size: SERVICING_PAGE_SIZE });
  const [retryOrder] = useRetryOrderIncidentMutation();
  const [reconcile] = useReconcileRepaymentMutation();
  const [recheck] = useRecheckDisbursementMutation();
  const [recheckWithdrawal] = useRecheckWithdrawalMutation();
  const [running, setRunning] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ retry: () => void; error: unknown } | null>(null);
  const [requeueing, setRequeueing] = useState<DisbursementSagaRepair | null>(null);
  const [reposting, setReposting] = useState<RepaymentIncident | null>(null);
  // Mốc so sánh "đủ khoảng an toàn chưa": lấy theo lúc danh sách được tải, làm mới danh sách là cập nhật.
  const loadedAt = repayments.fulfilledTimeStamp ?? 0;

  const run = async (id: string, action: () => Promise<string>) => {
    if (running) return;
    setRunning(id);
    setFailed(null);
    try {
      onDone(await action());
    } catch (error) {
      setFailed({ error, retry: () => run(id, action) });
    } finally {
      setRunning(null);
    }
  };

  const reconcileRepayment = (item: RepaymentIncident) => run(item.repaymentId, async () => {
    const result = await reconcile(item.repaymentId).unwrap();
    return result.status === 'RECONCILIATION_REQUIRED'
      ? `Hệ thống lõi chưa có giao dịch ${item.repaymentId}; giao dịch vẫn chờ đối soát.`
      : `Hệ thống lõi đã ghi nhận giao dịch ${item.repaymentId}; tiền sẽ được chia cho nhà đầu tư ở lượt xử lý kế tiếp.`;
  });

  const retryOrderIncident = (item: OrderIncident) => run(item.orderReference, async () => {
    await retryOrder(item.orderReference).unwrap();
    return `Đã hẹn thử lại lệnh ${item.orderReference}; kết quả cập nhật sau lượt xử lý kế tiếp của hệ thống.`;
  });

  const recheckDisbursement = (item: DisbursementIncident) => run(item.sagaId, async () => {
    await recheck(item.sagaId).unwrap();
    return `Đã hẹn tra cứu lại lệnh giải ngân của hợp đồng ${item.contractNumber} với đối tác chuyển tiền.`;
  });

  const recheckWithdrawalIncident = (item: WithdrawalIncident) => run(item.withdrawalId, async () => {
    await recheckWithdrawal(item.withdrawalId).unwrap();
    return `Đã hẹn tra cứu lại lệnh rút ${item.withdrawalId} với nhà cung cấp; kết quả cập nhật sau lượt xử lý kế tiếp.`;
  });

  return (
    <>
      <p className="svc-note">
        Tiền đã đi nhưng một bên chưa ghi xong. Các thao tác ở đây chỉ tra cứu hoặc chạy lại đúng bước còn dở theo mã đã gửi,
        không trừ tiền hay chuyển tiền lần hai.
      </p>
      {failed && (
        <div className="svc-pad">
          <ErrorNotice error={failed.error} onRetry={failed.retry} />
        </div>
      )}

      <div className="svc-subhead">
        <h2>Trả nợ chưa ghi xong vào hệ thống lõi</h2>
        {repayments.data && repayments.data.totalElements > 0 && <span>Tiền đã trừ ví người vay</span>}
      </div>
      <QueueBody
        error={repayments.error}
        isLoading={repayments.isLoading}
        isFetching={repayments.isFetching}
        onRetry={repayments.refetch}
        total={repayments.data?.totalElements ?? 0}
        emptyText="Không có giao dịch trả nợ cần xử lý."
        page={page}
        unit="giao dịch"
        onPage={onPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Giao dịch trả nợ</th>
                <th>Hồ sơ vay</th>
                <th className="num">Số tiền</th>
                <th>Ngày ghi nhận</th>
                <th>Lỗi gần nhất</th>
                <th>Tình trạng</th>
                <th className="act"><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(repayments.data?.content ?? []).map((item) => (
                <tr key={item.repaymentId}>
                  <td>
                    <span className="ui-mono">{item.repaymentId}</span>
                    <span className="ui-sub">{REPAYMENT_TYPE_LABEL[item.repaymentType] ?? item.repaymentType}</span>
                  </td>
                  <td>Hồ sơ #{item.loanApplicationId}</td>
                  <td className="num">{money(item.amount)}</td>
                  <td>{formatDate(item.transactionDate)}</td>
                  <ErrorCell code={item.errorCode} detail={item.errorDetail} />
                  <td><RepaymentStatus item={item} /></td>
                  <td className="act">
                    {item.status === 'RECONCILIATION_REQUIRED' && (() => {
                      const lockedUntil = repostLockedUntil(item, loadedAt);
                      return (
                        <RowMenu
                          label={`Thao tác với giao dịch trả nợ ${item.repaymentId}`}
                          items={[
                            {
                              key: 'reconcile', label: running === item.repaymentId ? 'Đang đối soát...' : 'Đối soát',
                              icon: 'refresh', disabled: running != null, onSelect: () => reconcileRepayment(item),
                            },
                            {
                              key: 'repost', label: 'Ghi lại vào hệ thống lõi', icon: 'repeat', separatorBefore: true,
                              disabled: running != null || lockedUntil != null,
                              disabledReason: lockedUntil ? `Ghi lại được từ ${formatDateTime(lockedUntil)}` : undefined,
                              onSelect: () => setReposting(item),
                            },
                          ]}
                        />
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueueBody>

      <div className="svc-subhead">
        <h2>Giải ngân chưa có kết quả chuyển tiền</h2>
        {disbursements.data && disbursements.data.totalElements > 0 && <span>Chỉ tra cứu theo mã saga, không chuyển lại</span>}
      </div>
      <QueueBody
        error={disbursements.error}
        isLoading={disbursements.isLoading}
        isFetching={disbursements.isFetching}
        onRetry={disbursements.refetch}
        total={disbursements.data?.totalElements ?? 0}
        emptyText="Không có lệnh giải ngân đang chờ kết quả."
        page={disbursementPage}
        unit="lệnh"
        onPage={setDisbursementPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Hợp đồng</th>
                <th className="num">Số tiền</th>
                <th>Đối tác chuyển tiền</th>
                <th>Lỗi gần nhất</th>
                <th className="num">Lần tra cứu</th>
                <th>Tình trạng</th>
                <th className="act"><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(disbursements.data?.content ?? []).map((item) => (
                <tr key={item.sagaId}>
                  <td>
                    <span className="ui-code">{item.contractNumber}</span>
                    <span className="ui-sub">Hồ sơ #{item.loanApplicationId}</span>
                  </td>
                  <td className="num">{money(item.amount)}</td>
                  <td>
                    {item.provider}
                    {item.providerReference && <span className="ui-sub ui-mono">{item.providerReference}</span>}
                  </td>
                  <ErrorCell code={item.errorCode} detail={item.errorDetail} />
                  <td className="num">
                    {item.reconciliationAttemptCount}
                    {item.manualRecheckCount > 0 && <span className="ui-sub">{item.manualRecheckCount} lần thủ công</span>}
                  </td>
                  <td>
                    <DisbursementStatus item={item} />
                    {item.nextAttemptAt && <span className="ui-sub">Lượt sau {formatDateTime(item.nextAttemptAt)}</span>}
                  </td>
                  <td className="act">
                    {item.status === 'RECONCILIATION_REQUIRED' && (
                      <button
                        type="button"
                        className="ui-btn soft"
                        disabled={running != null}
                        onClick={() => recheckDisbursement(item)}
                      >
                        {running === item.sagaId ? 'Đang gửi...' : 'Tra cứu lại'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueueBody>

      <WithdrawalIncidentsSection running={running} onRecheck={recheckWithdrawalIncident} />

      <div className="svc-subhead">
        <h2>Đã giải ngân, hệ thống lõi chưa ghi khoản vay</h2>
        {sagas.data && sagas.data.totalElements > 0 && <span>Cần kiểm tra Fineract theo số hợp đồng</span>}
      </div>
      <QueueBody
        error={sagas.error}
        isLoading={sagas.isLoading}
        isFetching={sagas.isFetching}
        onRetry={sagas.refetch}
        total={sagas.data?.totalElements ?? 0}
        emptyText="Không có khoản giải ngân chờ ghi vào hệ thống lõi."
        page={sagaPage}
        unit="hợp đồng"
        onPage={setSagaPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Hợp đồng</th>
                <th className="num">Số tiền</th>
                <th>Mã chuyển tiền</th>
                <th>Lỗi gần nhất</th>
                <th className="num">Lần ghi lõi</th>
                <th>Cập nhật</th>
                <th className="act"><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(sagas.data?.data ?? []).map((item) => (
                <tr key={item.sagaId}>
                  <td>
                    <span className="ui-code">{item.contractNumber}</span>
                    <span className="ui-sub">Hồ sơ #{item.loanApplicationId}</span>
                  </td>
                  <td className="num">{money(item.amount)}</td>
                  <td>{item.paymentReference ? <span className="ui-mono">{item.paymentReference}</span> : <span className="svc-muted">Không có</span>}</td>
                  <ErrorCell code={item.lastErrorCode} detail={item.lastErrorDetail} />
                  <td className="num">
                    {item.attemptsSinceRepair}
                    {item.repairCount > 0 && <span className="ui-sub">Đã sửa {item.repairCount} lần</span>}
                  </td>
                  <td>{formatDateTime(item.updatedAt)}</td>
                  <td className="act">
                    <button
                      type="button"
                      className="ui-btn soft"
                      disabled={running != null}
                      onClick={() => setRequeueing(item)}
                    >
                      Ghi lại
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueueBody>

      <div className="svc-subhead">
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
        page={orderPage}
        unit="lệnh"
        onPage={setOrderPage}
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
                <th className="act"><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(orders.data?.content ?? []).map((item) => (
                <tr key={item.orderReference}>
                  <td>
                    <span className="ui-mono">{item.orderReference}</span>
                    <span className="ui-sub">Khoản vay trên sàn #{item.listingId}</span>
                  </td>
                  <td><span className="ui-mono">{item.investorId}</span></td>
                  <td className="num">{money(item.amount)}</td>
                  <ErrorCell code={item.releaseErrorCode ?? item.rejectedReasonCode} detail={null} />
                  <td className="num">{item.issue === 'HOLD_PENDING' ? item.pendingAttemptCount : item.releaseAttemptCount}</td>
                  <td>
                    <OrderIncidentIssue item={item} />
                    {(item.releaseNextAttemptAt ?? item.pendingNextAttemptAt) && item.issue !== 'RELEASE_BLOCKED' && (
                      <span className="ui-sub">Lượt sau {formatDateTime(item.releaseNextAttemptAt ?? item.pendingNextAttemptAt)}</span>
                    )}
                  </td>
                  <td className="act">
                    <button
                      type="button"
                      className="ui-btn soft"
                      disabled={running != null}
                      onClick={() => retryOrderIncident(item)}
                    >
                      {running === item.orderReference ? 'Đang gửi...' : 'Thử lại'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueueBody>

      {reposting && (
        <RepaymentRepostModal
          item={reposting}
          onClose={() => setReposting(null)}
          onDone={(message) => { setReposting(null); onDone(message); }}
        />
      )}
      {requeueing && (
        <SagaRequeueModal
          saga={requeueing}
          onClose={() => setRequeueing(null)}
          onDone={(message) => { setRequeueing(null); onDone(message); }}
        />
      )}
    </>
  );
}
