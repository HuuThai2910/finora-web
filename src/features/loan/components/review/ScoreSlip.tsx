import { StatusPill } from '@/components/StatusPill';
import { formatMoney, formatPercent } from '../../formatters';
import { recommendationLabel, recommendationTone } from '../../mappers/applicationListDisplay';
import type { AdminLoanReviewDetail } from '../../types';

interface ScoreSlipProps {
  application: AdminLoanReviewDetail;
  canRetry: boolean;
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
export function ScoreSlip({ application, canRetry, retrying, onRetry }: ScoreSlipProps) {
  const assessment = application.assessment;
  const scored = assessment?.status === 'SUCCEEDED' && assessment.evaluationScore != null;

  return (
    <section className="ui-card lr-slip-card lr-slip-summary" aria-labelledby="lr-slip-title">
      <h2 id="lr-slip-title">Kết quả chấm điểm</h2>
      {scored && assessment ? (
        <>
          <div className="lr-slip-score">
            <span className="lr-slip-num">{assessment.evaluationScore}</span>
            <span className="lr-slip-unit">điểm đánh giá</span>
            {assessment.creditGrade ? (
              <span className="lr-grade" role="img" aria-label={`Hạng tín dụng ${assessment.creditGrade}`}>
                <b>{assessment.creditGrade}</b>
                <span>hạng</span>
              </span>
            ) : null}
          </div>
          {assessment.aiRecommendation ? (
            <div className="lr-slip-verdict">
              <StatusPill tone={recommendationTone(assessment.aiRecommendation)} dot>
                {recommendationLabel(assessment.aiRecommendation)}
              </StatusPill>
            </div>
          ) : null}
          <dl className="lr-slip-data">
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
          {assessment.rejectionReason ? (
            <p className="lr-slip-remark"><span>Ghi chú khi chấm</span>{assessment.rejectionReason}</p>
          ) : null}
        </>
      ) : (
        <>
          <p className="lr-slip-note">{unscoredReason(application)}</p>
          {canRetry ? (
            <button type="button" className="ui-btn ghost lr-slip-retry" disabled={retrying} onClick={onRetry}>
              {retrying ? <><span className="lr-spinner" aria-hidden="true" />Đang gửi yêu cầu...</> : 'Yêu cầu chấm lại'}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
