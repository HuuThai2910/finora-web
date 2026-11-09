import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { toast } from '@/lib/toast';
import { formatDateTime } from '@/utils';
import { useRecheckWithdrawalMutation, useWithdrawalIncidentsQuery } from '../api/paymentIncidentApi';
import { SERVICING_PAGE_SIZE, WALLET_OWNER_LABEL } from '../constant';
import { money } from '../formatters';
import { useUserLabel } from '../hooks/useUserLabel';
import { SVC_ACT_CELL, SVC_ACT_HEAD } from '../styles';
import type { WithdrawalIncident } from '../types';
import { ErrorCell } from './ErrorCell';
import { QueueBody } from './QueueBody';
import { ServicingCard } from './ServicingCard';

interface Props {
  /** Mã khách hàng (chủ ví): trang chi tiết khách hàng chỉ đọc lệnh của khách đó. Không truyền là cả hàng đợi. */
  ownerId?: string;
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

/** Số lần gửi provider và số lần tra cứu chưa ra kết quả cuối, kèm số lần vận hành bấm tra cứu tay. */
function attemptText(item: WithdrawalIncident): string {
  const base = `Gửi ${item.attemptCount} lần, tra cứu ${item.reconciliationAttemptCount} lần`;
  return item.manualRecheckCount > 0 ? `${base} (${item.manualRecheckCount} lần thủ công)` : base;
}

/**
 * Ô "Chủ ví": họ tên (tra theo mã người dùng) và vai trò. Ví của nền tảng không có người dùng để tra và mã ví là mã
 * nội bộ, nên chỉ ghi "Ví nền tảng".
 */
function OwnerCell({ item }: { item: WithdrawalIncident }) {
  const isPlatform = item.ownerType === 'PLATFORM';
  const role = WALLET_OWNER_LABEL[item.ownerType] ?? item.ownerType;
  const name = useUserLabel(isPlatform ? '' : item.ownerId, isPlatform ? role : `${role} #${item.ownerId}`);
  return (
    <td>
      <span className="svc-who font-medium text-primary">{name}</span>
      {!isPlatform && <span className="ui-sub">{role}</span>}
    </td>
  );
}

/**
 * Lệnh rút tiền chờ đối soát (R4, W3B): tiền đã trừ ví nhưng provider chưa trả kết quả cuối. Nằm ở trang chi tiết khách
 * hàng (lọc theo khách); trang Sự cố hệ thống dùng bản cả hàng đợi khi tài khoản không mở được trang khách hàng.
 * "Tra cứu lại" chỉ hẹn worker hỏi provider ngay theo mã lệnh, không bao giờ gửi lệnh chi thứ hai (D42); provider báo thất
 * bại thì Payment tự hoàn tiền về ví. Xem cần quyền Xem "Rút tiền", tra cứu lại cần quyền Thao tác; một lệnh một lúc.
 */
export function WithdrawalIncidentsSection({ ownerId }: Props) {
  const canRecheck = usePermission().canAct('withdrawal');
  const [page, setPage] = useState(0);
  const withdrawals = useWithdrawalIncidentsQuery({ page, size: SERVICING_PAGE_SIZE, ...(ownerId ? { ownerId } : {}) });
  const [recheck] = useRecheckWithdrawalMutation();
  const [running, setRunning] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ item: WithdrawalIncident; error: unknown } | null>(null);
  const total = withdrawals.data?.totalElements ?? 0;

  const run = async (item: WithdrawalIncident) => {
    if (running) return;
    setRunning(item.withdrawalId);
    setFailed(null);
    try {
      await recheck(item.withdrawalId).unwrap();
      toast.success('Đã hẹn tra cứu lại lệnh rút với nhà cung cấp; kết quả cập nhật sau lượt xử lý kế tiếp.');
    } catch (error) {
      setFailed({ item, error });
    } finally {
      setRunning(null);
    }
  };

  return (
    <ServicingCard title="Lệnh rút tiền chờ đối soát" aside={total > 0 ? 'Tiền đã trừ ví, chỉ tra cứu theo mã lệnh' : undefined}>
      {failed && <div className="mb-2"><ErrorNotice error={failed.error} onRetry={() => run(failed.item)} /></div>}
      <QueueBody
        error={withdrawals.error}
        isLoading={withdrawals.isLoading}
        isFetching={withdrawals.isFetching}
        onRetry={withdrawals.refetch}
        total={total}
        emptyText="Không có lệnh rút tiền đang chờ kết quả."
        compactEmpty
        page={page}
        unit="lệnh"
        onPage={setPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Lệnh rút</th>
                {!ownerId && <th>Chủ ví</th>}
                <th className="num">Số tiền</th>
                <th>Tài khoản nhận</th>
                <th>Lỗi gần nhất</th>
                <th>Tình trạng</th>
                <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {(withdrawals.data?.content ?? []).map((item) => (
                <tr key={item.withdrawalId}>
                  <td>
                    {formatDateTime(item.createdAt)}
                    <span className="ui-sub">{WALLET_OWNER_LABEL[item.ownerType] ?? item.ownerType}</span>
                  </td>
                  {!ownerId && <OwnerCell item={item} />}
                  <td className="num">{money(item.amount)}</td>
                  {/* Nhà cung cấp và mã tham chiếu ở dòng phụ của tài khoản nhận; số lần gửi/tra cứu ở dòng phụ của tình
                      trạng: bảng bớt hai cột nên vừa màn 1050px mà vẫn đủ thông tin. */}
                  <td>
                    <span className="ui-mono">{item.accountNumberMasked}</span>
                    <span className="ui-sub">{item.bankCode}, qua {item.provider}</span>
                  </td>
                  <ErrorCell code={item.errorCode} detail={item.errorDetail} />
                  <td className="min-w-50 whitespace-normal">
                    <WithdrawalStatus item={item} />
                    <span className="ui-sub">{attemptText(item)}</span>
                    {item.nextAttemptAt && <span className="ui-sub">Lượt sau {formatDateTime(item.nextAttemptAt)}</span>}
                    {item.lastManualRecheckAt && (
                      <span className="ui-sub">Tra cứu thủ công {formatDateTime(item.lastManualRecheckAt)}</span>
                    )}
                  </td>
                  <td className={SVC_ACT_CELL}>
                    {canRecheck && (
                      <button
                        type="button"
                        className="ui-btn soft"
                        disabled={running != null || !needsOperator(item)}
                        title={recheckBlockedReason(item)}
                        onClick={() => run(item)}
                      >
                        {running === item.withdrawalId ? 'Đang gửi...' : 'Tra cứu lại'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueueBody>
    </ServicingCard>
  );
}
