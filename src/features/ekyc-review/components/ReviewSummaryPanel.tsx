import { useId } from 'react';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import {
  attemptStatusDisplay,
  cardTypeLabel,
  consentLabel,
  documentDecisionDisplay,
  formatDayTime,
  formatFaceScore,
  livenessDisplay,
  shortId,
} from '../mappers/attemptDisplay';
import { FACE_ZONE_DISPLAY, faceMatchZone, toReasonViews } from '../mappers/reasonDisplay';
import type { EkycAttemptDetail, EkycReviewDecision } from '../types';
import { REVIEW_CARD, REVIEW_CARD_TITLE } from './reviewStyles';

const SUMMARY_ROW = 'flex items-center justify-between gap-3 py-2 border-b border-b-divider text-[13px] last:[border-bottom:0]';
const SUMMARY_VALUE = 'inline-flex items-center justify-end flex-wrap gap-1.5 min-w-0 font-medium text-right';
const DECIDE_BUTTON = 'h-9 px-3.5';

/** Vì sao lượt không còn (hoặc chưa) duyệt được, theo trạng thái hiện tại. */
const STATUS_NOTE: Record<string, string> = {
  VERIFIED: 'Hệ thống đã tự xác minh lượt này vì giấy tờ đạt tự động và liveness đạt.',
  IN_PROGRESS: 'Người dùng chưa hoàn tất lượt này.',
  ABANDONED: 'Lượt đã bị bỏ dở hoặc được thay bằng lần quét mới.',
};

/** Hệ quả của hai nút; trang chỉ trình bày dữ liệu và hệ quả, không khuyên người duyệt nên chọn gì. */
const PENDING_NOTE =
  'Duyệt sẽ ghi thông tin của bản nháp vào hồ sơ khách hàng; từ chối thì người dùng có thể xác minh lại.';

function decideNote(status: string, isPending: boolean, isDecided: boolean): string {
  if (isPending) return PENDING_NOTE;
  const why = isDecided ? undefined : STATUS_NOTE[status];
  return [why, 'Chỉ lượt đang chờ duyệt tay mới duyệt hoặc từ chối được.'].filter(Boolean).join(' ');
}

/**
 * Người duyệt: họ tên kèm email nếu backend tra được hồ sơ của admin; không có hồ sơ FINORA (admin tạo thẳng
 * trên Keycloak) thì chỉ còn mã rút gọn. Mã đầy đủ luôn nằm trong tooltip để đối chiếu nhật ký.
 */
function ReviewerLabel({ attempt }: { attempt: EkycAttemptDetail }) {
  const id = attempt.reviewerKeycloakId ?? '';
  const name = attempt.reviewerName?.trim();
  const email = attempt.reviewerEmail?.trim();
  if (!name && !email) {
    return <span className="ui-mono" title={id}>{shortId(id)}</span>;
  }
  return (
    <span title={id}>
      <strong>{name || email}</strong>
      {name && email ? <> · {email}</> : null}
    </span>
  );
}

function DecisionOutcome({ attempt }: { attempt: EkycAttemptDetail }) {
  const status = attemptStatusDisplay(attempt.status);
  return (
    <div className="ekr-outcome grid gap-1.5 mt-2">
      <div className="ekr-outcome-row flex items-center flex-wrap gap-2 text-secondary text-[13px]">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        {attempt.reviewedAt ? <span>{formatDayTime(attempt.reviewedAt)}</span> : null}
      </div>
      {attempt.reviewerKeycloakId ? (
        <p className="ekr-outcome-meta text-muted text-[12px]">
          Người duyệt <ReviewerLabel attempt={attempt} />
        </p>
      ) : null}
      {attempt.reviewNote ? (
        <p className="ekr-review-note pl-2.5 border-l-2 border-l-line-strong text-primary text-[13px] leading-[1.55] whitespace-pre-wrap wrap-anywhere">
          {attempt.reviewNote}
        </p>
      ) : null}
    </div>
  );
}

interface ReviewSummaryPanelProps {
  attempt: EkycAttemptDetail;
  /** Đang tải lại chi tiết: khoá nút để không quyết định trên trạng thái cũ. */
  refreshing: boolean;
  onDecide: (decision: EkycReviewDecision) => void;
}

/**
 * Cột phải: kết quả kiểm tra tóm tắt và khay quyết định. Nút Duyệt/Từ chối chỉ hiện khi lượt đang
 * `MANUAL_REVIEW`; backend vẫn là nơi chặn cuối (409 khi lượt đã được quyết định).
 */
