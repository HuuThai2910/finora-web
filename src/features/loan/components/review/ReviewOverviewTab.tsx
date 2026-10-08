import { StatusPill } from '@/components/StatusPill';
import { formatNumber } from '@/utils';
import { formatBusinessLabel, formatDateTime, formatMoney, formatMonths, formatPercent } from '../../formatters';
import type { AdminAssessmentExplanation, AdminLoanReviewDetail } from '../../types';
import { LoanTermsCard } from './LoanTermsCard';
import { ReviewCard, ReviewRows, type ReviewRow } from './ReviewCard';
import { reasonLabel, TRACE_FIELDS } from '../../mappers/reviewDisplay';

interface ReviewOverviewTabProps {
  application: AdminLoanReviewDetail;
  /** Giải thích AI nếu đã tải (tab Chi tiết chấm điểm đã mở); chưa tải thì không gọi thêm. */
  explanation: AdminAssessmentExplanation | null;
  onOpenScoring: () => void;
}

/** Dòng lấy từ vết chấm điểm; luật không có trường này thì không hiện. */
function traceRow(explanation: AdminAssessmentExplanation | null, field: string): ReviewRow | null {
  const item = explanation?.ruleTrace?.find((trace) => trace.truong === field);
  const meta = TRACE_FIELDS[field];
  if (!item || !meta) return null;
  return {
    key: field,
    label: meta.label,
    value: item.gia_tri == null ? '-' : meta.format(item.gia_tri),
    missing: item.thieu_du_lieu,
  };
}

function internalHistoryRows(application: AdminLoanReviewDetail): ReviewRow[] {
  const profile = application.creditProfile;
  if (!profile) return [{ key: 'internal', label: 'Lịch sử vay tại FINORA', value: 'Chưa có dữ liệu' }];
  if (!profile.hasInternalCreditHistory) return [{ key: 'internal', label: 'Lịch sử vay tại FINORA', value: 'Chưa từng vay' }];
  return [
    { key: 'completed', label: 'Đã tất toán tại FINORA', value: `${formatNumber(profile.completedLoanCount)} khoản` },
    { key: 'late', label: 'Trễ hạn tại FINORA, 2 năm', value: `${formatNumber(profile.internalDelinquenciesLast2Years)} lần` },
    { key: 'default', label: 'Vỡ nợ tại FINORA', value: `${formatNumber(profile.internalDefaultedLoanCount)} khoản` },
  ];
}

/** Tab "Thẩm định": các căn cứ đọc từ trên xuống, kết thúc bằng điều khoản sẽ ký. */
export function ReviewOverviewTab({ application, explanation, onOpenScoring }: ReviewOverviewTabProps) {
  const financial = application.financialInformation;
  const eligibility = application.eligibility;
  const scored = application.assessment?.status === 'SUCCEEDED';

  const capacity = [
    { key: 'income', label: 'Thu nhập hằng tháng', value: formatMoney(financial.declaredMonthlyIncome) },
    { key: 'debt', label: 'Nợ phải trả hằng tháng', value: formatMoney(financial.monthlyDebtObligations) },
    { key: 'dti', label: 'Tỷ lệ nợ trên thu nhập (DTI)', value: formatPercent(financial.dtiSnapshot) },
    traceRow(explanation, 'ty_le_tra_no_thang'),
    { key: 'emp', label: 'Thâm niên làm việc', value: formatMonths(financial.employmentLengthMonths) },
  ].filter((row): row is ReviewRow => row !== null);

  const traceCredit = [traceRow(explanation, 'cic_score'), traceRow(explanation, 'so_lan_tra_cuu')]
    .filter((row): row is ReviewRow => row !== null);
  const credit = [...traceCredit, ...internalHistoryRows(application)];

  const eligible = eligibility?.result === 'ELIGIBLE';
  const profileLeft: ReviewRow[] = [
    {
      key: 'elig',
      label: 'Điều kiện vay',
      value: eligibility
        ? <StatusPill tone={eligible ? 'success' : 'danger'} small>{formatBusinessLabel(eligibility.result)}</StatusPill>
        : 'Chưa kiểm tra',
      hint: eligibility?.reasonCode ? reasonLabel(eligibility.reasonCode) : null,
    },
    { key: 'kyc', label: 'Định danh eKYC', value: eligibility ? formatBusinessLabel(eligibility.kycStatus) : '-' },
    { key: 'age', label: 'Tuổi lúc nộp', value: eligibility ? `${eligibility.age} tuổi` : '-' },
  ];
  const profileRight: ReviewRow[] = [
    { key: 'home', label: 'Nhà ở', value: formatBusinessLabel(financial.homeOwnership) },
    { key: 'edu', label: 'Học vấn', value: formatBusinessLabel(financial.educationLevel) },
    { key: 'source', label: 'Nguồn hồ sơ', value: eligibility ? formatBusinessLabel(eligibility.profileSource) : '-' },
  ];

  return (
    <>
      <div className="lr-pair">
        <ReviewCard title="Khả năng trả nợ" aside={formatBusinessLabel(financial.informationSource)}>
          <ReviewRows rows={capacity} />
        </ReviewCard>
        <ReviewCard title="Lịch sử tín dụng" aside={traceCredit.length ? 'CIC đọc lúc chấm điểm' : 'Tại FINORA'}>
          <ReviewRows rows={credit} />
          {/* Điểm CIC chỉ có trong vết chấm điểm, tải khi mở tab chi tiết để trang mở nhanh. */}
          {scored && !explanation ? (
            <p className="lr-footnote">
              Điểm CIC và số lần tra cứu lúc chấm nằm trong{' '}
              <button type="button" className="ui-link lr-inline-link" onClick={onOpenScoring}>Chi tiết chấm điểm</button>.
            </p>
          ) : null}
        </ReviewCard>
      </div>

      <ReviewCard
        title="Nhân thân và điều kiện vay"
        aside={eligibility ? `Kiểm tra lúc ${formatDateTime(eligibility.checkedAt)}` : undefined}
      >
        <div className="lr-rows-2">
          <ReviewRows rows={profileLeft} />
          <ReviewRows rows={profileRight} />
        </div>
      </ReviewCard>

      <LoanTermsCard application={application} />
    </>
  );
}
