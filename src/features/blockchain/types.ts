/**
 * Contract explorer proof của Blockchain Service (R6, W3D D54), khớp `ProofResponse` và `ProofVerificationResponse`.
 * Proof không chứa payload gốc: chỉ có hash, cách tính hash và biên nhận của sổ cái.
 */

/** Các mốc nghiệp vụ được neo (D52), thêm giấy xác nhận chuyển nhượng Note (PDF ký số của mỗi lần khớp đã thanh toán). */
export type ProofType =
  | 'CONTRACT_DOCUMENT'
  | 'DISBURSEMENT'
  | 'REPAYMENT'
  | 'NOTE_OWNERSHIP'
  | 'NOTE_TRANSFER_DOCUMENT';

/** `PENDING → PROCESSING → CONFIRMED | PENDING (thử lại) | DEAD_LETTER`; chỉ `POST /retry` đưa DEAD_LETTER về PENDING. */
export type ProofStatus = 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'DEAD_LETTER';

/** Sổ cái đã chọn lúc đăng ký proof; không đổi về sau. */
export type ProofProvider = 'MOCK' | 'HYPERLEDGER_FABRIC';

/** Tham chiếu tra cứu; `LOAN_APPLICATION` gom mọi mốc của một hồ sơ vay theo ID số. */
export type ProofReferenceType =
  | 'LOAN_APPLICATION'
  | 'LOAN_CONTRACT'
  | 'DISBURSEMENT_SAGA'
  | 'REPAYMENT'
  | 'NOTE_ISSUANCE'
  | 'NOTE_TRANSFER'
  | 'NOTE_TRANSFER_DOCUMENT';

/** Loại biên nhận do backend gắn; hai loại không bao giờ được trình bày giống nhau (B50, LEGAL-DATA-01). */
export type ReceiptKind = 'FABRIC_ON_CHAIN' | 'MOCK_NOT_ON_CHAIN';

/** Kết quả đối chiếu cơ sở dữ liệu với Fabric được lưu lại trên proof (F08). */
export type ChainCheckStatus = 'MATCHED' | 'MISMATCHED' | 'MISSING_ON_CHAIN';

/** Kết quả đối chiếu của một lần kiểm; ba giá trị sau chỉ trả về, không lưu. */
export type ChainResult = ChainCheckStatus | 'NOT_ON_CHAIN_MOCK' | 'NOT_CONFIRMED' | 'LEDGER_UNAVAILABLE';

export type ArtifactResult = 'MATCHED' | 'MISMATCHED';

/** Event nguồn: người kiểm toán lấy `data` của event này ở service nguồn để tính lại hash. */
export interface ProofSource {
  service: string;
  eventId: string;
  /** Ba trường sau null với bản ghi trước W3D. */
  eventType: string | null;
  eventVersion: number | null;
  occurredAt: string | null;
}

export interface ProofHash {
  value: string;
  version: number;
  scheme: string;
  description: string;
}

export interface ProofReceipt {
  kind: ReceiptKind;
  onChain: boolean;
  transactionId: string | null;
  blockReference: string | null;
  confirmedAt: string | null;
  /** Câu cảnh báo của biên nhận MOCK; null với Fabric. */
  notice: string | null;
}

export interface ProofChainCheck {
  status: ChainCheckStatus;
  checkedAt: string | null;
}

export interface Proof {
  proofId: string;
  proofType: ProofType;
  aggregateType: string;
  aggregateId: string;
  loanApplicationId: number | null;
  source: ProofSource;
  hash: ProofHash;
  provider: ProofProvider;
  status: ProofStatus;
  attemptCount: number;
  /** Chỉ có khi `PENDING`: lượt gửi kế tiếp của worker. */
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorDetail: string | null;
  /** Null khi proof chưa được sổ cái xác nhận. */
  receipt: ProofReceipt | null;
  /** Đối chiếu gần nhất; null nếu chưa kiểm hoặc proof không nằm trên Fabric. */
  chainCheck: ProofChainCheck | null;
  createdAt: string;
  updatedAt: string;
}

/** `PageResponse` chung của finora-common: danh sách ở `content`, trang tính từ 0. */
export interface ProofPage {
  content: Proof[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/**
 * Tham số `GET /blockchain/proofs`: tra theo tham chiếu hoặc lọc trạng thái, không gộp hai cách vì backend từ chối
 * (`PROOF_FILTER_UNSUPPORTED`). `size` tối đa 100.
 */
export interface ProofSearchArgs {
  referenceType?: ProofReferenceType;
  referenceId?: string;
  status?: ProofStatus;
  page: number;
  size: number;
}

export interface ArtifactCheck {
  result: ArtifactResult;
  scheme: string;
  expectedHash: string;
  recomputedHash: string;
}

export interface ChainVerification {
  result: ChainResult;
  detail: string | null;
  transactionId: string | null;
  payloadHash: string | null;
  recordedAt: string | null;
  submitterMspId: string | null;
}

export interface ProofVerification {
  proofId: string;
  provider: ProofProvider;
  status: ProofStatus;
  /** Null khi không gửi dữ liệu gốc. */
  artifact: ArtifactCheck | null;
  chain: ChainVerification;
  verifiedAt: string;
}

/** Thân `POST /verify`; bỏ `artifact` thì chỉ đối chiếu cơ sở dữ liệu với Fabric. */
export interface VerifyProofArgs {
  proofId: string;
  artifact?: Record<string, unknown>;
}
