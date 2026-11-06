import { StatusPill } from '@/components/StatusPill';
import { formatNumber } from '@/utils';
import { formatBusinessLabel, formatDateTime, formatMoney, formatMonths, formatPercent } from '../../formatters';
import type { AdminAssessmentExplanation, AdminLoanReviewDetail } from '../../types';
import { LoanTermsCard } from './LoanTermsCard';
import { BorrowerApplicationsCard } from '../BorrowerApplicationsCard';
import { ReviewCard, ReviewRows, type ReviewRow } from './ReviewCard';
import { formatRuleValue, reasonLabel, TRACE_FIELDS, aiReviewReasonLabels } from '../../mappers/reviewDisplay';
import { FOOTNOTE } from './reviewClassNames';

// Hai nhóm dòng cạnh nhau; dưới 900px xếp dọc, có vạch ngăn giữa hai nhóm và dòng cuối nhóm trên giữ khoảng đệm dưới.
const ROWS_2 =
  'lr-rows-2 grid grid-cols-2 gap-x-13.5 max-[900px]:grid-cols-1 max-[900px]:[&>.lr-rows+.lr-rows]:border-t max-[900px]:[&>.lr-rows+.lr-rows]:border-t-divider max-[900px]:[&>.lr-rows:first-child_.lr-row:last-child]:pb-1.5';

interface ReviewOverviewTabProps {
  application: AdminLoanReviewDetail;
  /** Giải thích AI nếu đã tải (hồ sơ chờ thẩm định tải ngay, hồ sơ khác khi mở tab Chi tiết chấm điểm). */
  explanation: AdminAssessmentExplanation | null;
  /** Đang tải giải thích: thay lời mời mở tab bằng dòng chờ. */
  explanationLoading: boolean;
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
    value: formatRuleValue(field, item.gia_tri),
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
export function ReviewOverviewTab({ application, explanation, explanationLoading, onOpenScoring }: ReviewOverviewTabProps) {
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
      // Lý do chỉ có nghĩa khi chưa đủ điều kiện; hồ sơ đủ điều kiện có thể mang mã cũ, không cần nhắc.
      hint: eligibility?.reasonCode && !eligible ? reasonLabel(eligibility.reasonCode) : null,
    },
    { key: 'kyc', label: 'Xác minh danh tính', value: eligibility ? formatBusinessLabel(eligibility.kycStatus) : '-' },
    { key: 'age', label: 'Tuổi lúc nộp', value: eligibility ? `${eligibility.age} tuổi` : '-' },
  ];
  const profileRight: ReviewRow[] = [
    { key: 'home', label: 'Nhà ở', value: formatBusinessLabel(financial.homeOwnership) },
    { key: 'edu', label: 'Học vấn', value: formatBusinessLabel(financial.educationLevel) },
    { key: 'source', label: 'Nguồn hồ sơ', value: eligibility ? formatBusinessLabel(eligibility.profileSource) : '-' },
  ];

  const reviewReasons = aiReviewReasonLabels(application.aiReviewReasons);
  // Chỉ hồ sơ AI chuyển cho người thẩm định mới có mục này; lần chấm cũ chưa lưu lý do thì ghi rõ.
  const aiSentToReview = application.assessment?.aiRecommendation === 'PENDING_REVIEW';

  return (
    <>
      {aiSentToReview && (
        <ReviewCard title="Vì sao hồ sơ cần người thẩm định" className="lr-ai-review-reasons">
          {reviewReasons.length > 0 ? (
            <ul className="list-disc pl-5 text-[14px] leading-[1.6]">
              {reviewReasons.map((label) => <li key={label}>{label}</li>)}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">Lần chấm này diễn ra trước khi hệ thống lưu lý do chuyển thẩm định.</p>
          )}
        </ReviewCard>
      )}
      <div className="lr-pair grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <ReviewCard title="Khả năng trả nợ" aside={formatBusinessLabel(financial.informationSource)}>
          <ReviewRows rows={capacity} />
        </ReviewCard>
        <ReviewCard title="Lịch sử tín dụng" aside={traceCredit.length ? 'CIC đọc lúc chấm điểm' : 'Tại FINORA'}>
          <ReviewRows rows={credit} />
          {/* Điểm CIC chỉ có trong vết chấm điểm: hồ sơ chờ thẩm định tải ngay, hồ sơ đã xử lý tải khi mở tab chi tiết. */}
          {scored && !explanation && explanationLoading ? (
            <p className={FOOTNOTE} aria-busy="true">Đang tải điểm CIC và số lần tra cứu lúc chấm...</p>
          ) : null}
          {scored && !explanation && !explanationLoading ? (
            <p className={FOOTNOTE}>
              Điểm CIC và số lần tra cứu lúc chấm nằm trong{' '}
              <button type="button" className="ui-link lr-inline-link text-[length:inherit]" onClick={onOpenScoring}>Chi tiết chấm điểm</button>.
            </p>
          ) : null}
        </ReviewCard>
      </div>

      <ReviewCard
        title="Nhân thân và điều kiện vay"
        aside={eligibility ? `Kiểm tra lúc ${formatDateTime(eligibility.checkedAt)}` : undefined}
      >
        <div className={ROWS_2}>
          <ReviewRows rows={profileLeft} />
          <ReviewRows rows={profileRight} />
        </div>
      </ReviewCard>

      <LoanTermsCard application={application} />

      <BorrowerApplicationsCard
        borrowerId={application.borrowerId}
        excludeApplicationNumber={application.applicationNumber}
        title="Hồ sơ khác của cùng người vay"
        emptyText="Người vay chưa có hồ sơ nào khác."
        limit={5}
      />
    </>
  );
}
