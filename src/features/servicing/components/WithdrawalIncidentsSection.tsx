import { useState } from 'react';
import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import { useWithdrawalIncidentsQuery } from '../api/paymentIncidentApi';
import { SERVICING_PAGE_SIZE, WALLET_OWNER_LABEL } from '../constant';
import { money } from '../formatters';
import { useUserLabel } from '../hooks/useUserLabel';
import type { WithdrawalIncident } from '../types';
import { ErrorCell } from './ErrorCell';
import { QueueBody } from './QueueBody';

interface Props {
  /** Mã của thao tác đang chạy trên cả tab; một thao tác một lúc để không gửi chồng. */
  running: string | null;
  onRecheck: (item: WithdrawalIncident) => void;
}

/**
 * Chỉ lệnh đã hết lượt tra cứu tự động (`nextAttemptAt = null`) mới cần vận hành; lệnh còn lịch hẹn thì worker vẫn
 * đang tự hỏi provider, bấm thêm chỉ làm loạn lịch tra cứu.
 */
const needsOperator = (item: WithdrawalIncident) => item.status === 'RECONCILIATION_REQUIRED' && item.nextAttemptAt == null;

function recheckBlockedReason(item: WithdrawalIncident): string | undefined {
  if (item.status !== 'RECONCILIATION_REQUIRED') return 'Lệnh chưa vào đối soát, hệ thống vẫn đang chờ kết quả từ nhà cung cấp.';
  if (item.nextAttemptAt != null) return `Hệ thống còn lượt tự tra cứu lúc ${formatDateTime(item.nextAttemptAt)}.`;
  return undefined;
}

function WithdrawalStatus({ item }: { item: WithdrawalIncident }) {
  if (item.status === 'PROCESSING') return <StatusPill tone="info">Đang gửi lệnh chi</StatusPill>;
  if (item.status === 'PROVIDER_PENDING') return <StatusPill tone="neutral">Chờ nhà cung cấp xác nhận</StatusPill>;
  return item.nextAttemptAt == null
    ? <StatusPill tone="danger">Hết lượt tra cứu tự động</StatusPill>
    : <StatusPill tone="warning">Đang tra cứu lại</StatusPill>;
}

/** Ô "Chủ ví": họ tên (tra theo mã người dùng) và vai trò; ví của nền tảng không có người dùng để tra. */
function OwnerCell({ item }: { item: WithdrawalIncident }) {
  const role = WALLET_OWNER_LABEL[item.ownerType] ?? item.ownerType;
  const name = useUserLabel(item.ownerType === 'PLATFORM' ? '' : item.ownerId, `${role} #${item.ownerId}`);
  return (
    <td>
      <span className="svc-who">{name}</span>
      <span className="ui-sub">{role}</span>
    </td>
  );
}

/**
 * Lệnh rút tiền chờ đối soát (R4, W3B): tiền đã trừ ví nhưng provider chưa trả kết quả cuối. "Tra cứu lại" chỉ hẹn
 * worker hỏi provider ngay theo mã lệnh, không bao giờ gửi lệnh chi thứ hai (D42); provider báo thất bại thì Payment
 * tự hoàn tiền về ví. Hàng đợi tự giữ trang của mình; thao tác đi qua `onRecheck` để cả tab chỉ chạy một việc một lúc.
 */
export function WithdrawalIncidentsSection({ running, onRecheck }: Props) {
  const [page, setPage] = useState(0);
  const withdrawals = useWithdrawalIncidentsQuery({ page, size: SERVICING_PAGE_SIZE });

  return (
    <>
      <div className="svc-subhead">
        <h2>Lệnh rút tiền chờ đối soát</h2>
        {withdrawals.data && withdrawals.data.totalElements > 0 && <span>Tiền đã trừ ví, chỉ tra cứu theo mã lệnh, không chi lại</span>}
      </div>
      <QueueBody
        error={withdrawals.error}
        isLoading={withdrawals.isLoading}
        isFetching={withdrawals.isFetching}
        onRetry={withdrawals.refetch}
        total={withdrawals.data?.totalElements ?? 0}
        emptyText="Không có lệnh rút tiền đang chờ kết quả."
        page={page}
        unit="lệnh"
        onPage={setPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Lệnh rút</th>
                <th>Chủ ví</th>
                <th className="num">Số tiền</th>
                <th>Tài khoản nhận</th>
                <th>Nhà cung cấp</th>
                <th>Lỗi gần nhất</th>
                <th className="num">Lần gửi / tra cứu</th>
                <th>Tình trạng</th>
                <th className="act"><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(withdrawals.data?.content ?? []).map((item) => (
                <tr key={item.withdrawalId}>
                  <td>
                    <span className="ui-mono">{item.withdrawalId}</span>
                    <span className="ui-sub">Tạo {formatDateTime(item.createdAt)}</span>
                  </td>
                  <OwnerCell item={item} />
                  <td className="num">{money(item.amount)}</td>
                  <td>
                    <span className="ui-mono">{item.accountNumberMasked}</span>
                    <span className="ui-sub">{item.bankCode}</span>
                  </td>
                  <td>
                    {item.provider}
                    {item.providerReference && <span className="ui-sub ui-mono">{item.providerReference}</span>}
                  </td>
                  <ErrorCell code={item.errorCode} detail={item.errorDetail} />
                  <td className="num">
                    {item.attemptCount} / {item.reconciliationAttemptCount}
                    {item.manualRecheckCount > 0 && <span className="ui-sub">{item.manualRecheckCount} lần thủ công</span>}
                  </td>
                  <td>
                    <WithdrawalStatus item={item} />
                    {item.nextAttemptAt && <span className="ui-sub">Lượt sau {formatDateTime(item.nextAttemptAt)}</span>}
                    {item.lastManualRecheckAt && (
                      <span className="ui-sub">Tra cứu thủ công {formatDateTime(item.lastManualRecheckAt)}</span>
                    )}
                  </td>
                  <td className="act">
                    <button
                      type="button"
                      className="ui-btn soft"
                      disabled={running != null || !needsOperator(item)}
                      title={recheckBlockedReason(item)}
                      onClick={() => onRecheck(item)}
                    >
                      {running === item.withdrawalId ? 'Đang gửi...' : 'Tra cứu lại'}
                    </button>
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
