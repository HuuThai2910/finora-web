import type {
  DienGiaiNguoiDung,
  GiaiThichMoHinh,
  RuleTraceItem,
} from '@/features/credit-score/types';

import type { PageResponse, RepaymentMethod } from '@/features/product/types';

export type LoanApplicationStatus =
  | 'SUBMITTED' | 'ELIGIBILITY_PENDING' | 'SCORING' | 'SCORING_RETRY_PENDING'
  | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type CreditAssessmentStatus = 'PENDING' | 'PROCESSING' | 'RETRY_PENDING' | 'SUCCEEDED' | 'FAILED';
export type LoanDecisionSource = 'AI_POLICY' | 'ADMIN';

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
  assessment: AssessmentEvidence | null;
  version: number;
  submittedAt: string;
  /** ID quản trị viên đã ra quyết định; null khi hồ sơ chưa được duyệt hoặc từ chối. */
  adminDecidedBy: string | null;
  adminDecidedAt: string | null;
}

export interface AdminLoanReviewDetail extends AdminLoanReviewSummary {
  purposeCode: string;
  purposeDetail: string | null;
  pricingPolicyVersion: string | null;
  financialInformation: ApplicantFinancialInformation;
  schedule: ScheduleCalculationSnapshot;
  initialSchedule: ScheduleCalculationSnapshot;
  finalSchedule: ScheduleCalculationSnapshot | null;
  eligibility: EligibilityEvidence | null;
  creditProfile: CreditProfileEvidence | null;
  recentHistory: LoanApplicationHistoryItem[];
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

/* ── AI Config (finora-ai /api/v1/ai/config/product) ────────────────────── */

export interface GradeConfig {
  grade: string;
  min_score: number;
  max_score: number;
  limit: number;
}

export interface ApprovalThresholds {
  auto_approve: number;
  auto_reject: number;
}

export interface ModelWeights {
  pd_weight: number;
  risk_weight: number;
}

export interface LegalLimits {
  max_platform_limit: number;
  /** Trần tổng dư nợ một khách hàng trên toàn bộ nền tảng — QĐ 2866/QĐ-NHNN. */
  max_total_debt_all_platforms: number;
  max_interest_rate: number;
  max_term_months: number;
}

export interface AiProductConfig {
  grades: GradeConfig[];
  approval_thresholds: ApprovalThresholds;
  model_weights: ModelWeights;
  legal_limits: LegalLimits;
}

export interface AiProductConfigUpdate {
  grades: GradeConfig[];
  approval_thresholds: ApprovalThresholds;
  model_weights?: ModelWeights;
}

/* ── Re-exports from @/features/rule-engine and @/features/credit-score ─── */
export type {
  RuleBac,
  AiRule,
  AiTruong,
  AiRulesResponse,
  AiRulesUpdate,
} from '@/features/rule-engine';

export type {
  CreditScoreRequest,
  RuleTraceItem,
  CreditScoreResponse,
  YeuToAnhHuong,
  YeuToGop,
  TomTatYeuTo,
  GiaiThichMoHinh,
  DienGiaiNguoiDung,
  CreditExplainResponse,
} from '@/features/credit-score';