export function ReviewSummaryPanel({ attempt, refreshing, onDecide }: ReviewSummaryPanelProps) {
  const noteId = useId();
  const decision = documentDecisionDisplay(attempt.documentDecision);
  const liveness = livenessDisplay(attempt.livenessResult);
  const zone = attempt.faceMatchZone ?? faceMatchZone(toReasonViews(attempt.livenessReasons));
  const isPending = attempt.status === 'MANUAL_REVIEW';
  const isDecided = attempt.status === 'APPROVED' || attempt.status === 'REJECTED';
  // Duyệt/Từ chối cần quyền Thao tác "Duyệt xác minh danh tính"; chỉ có quyền Xem thì khay chỉ hiện kết quả.
  const canDecide = usePermission().canAct('ekyc');

  return (
    // Cột phải dính khi cuộn (cuộn riêng nếu dài hơn màn hình). Màn hẹp còn một cột: khung này tan ra (`contents`) để
    // "Kết quả kiểm tra" lên đầu trang làm bức tranh chung, còn khay quyết định nằm cuối, sau bằng chứng.
    <aside
      className="ekr-aside sticky top-[calc(var(--header-height)+16px)] grid gap-3 max-h-[calc(100vh-var(--header-height)-32px)] overflow-y-auto max-[1180px]:contents"
      aria-label="Kết quả kiểm tra và quyết định"
    >
      <section className={`${REVIEW_CARD} ekr-summary-card max-[1180px]:-order-1`} aria-labelledby={`${noteId}-summary`}>
        <h2 id={`${noteId}-summary`} className={REVIEW_CARD_TITLE}>Kết quả kiểm tra</h2>
        <dl className="ekr-summary mt-1.5">
          <div className={SUMMARY_ROW}>
            <dt className="text-muted">Giấy tờ</dt>
            <dd className={SUMMARY_VALUE}><StatusPill tone={decision.tone}>{decision.label}</StatusPill></dd>
          </div>
          <div className={SUMMARY_ROW}>
            <dt className="text-muted">Loại thẻ</dt>
            <dd className={SUMMARY_VALUE}>{cardTypeLabel(attempt.cardType)}</dd>
          </div>
          <div className={SUMMARY_ROW}>
            <dt className="text-muted">Kiểm tra người thật</dt>
            <dd className={SUMMARY_VALUE}><StatusPill tone={liveness.tone}>{liveness.label}</StatusPill></dd>
          </div>
          <div className={SUMMARY_ROW}>
            <dt className="text-muted">Điểm so mặt</dt>
            <dd className={SUMMARY_VALUE}>
              <span className="ekr-score text-[16px] font-bold [font-variant-numeric:tabular-nums]">{formatFaceScore(attempt.faceMatchScore)}</span>
              {zone ? <StatusPill tone={FACE_ZONE_DISPLAY[zone].tone} small>{FACE_ZONE_DISPLAY[zone].label}</StatusPill> : null}
            </dd>
          </div>
          <div className={SUMMARY_ROW}>
            <dt className="text-muted">Điều khoản đã đồng ý</dt>
            <dd className={SUMMARY_VALUE} title={attempt.consentVersion ?? undefined}>{consentLabel(attempt.consentVersion)}</dd>
          </div>
        </dl>
      </section>

      <section className={`${REVIEW_CARD} ekr-decide bg-surface-muted`} aria-labelledby={`${noteId}-decide`}>
        <h2 id={`${noteId}-decide`} className={REVIEW_CARD_TITLE}>Quyết định</h2>
        {isDecided ? <DecisionOutcome attempt={attempt} /> : null}
        <p id={noteId} className="ekr-decide-note mt-2 mb-3 text-secondary text-[13px] leading-normal">
          {isPending && !canDecide
            ? 'Lượt đang chờ duyệt tay. Vai trò của bạn chỉ được xem; cần quyền Sửa "Duyệt xác minh danh tính" để duyệt hoặc từ chối.'
            : decideNote(attempt.status, isPending, isDecided)}
        </p>
        {/* Lượt không còn chờ duyệt tay (đã quyết định, tự xác minh, bỏ dở) thì không còn nút để bấm. */}
        {canDecide && isPending && (
          <div className="ekr-decide-row flex gap-2">
            <button
              type="button"
              className={`ui-btn ekr-btn-danger-outline ${DECIDE_BUTTON} bg-white border-danger text-danger hover:not-disabled:bg-danger-bg`}
              disabled={refreshing}
              aria-describedby={noteId}
              onClick={() => onDecide('reject')}
            >
              Từ chối
            </button>
            <button
              type="button"
              className={`ui-btn primary ekr-grow ${DECIDE_BUTTON} flex-1`}
              disabled={refreshing}
              aria-describedby={noteId}
              onClick={() => onDecide('approve')}
            >
              Duyệt
            </button>
          </div>
        )}
      </section>
    </aside>
  );
}
