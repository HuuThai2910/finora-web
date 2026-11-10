/**
 * Contract của Investment Service.
 *
 * Tiền được backend trả về dạng chuỗi decimal để không mất chính xác khi truyền JSON;
 * chỉ đổi sang number ở lớp hiển thị, không dùng chuỗi đã format để tính toán.
 */

export type ListingStatus = 'DRAFT' | 'OPEN' | 'FULLY_FUNDED' | 'CLOSED' | 'CANCELLED';

export interface MarketListing {
  listingId: number;
  loanId: number;
  /** Mã hồ sơ vay công khai bên Loan (`LA-...`), dùng mở trang thẩm định `/loans/:applicationNumber/review`. */
  applicationNumber?: string | null;
  /** Mã hiển thị `HS-…`/`HĐ-…`; khoản vay niêm yết trước khi Loan có mã để null. */
  applicationCode?: string | null;
  contractCode?: string | null;
  purpose: string;
  region: string;
  creditGrade: string;
  creditScore: number;
  targetAmount: string;
  committedAmount: string;
  remainingAmount: string;
  fundedPercent: number;
  annualInterestRate: string;
  termMonths: number;
  repaymentMethod: string;
  noteDenomination: string;
  minInvestmentAmount: string;
  status: ListingStatus;
  /** Số hợp đồng vay đã ký; null khi khoản chưa gắn hợp đồng. */
  contractNumber: string | null;
  /**
   * Trạng thái hợp đồng Investment chép từ sự kiện của Loan: `PENDING_LENDER_SIGNATURES` khi đủ vốn và chờ các bên
   * ký, `PENDING_REFUNDING` khi nhà đầu tư chưa ký rút và khoản vay đang gọi vốn bổ sung, `EFFECTIVE` khi hợp đồng có
   * hiệu lực hoặc đã giải ngân; mã khác giữ nguyên.
   */
  contractStatus: string | null;
  fundingClosesAt: string;
  /** Chỉ có khi `CANCELLED` do Loan hủy đợt gọi vốn đã đủ vốn (không giải ngân). */
  cancelledAt?: string | null;
  /** `CONTRACT_DECLINED`, `CONTRACT_EXPIRED` hoặc `DISBURSEMENT_FAILED`; mã lạ hiện nguyên văn. */
  cancellationReason?: string | null;
  /** Có khi Loan đã xác nhận giải ngân (LoanDisbursed); trước đó tiền nhà đầu tư mới chỉ được giữ. */
  disbursedAt?: string | null;
  /** Họ tên người vay theo finora-user (danh sách đọc theo lô); null khi User lỗi hoặc người vay chưa có họ tên. */
  borrowerFullName?: string | null;
  /** Mã mục đích vay (`LoanPurpose`) để chọn icon; null khi không nhận ra. */
  purposeCode?: string | null;
  /** Lúc khoản vay lên sàn (mở gọi vốn); gọi vốn bổ sung vẫn giữ lần mở đầu. */
  fundingOpenedAt?: string | null;
  /**
   * Số nhà đầu tư không trùng: đang góp, hoặc với khoản đã đóng/hủy là những người đã góp trước khi được hoàn tiền.
   * Backend cũ không có trường này.
   */
  investorCount?: number | null;
  /** Số đã gọi được lúc đóng/hủy (sau đó `committedAmount` về 0 vì đã hoàn tiền); null khi khoản chưa đóng/hủy. */
  raisedAmount?: string | null;
}

export interface FundingProgress {
  listingId: number;
  loanId: number;
  targetAmount: string;
  committedAmount: string;
  remainingAmount: string;
  fundedPercent: number;
  investorCount: number;
  committedNoteCount: number;
  status: ListingStatus;
  fundingClosesAt: string;
  fullyFundedAt: string | null;
}

/**
 * Một phần vốn của nhà đầu tư, nhìn từ màn quản trị.
 *
 * Không có tên hay liên hệ: hồ sơ người dùng thuộc finora-user, còn sàn cố ý không mang
 * dữ liệu cá nhân. `createdAt` là lúc đặt lệnh góp vốn.
 */
export interface ListingInvestor {
  commitmentId: number;
  investorId: string;
  amount: string;
  noteCount: number;
  sharePercent: number;
  status: 'ACTIVE' | 'FINALIZED' | 'CANCELLED';
  createdAt: string;
}

