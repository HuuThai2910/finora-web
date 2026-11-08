import { useState } from 'react';
import { RowMenu } from '@/components/RowMenu';
import { usePermission } from '@/features/auth';
import { EMPTY, formatDate, formatDateTime } from '@/utils';
import { useRescheduleRequestsQuery } from '../api/servicingApi';
import { RESCHEDULE_TYPE_LABEL, SERVICING_PAGE_SIZE } from '../constant';
import { rescheduleChangeText } from '../mappers/rescheduleDisplay';
import { SVC_ACT_CELL, SVC_ACT_HEAD, SVC_WRAP_CELL } from '../styles';
import type { RescheduleDecision, RescheduleRecoveryAction, RescheduleRequest, RescheduleStatus } from '../types';
import { QueueBody } from './QueueBody';
import { RescheduleDecisionModal } from './RescheduleDecisionModal';
import { RescheduleRecoveryModal } from './RescheduleRecoveryModal';

interface Props {
  page: number;
  onPage: (page: number) => void;
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
 * Hàng chờ duyệt cơ cấu (`PENDING_REVIEW`, mới nhất trước theo backend). Hai thao tác của dòng nằm
 * trong menu "⋯"; cả hai mở hộp thoại để xác nhận và gửi kèm idempotency key.
 */
export function ReschedulePanel({ page, onPage, onDone }: Props) {
  // Thẩm định đạt/Từ chối cần quyền Thao tác "Cơ cấu nợ"; chỉ có quyền Xem thì bảng chỉ đọc.
  const canDecide = usePermission().canAct('reschedule');
  const [view, setView] = useState<'review' | 'repair'>('review');
  const status: RescheduleStatus = view === 'review' ? 'PENDING_REVIEW' : 'MANUAL_REVIEW';
  const query = useRescheduleRequestsQuery({ page, size: SERVICING_PAGE_SIZE, status });
  const [pending, setPending] = useState<{ request: RescheduleRequest; decision: RescheduleDecision } | null>(null);
  const [recovery, setRecovery] = useState<{ request: RescheduleRequest; action: RescheduleRecoveryAction } | null>(null);
  const rows = query.data?.data ?? [];

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2" aria-label="Loại yêu cầu cơ cấu">
        <button type="button" className={view === 'review' ? 'ui-btn primary' : 'ui-btn ghost'}
          onClick={() => { setView('review'); onPage(0); }}>Chờ thẩm định</button>
        <button type="button" className={view === 'repair' ? 'ui-btn primary' : 'ui-btn ghost'}
          onClick={() => { setView('repair'); onPage(0); }}>Cần xử lý lỗi</button>
      </div>
      <QueueBody
        error={query.error}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRetry={query.refetch}
        total={query.data?.totalElements ?? 0}
        emptyText={view === 'review' ? 'Không có yêu cầu cơ cấu chờ duyệt.' : 'Không có yêu cầu cơ cấu cần xử lý lỗi.'}
        page={page}
        unit="yêu cầu"
        onPage={onPage}
      >
        <div className="ui-table-wrap">
          <table className="ui-table list svc-table">
            <thead>
              <tr>
                <th>Khoản vay</th>
                <th>Đề nghị</th>
                <th>Thay đổi</th>
                <th className="num">Ngày đáo hạn</th>
                <th>Lý do người vay nêu</th>
                <th>Gửi lúc</th>
                <th className={SVC_ACT_HEAD}><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.requestId}>
                  <td><span className="ui-code">{item.loanNumber}</span></td>
                  <td>{RESCHEDULE_TYPE_LABEL[item.requestType] ?? item.requestType}</td>
                  <td>{rescheduleChangeText(item)}</td>
                  <td className="num"><MaturityCell item={item} /></td>
                  <td className={SVC_WRAP_CELL}>{item.reasonComment}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td className={SVC_ACT_CELL}>
                    {canDecide && (
                      <RowMenu
                        label={`Thao tác với yêu cầu cơ cấu khoản vay ${item.loanNumber}`}
                        items={view === 'review' ? [
                          { key: 'approve', label: 'Thẩm định đạt', icon: 'checkCircle', onSelect: () => setPending({ request: item, decision: 'approve' }) },
                          { key: 'reject', label: 'Từ chối', icon: 'xCircle', danger: true, separatorBefore: true, onSelect: () => setPending({ request: item, decision: 'reject' }) },
                        ] : [
                          { key: 'retry', label: 'Chạy lại', icon: 'refresh', onSelect: () => setRecovery({ request: item, action: 'retry' }) },
                          { key: 'cancel', label: 'Đóng và dùng lịch cũ', icon: 'xCircle', danger: true, separatorBefore: true, onSelect: () => setRecovery({ request: item, action: 'cancel' }) },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueueBody>

      {pending && (
        <RescheduleDecisionModal
          request={pending.request}
          decision={pending.decision}
          onClose={() => setPending(null)}
          onDone={(message) => {
            setPending(null);
            onDone(message);
          }}
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
    </>
  );
}
