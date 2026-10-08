/**
 * Contract vận hành khoản vay của Loan Service (LN-013 đến LN-017), khớp DTO/enum backend hiện hành.
 * Tiền là số theo JSON của backend (BigDecimal), chỉ định dạng ở lớp hiển thị.
 */

/** `PageResponse` của Loan Service: danh sách nằm ở `data`, trang tính từ 0. */
export interface PageResponse<T> { data: T[]; page: number; size: number; totalElements: number }

/** `CollectionStage`: backend suy từ số ngày quá hạn (`fromDaysPastDue`). */
export type CollectionStage = 'EARLY_REMINDER' | 'ATTENTION' | 'NPL' | 'INTENSIVE' | 'LOSS';
export type CollectionCaseStatus = 'OPEN' | 'CURED' | 'SETTLED' | 'WRITTEN_OFF';
export type CollectionActionType =
  | 'REMINDER_SENT'
  | 'BORROWER_CONTACTED'
  | 'PROMISE_TO_PAY'
  | 'LEGAL_REVIEW'
  | 'FIELD_COLLECTION'
  | 'WRITE_OFF_RECOMMENDED'
  | 'NOTE';

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
export type RescheduleType = 'INSTALLMENT_ADJUSTMENT' | 'TERM_EXTENSION';
export type RescheduleDecision = 'approve' | 'reject';

export type FinoraLoanStatus = 'ACTIVE' | 'RESTRUCTURING' | 'SETTLED' | 'DEFAULTED' | 'WRITTEN_OFF';
export type ReconciliationIncidentType =
  | 'CORE_LOAN_ID_MISMATCH'
  | 'EXTERNAL_ID_MISMATCH'
  | 'PRINCIPAL_DISBURSED_MISMATCH'
  | 'OUTSTANDING_BREAKDOWN_MISMATCH';

export interface CollectionCase {
  caseId: string; loanNumber: string; borrowerId: string; stage: CollectionStage; status: CollectionCaseStatus;
  daysPastDue: number; debtGroup: number; overdueAmount: number; totalOutstanding: number;
  overdueSince: string | null; openedAt: string; lastObservedAt: string; closedAt: string | null;
}

export interface CollectionAction {
  actionId: string; actionType: CollectionActionType; note: string | null; promiseDate: string | null;
  promiseAmount: number | null; actorId: string; createdAt: string;
}

/** `CreateCollectionActionRequest`: chỉ PROMISE_TO_PAY được gửi ngày và số tiền hẹn trả. */
export interface CreateCollectionActionRequest {
  actionType: CollectionActionType;
  note: string | null;
  promiseDate: string | null;
  promiseAmount: number | null;
}

export interface RescheduleRequest {
  requestId: string; loanNumber: string; requestType: RescheduleType; rescheduleFromDate: string;
  adjustedDueDate: string | null; extraTerms: number | null; reasonComment: string;
  termsVersion: string; status: RescheduleStatus; originalMaturityDate: string; newMaturityDate: string | null;
  decisionComment: string | null; decidedAt: string | null; createdAt: string; updatedAt: string;
}

export interface StaleLoan {
  loanNumber: string; applicationNumber: string; fineractLoanId: number; loanStatus: FinoraLoanStatus;
  fineractStatusCode: string; totalOutstanding: number; overdueAmount: number; daysPastDue: number;
  source: string; dataAsOf: string; lastSyncedAt: string; stale: boolean;
}

export interface ReconciliationIncident {
  incidentId: string; loanNumber: string; type: ReconciliationIncidentType; status: 'OPEN' | 'RESOLVED';
  expectedValue: string; actualValue: string; occurrenceCount: number; firstDetectedAt: string;
  lastDetectedAt: string; resolvedAt: string | null; resolutionCode: string | null; resolvedBy: string | null;
}

export interface QuarantinedRepaymentEvent {
  eventId: string; loanApplicationId: number; repaymentId: string; status: 'PENDING' | 'RESOLVED';
  reasonCode: string; attemptCount: number; receivedAt: string; lastAttemptAt: string | null; resolvedAt: string | null;
}
