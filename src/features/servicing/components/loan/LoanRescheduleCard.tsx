import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { RowMenu, type RowMenuItem } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { EMPTY, formatDate, formatDateTime } from '@/utils';
import { useRescheduleRequestsQuery } from '../../api/servicingApi';
import { LOAN_SCOPED_SIZE, RESCHEDULE_STATUS, RESCHEDULE_TYPE_LABEL } from '../../constant';
import { rescheduleChangeText } from '../../mappers/rescheduleDisplay';
import { SVC_ACT_CELL, SVC_ACT_HEAD, SVC_WRAP_CELL } from '../../styles';
import type { RescheduleDecision, RescheduleRecoveryAction, RescheduleRequest } from '../../types';
import { RescheduleDecisionModal } from '../RescheduleDecisionModal';
import { RescheduleRecoveryModal } from '../RescheduleRecoveryModal';
import { NothingOpen, ServicingCard } from '../ServicingCard';

interface Props {
  loanNumber: string;
  onDone: (message: string) => void;
}

function MaturityCell({ item }: { item: RescheduleRequest }) {
  if (!item.newMaturityDate) {
    return <>{EMPTY}<span className="ui-sub">hiện tại {formatDate(item.originalMaturityDate)}</span></>;
  }
  return (
    <>
      {formatDate(item.newMaturityDate)}
      <span className="ui-sub">
        {item.newMaturityDate === item.originalMaturityDate ? 'không đổi' : `trước đây ${formatDate(item.originalMaturityDate)}`}
      </span>
    </>
  );
}

/**
 * Yêu cầu cơ cấu của khoản vay, mới nhất trước. Thao tác nằm trong menu "⋯" của dòng: yêu cầu chờ thẩm định có "Thẩm
 * định đạt"/"Từ chối", yêu cầu hết lượt tự chạy có "Chạy lại"/"Đóng và dùng lịch cũ"; mỗi thao tác mở hộp thoại xác nhận
 * và gửi kèm idempotency key. Cần quyền Thao tác "Cơ cấu nợ"; chỉ có quyền Xem thì bảng chỉ đọc.
 */
export function LoanRescheduleCard({ loanNumber, onDone }: Props) {
  const canDecide = usePermission().canAct('reschedule');
  const query = useRescheduleRequestsQuery({ loanNumber, page: 0, size: LOAN_SCOPED_SIZE });
  const [pending, setPending] = useState<{ request: RescheduleRequest; decision: RescheduleDecision } | null>(null);
  const [recovery, setRecovery] = useState<{ request: RescheduleRequest; action: RescheduleRecoveryAction } | null>(null);
  const rows = query.data?.data ?? [];
  const waiting = rows.filter((item) => item.status === 'PENDING_REVIEW').length;

  const actionsOf = (item: RescheduleRequest): RowMenuItem[] => {
    if (item.status === 'PENDING_REVIEW') {
      return [
        { key: 'approve', label: 'Thẩm định đạt', icon: 'checkCircle', onSelect: () => setPending({ request: item, decision: 'approve' }) },
        { key: 'reject', label: 'Từ chối', icon: 'xCircle', danger: true, separatorBefore: true, onSelect: () => setPending({ request: item, decision: 'reject' }) },
      ];
    }
    if (item.status === 'MANUAL_REVIEW') {
      return [
        { key: 'retry', label: 'Chạy lại', icon: 'refresh', onSelect: () => setRecovery({ request: item, action: 'retry' }) },
        { key: 'cancel', label: 'Đóng và dùng lịch cũ', icon: 'xCircle', danger: true, separatorBefore: true, onSelect: () => setRecovery({ request: item, action: 'cancel' }) },
      ];
    }
    return [];
  };

  return (
    <ServicingCard title="Yêu cầu cơ cấu" aside={waiting > 0 ? `${waiting} yêu cầu chờ thẩm định` : undefined}>
      {query.error ? (
        <ErrorNotice error={query.error} onRetry={query.refetch} />
      ) : query.isLoading ? (
        <p className="text-[13px] text-muted" aria-busy="true">Đang tải yêu cầu cơ cấu...</p>
      ) : rows.length === 0 ? (
        <NothingOpen text="Người vay chưa gửi yêu cầu cơ cấu nào." />
      ) : (
        <div className={query.isFetching ? 'ui-table-wrap ui-busy' : 'ui-table-wrap'}>
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Đề nghị</th>
                <th className="num">Ngày đáo hạn</th>
                <th>Lý do người vay nêu</th>
                <th>Tình trạng</th>
                <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const status = RESCHEDULE_STATUS[item.status] ?? { label: item.status, tone: 'neutral' as const };
                const actions = canDecide ? actionsOf(item) : [];
                return (
                  <tr key={item.requestId}>
                    <td>
                      {RESCHEDULE_TYPE_LABEL[item.requestType] ?? item.requestType}
                      <span className="ui-sub">{rescheduleChangeText(item)}</span>
                    </td>
                    <td className="num"><MaturityCell item={item} /></td>
                    <td className={SVC_WRAP_CELL}>{item.reasonComment}</td>
                    <td>
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      <span className="ui-sub">Gửi {formatDateTime(item.createdAt)}</span>
                    </td>
                    <td className={SVC_ACT_CELL}>
                      {actions.length > 0 && (
                        <RowMenu label={`Thao tác với yêu cầu cơ cấu gửi lúc ${formatDateTime(item.createdAt)}`} items={actions} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pending && (
        <RescheduleDecisionModal
          request={pending.request}
          decision={pending.decision}
          onClose={() => setPending(null)}
          onDone={(message) => { setPending(null); onDone(message); }}
        />
      )}
      {recovery && (
        <RescheduleRecoveryModal
          request={recovery.request}
          action={recovery.action}
          onClose={() => setRecovery(null)}
          onDone={(message) => { setRecovery(null); onDone(message); }}
        />
      )}
    </ServicingCard>
  );
}
