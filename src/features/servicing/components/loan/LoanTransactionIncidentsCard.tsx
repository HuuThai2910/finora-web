import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { RowMenu } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { formatDate, formatDateTime } from '@/utils';
import {
  useDisbursementIncidentsQuery, useRecheckDisbursementMutation, useReconcileRepaymentMutation,
  useRepaymentIncidentsQuery,
} from '../../api/paymentIncidentApi';
import { useRepairSagasQuery } from '../../api/servicingApi';
import { LOAN_SCOPED_SIZE, REPAYMENT_TYPE_LABEL } from '../../constant';
import { money } from '../../formatters';
import { SVC_ACT_CELL, SVC_ACT_HEAD } from '../../styles';
import type { DisbursementIncident, DisbursementSagaRepair, RepaymentIncident } from '../../types';
import { ErrorCell } from '../ErrorCell';
import { RepaymentRepostModal } from '../RepaymentRepostModal';
import { SagaRequeueModal } from '../SagaRequeueModal';
import { NothingOpen, ServicingCard, ServicingSubhead } from '../ServicingCard';

interface Props {
  /** ID số của hồ sơ vay: Payment và saga của Loan lọc theo ID này. */
  applicationId: number;
  onDone: (message: string) => void;
}

function RepaymentStatus({ item }: { item: RepaymentIncident }) {
  if (item.status === 'CORE_POSTING') return <StatusPill tone="info">Đang ghi vào hệ thống lõi</StatusPill>;
  if (item.status === 'RECONCILIATION_REQUIRED') return <StatusPill tone="warning">Cần đối soát</StatusPill>;
  return <StatusPill tone="danger">Lõi từ chối, đã hoàn ví</StatusPill>;
}

function DisbursementStatus({ item }: { item: DisbursementIncident }) {
  if (item.status === 'PROCESSING') return <StatusPill tone="info">Đang chuyển tiền</StatusPill>;
  if (item.status === 'RETRY_PENDING') return <StatusPill tone="neutral">Chờ gửi lại</StatusPill>;
  // Hết lượt tra cứu tự động thì backend bỏ lịch hẹn (`nextAttemptAt = null`) và chờ vận hành.
  return item.nextAttemptAt == null
    ? <StatusPill tone="danger">Hết lượt tra cứu tự động</StatusPill>
    : <StatusPill tone="warning">Đang tra cứu lại</StatusPill>;
}

/** Lần ghi core gần nhất chưa đủ khoảng an toàn (backend cũng chặn `REPAYMENT_REPOST_TOO_EARLY`). */
function repostLockedUntil(item: RepaymentIncident, now: number): string | null {
  if (!item.coreRepostAvailableAt) return null;
  return new Date(item.coreRepostAvailableAt).getTime() > now ? item.coreRepostAvailableAt : null;
}

/**
 * Sự cố tiền của khoản vay (R2): tiền đã đi nhưng một bên chưa ghi xong. Mọi thao tác chỉ tra cứu hoặc chạy lại đúng
 * bước còn dở theo mã đã gửi, không trừ tiền hay chuyển tiền lần hai:
 * - giải ngân xong nhưng hệ thống lõi chưa ghi khoản vay (Loan): "Ghi lại" đưa bước ghi lõi về hàng chờ, kèm ghi chú;
 * - lệnh giải ngân chưa có kết quả từ đối tác chuyển tiền (Payment): "Tra cứu lại" hẹn lượt hỏi đối tác;
 * - trả nợ đã trừ ví người vay, hệ thống lõi chưa ghi xong (Payment): "Đối soát" đọc lõi theo mã giao dịch; "Ghi lại"
 *   (B32) tra cứu trước rồi ghi với đúng mã nên không thành hai giao dịch.
 * Một thao tác chạy tại một thời điểm để không gửi chồng. Ba nhóm cùng trống thì chỉ còn một dòng "Không có".
 */
