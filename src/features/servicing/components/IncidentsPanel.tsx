import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { RowMenu } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { ApplicationRef, useApplicationNumbers } from '@/features/loan';
import { formatDate, formatDateTime } from '@/utils';
import {
  useDisbursementIncidentsQuery, useRecheckDisbursementMutation, useRecheckWithdrawalMutation,
  useReconcileRepaymentMutation, useRepaymentIncidentsQuery,
} from '../api/paymentIncidentApi';
import { useRetryOrderIncidentMutation } from '../api/investmentIncidentApi';
import { useRepairSagasQuery } from '../api/servicingApi';
import { REPAYMENT_TYPE_LABEL, SERVICING_PAGE_SIZE } from '../constant';
import { money } from '../formatters';
import { SVC_ACT_CELL, SVC_ACT_HEAD, SVC_NOTE, SVC_SUBHEAD } from '../styles';
import type {
  DisbursementIncident, DisbursementSagaRepair, OrderIncident, RepaymentIncident, WithdrawalIncident,
} from '../types';
import { ErrorCell } from './ErrorCell';
import { LoanProofsLink } from './LoanProofsLink';
import { OrderIncidentsSection } from './OrderIncidentsSection';
import { QueueBody, QueueEmpty } from './QueueBody';
import { RepaymentRepostModal } from './RepaymentRepostModal';
import { SagaRequeueModal } from './SagaRequeueModal';
import { UserName } from './UserName';
import { WithdrawalIncidentsSection } from './WithdrawalIncidentsSection';

