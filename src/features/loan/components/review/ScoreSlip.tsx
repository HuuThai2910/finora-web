import { StatusPill } from '@/components/StatusPill';
import { formatMoney, formatPercent, formatScore } from '../../formatters';
import { recommendationLabel, recommendationTone } from '../../mappers/applicationListDisplay';
import { policyRejectionLabels } from '../../mappers/reviewDisplay';
import type { AdminLoanReviewDetail } from '../../types';
import { SPINNER } from './reviewClassNames';

// Phần trên của phiếu kết luận: bo góc dưới về 0 để nối liền khay quyết định. Dưới 1180px phiếu tách đôi
// nên phần này thành thẻ riêng, đủ viền, bo đủ bốn góc và lên đầu trang (order -1).
const SUMMARY_CARD =
  'ui-card lr-slip-card lr-slip-summary py-4 px-4.5 rounded-b-none max-[1180px]:[border:1px_solid_var(--color-line)] max-[1180px]:rounded-lg max-[1180px]:-order-1';

const SLIP_DATA =
  'lr-slip-data grid gap-2 mt-3.5 pt-3 border-t border-t-divider [&_div]:flex [&_div]:justify-between [&_div]:items-baseline [&_div]:gap-3 [&_div]:text-[13px] [&_dt]:text-muted [&_dd]:font-medium [&_dd]:tabular-nums [&_dd]:text-right [&_dd_small]:block [&_dd_small]:text-muted [&_dd_small]:text-[12px] [&_dd_small]:font-normal';

interface ScoreSlipProps {
  application: AdminLoanReviewDetail;
  /** Hiện nút "Yêu cầu chấm lại": lần chấm gần nhất lỗi hoặc đang chờ thử lại. */
  showRetry: boolean;
  /** Lý do khóa nút, hiện ở tooltip; `null` khi Loan nhận yêu cầu ở trạng thái hiện tại. */
  retryBlockedReason: string | null;
  retrying: boolean;
  onRetry: () => void;
}

function unscoredReason(application: AdminLoanReviewDetail): string {
  const assessment = application.assessment;
  if (!assessment) {
    return application.eligibility && application.eligibility.result !== 'ELIGIBLE'
      ? 'Hồ sơ dừng ở bước kiểm tra điều kiện nên không được chấm điểm.'
      : 'Hồ sơ chưa được chấm điểm.';
  }
  if (assessment.status === 'FAILED') return 'Lần chấm điểm gần nhất không thành công.';
  if (assessment.status === 'RETRY_PENDING') return 'Lần chấm điểm gần nhất chưa xong, hệ thống đang chờ thử lại.';
  return 'Hệ thống đang chấm điểm hồ sơ này.';
}

/**
 * Phiếu kết quả chấm điểm ở cột phải. Vùng khuyến nghị lấy từ `aiRecommendation` của backend;
 * trang không vẽ thang ngưỡng điểm vì ngưỡng là cấu hình chính sách tại thời điểm chấm, không có
 * trong dữ liệu hồ sơ.
 */
export function ScoreSlip({ application, showRetry, retryBlockedReason, retrying, onRetry }: ScoreSlipProps) {
  const assessment = application.assessment;
  const scored = assessment?.status === 'SUCCEEDED' && assessment.evaluationScore != null;

  return (
    <section className={SUMMARY_CARD} aria-labelledby="lr-slip-title">
      <h2 id="lr-slip-title" className="text-[14px] font-semibold">Kết quả chấm điểm</h2>
      {scored && assessment ? (
        <>
          <div className="lr-slip-score flex items-end gap-2 mt-2.5">
            <span className="lr-slip-num text-[40px] font-semibold leading-none tabular-nums">{formatScore(assessment.evaluationScore)}</span>
            <span className="lr-slip-unit pb-1 text-muted text-[13px]">điểm đánh giá</span>
            {assessment.creditGrade ? (
              <span
                className="lr-grade grid place-items-center min-w-11 h-11 ml-auto px-2 border border-line-strong rounded-md leading-[1.15] text-center"
                role="img"
                aria-label={`Hạng tín dụng ${assessment.creditGrade}`}
              >
                <b className="text-[18px] font-semibold">{assessment.creditGrade}</b>
                <span className="text-muted text-[12px]">hạng</span>
              </span>
            ) : null}
          </div>
          {assessment.aiRecommendation ? (
            <div className="lr-slip-verdict mt-3">
              <StatusPill tone={recommendationTone(assessment.aiRecommendation)} dot>
                {recommendationLabel(assessment.aiRecommendation)}
              </StatusPill>
            </div>
          ) : null}
          <dl className={SLIP_DATA}>
            <div><dt>Xác suất vỡ nợ (PD)</dt><dd>{formatPercent(assessment.pdProbability, true)}</dd></div>
            <div><dt>Hạn mức gợi ý</dt><dd>{formatMoney(assessment.suggestedLimit)}</dd></div>
            <div>
              <dt>Lãi suất sau định giá</dt>
              <dd>
                {application.finalAnnualInterestRate != null ? (
                  <>
                    {formatPercent(application.finalAnnualInterestRate)}/năm
                    <small>cơ sở {formatPercent(application.annualInterestRate)}</small>
                  </>
                ) : '-'}
              </dd>
            </div>
          </dl>
          {/* `rejectionReason` là các mã loại trực tiếp nối bằng ", "; dịch từng mã, không hiện mã gốc. */}
          {assessment.rejectionReason ? (
            <div className="lr-slip-remark mt-3 py-2 px-2.5 rounded-md bg-warning-bg text-[13px] leading-normal">
              <span className="block text-warning text-[12px] font-medium">Lý do loại theo chính sách</span>
              <ul className="lr-slip-reasons grid gap-0.5">
                {policyRejectionLabels(assessment.rejectionReason).map((label) => <li key={label}>{label}</li>)}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="lr-slip-note mt-2 text-secondary text-[13px] leading-normal">{unscoredReason(application)}</p>
          {showRetry ? (
            <button
              type="button"
              className="ui-btn ghost lr-slip-retry w-full mt-3"
              disabled={retrying || retryBlockedReason != null}
              title={retryBlockedReason ?? undefined}
              onClick={onRetry}
            >
              {retrying ? <><span className={SPINNER} aria-hidden="true" />Đang gửi yêu cầu...</> : 'Yêu cầu chấm lại'}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
