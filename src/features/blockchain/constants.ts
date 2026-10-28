import type { PillTone } from '@/components/StatusPill';
import type {
  ArtifactResult, ChainResult, ProofProvider, ProofReferenceType, ProofStatus, ProofType,
} from './types';

/** Bảng danh sách quản trị: 10 dòng mỗi trang. */
export const PROOF_PAGE_SIZE = 10;

export interface Tagged {
  label: string;
  tone: PillTone;
}

/** Bốn mốc nghiệp vụ được neo (W3D D52). */
export const PROOF_TYPE_LABEL: Record<ProofType, string> = {
  CONTRACT_DOCUMENT: 'Hợp đồng đủ chữ ký',
  DISBURSEMENT: 'Giải ngân',
  REPAYMENT: 'Trả nợ',
  NOTE_OWNERSHIP: 'Phát hành hoặc chuyển nhượng Note',
};

/**
 * Loại tham chiếu tra cứu, đúng `ProofReferenceType` của Blockchain. Gợi ý nhập là dạng mã của aggregate mà proof neo
 * (D52): hồ sơ vay theo ID số, hợp đồng theo số hợp đồng, Note phát hành theo mã khoản gọi vốn. `noun` dùng trong câu.
 */
export const REFERENCE_TYPES: ReadonlyArray<{
  value: ProofReferenceType;
  label: string;
  noun: string;
  placeholder: string;
}> = [
  { value: 'LOAN_APPLICATION', label: 'Hồ sơ vay', noun: 'hồ sơ vay', placeholder: 'ID hồ sơ vay, ví dụ 123' },
  { value: 'LOAN_CONTRACT', label: 'Hợp đồng', noun: 'hợp đồng', placeholder: 'Số hợp đồng, ví dụ LC-...' },
  { value: 'DISBURSEMENT_SAGA', label: 'Giải ngân', noun: 'saga giải ngân', placeholder: 'Mã saga giải ngân' },
  { value: 'REPAYMENT', label: 'Trả nợ', noun: 'giao dịch trả nợ', placeholder: 'Mã giao dịch trả nợ' },
  {
    value: 'NOTE_ISSUANCE',
    label: 'Phát hành Note',
    noun: 'đợt phát hành Note của khoản gọi vốn',
    placeholder: 'Mã khoản gọi vốn',
  },
  {
    value: 'NOTE_TRANSFER',
    label: 'Chuyển nhượng Note',
    noun: 'giao dịch chuyển nhượng Note',
    placeholder: 'Mã giao dịch chuyển nhượng',
  },
];

/** Tên aggregate lưu trên proof (`aggregateType`); tên lạ hiện nguyên văn. */
export const AGGREGATE_LABEL: Record<string, string> = {
  LoanContract: 'Hợp đồng',
  DisbursementSaga: 'Saga giải ngân',
  Repayment: 'Giao dịch trả nợ',
  NoteIssuance: 'Phát hành Note',
  NoteTransfer: 'Chuyển nhượng Note',
};

/** Tab lọc trạng thái; `null` là tất cả proof, mới nhất trước. */
export const STATUS_TABS: ReadonlyArray<{ value: ProofStatus | null; label: string }> = [
  { value: null, label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ gửi' },
  { value: 'PROCESSING', label: 'Đang gửi' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'DEAD_LETTER', label: 'Dừng gửi' },
];

export const STATUS_INFO: Record<ProofStatus, Tagged> = {
  PENDING: { label: 'Chờ gửi', tone: 'neutral' },
  PROCESSING: { label: 'Đang gửi', tone: 'info' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'success' },
  DEAD_LETTER: { label: 'Dừng gửi', tone: 'danger' },
};

export const PROVIDER_LABEL: Record<ProofProvider, string> = {
  MOCK: 'MOCK (demo, không ghi lên Fabric)',
  HYPERLEDGER_FABRIC: 'Hyperledger Fabric',
};

/**
 * Nhãn duy nhất của proof MOCK, dùng chung cho badge biên nhận và kết quả đối chiếu sổ cái (BC-N10): dữ liệu demo,
 * không ghi lên Hyperledger Fabric. Khác chữ và khác màu với nhãn "Trên Fabric" (B50, LEGAL-DATA-01).
 */
export const MOCK_RECEIPT_TAG: Tagged = { label: 'MOCK, không có trên Fabric', tone: 'warning' };

export const CHAIN_RESULT_INFO: Record<ChainResult, Tagged> = {
  MATCHED: { label: 'Khớp sổ cái', tone: 'success' },
  MISMATCHED: { label: 'Lệch với sổ cái', tone: 'danger' },
  MISSING_ON_CHAIN: { label: 'Không có trên sổ cái', tone: 'danger' },
  NOT_ON_CHAIN_MOCK: MOCK_RECEIPT_TAG,
  NOT_CONFIRMED: { label: 'Chưa được Fabric xác nhận', tone: 'neutral' },
  LEDGER_UNAVAILABLE: { label: 'Không đọc được Fabric', tone: 'warning' },
};

export const ARTIFACT_RESULT_INFO: Record<ArtifactResult, Tagged> = {
  MATCHED: { label: 'Khớp hash đã neo', tone: 'success' },
  MISMATCHED: { label: 'Không khớp hash đã neo', tone: 'danger' },
};

/** Dùng khi backend chưa trả câu cảnh báo của biên nhận MOCK (proof chưa xác nhận). */
export const MOCK_LEDGER_NOTICE =
  'Proof này ghi bằng ledger MOCK để demo. Biên nhận của nó không nằm trên Hyperledger Fabric và không dùng làm bằng chứng được.';

/** Giới hạn của bằng chứng (W3D mục 12, LEGAL-CONTRACT-01): nói rõ trên trang để không trình bày quá giá trị thật. */
export const PROOF_LEGAL_NOTE =
  'Kết quả trên trang này chứng minh tính toàn vẹn kỹ thuật của dữ liệu, không thay thế chữ ký số hoặc kết luận pháp lý. '
  + 'Mạng Fabric hiện chạy local để phục vụ đồ án; nhãn “Bản demo” nghĩa là dữ liệu chưa được ghi lên Fabric.';
