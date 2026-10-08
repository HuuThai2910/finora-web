import type {
  DienGiaiNguoiDung,
  GiaiThichMoHinh,
  RuleTraceItem,
} from '@/features/credit-score';

import type { PageResponse, RepaymentMethod } from '@/features/product';

export type LoanApplicationStatus =
  | 'SUBMITTED' | 'ELIGIBILITY_PENDING' | 'SCORING' | 'SCORING_RETRY_PENDING'
  | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type CreditAssessmentStatus = 'PENDING' | 'PROCESSING' | 'RETRY_PENDING' | 'SUCCEEDED' | 'FAILED';
export type LoanDecisionSource = 'AI_POLICY' | 'ADMIN';
export type TermsConfirmationStatus = 'AUTO_AUTHORIZED' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface ApplicantFinancialInformation {
  declaredMonthlyIncome: number;
  annualIncomeSnapshot: number;
  employmentLengthMonths: number | null;
  educationLevel: string | null;
  homeOwnership: string;
  monthlyDebtObligations: number;
  dtiSnapshot: number;
  informationSource: string;
  capturedAt: string;
}

export interface SchedulePeriod {
  period: number;
  fromDate: string;
  dueDate: string;
  daysInPeriod: number;
  principal: number;
  interest: number;
  fees: number;
  penalties: number;
  totalDue: number;
  outstandingBalance: number;
}

export interface ScheduleCalculationSnapshot {
  id: number;
  expectedDisbursementDate: string;
  totalPrincipal: number;
  totalInterest: number;
  totalFees: number;
  totalPenalties: number;
  totalRepayment: number;
  firstInstallment: number;
  maximumInstallment: number;
  periods: SchedulePeriod[];
  calculationPolicyVersion: string;
  calculatedAt: string;
}

export interface EligibilityEvidence {
  age: number;
  kycStatus: 'VERIFIED' | 'PENDING' | 'PROCESSING' | 'REJECTED' | 'EXPIRED';
  profileSource: string;
  result: 'ELIGIBLE' | 'RETRY_PENDING' | 'INELIGIBLE' | 'DEPENDENCY_UNAVAILABLE' | 'INVALID_PROFILE';
  reasonCode: string | null;
  policyVersion: string;
  checkedAt: string;
}

export interface CreditProfileEvidence {
  hasInternalCreditHistory: boolean;
  internalDelinquenciesLast2Years: number;
  internalDefaultedLoanCount: number;
  completedLoanCount: number;
  source: string;
  calculationPolicyVersion: string;
}

export interface LoanApplicationHistoryItem {
  id: number;
  fromStatus: LoanApplicationStatus | null;
  toStatus: LoanApplicationStatus;
  reasonCode: string | null;
  reasonDetail: string | null;
  actorType: 'BORROWER' | 'ADMIN' | 'SYSTEM';
  actorId: string;
  createdAt: string;
}

export interface AssessmentEvidence {
  assessmentId: number;
  status: CreditAssessmentStatus;
  actualModelVersion: string | null;
  pdProbability: number | null;
  riskScore: number | null;
  evaluationScore: number | null;
  creditGrade: string | null;
  suggestedLimit: number | null;
  aiRecommendation: string | null;
  rejectionReason: string | null;
  decisionPolicyVersion: string | null;
  scoredAt: string | null;
}

export interface AdminLoanReviewSummary {
  applicationNumber: string;
  borrowerId: string;
  requestedAmount: number;
  requestedTermMonths: number;
  annualInterestRate: number;
  finalAnnualInterestRate: number | null;
  pricingCreditGrade: string | null;
  pricingAdjustmentPercentagePoints: number | null;
  decisionSource: LoanDecisionSource | null;
  repaymentMethod: RepaymentMethod;
  status: LoanApplicationStatus;
  termsConfirmationStatus: TermsConfirmationStatus | null;
  assessment: AssessmentEvidence | null;
  version: number;
  submittedAt: string;
  /** ID quản trị viên đã ra quyết định; null khi hồ sơ chưa được duyệt hoặc từ chối. */
  adminDecidedBy: string | null;
  adminDecidedAt: string | null;
  /** Mục đích vay (`LoanPurpose`) để bảng danh sách hiện icon và nhãn mà không gọi chi tiết từng hồ sơ. */
  purposeCode: string;
}

