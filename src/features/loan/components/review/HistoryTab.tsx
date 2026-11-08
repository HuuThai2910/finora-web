import { useMemo, useState } from 'react';
import { formatBusinessLabel, formatDateTime } from '../../formatters';
import { TIMELINE_STAGE_LABELS, describeTimelineItem, historyAsTimeline } from '../../mappers/timelineDisplay';
import type { LoanApplicationHistoryItem, LoanTimelineItem, TimelineStage } from '../../types';
import { ReviewCard } from './ReviewCard';
import { MUTED } from './reviewClassNames';

// Mỗi mốc: chấm tròn + nội dung; vạch dọc nối từ dưới chấm tới mốc kế tiếp (mốc cuối không có vạch).
const ITEM =
  "relative grid grid-cols-[16px_1fr] gap-2 pb-3.5 last:pb-0 not-last:before:content-[''] not-last:before:absolute not-last:before:top-4.5 not-last:before:bottom-0 not-last:before:left-0.75 not-last:before:w-px not-last:before:bg-line";

const NOTE = 'mt-0.5 text-secondary text-[13px]';

const DOT_TONE = {
  neutral: 'bg-line-strong',
  warning: 'bg-warning',
  success: 'bg-success',
} as const;

const CHIP = 'lr-timeline-chip inline-flex h-7 items-center gap-1.5 rounded-[999px] border border-line-strong bg-white px-3 '
  + 'text-[12px] font-medium text-secondary hover:text-primary '
  + 'aria-pressed:border-brand aria-pressed:bg-brand-50 aria-pressed:text-brand';

interface HistoryTabProps {
  history: LoanApplicationHistoryItem[];
  /** Lịch sử đầy đủ từ backend; backend cũ không có thì dùng lịch sử trạng thái hồ sơ. */
  timeline?: LoanTimelineItem[];
  displayName: (actorId: string | null | undefined) => string;
}

/**
 * Lịch sử xử lý của hồ sơ từ lúc nộp tới khi khoản vay đóng: thẩm định, gọi vốn (kể cả nhà đầu tư rút và gọi vốn bổ
 * sung), ký hợp đồng, giải ngân, gia hạn/cơ cấu, thu hồi nợ. Backend trả mới nhất trước.
 */
export function HistoryTab({ history, timeline, displayName }: HistoryTabProps) {
  const items = useMemo(() => timeline ?? historyAsTimeline(history), [timeline, history]);
  const [stage, setStage] = useState<TimelineStage | null>(null);
  const stages = (Object.keys(TIMELINE_STAGE_LABELS) as TimelineStage[])
    .filter((key) => items.some((item) => item.stage === key));
  const visible = stage ? items.filter((item) => item.stage === stage) : items;

  return (
    <ReviewCard title="Lịch sử xử lý" aside="Mới nhất ở trên">
      {items.length === 0 ? (
        <p className={MUTED}>Chưa có lịch sử xử lý.</p>
      ) : (
        <>
          {stages.length > 1 ? (
            <div className="lr-timeline-filter mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo giai đoạn">
              <button type="button" className={CHIP} aria-pressed={stage === null} onClick={() => setStage(null)}>
                Tất cả
              </button>
              {stages.map((key) => (
                <button key={key} type="button" className={CHIP} aria-pressed={stage === key} onClick={() => setStage(key)}>
                  {TIMELINE_STAGE_LABELS[key]}
                </button>
              ))}
            </div>
          ) : null}
          <ol className="lr-timeline">
            {visible.map((item) => {
              const view = describeTimelineItem(item, displayName);
              return (
                <li key={item.key} className={ITEM}>
                  <span
                    className={`lr-timeline-dot size-2 mt-1.75 rounded-[50%] ${DOT_TONE[view.tone]}`}
                    aria-hidden="true"
                  />
                  <div>
                    <strong className="font-semibold">{view.title}</strong>
                    {view.notes.map((note) => (
                      <p key={note} className={`lr-timeline-reasons ${NOTE}`}>{note}</p>
                    ))}
                    <span className="lr-timeline-meta block mt-0.5 text-muted text-[12px]">
                      {formatDateTime(item.occurredAt)} · {TIMELINE_STAGE_LABELS[item.stage]} · {formatBusinessLabel(item.actorType)}
                      {/* Người vay và tiến trình tự động không cần tên; quản trị viên và nhà đầu tư tra theo danh bạ. */}
                      {item.actorType === 'ADMIN' || item.actorType === 'INVESTOR' ? `: ${displayName(item.actorId)}` : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </ReviewCard>
  );
}
