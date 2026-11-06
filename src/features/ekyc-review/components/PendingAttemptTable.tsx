import { useLocation, useNavigate } from 'react-router-dom';
import { StatusPill } from '@/components/StatusPill';
import { useActorNames } from '@/features/loan';
import { fromListState } from '@/lib/navigation';
import { ekycReviewDetailPath } from '../constants';
import {
  documentDecisionDisplay,
  formatDayTime,
  formatFaceScore,
  livenessDisplay,
  waitingLabel,
} from '../mappers/attemptDisplay';
import { FACE_ZONE_DISPLAY } from '../mappers/reasonDisplay';
import type { EkycAttemptSummary } from '../types';

/** Cột phụ ẩn bớt khi bảng hẹp; lớp `ekr-hide-*` giữ làm mốc. */
const HIDE_SM = 'ekr-hide-sm max-[760px]:hidden';
const HIDE_XS = 'ekr-hide-xs max-[520px]:hidden';

/** Tên khách: họ tên đã khai (tra theo mã hồ sơ, cần quyền Xem "Khách hàng"), không có thì chính email là tên. */
function CustomerCell({ attempt, fullName }: { attempt: EkycAttemptSummary; fullName: string | null }) {
  // Email dài được xuống dòng để cột thời điểm gửi vẫn nằm trong khung ở màn hẹp.
  return (
    <td className="whitespace-normal wrap-anywhere">
      <span className="ekr-queue-name block font-medium text-primary wrap-anywhere">{fullName || attempt.email}</span>
      {fullName ? <span className="ui-sub">{attempt.email}</span> : null}
    </td>
  );
}

/**
 * Hàng chờ duyệt tay theo lượt (`GET /admin/users/ekyc-attempts?status=MANUAL_REVIEW`), giữ thứ tự backend: lượt gửi
 * sớm nhất ở đầu, đã chờ bao lâu ghi ngay dưới thời điểm gửi. Bấm dòng (hoặc Enter) vào thẳng màn duyệt; `state` nhớ
 * URL hàng chờ để nút quay lại về đúng tab, đúng trang.
 */
export function PendingAttemptTable({ attempts }: { attempts: EkycAttemptSummary[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { names } = useActorNames(attempts.map((attempt) => String(attempt.userProfileId)));
  const open = (attempt: EkycAttemptSummary) =>
    navigate(ekycReviewDetailPath(attempt.attemptId), { state: fromListState(location) });

  return (
    <div className="ui-table-wrap">
      <table className="ui-table list ekr-queue-table">
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th>Gửi duyệt lúc</th>
            <th className={HIDE_SM}>Giấy tờ</th>
            <th className={HIDE_SM}>Kiểm tra người thật</th>
            <th className={HIDE_XS}>Điểm so mặt</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => {
            const document = documentDecisionDisplay(attempt.documentDecision);
            const liveness = livenessDisplay(attempt.livenessResult);
            const zone = attempt.faceMatchZone ? FACE_ZONE_DISPLAY[attempt.faceMatchZone] : null;
            const waiting = waitingLabel(attempt.submittedAt);
            const fullName = names[String(attempt.userProfileId)]?.fullName ?? null;
            return (
              <tr
                key={attempt.attemptId}
                className="clickable"
                tabIndex={0}
                aria-label={`Duyệt lượt xác minh của ${fullName || attempt.email}`}
                onClick={() => open(attempt)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.target === event.currentTarget) open(attempt);
                }}
              >
                <CustomerCell attempt={attempt} fullName={fullName} />
                <td>
                  {formatDayTime(attempt.submittedAt)}
                  {waiting ? <span className="ui-sub">{waiting}</span> : null}
                </td>
                <td className={HIDE_SM}><StatusPill tone={document.tone}>{document.label}</StatusPill></td>
                <td className={HIDE_SM}><StatusPill tone={liveness.tone}>{liveness.label}</StatusPill></td>
                <td className={HIDE_XS}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-semibold tabular-nums">{formatFaceScore(attempt.faceMatchScore)}</span>
                    {zone ? <StatusPill tone={zone.tone} small>{zone.label}</StatusPill> : null}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
