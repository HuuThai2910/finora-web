import { APPLICATION_STATUS_LABELS, formatBusinessLabel, formatDateTime } from '../../formatters';
import { AI_POLICY_REJECTED, AI_POLICY_REVIEW, aiReviewReasonLabels, policyRejectionLabels } from '../../mappers/reviewDisplay';
import type { LoanApplicationHistoryItem } from '../../types';
import { ReviewCard } from './ReviewCard';
import { MUTED } from './reviewClassNames';

// Mỗi mốc: chấm tròn + nội dung; vạch dọc nối từ dưới chấm tới mốc kế tiếp (mốc cuối không có vạch).
const ITEM =
  "relative grid grid-cols-[16px_1fr] gap-2 pb-3.5 last:pb-0 not-last:before:content-[''] not-last:before:absolute not-last:before:top-4.5 not-last:before:bottom-0 not-last:before:left-0.75 not-last:before:w-px not-last:before:bg-line";

const NOTE = 'mt-0.5 text-secondary text-[13px]';

interface HistoryTabProps {
  history: LoanApplicationHistoryItem[];
  displayName: (actorId: string | null | undefined) => string;
}

/** Lịch sử trạng thái gần nhất; backend trả mới nhất trước và có giới hạn số dòng. */
export function HistoryTab({ history, displayName }: HistoryTabProps) {
  return (
    <ReviewCard title="Lịch sử xử lý" aside="Mới nhất ở trên">
      {history.length === 0 ? (
        <p className={MUTED}>Chưa có lịch sử xử lý.</p>
      ) : (
        // Mốc mới nhất (đầu danh sách) chấm màu nhấn.
        <ol className="lr-timeline [&_li:first-child_.lr-timeline-dot]:bg-brand">
          {history.map((item) => (
            <li key={item.id} className={ITEM}>
              <span className="lr-timeline-dot size-2 mt-1.75 rounded-[50%] bg-line-strong" aria-hidden="true" />
              <div>
                <strong className="font-semibold">{APPLICATION_STATUS_LABELS[item.toStatus] ?? item.toStatus}</strong>
                <p className={NOTE}>
                  {item.fromStatus
                    ? `Chuyển từ ${APPLICATION_STATUS_LABELS[item.fromStatus] ?? item.fromStatus}`
                    : 'Hồ sơ được khởi tạo'}
                </p>
                {/* Chính sách tự từ chối: Loan ghi danh sách mã loại trực tiếp vào reasonDetail nên dịch từng mã. */}
                {item.reasonDetail && item.reasonCode === AI_POLICY_REJECTED ? (
                  <p className={`lr-timeline-reasons ${NOTE}`}>{policyRejectionLabels(item.reasonDetail).join('; ')}</p>
                ) : item.reasonDetail && item.reasonCode === AI_POLICY_REVIEW ? (
                  // Chuyển thẩm định: Loan ghi mã lý do chuyển (từ AI) vào reasonDetail.
                  <p className={`lr-timeline-reasons ${NOTE}`}>{aiReviewReasonLabels(item.reasonDetail).join('; ')}</p>
                ) : item.reasonDetail ? <p className={NOTE}>{item.reasonDetail}</p> : null}
                <span className="lr-timeline-meta block mt-0.5 text-muted text-[12px]">
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
