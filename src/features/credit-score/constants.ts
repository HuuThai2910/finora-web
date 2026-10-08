import type { CreditExplainResponse, CreditScoreRequest, YeuToGop } from './types';

/** Hồ sơ mẫu, cũng là giá trị khởi tạo của form. */
export const HO_SO_MAC_DINH: CreditScoreRequest = {
  so_cccd: '075047842393',
  person_age: 30,
  emp_length: '5 years',
  annual_inc: 300_000_000,
  loan_amnt: 50_000_000,
  home_ownership: 'MORTGAGE',
  purpose: 'debt_consolidation',
  verification_status: 'Verified',
  dti: 15.5,
  installment: 4_500_000,
  int_rate: 12,
  term_months: 12,
};

/**
 * Kịch bản dựng sẵn để thử phản ứng của mô hình và bộ luật.
 *
 * Ba CCCD đầu có thật trong dữ liệu của cic-service; nợ xấu và dư nợ chỉ đổi được
 * qua CCCD vì dữ liệu đó do CIC cấp, không nhận từ người dùng tự khai. Mô tả chỉ
 * nói hồ sơ khác gì, không hứa kết quả: kết quả do backend quyết theo cấu hình hiện hành.
 */
export const KICH_BAN: { ten: string; mo_ta: string; ghi_de: Partial<CreditScoreRequest> }[] = [
  { ten: 'Hồ sơ sạch', mo_ta: 'Nợ nhóm 1, dư nợ thấp', ghi_de: { so_cccd: '075047842393' } },
  { ten: 'Nợ xấu nhóm 5', mo_ta: 'CIC ghi nhận nợ nhóm 5', ghi_de: { so_cccd: '089182000010' } },
  { ten: 'Dư nợ 1,3 tỷ', mo_ta: 'CIC ghi nhận dư nợ hiện có 1,3 tỷ', ghi_de: { so_cccd: '001668101246' } },
  { ten: 'Lãi suất 25%', mo_ta: 'Lãi suất khai báo 25%/năm', ghi_de: { so_cccd: '075047842393', int_rate: 25 } },
  {
    ten: 'Trả nợ 80% thu nhập',
    mo_ta: 'Khoản trả tháng bằng 80% thu nhập tháng',
    ghi_de: { so_cccd: '075047842393', annual_inc: 60_000_000, installment: 4_000_000 },
  },
  {
    ten: 'Tuổi 19, thâm niên 10+ năm',
    mo_ta: 'Tuổi và thâm niên mâu thuẫn',
    ghi_de: { so_cccd: '075047842393', person_age: 19, emp_length: '10+ years' },
  },
];

export const NHAN_QUYET_DINH: Record<CreditExplainResponse['decision'], string> = {
  APPROVED: 'Duyệt tự động',
  PENDING_REVIEW: 'Chờ thẩm định',
  REJECTED: 'Từ chối',
};

export const TONE_QUYET_DINH: Record<CreditExplainResponse['decision'], 'success' | 'warning' | 'danger'> = {
  APPROVED: 'success',
  PENDING_REVIEW: 'warning',
  REJECTED: 'danger',
};

export const NHAN_MUC_DO: Record<YeuToGop['muc_do'], string> = {
  manh: 'Mạnh',
  vua: 'Vừa',
  nhe: 'Nhẹ',
};

/** Giá trị theo `PURPOSE_HOP_LE` trong schemas/credit.py của finora-ai. */
export const MUC_DICH: [string, string][] = [
  ['debt_consolidation', 'Đảo nợ'],
  ['home_improvement', 'Sửa nhà'],
  ['car', 'Mua xe'],
  ['medical', 'Y tế'],
  ['education', 'Học tập'],
  ['small_business', 'Kinh doanh nhỏ'],
  ['major_purchase', 'Mua sắm lớn'],
  ['moving', 'Chuyển nhà'],
  ['vacation', 'Du lịch'],
  ['credit_card', 'Thẻ tín dụng'],
  ['other', 'Khác'],
];

export const NHA_O: [string, string][] = [
  ['OWN', 'Sở hữu riêng'],
  ['MORTGAGE', 'Đang thế chấp'],
  ['RENT', 'Thuê'],
  ['OTHER', 'Khác'],
];

export const XAC_MINH: [string, string][] = [
  ['Verified', 'Đã xác minh'],
  ['Source Verified', 'Xác minh qua nguồn'],
  ['Not Verified', 'Chưa xác minh'],
];

/** Giá trị gửi backend giữ nguyên dạng tiếng Anh của bộ dữ liệu huấn luyện; nhãn để hiển thị. */
export const THAM_NIEN: [string, string][] = [
  ['< 1 year', 'Dưới 1 năm'],
  ['1 year', '1 năm'],
  ['2 years', '2 năm'],
  ['3 years', '3 năm'],
  ['5 years', '5 năm'],
  ['7 years', '7 năm'],
  ['10+ years', 'Từ 10 năm'],
];
