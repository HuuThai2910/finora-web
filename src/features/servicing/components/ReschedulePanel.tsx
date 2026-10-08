import { useState } from 'react';
import { RowMenu } from '@/components/RowMenu';
import { EMPTY, formatDate, formatDateTime } from '@/utils';
import { useRescheduleRequestsQuery } from '../api/servicingApi';
import { RESCHEDULE_TYPE_LABEL, SERVICING_PAGE_SIZE } from '../constant';
import type { RescheduleDecision, RescheduleRequest } from '../types';
import { QueueBody } from './QueueBody';
import { RescheduleDecisionModal } from './RescheduleDecisionModal';

interface Props {
  page: number;
  onPage: (page: number) => void;
  onDone: (message: string) => void;
}

/** Nội dung đề nghị: thêm kỳ, hoặc dời một kỳ sang ngày mới. */
function changeText(item: RescheduleRequest): string {
  if (item.extraTerms) return `Thêm ${item.extraTerms} kỳ từ ${formatDate(item.rescheduleFromDate)}`;
  if (item.adjustedDueDate) return `Kỳ ${formatDate(item.rescheduleFromDate)} sang ${formatDate(item.adjustedDueDate)}`;
  return `Từ kỳ ${formatDate(item.rescheduleFromDate)}`;
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
  const query = useRescheduleRequestsQuery({ page, size: SERVICING_PAGE_SIZE, status: 'PENDING_REVIEW' });
  const [pending, setPending] = useState<{ request: RescheduleRequest; decision: RescheduleDecision } | null>(null);
  const rows = query.data?.data ?? [];

  return (
    <>
      <QueueBody
        error={query.error}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRetry={query.refetch}
        total={query.data?.totalElements ?? 0}
        emptyText="Không có yêu cầu cơ cấu chờ duyệt."
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
                <th className="act"><span className="ui-sr-only">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.requestId}>
                  <td><span className="ui-code">{item.loanNumber}</span></td>
                  <td>{RESCHEDULE_TYPE_LABEL[item.requestType] ?? item.requestType}</td>
                  <td>{changeText(item)}</td>
                  <td className="num"><MaturityCell item={item} /></td>
                  <td className="svc-wrap">{item.reasonComment}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td className="act">
                    <RowMenu
                      label={`Thao tác với yêu cầu cơ cấu khoản vay ${item.loanNumber}`}
                      items={[
                        { key: 'approve', label: 'Duyệt', icon: 'checkCircle', onSelect: () => setPending({ request: item, decision: 'approve' }) },
                        { key: 'reject', label: 'Từ chối', icon: 'xCircle', danger: true, separatorBefore: true, onSelect: () => setPending({ request: item, decision: 'reject' }) },
                      ]}
                    />
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
    </>
  );
}