export function LoanTransactionIncidentsCard({ applicationId, onDone }: Props) {
  const canFix = usePermission().canAct('reconciliation');
  const scope = { loanApplicationId: applicationId, page: 0, size: LOAN_SCOPED_SIZE };
  const sagas = useRepairSagasQuery(scope);
  const disbursements = useDisbursementIncidentsQuery(scope);
  const repayments = useRepaymentIncidentsQuery(scope);
  const [reconcile] = useReconcileRepaymentMutation();
  const [recheck] = useRecheckDisbursementMutation();
  const [running, setRunning] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ retry: () => void; error: unknown } | null>(null);
  const [requeueing, setRequeueing] = useState<DisbursementSagaRepair | null>(null);
  const [reposting, setReposting] = useState<RepaymentIncident | null>(null);
  // Mốc so sánh "đủ khoảng an toàn chưa": lấy theo lúc danh sách được tải, làm mới danh sách là cập nhật.
  const loadedAt = repayments.fulfilledTimeStamp ?? 0;

  const sagaRows = sagas.data?.data ?? [];
  const disbursementRows = disbursements.data?.content ?? [];
  const repaymentRows = repayments.data?.content ?? [];
  const queries = [sagas, disbursements, repayments];
  const loading = queries.some((query) => query.isLoading);
  const errors = queries.filter((query) => query.error);
  const total = sagaRows.length + disbursementRows.length + repaymentRows.length;

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
      ? 'Hệ thống lõi chưa có giao dịch trả nợ này; giao dịch vẫn chờ đối soát.'
      : 'Hệ thống lõi đã ghi nhận giao dịch trả nợ; tiền sẽ được chia cho nhà đầu tư ở lượt xử lý kế tiếp.';
  });

  const recheckDisbursement = (item: DisbursementIncident) => run(item.sagaId, async () => {
    await recheck(item.sagaId).unwrap();
    return 'Đã hẹn tra cứu lại lệnh giải ngân với đối tác chuyển tiền.';
  });

  return (
    <ServicingCard title="Sự cố giải ngân và trả nợ" aside={total > 0 ? `${total} việc cần xử lý` : undefined}>
      {failed && <div className="mb-2"><ErrorNotice error={failed.error} onRetry={failed.retry} /></div>}
      {errors.map((query, index) => (
        <div key={index} className="mb-2"><ErrorNotice error={query.error} onRetry={query.refetch} /></div>
      ))}
      {loading ? (
        <p className="text-[13px] text-muted" aria-busy="true">Đang tải sự cố giao dịch...</p>
      ) : total === 0 && errors.length === 0 ? (
        <NothingOpen text="Không có sự cố giải ngân hay trả nợ." />
      ) : (
        <>
          {sagaRows.length > 0 && (
            <>
              <ServicingSubhead>Đã giải ngân, hệ thống lõi chưa ghi khoản vay</ServicingSubhead>
              <div className="ui-table-wrap">
                <table className="ui-table list svc-table">
                  <thead>
                    <tr>
                      <th>Hợp đồng</th>
                      <th className="num">Số tiền</th>
                      <th>Lỗi gần nhất</th>
                      <th className="num">Lần ghi lõi</th>
                      <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sagaRows.map((item) => (
                      <tr key={item.sagaId}>
                        <td>
                          <span className="ui-code">{item.contractCode || item.contractNumber}</span>
                          <span className="ui-sub">Cập nhật {formatDateTime(item.updatedAt)}</span>
                        </td>
                        <td className="num">{money(item.amount)}</td>
                        <ErrorCell code={item.lastErrorCode} detail={item.lastErrorDetail} />
                        <td className="num">
                          {item.attemptsSinceRepair}
                          {item.repairCount > 0 && <span className="ui-sub">Đã sửa {item.repairCount} lần</span>}
                        </td>
                        <td className={SVC_ACT_CELL}>
                          {canFix && (
                            <button type="button" className="ui-btn soft" disabled={running != null} onClick={() => setRequeueing(item)}>
                              Ghi lại
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {disbursementRows.length > 0 && (
            <>
              <ServicingSubhead>Lệnh giải ngân chưa có kết quả chuyển tiền</ServicingSubhead>
              <div className="ui-table-wrap">
                <table className="ui-table list svc-table">
                  <thead>
                    <tr>
                      <th>Đối tác chuyển tiền</th>
                      <th className="num">Số tiền</th>
                      <th>Lỗi gần nhất</th>
                      <th>Tình trạng</th>
                      <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {disbursementRows.map((item) => (
                      <tr key={item.sagaId}>
                        <td>
                          {item.provider}
                          {item.providerReference && <span className="ui-sub ui-mono">{item.providerReference}</span>}
                        </td>
                        <td className="num">{money(item.amount)}</td>
                        <ErrorCell code={item.errorCode} detail={item.errorDetail} />
                        <td>
                          <DisbursementStatus item={item} />
                          {item.nextAttemptAt && <span className="ui-sub">Lượt sau {formatDateTime(item.nextAttemptAt)}</span>}
                          {item.manualRecheckCount > 0 && <span className="ui-sub">{item.manualRecheckCount} lần tra cứu thủ công</span>}
                        </td>
                        <td className={SVC_ACT_CELL}>
                          {item.status === 'RECONCILIATION_REQUIRED' && canFix && (
                            <button type="button" className="ui-btn soft" disabled={running != null} onClick={() => recheckDisbursement(item)}>
                              {running === item.sagaId ? 'Đang gửi...' : 'Tra cứu lại'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {repaymentRows.length > 0 && (
            <>
              <ServicingSubhead>Trả nợ chưa ghi xong vào hệ thống lõi</ServicingSubhead>
              <div className="ui-table-wrap">
                <table className="ui-table list svc-table">
                  <thead>
                    <tr>
                      <th>Giao dịch trả nợ</th>
                      <th className="num">Số tiền</th>
                      <th>Lỗi gần nhất</th>
                      <th>Tình trạng</th>
                      <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {repaymentRows.map((item) => {
                      const lockedUntil = repostLockedUntil(item, loadedAt);
                      return (
                        <tr key={item.repaymentId}>
                          <td>
                            {REPAYMENT_TYPE_LABEL[item.repaymentType] ?? item.repaymentType}
                            <span className="ui-sub">Ngày {formatDate(item.transactionDate)}</span>
                          </td>
                          <td className="num">{money(item.amount)}</td>
                          <ErrorCell code={item.errorCode} detail={item.errorDetail} />
                          <td><RepaymentStatus item={item} /></td>
                          <td className={SVC_ACT_CELL}>
                            {item.status === 'RECONCILIATION_REQUIRED' && canFix && (
                              <RowMenu
                                label={`Thao tác với giao dịch trả nợ ngày ${formatDate(item.transactionDate)}`}
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
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {reposting && (
        <RepaymentRepostModal
          item={reposting}
          onClose={() => setReposting(null)}
          onDone={(message) => { setReposting(null); if (message) onDone(message); }}
        />
      )}
      {requeueing && (
        <SagaRequeueModal
          saga={requeueing}
          onClose={() => setRequeueing(null)}
          onDone={(message) => { setRequeueing(null); onDone(message); }}
        />
      )}
    </ServicingCard>
  );
}
