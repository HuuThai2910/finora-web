export interface PageResponse<T> { data: T[]; page: number; size: number; totalElements: number }

/** Khớp LoanRescheduleStatus ở Loan Service; không gửi status tự suy đoán lên API. */
export type RescheduleStatus =
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'CREATE_PENDING'
  | 'CREATING'
  | 'APPROVAL_PENDING'
  | 'APPROVING'
  | 'COMPLETED'
  | 'RECONCILIATION_REQUIRED'
  | 'MANUAL_REVIEW';

export interface CollectionCase {
  caseId: string; loanNumber: string; borrowerId: string; stage: string; status: string;
  daysPastDue: number; debtGroup: number; overdueAmount: number; totalOutstanding: number;
  overdueSince: string | null; openedAt: string; lastObservedAt: string; closedAt: string | null;
}

export interface CollectionAction {
  actionId: string; actionType: string; note: string | null; promiseDate: string | null;
  promiseAmount: number | null; actorId: string; createdAt: string;
}

export interface RescheduleRequest {
  requestId: string; loanNumber: string; requestType: string; rescheduleFromDate: string;
  adjustedDueDate: string | null; extraTerms: number | null; reasonComment: string;
  termsVersion: string; status: RescheduleStatus; originalMaturityDate: string; newMaturityDate: string | null;
  decisionComment: string | null; decidedAt: string | null; createdAt: string; updatedAt: string;
}

export interface StaleLoan {
  loanNumber: string; applicationNumber: string; fineractLoanId: number; loanStatus: string;
  fineractStatusCode: string; totalOutstanding: number; overdueAmount: number; daysPastDue: number;
  source: string; dataAsOf: string; lastSyncedAt: string; stale: boolean;
}

export interface ReconciliationIncident {
  incidentId: string; loanNumber: string; type: string; status: string; expectedValue: string;
  actualValue: string; occurrenceCount: number; firstDetectedAt: string; lastDetectedAt: string;
  resolvedAt: string | null; resolutionCode: string | null; resolvedBy: string | null;
}

export interface QuarantinedRepaymentEvent {
  eventId: string; loanApplicationId: number; repaymentId: string; status: string; reasonCode: string;
  attemptCount: number; receivedAt: string; lastAttemptAt: string | null; resolvedAt: string | null;
}
