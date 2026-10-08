import { StatusPill } from '@/components/StatusPill';
import { formatBusinessLabel, formatMoney, formatPercent, formatPercentagePoints } from '../../formatters';
import type { AdminLoanReviewDetail } from '../../types';
import { RepaymentSchedule } from './RepaymentSchedule';
import { ReviewCard } from './ReviewCard';
import { DIRECTION_COPY, formatDecimal, policyLabel, rateDirection } from '../../mappers/reviewDisplay';

function termsTitle(status: AdminLoanReviewDetail['status']): string {
  if (status === 'PENDING_REVIEW') return 'Điều khoản nếu duyệt';
  if (status === 'APPROVED') return 'Điều khoản đã duyệt';
  return 'Điều khoản sau định giá';
}

function DiffCell({ delta, format }: { delta: number; format: (value: number) => string }) {
  if (delta === 0) return <td className="num lr-diff-same">Không đổi</td>;
  return (
    <td className={`num ${delta < 0 ? 'lr-diff-lower' : 'lr-diff-higher'}`}>
      {delta > 0 ? '+' : ''}{format(delta)}
    </td>
  );
}

/**
 * So sánh điều khoản lúc nộp với điều khoản sau định giá, đặt ngay trong thẻ Khoản vay để người
 * thẩm định thấy mình sắp duyệt mức lãi nào. Mọi con số lấy từ hai lịch trả backend đã tính,
 * frontend chỉ trừ hai số để hiện chênh lệch.
 */
function TermsComparison({ application }: { application: AdminLoanReviewDetail }) {
  const finalRate = application.finalAnnualInterestRate;
  const finalSchedule = application.finalSchedule;
  const title = termsTitle(application.status);

  if (finalRate == null || !finalSchedule) {
    return (
      <>
        <h3 className="lr-sub-head">{title}<StatusPill tone="neutral" small>Chưa định giá</StatusPill></h3>
        <p className="lr-footnote">
          Chưa có lãi suất sau định giá. Lãi suất cơ sở lúc nộp là {formatPercent(application.annualInterestRate)}/năm.
        </p>
      </>
    );
  }

  const direction = rateDirection(application.annualInterestRate, finalRate);
  const copy = DIRECTION_COPY[direction];
  const initial = application.initialSchedule;
  // Làm tròn 4 chữ số để phép trừ số thực không sinh đuôi kiểu 0,49999999.
  const rateDelta = Math.round((finalRate - application.annualInterestRate) * 10_000) / 10_000;
  const rows = [
    { label: 'Lãi suất/năm', before: formatPercent(application.annualInterestRate), after: formatPercent(finalRate), delta: rateDelta, format: (v: number) => `${formatDecimal(v)} điểm %`, strong: true },
    { label: 'Kỳ trả đầu', before: formatMoney(initial.firstInstallment), after: formatMoney(finalSchedule.firstInstallment), delta: finalSchedule.firstInstallment - initial.firstInstallment, format: formatMoney },
    { label: 'Tổng tiền lãi', before: formatMoney(initial.totalInterest), after: formatMoney(finalSchedule.totalInterest), delta: finalSchedule.totalInterest - initial.totalInterest, format: formatMoney },
    { label: 'Tổng phải trả', before: formatMoney(initial.totalRepayment), after: formatMoney(finalSchedule.totalRepayment), delta: finalSchedule.totalRepayment - initial.totalRepayment, format: formatMoney, strong: true },
  ];

  return (
    <>
      <h3 className="lr-sub-head">{title}<StatusPill tone={copy.tone} small>{copy.label}</StatusPill></h3>
      <div className="ui-table-wrap">
        <table className="ui-table lr-terms-table">
          <thead>
            <tr>
              <th><span className="ui-sr-only">Hạng mục</span></th>
              <th className="num">Khi nộp hồ sơ</th>
              <th className="num">Sau định giá</th>
              <th className="num">Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="num">{row.before}</td>
                <td className={row.strong ? 'num strong' : 'num'}>{row.after}</td>
                <DiffCell delta={row.delta} format={row.format} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lr-footnote">
        Lãi suất điều chỉnh {formatPercentagePoints(application.pricingAdjustmentPercentagePoints)}
        {application.pricingPolicyVersion ? ` theo ${policyLabel(application.pricingPolicyVersion)}` : ''}
        {application.pricingCreditGrade ? ` cho hạng ${application.pricingCreditGrade}` : ''}. Số tiền và kỳ hạn giữ nguyên.
        {direction === 'higher' ? ' Mức lãi mới vẫn nằm trong khung của sản phẩm đã công bố.' : ''}
      </p>
    </>
  );
}

/** Thẻ "Khoản vay": điều kiện người vay chọn, điều khoản sau định giá và lịch trả từng kỳ. */
export function LoanTermsCard({ application }: { application: AdminLoanReviewDetail }) {
  const suggestedLimit = application.assessment?.suggestedLimit;
  return (
    <ReviewCard title="Khoản vay" aside="Người vay chọn lúc nộp hồ sơ">
      <dl className="lr-strip">
        <div>
          <dt>Số tiền đề nghị</dt>
          <dd>
            {formatMoney(application.requestedAmount)}
            {suggestedLimit != null ? <span className="lr-val-hint">Hạn mức gợi ý {formatMoney(suggestedLimit)}</span> : null}
          </dd>
        </div>
        <div><dt>Kỳ hạn</dt><dd>{application.requestedTermMonths} tháng</dd></div>
        <div>
          <dt>Mục đích vay</dt>
          <dd>
            {formatBusinessLabel(application.purposeCode)}
            {application.purposeDetail ? <span className="lr-val-hint">{application.purposeDetail}</span> : null}
          </dd>
        </div>
        <div><dt>Phương thức trả</dt><dd>{formatBusinessLabel(application.repaymentMethod)}</dd></div>
      </dl>
      <TermsComparison application={application} />
      <RepaymentSchedule application={application} />
    </ReviewCard>
  );
}
