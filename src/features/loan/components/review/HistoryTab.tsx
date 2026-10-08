import { APPLICATION_STATUS_LABELS, formatBusinessLabel, formatDateTime } from '../../formatters';
import type { LoanApplicationHistoryItem } from '../../types';
import { ReviewCard } from './ReviewCard';

interface HistoryTabProps {
  history: LoanApplicationHistoryItem[];
  displayName: (actorId: string | null | undefined) => string;
}

/** Lịch sử trạng thái gần nhất; backend trả mới nhất trước và có giới hạn số dòng. */
export function HistoryTab({ history, displayName }: HistoryTabProps) {
  return (
    <ReviewCard title="Lịch sử xử lý" aside="Mới nhất ở trên">
      {history.length === 0 ? (
        <p className="lr-muted">Chưa có lịch sử xử lý.</p>
      ) : (
        <ol className="lr-timeline">
          {history.map((item) => (
            <li key={item.id}>
              <span className="lr-timeline-dot" aria-hidden="true" />
              <div>
                <strong>{APPLICATION_STATUS_LABELS[item.toStatus] ?? item.toStatus}</strong>
                <p>
                  {item.fromStatus
                    ? `Chuyển từ ${APPLICATION_STATUS_LABELS[item.fromStatus] ?? item.fromStatus}`
                    : 'Hồ sơ được khởi tạo'}
                </p>
                {item.reasonDetail ? <p>{item.reasonDetail}</p> : null}
                <span className="lr-timeline-meta">
                  {formatDateTime(item.createdAt)} · {formatBusinessLabel(item.actorType)}
                  {/* Chỉ tra tên quản trị viên: người vay và tiến trình tự động không nằm trong danh bạ quản trị. */}
                  {item.actorType === 'ADMIN' ? `: ${displayName(item.actorId)}` : null}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ReviewCard>
  );
}
