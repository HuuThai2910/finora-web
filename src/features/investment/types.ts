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
  fundingClosesAt: string;
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
 * Một nhà đầu tư đã góp vốn, nhìn từ màn quản trị.
 *
 * Không có tên hay liên hệ: hồ sơ người dùng thuộc finora-user, còn sàn cố ý không mang
 * dữ liệu cá nhân.
 */
/** Duyệt khoản vay đang chờ lên sàn, với mệnh giá Note do quản trị chốt. */
export interface ApproveListingRequest {
  targetAmount: string;
  noteDenomination: string;
  minInvestmentAmount: string;
  fundingDays: number;
}

export interface ListingInvestor {
  commitmentId: number;
  investorId: string;
  amount: string;
  noteCount: number;
  sharePercent: number;
  status: 'ACTIVE' | 'FINALIZED' | 'CANCELLED';
  createdAt: string;
}

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
