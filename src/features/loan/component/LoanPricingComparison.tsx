import type { AdminLoanReviewDetail, ScheduleCalculationSnapshot } from '../types';
import { formatBusinessLabel, formatMoney, formatPercentagePoints, formatPercent } from '../formatters';

type Props = {
  application: AdminLoanReviewDetail;
};

function rateDirection(baseRate: number, finalRate: number): 'lower' | 'same' | 'higher' {
  if (finalRate < baseRate) return 'lower';
  if (finalRate > baseRate) return 'higher';
  return 'same';
}

function directionCopy(direction: ReturnType<typeof rateDirection>) {
  if (direction === 'lower') return {
    label: 'Lãi suất được giảm',
    detail: 'Kết quả đánh giá cho phép áp dụng mức thấp hơn lãi suất cơ sở.',
  };
  if (direction === 'higher') return {
    label: 'Lãi suất được điều chỉnh tăng',
    detail: 'Kết quả đánh giá dẫn tới mức lãi cao hơn, nhưng vẫn nằm trong khung Product đã công bố.',
  };
  return {
    label: 'Giữ nguyên lãi suất cơ sở',
    detail: 'Kết quả đánh giá không làm thay đổi mức lãi dùng khi người vay nộp hồ sơ.',
  };
}

function TermsColumn({
  title,
  rate,
  amount,
  termMonths,
  schedule,
  emphasized = false,
}: {
  title: string;
  rate: number;
  amount: number;
  termMonths: number;
  schedule: ScheduleCalculationSnapshot;
  emphasized?: boolean;
}) {
  return (
    <section className={`review-pricing-column${emphasized ? ' emphasized' : ''}`}>
      <span className="review-pricing-column-title">{title}</span>
      <strong className="review-pricing-rate">{formatPercent(rate)}/năm</strong>
      <dl>
        <div><dt>Số tiền vay</dt><dd>{formatMoney(amount)}</dd></div>
        <div><dt>Kỳ hạn</dt><dd>{termMonths} tháng</dd></div>
        <div><dt>Kỳ trả đầu</dt><dd>{formatMoney(schedule.firstInstallment)}</dd></div>
        <div><dt>Tổng tiền lãi</dt><dd>{formatMoney(schedule.totalInterest)}</dd></div>
        <div><dt>Tổng phải trả</dt><dd>{formatMoney(schedule.totalRepayment)}</dd></div>
      </dl>
    </section>
  );
}

/**
 * Đặt điều khoản ban đầu và điều khoản sau thẩm định cạnh nhau để admin ra quyết định
 * mà không phải chuyển qua lại giữa tab kết quả AI và tab lịch trả nợ.
 */
export default function LoanPricingComparison({ application }: Props) {
  const finalRate = application.finalAnnualInterestRate;
  const finalSchedule = application.finalSchedule;

  if (finalRate == null || !finalSchedule) {
    return (
      <article className="review-card review-pricing-comparison pending">
        <div>
          <span className="review-eyebrow">Điều khoản khoản vay</span>
          <h2>Đang chờ kết quả định giá sau thẩm định</h2>
          <p>Lãi suất cơ sở hiện tại là {formatPercent(application.annualInterestRate)}/năm. Hệ thống chưa chốt lịch trả cuối.</p>
        </div>
      </article>
    );
  }

  const direction = rateDirection(application.annualInterestRate, finalRate);
  const copy = directionCopy(direction);

  return (
    <article className={`review-card review-pricing-comparison ${direction}`}>
      <div className="review-pricing-heading">
        <div>
          <span className="review-eyebrow">So sánh điều khoản</span>
          <h2>{copy.label}</h2>
          <p>{copy.detail}</p>
        </div>
        <div className="review-pricing-badges">
          <span>Hạng {application.pricingCreditGrade ?? '—'}</span>
          <span>{formatBusinessLabel(application.decisionSource)}</span>
        </div>
      </div>

      <div className="review-pricing-columns">
        <TermsColumn
          title="Khi người vay nộp hồ sơ"
          rate={application.annualInterestRate}
          amount={application.requestedAmount}
          termMonths={application.requestedTermMonths}
          schedule={application.initialSchedule}
        />
        <div className="review-pricing-arrow" aria-hidden="true">→</div>
        <TermsColumn
          title="Sau đánh giá tín dụng"
          rate={finalRate}
          amount={application.requestedAmount}
          termMonths={application.requestedTermMonths}
          schedule={finalSchedule}
          emphasized
        />
      </div>

      <p className="review-pricing-note">
        Số tiền vay và kỳ hạn được giữ nguyên. Mức điều chỉnh thực tế là{' '}
        {formatPercentagePoints(application.pricingAdjustmentPercentagePoints)}
        {application.pricingPolicyVersion ? ` theo ${application.pricingPolicyVersion}` : ''}.
      </p>
    </article>
  );
}