interface Props {
  page: number;
  onPage: (page: number) => void;
  onDone: (message: string) => void;
  /**
   * Số đếm đầu trang (`useServicingCounts`) báo mọi hàng đợi tài khoản xem được đều rỗng: hiện một dòng chung thay cho
   * năm khối "không có việc" nối nhau.
   */
  nothingOpen: boolean;
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
export function IncidentsPanel({ page, onPage, onDone, nothingOpen }: Props) {
  const { canView, canAct } = usePermission();
  // Bốn hàng đợi tiền/lõi thuộc "Đối soát & sự cố", lệnh rút tiền thuộc "Rút tiền": mỗi phần hiện theo quyền Xem riêng,
  // nút xử lý theo quyền Thao tác riêng.
  const showReconciliation = canView('reconciliation');
  const canFix = canAct('reconciliation');
  const skip = !showReconciliation;
  const repayments = useRepaymentIncidentsQuery({ page, size: SERVICING_PAGE_SIZE }, { skip });
  const [disbursementPage, setDisbursementPage] = useState(0);
  const disbursements = useDisbursementIncidentsQuery({ page: disbursementPage, size: SERVICING_PAGE_SIZE }, { skip });
  const [sagaPage, setSagaPage] = useState(0);
  const sagas = useRepairSagasQuery({ page: sagaPage, size: SERVICING_PAGE_SIZE }, { skip });
  // Bảng của Payment chỉ có ID hồ sơ: tra mã LA-… cho cả hai trang đang hiện trong một request.
  const numbers = useApplicationNumbers([
    ...(repayments.data?.content ?? []).map((item) => item.loanApplicationId),
    ...(disbursements.data?.content ?? []).map((item) => item.loanApplicationId),
  ]);
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

  if (nothingOpen && !failed) return <QueueEmpty text="Không có sự cố giao dịch cần xử lý." />;

  return (
    <>
      <p className={SVC_NOTE}>
        Tiền đã đi nhưng một bên chưa ghi xong. Các thao tác ở đây chỉ tra cứu hoặc chạy lại đúng bước còn dở theo mã đã gửi,
        không trừ tiền hay chuyển tiền lần hai.
      </p>
      {failed && (
        <div className="svc-pad px-0.5 pb-3">
          <ErrorNotice error={failed.error} onRetry={failed.retry} />
        </div>
      )}

      {showReconciliation && (
        <>
          <div className={SVC_SUBHEAD}>
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
                    <th>Người vay</th>
                    <th className="num">Số tiền</th>
                    <th>Ngày ghi nhận</th>
                    <th>Lỗi gần nhất</th>
                    <th>Tình trạng</th>
                    <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {(repayments.data?.content ?? []).map((item) => (
                    <tr key={item.repaymentId}>
                      <td>
                        <span className="ui-mono">{item.repaymentId}</span>
                        <span className="ui-sub">{REPAYMENT_TYPE_LABEL[item.repaymentType] ?? item.repaymentType}</span>
                      </td>
                      <td>
                        <UserName userId={item.borrowerId} fallback={`Người vay #${item.borrowerId}`} />
                        <span className="ui-sub">
                          <ApplicationRef id={item.loanApplicationId} applicationNumber={numbers.get(item.loanApplicationId)} /><LoanProofsLink loanApplicationId={item.loanApplicationId} separated />
                        </span>
                      </td>
                      <td className="num">{money(item.amount)}</td>
                      <td>{formatDate(item.transactionDate)}</td>
                      <ErrorCell code={item.errorCode} detail={item.errorDetail} />
                      <td><RepaymentStatus item={item} /></td>
                      <td className={SVC_ACT_CELL}>
                        {item.status === 'RECONCILIATION_REQUIRED' && canFix && (() => {
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

          <div className={SVC_SUBHEAD}>
            <h2>Giải ngân chưa có kết quả chuyển tiền</h2>
            {disbursements.data && disbursements.data.totalElements > 0 && <span>Chỉ tra cứu theo mã lệnh, không chuyển lại</span>}
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
                    <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {(disbursements.data?.content ?? []).map((item) => (
                    <tr key={item.sagaId}>
                      <td>
                        <span className="ui-code">{item.contractNumber}</span>
                        <span className="ui-sub">
                          <ApplicationRef id={item.loanApplicationId} applicationNumber={numbers.get(item.loanApplicationId)} /><LoanProofsLink loanApplicationId={item.loanApplicationId} separated />
                        </span>
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
                      <td className={SVC_ACT_CELL}>
                        {item.status === 'RECONCILIATION_REQUIRED' && canFix && (
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
        </>
      )}

      {canView('withdrawal') && <WithdrawalIncidentsSection running={running} onRecheck={recheckWithdrawalIncident} />}

      {showReconciliation && (
        <>
          <div className={SVC_SUBHEAD}>
            <h2>Đã giải ngân, hệ thống lõi chưa ghi khoản vay</h2>
            {sagas.data && sagas.data.totalElements > 0 && <span>Cần kiểm tra hệ thống lõi theo số hợp đồng</span>}
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
                    <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {(sagas.data?.data ?? []).map((item) => (
                    <tr key={item.sagaId}>
                      <td>
                        <span className="ui-code">{item.contractNumber}</span>
                        <span className="ui-sub">
                          <ApplicationRef id={item.loanApplicationId} applicationNumber={item.applicationNumber} /><LoanProofsLink loanApplicationId={item.loanApplicationId} separated />
                        </span>
                      </td>
                      <td className="num">{money(item.amount)}</td>
                      <td>{item.paymentReference ? <span className="ui-mono">{item.paymentReference}</span> : <span className="svc-muted text-muted">Không có</span>}</td>
                      <ErrorCell code={item.lastErrorCode} detail={item.lastErrorDetail} />
                      <td className="num">
                        {item.attemptsSinceRepair}
                        {item.repairCount > 0 && <span className="ui-sub">Đã sửa {item.repairCount} lần</span>}
                      </td>
                      <td>{formatDateTime(item.updatedAt)}</td>
                      <td className={SVC_ACT_CELL}>
                        {canFix && (
                          <button
                            type="button"
                            className="ui-btn soft"
                            disabled={running != null}
                            onClick={() => setRequeueing(item)}
                          >
                            Ghi lại
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueueBody>

          <OrderIncidentsSection running={running} canFix={canFix} onRetry={retryOrderIncident} />
        </>
      )}

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
