import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { ekycReviewDetailPath } from '../constants';
import {
  cardTypeLabel,
  documentDecisionDisplay,
  formatDayTime,
  formatFaceScore,
  livenessDisplay,
} from '../mappers/attemptDisplay';
import { toReasonViews } from '../mappers/reasonDisplay';
import type { EkycAttemptSummary } from '../types';

/** Số lý do hiện trong ô; phần còn lại gom thành "+N", xem đủ ở trang chi tiết. */
const REASON_PREVIEW = 2;

function ReasonPreview({ codes }: { codes: string[] | null }) {
  const reasons = toReasonViews(codes);
  if (reasons.length === 0) return <span className="ekr-muted">Không có</span>;
  const more = reasons.length - REASON_PREVIEW;
  return (
    <ul className="ekr-reason-preview">
      {reasons.slice(0, REASON_PREVIEW).map((reason) => (
        <li key={reason.code} title={reason.code}>{reason.label}</li>
      ))}
      {more > 0 ? <li className="more">+{more} lý do khác</li> : null}
    </ul>
  );
}

/** Bảng lượt eKYC. Cả dòng bấm được để mở chi tiết; nút cuối dòng giữ cho bàn phím và trình đọc màn hình. */
export function AttemptTable({ attempts }: { attempts: EkycAttemptSummary[] }) {
  const navigate = useNavigate();

  return (
    <div className="ui-table-wrap">
      <table className="ui-table list ekr-table">
        <thead>
          <tr>
            <th>Thời gian gửi</th>
            <th>Email</th>
            <th className="hide-md">Loại thẻ</th>
            <th>Quyết định giấy tờ</th>
            <th>Kết quả liveness</th>
            <th className="num">Điểm so mặt</th>
            <th className="hide-sm">Lý do</th>
            <th><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => {
            const path = ekycReviewDetailPath(attempt.attemptId);
            const decision = documentDecisionDisplay(attempt.documentDecision);
            const liveness = livenessDisplay(attempt.livenessResult);
            return (
              <tr
                key={attempt.attemptId}
                className="clickable"
                tabIndex={0}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a')) return;
                  navigate(path);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.target === event.currentTarget) navigate(path);
                }}
              >
                <td>
                  {/* Lượt chưa gửi duyệt không có `submittedAt`: hiện thời điểm bắt đầu và ghi rõ. */}
                  {formatDayTime(attempt.submittedAt ?? attempt.createdAt)}
                  {attempt.submittedAt ? null : <span className="ui-sub">Thời điểm bắt đầu</span>}
                </td>
                <td>
                  <span className="ekr-email">{attempt.email}</span>
                  <span className="ui-sub">Khách hàng #{attempt.userProfileId}</span>
                </td>
                <td className="hide-md">{cardTypeLabel(attempt.cardType)}</td>
                <td><StatusPill tone={decision.tone}>{decision.label}</StatusPill></td>
                <td><StatusPill tone={liveness.tone}>{liveness.label}</StatusPill></td>
                <td className="num">{formatFaceScore(attempt.faceMatchScore)}</td>
                <td className="hide-sm ekr-reasons-cell"><ReasonPreview codes={attempt.reasons} /></td>
                <td className="num">
                  <Link className="ui-btn soft" to={path}>
                    Xem
                    <Icon name="arrowRight" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
