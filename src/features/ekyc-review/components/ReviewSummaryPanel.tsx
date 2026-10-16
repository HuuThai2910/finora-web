import { useId } from 'react';
import { StatusPill } from '@/components/StatusPill';
import { EMPTY } from '@/utils';
import {
  attemptStatusDisplay,
  cardTypeLabel,
  documentDecisionDisplay,
  formatDayTime,
  formatFaceScore,
  livenessDisplay,
  shortId,
} from '../mappers/attemptDisplay';
import { FACE_ZONE_DISPLAY, faceMatchZone, toReasonViews } from '../mappers/reasonDisplay';
import type { EkycAttemptDetail, EkycReviewDecision } from '../types';

/** Vì sao lượt không còn (hoặc chưa) duyệt được, theo trạng thái hiện tại. */
const STATUS_NOTE: Record<string, string> = {
  VERIFIED: 'Hệ thống đã tự xác minh lượt này vì giấy tờ đạt tự động và liveness đạt.',
  IN_PROGRESS: 'Người dùng chưa hoàn tất lượt này.',
  ABANDONED: 'Lượt đã bị bỏ dở hoặc được thay bằng lần quét mới.',
};

const PENDING_NOTE =
  'Đối chiếu ảnh thẻ, video và các trường trước khi quyết định. Duyệt sẽ ghi thông tin của bản nháp vào hồ sơ khách hàng; từ chối thì người dùng có thể xác minh lại.';

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
    <div className="ekr-outcome">
      <div className="ekr-outcome-row">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        {attempt.reviewedAt ? <span>{formatDayTime(attempt.reviewedAt)}</span> : null}
      </div>
      {attempt.reviewerKeycloakId ? (
        <p className="ekr-outcome-meta">
          Người duyệt <ReviewerLabel attempt={attempt} />
        </p>
      ) : null}
      {attempt.reviewNote ? <p className="ekr-review-note">{attempt.reviewNote}</p> : null}
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
 * Cột phải: kết quả kiểm tra tóm tắt và khay quyết định. Nút Duyệt/Từ chối chỉ bật khi lượt đang
 * `MANUAL_REVIEW`; backend vẫn là nơi chặn cuối (409 khi lượt đã được quyết định).
 */
export function ReviewSummaryPanel({ attempt, refreshing, onDecide }: ReviewSummaryPanelProps) {
  const noteId = useId();
  const decision = documentDecisionDisplay(attempt.documentDecision);
  const liveness = livenessDisplay(attempt.livenessResult);
  const zone = attempt.faceMatchZone ?? faceMatchZone(toReasonViews(attempt.livenessReasons));
  const isPending = attempt.status === 'MANUAL_REVIEW';
  const isDecided = attempt.status === 'APPROVED' || attempt.status === 'REJECTED';

  return (
    <aside className="ekr-aside" aria-label="Kết quả kiểm tra và quyết định">
      <section className="ui-card ekr-card" aria-labelledby={`${noteId}-summary`}>
        <h2 id={`${noteId}-summary`}>Kết quả kiểm tra</h2>
        <dl className="ekr-summary">
          <div>
            <dt>Giấy tờ</dt>
            <dd><StatusPill tone={decision.tone}>{decision.label}</StatusPill></dd>
          </div>
          <div>
            <dt>Loại thẻ</dt>
            <dd>{cardTypeLabel(attempt.cardType)}</dd>
          </div>
          <div>
            <dt>Liveness</dt>
            <dd><StatusPill tone={liveness.tone}>{liveness.label}</StatusPill></dd>
          </div>
          <div>
            <dt>Điểm so mặt</dt>
            <dd>
              <span className="ekr-score">{formatFaceScore(attempt.faceMatchScore)}</span>
              {zone ? <StatusPill tone={FACE_ZONE_DISPLAY[zone].tone} small>{FACE_ZONE_DISPLAY[zone].label}</StatusPill> : null}
            </dd>
          </div>
          <div>
            <dt>Điều khoản đã đồng ý</dt>
            <dd className="ui-mono">{attempt.consentVersion ?? EMPTY}</dd>
          </div>
        </dl>
      </section>

      <section className="ui-card ekr-card ekr-decide" aria-labelledby={`${noteId}-decide`}>
        <h2 id={`${noteId}-decide`}>Quyết định</h2>
        {isDecided ? <DecisionOutcome attempt={attempt} /> : null}
        <p id={noteId} className="ekr-decide-note">{decideNote(attempt.status, isPending, isDecided)}</p>
        <div className="ekr-decide-row">
          <button
            type="button"
            className="ui-btn ekr-btn-danger-outline"
            disabled={!isPending || refreshing}
            aria-describedby={noteId}
            onClick={() => onDecide('reject')}
          >
            Từ chối
          </button>
          <button
            type="button"
            className="ui-btn primary ekr-grow"
            disabled={!isPending || refreshing}
            aria-describedby={noteId}
            onClick={() => onDecide('approve')}
          >
            Duyệt
          </button>
        </div>
      </section>
    </aside>
  );
}
