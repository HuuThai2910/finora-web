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
  | 'PENDING_INVESTOR_CONSENT'
  | 'INVESTOR_REJECTED'
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

/** Saga giải ngân của Loan Service (`DisbursementSagaStatus`). Màn sự cố chỉ đọc `REPAIR_REQUIRED`. */
export type DisbursementSagaStatus =
  | 'WAITING_PAYMENT'
  | 'CORE_BOOKING_PENDING'
  | 'CORE_BOOKING'
  | 'RETRY_PENDING'
  | 'REPAIR_REQUIRED'
  | 'COMPLETED';

/** `AdminDisbursementSagaResponse` (R2): tiền đã giải ngân, Fineract chưa ghi nhận khoản vay. */
export interface DisbursementSagaRepair {
  sagaId: string; loanApplicationId: number; contractNumber: string; status: DisbursementSagaStatus;
  amount: number; currency: string; paymentReference: string | null; fineractLoanId: number | null;
  attemptCount: number; attemptsSinceRepair: number; repairCount: number; nextRetryAt: string | null;
  lastErrorCode: string | null; lastErrorDetail: string | null; lastRepairBy: string | null;
  lastRepairAt: string | null; lastRepairNote: string | null; createdAt: string; updatedAt: string;
}

/**
 * `PageResponse` chung của finora-common mà Payment và Investment trả: danh sách nằm ở `content` (khác bản
 * riêng của Loan dùng `data`), trang tính từ 0.
 */
export interface CommonPage<T> {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean;
}

export type RepaymentType = 'SCHEDULED' | 'OVERDUE_CURE' | 'PARTIAL_PREPAYMENT' | 'EARLY_SETTLEMENT';

/** Payment chỉ trả ba trạng thái này cho hàng đợi sự cố trả nợ. */
export type RepaymentIncidentStatus = 'CORE_POSTING' | 'RECONCILIATION_REQUIRED' | 'FAILED';

/**
 * `RepaymentReconciliationResponse`: tiền đã trừ ví người vay, việc ghi Fineract chưa xong hoặc bị từ chối.
 * `corePostingDate` là ngày sẽ gửi Fineract nếu ghi lại; `coreRepostAvailableAt` là lúc sớm nhất được ghi lại (B32),
 * `null` khi không chờ đối soát.
 */
export interface RepaymentIncident {
  repaymentId: string; loanApplicationId: number; borrowerId: string; fineractLoanId: number;
  repaymentType: RepaymentType; status: RepaymentIncidentStatus; amount: number; currency: string;
  transactionDate: string; walletLedgerTransactionId: string | null; fineractTransactionId: number | null;
  attemptCount: number; errorCode: string | null; errorDetail: string | null; updatedAt: string;
  corePostingDate: string; coreRepostCount: number; lastCoreRepostBy: string | null; lastCoreRepostAt: string | null;
  coreRepostAvailableAt: string | null;
}

/** Payment chỉ trả các lệnh giải ngân chưa kết thúc. */
export type DisbursementIncidentStatus = 'PROCESSING' | 'RETRY_PENDING' | 'RECONCILIATION_REQUIRED';

/**
 * `DisbursementReconciliationResponse` (R2). `nextAttemptAt = null` ở `RECONCILIATION_REQUIRED` nghĩa là
 * đã hết lượt tra cứu tự động và đang chờ vận hành.
 */
export interface DisbursementIncident {
  sagaId: string; loanApplicationId: number; contractNumber: string; amount: number; currency: string;
  provider: string; providerReference: string | null; status: DisbursementIncidentStatus; attemptCount: number;
  reconciliationAttemptCount: number; nextAttemptAt: string | null; errorCode: string | null;
  errorDetail: string | null; manualRecheckCount: number; lastManualRecheckBy: string | null;
  lastManualRecheckAt: string | null; createdAt: string; updatedAt: string;
}

/** Payment chỉ trả các lệnh rút chưa có kết quả cuối cho hàng đợi sự cố (R4). */
export type WithdrawalIncidentStatus = 'PROCESSING' | 'PROVIDER_PENDING' | 'RECONCILIATION_REQUIRED';

/** Chủ ví của lệnh rút (`WalletOwnerType` của Payment). */
export type WalletOwnerType = 'BORROWER' | 'INVESTOR' | 'PLATFORM';

/**
 * `AdminWithdrawalResponse` (R4, W3B): lệnh rút tiền về ngân hàng đã trừ ví nhưng chưa có kết quả cuối từ provider.
 * `nextAttemptAt = null` ở `RECONCILIATION_REQUIRED` là đã hết lượt tra cứu tự động và đang chờ vận hành;
 * `attemptCount` là số lần gửi provider, `reconciliationAttemptCount` là số lần tra cứu chưa ra kết quả cuối.
 * Số tài khoản chỉ ở dạng che.
 */
export interface WithdrawalIncident {
  withdrawalId: string; ownerType: WalletOwnerType; ownerId: string; amount: number; currency: string;
  status: WithdrawalIncidentStatus; bankCode: string; accountNumberMasked: string; provider: string;
  providerReference: string | null; attemptCount: number; reconciliationAttemptCount: number;
  nextAttemptAt: string | null; errorCode: string | null; errorDetail: string | null; manualRecheckCount: number;
  lastManualRecheckBy: string | null; lastManualRecheckAt: string | null; createdAt: string; updatedAt: string;
}

/**
 * `OrderIncidentResponse` của Investment (R3): lệnh góp vốn chưa khớp với ví ở Payment.
 * `HOLD_PENDING`: chưa biết tiền đã giữ hay chưa; `RELEASE_RETRYING`: đang thử nhả tiền giữ;
 * `RELEASE_BLOCKED`: Payment trả lỗi chắc chắn, worker đã dừng.
 */
export type OrderIncidentIssue = 'HOLD_PENDING' | 'RELEASE_RETRYING' | 'RELEASE_BLOCKED';

export interface OrderIncident {
  orderReference: string; listingId: number; investorId: string; amount: number; status: string;
  issue: OrderIncidentIssue; paymentHoldReference: string | null; rejectedReasonCode: string | null;
  releaseErrorCode: string | null; releaseAttemptCount: number; releaseNextAttemptAt: string | null;
  releaseBlockedAt: string | null; pendingAttemptCount: number; pendingNextAttemptAt: string | null;
  createdAt: string; updatedAt: string;
}