export type CommitmentStatus = ListingInvestor['status'];

export interface InvestmentNote {
  noteNumber: string;
  loanId: number;
  principalAmount: string;
  outstandingPrincipal: string;
  principalRepaid: string;
  interestReceived: string;
  annualInterestRate: string;
  termMonths: number;
  status: 'ACTIVE' | 'CLOSED' | 'DEFAULTED';
  issuedAt: string;
  /** Người đang nắm giữ phần vốn (đã tính chuyển nhượng trên Chợ); backend cũ không có. */
  holderId?: string | null;
}

export type NoteStatus = InvestmentNote['status'];

/** Trạng thái một bên ký theo Loan. */
export type ContractPartyStatus = 'PENDING_SIGNATURE' | 'SIGNING' | 'SIGNED' | 'DECLINED' | 'EXPIRED';

/** Nhà cung cấp chữ ký số của Loan: `MOCK` là ký xác nhận mô phỏng (môi trường demo), không phải chữ ký số. */
export type SignatureProvider = 'MOCK' | 'VNPT_SMART_CA';

/** Một bên ký hợp đồng (`GET /admin/loan-contracts/{số}` của Loan). */
export interface AdminContractParty {
  partyType: 'LENDER' | 'BORROWER';
  /** ID người dùng ở finora-user; giao diện đổi thành họ tên, không hiện mã. */
  partyId: string;
  commitmentId: number | null;
  allocationAmount: number | null;
  allocationSharePercent: number | null;
  status: ContractPartyStatus;
  signatureProvider: SignatureProvider | null;
  signedAt: string | null;
  /** Lúc rời hợp đồng (từ chối hoặc hết hạn ký). */
  closedAt: string | null;
}

/** Hợp đồng vay cho màn quản trị; tiền là số JSON như các API khác của Loan. */
export interface AdminLoanContract {
  contractNumber: string;
  /** Mã hiển thị `HĐ-…`; `contractNumber` chỉ dùng gọi API. */
  contractCode: string | null;
  /** Mã khoản vay sau giải ngân, để đọc các kỳ trả. */
  loanNumber: string | null;
  status: string;
  multiParty: boolean;
  principalAmount: number;
  termMonths: number;
  annualInterestRate: number;
  documentHash: string | null;
  /** SHA-256 của tệp PDF tải được (bản để ký hoặc bản đủ chữ ký). */
  pdfDocumentHash: string | null;
  signatureProvider: SignatureProvider | null;
  issuedAt: string | null;
  expiresAt: string | null;
  effectiveAt: string | null;
  declinedAt: string | null;
  declineReasonCode: string | null;
  /** Nhà đầu tư trước (góp nhiều trước), người vay cuối cùng. */
  parties: AdminContractParty[];
}

/** Cách ký đang áp dụng, cho khoản chưa có hợp đồng. */
export interface ContractSigningPolicy {
  signatureProvider: SignatureProvider;
  signatureWindowHours: number;
}

export type InstallmentStatus = 'PAID' | 'OVERDUE' | 'DUE' | 'UPCOMING';

/** Kỳ trả theo lịch hiện hành trên hệ thống lõi (sau cơ cấu là lịch mới). */
export interface LoanInstallment {
  number: number;
  dueDate: string;
  totalDue: number | null;
  totalPaid: number | null;
  paidOn: string | null;
  status: InstallmentStatus;
}

export interface LoanInstallments {
  loanNumber: string;
  businessDate: string;
  paidCount: number;
  overdueCount: number;
  installments: LoanInstallment[];
}

/** Phân trang chuẩn của backend FINORA. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/**
 * Tham số gọi vốn đang áp dụng cho khoản vay lên sàn từ giờ trở đi.
 *
 * Đổi tham số không tính lại listing hay phần vốn đã tạo: mỗi bản ghi đã chụp mệnh giá
 * của riêng nó lúc sinh ra, nên cam kết của nhà đầu tư không bị đổi sau lưng.
 */
export interface FundingSettings {
  noteDenomination: string;
  minInvestmentAmount: string;
  fundingDays: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface UpdateFundingSettingsRequest {
  noteDenomination: string;
  minInvestmentAmount: string;
  fundingDays: number;
}