export interface AdminLoanReviewDetail extends AdminLoanReviewSummary {
  purposeDetail: string | null;
  pricingPolicyVersion: string | null;
  financialInformation: ApplicantFinancialInformation;
  schedule: ScheduleCalculationSnapshot;
  initialSchedule: ScheduleCalculationSnapshot;
  finalSchedule: ScheduleCalculationSnapshot | null;
  eligibility: EligibilityEvidence | null;
  creditProfile: CreditProfileEvidence | null;
  recentHistory: LoanApplicationHistoryItem[];
  termsVersion: string | null;
  termsExpiresAt: string | null;
}

/**
 * Phần giải thích của lần chấm điểm đã dùng để quyết định hồ sơ.
 *
 * Loan Service trả lại đúng bản AI sinh ra lúc chấm (`response_snapshot_json`),
 * không chấm lại — nên đây là bằng chứng cho quyết định đã ra, kể cả khi mô hình
 * hoặc bộ luật sau đó đã đổi.
 */
export interface AdminAssessmentExplanation {
  assessmentId: number;
  actualModelVersion: string | null;
  decisionPolicyVersion: string | null;
  scoredAt: string | null;
  borrowerExplanation: DienGiaiNguoiDung | null;
  modelExplanation: GiaiThichMoHinh | null;
  ruleTrace: RuleTraceItem[] | null;
}

export interface CreditAssessmentSummary {
  id: number;
  applicationId: number;
  requestId: string;
  status: CreditAssessmentStatus;
  attemptCount: number;
  requestedModelVersion: string;
  actualModelVersion: string | null;
  pdProbability: number | null;
  riskScore: number | null;
  evaluationScore: number | null;
  creditGrade: string | null;
  suggestedLimit: number | null;
  aiRecommendation: string | null;
  failureCode: string | null;
  nextRetryAt: string | null;
  scoredAt: string | null;
  createdAt: string;
}

export interface CreditAssessmentDetail extends CreditAssessmentSummary {
  version: number;
  failureDetail: string | null;
  inputSnapshot: Record<string, unknown>;
  inputSources: Record<string, unknown>;
  responseSnapshot: Record<string, unknown> | null;
}

export interface AdminDecisionResponse {
  applicationNumber: string;
  applicationStatus: LoanApplicationStatus;
  applicationVersion: number;
  decisionReasonCode: string;
  decisionPolicyVersion: string;
  adminDecidedBy: string | null;
  adminDecidedAt: string | null;
  termsConfirmationStatus: TermsConfirmationStatus | null;
  termsVersion: string | null;
  termsExpiresAt: string | null;
  contractNumber: string | null;
  contractStatus: string | null;
  contractVersion: number | null;
  documentHash: string | null;
  expiresAt: string | null;
}

export interface ScoringRetryAcceptedResponse {
  assessmentId: number;
  requestStatus: 'ACCEPTED';
  assessmentStatus: CreditAssessmentStatus;
  message: string;
  resultPath: string;
}

export type AdminLoanReviewPage = PageResponse<AdminLoanReviewSummary>;
export type AssessmentPage = PageResponse<CreditAssessmentSummary>;

/* ── Type giải thích AI dùng ở trang chi tiết hồ sơ (nguồn: @/features/credit-score) ── */
export type {
  RuleTraceItem,
  YeuToAnhHuong,
  YeuToGop,
  TomTatYeuTo,
  DienGiaiNguoiDung,
} from '@/features/credit-score';
