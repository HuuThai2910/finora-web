import type { PageResponse, RepaymentMethod } from '@/features/product/types';

export type LoanApplicationStatus =
  | 'SUBMITTED' | 'ELIGIBILITY_PENDING' | 'SCORING' | 'SCORING_RETRY_PENDING'
  | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
export type CreditAssessmentStatus = 'PENDING' | 'PROCESSING' | 'RETRY_PENDING' | 'SUCCEEDED' | 'FAILED';

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
  repaymentMethod: RepaymentMethod;
  status: LoanApplicationStatus;
  assessment: AssessmentEvidence | null;
  version: number;
  submittedAt: string;
}

export interface AdminLoanReviewDetail extends AdminLoanReviewSummary {
  purposeCode: string;
  purposeDetail: string | null;
  financialInformation: ApplicantFinancialInformation;
  schedule: ScheduleCalculationSnapshot;
  eligibility: EligibilityEvidence | null;
  creditProfile: CreditProfileEvidence | null;
  recentHistory: LoanApplicationHistoryItem[];
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
