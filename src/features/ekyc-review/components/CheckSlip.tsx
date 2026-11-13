import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { usePermission } from '@/features/auth';
import { formatDayTime, formatFaceScore } from '../mappers/attemptDisplay';
import { faceMatchZone } from '../mappers/reasonDisplay';
import type { EkycAttemptDetail, EkycReviewDecision } from '../types';

/** Chỉ tô màu khi cần chú ý; kết quả đạt để chữ thường. */
const TONE_TEXT = { ok: '', warning: 'text-warning', danger: 'text-danger' } as const;

const DOCUMENT: Record<string, [string, keyof typeof TONE_TEXT]> = {
  AUTO_OK: ['Đạt tự động', 'ok'],
  NEEDS_REVIEW: ['Cần duyệt tay', 'warning'],
};

const LIVENESS: Record<string, [string, keyof typeof TONE_TEXT]> = {
  PASS: ['Đạt', 'ok'],
  REVIEW: ['Cần xem thêm', 'warning'],
  FAIL: ['Không đạt', 'danger'],
};

const ZONE: Record<string, [string, keyof typeof TONE_TEXT]> = {
  HIGH: ['khớp cao', 'ok'],
  GRAY: ['vùng xám', 'warning'],
  LOW: ['không khớp', 'danger'],
};

const ROWS =
  'grid gap-2 [&>div]:flex [&>div]:items-baseline [&>div]:justify-between [&>div]:gap-3 [&>div]:text-[13px] ' +
  '[&_dt]:flex-none [&_dt]:text-muted [&_dd]:min-w-0 [&_dd]:text-right [&_dd]:font-medium [&_dd]:tabular-nums [&_dd]:wrap-anywhere';

function Toned({ text, tone }: { text: string; tone: keyof typeof TONE_TEXT }) {
  return <span className={TONE_TEXT[tone] || undefined}>{text}</span>;
}

function Rows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className={ROWS}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Người duyệt theo hồ sơ FINORA (họ tên, không có thì email); admin không có hồ sơ thì không rõ tên. */
function reviewerOf(attempt: EkycAttemptDetail): string {
  return attempt.reviewerName?.trim() || attempt.reviewerEmail?.trim() || 'Không rõ';
}

interface CheckSlipProps {
  attempt: EkycAttemptDetail;
  /** Đang tải lại chi tiết: khoá nút để không quyết định trên trạng thái cũ. */
  refreshing: boolean;
  onDecide: (decision: EkycReviewDecision) => void;
}

/**
 * Cột phải màn duyệt: kết quả kiểm tra tự động, rồi hai nút Duyệt/Từ chối (lượt đang chờ) hoặc người đã quyết định.
 * Trạng thái của lượt đã ở nhãn đầu trang nên không nhắc lại. Backend vẫn là nơi chặn cuối (409 khi lượt đã được quyết
 * định).
 */
export function CheckSlip({ attempt, refreshing, onDecide }: CheckSlipProps) {
  const canDecide = usePermission().canAct('ekyc');
  const doc = DOCUMENT[attempt.documentDecision] ?? [attempt.documentDecision, 'warning'];
  const liveness = attempt.livenessResult ? LIVENESS[attempt.livenessResult] ?? [attempt.livenessResult, 'warning'] : null;
  const zoneCode = attempt.faceMatchZone ?? faceMatchZone(attempt.livenessReasons);
  const zone = zoneCode ? ZONE[zoneCode] : null;
  const isPending = attempt.status === 'MANUAL_REVIEW';
  const approved = attempt.status === 'APPROVED';
  const decided = approved || attempt.status === 'REJECTED';

  const rows: Array<[string, ReactNode]> = [
    ['Giấy tờ', <Toned text={doc[0]} tone={doc[1]} />],
    ['Người thật', liveness ? <Toned text={liveness[0]} tone={liveness[1]} /> : <span className="font-normal text-muted">Chưa quay</span>],
  ];
  if (attempt.faceMatchScore != null) {
    const score = formatFaceScore(attempt.faceMatchScore);
    rows.push(['So khuôn mặt', zone ? <Toned text={`${score} (${zone[0]})`} tone={zone[1]} /> : score]);
  }
  rows.push(['Gửi lúc', formatDayTime(attempt.submittedAt)]);

  const decision: Array<[string, ReactNode]> = decided
    ? [[approved ? 'Duyệt bởi' : 'Từ chối bởi', reviewerOf(attempt)], ['Lúc', formatDayTime(attempt.reviewedAt)]]
    : [];

  return (
    <aside
      className="ekr-aside sticky top-[calc(var(--header-height)+16px)] max-[1180px]:static max-[1180px]:-order-1"
      aria-label="Kiểm tra tự động"
    >
      <section className="ui-card pt-3.5 px-4.5 pb-4 max-[600px]:px-3.5">
        <h2 className="mb-3 text-[15px] font-semibold leading-[1.4]">Kiểm tra tự động</h2>
        <Rows rows={rows} />

        {isPending && canDecide && (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-t-divider pt-3.5">
            <button type="button" className="ui-btn primary h-9" disabled={refreshing} onClick={() => onDecide('approve')}>
              <Icon name="checkCircle" />
              Duyệt
            </button>
            <button type="button" className="ui-btn outline-danger h-9" disabled={refreshing} onClick={() => onDecide('reject')}>
              <Icon name="xCircle" />
              Từ chối
            </button>
          </div>
        )}
        {isPending && !canDecide && (
          <p className="mt-4 border-t border-t-divider pt-3 text-[13px] text-muted">
            Cần quyền Sửa "Duyệt xác minh danh tính" để duyệt hoặc từ chối.
          </p>
        )}

        {decided && (
          <>
            <h3 className="mt-3.5 mb-2.5 border-t border-t-divider pt-3 text-[13px] font-semibold text-secondary">Quyết định</h3>
            <Rows rows={decision} />
            {attempt.reviewNote && (
              <div className="mt-2 grid gap-0.5 text-[13px]">
                <span className="text-muted">{approved ? 'Ghi chú' : 'Lý do từ chối'}</span>
                <span className="font-medium whitespace-pre-wrap wrap-anywhere">{attempt.reviewNote}</span>
              </div>
            )}
          </>
        )}
      </section>
    </aside>
  );
}
