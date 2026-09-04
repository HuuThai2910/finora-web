import type { CreditScoreRequest, YeuToGop } from './types';

/** Hồ sơ mẫu — cũng là giá trị khởi tạo của form. */
export const HO_SO_MAC_DINH: CreditScoreRequest = {
  so_cccd: "075047842393",
  person_age: 30,
  emp_length: "5 years",
  annual_inc: 300_000_000,
  loan_amnt: 50_000_000,
  home_ownership: "MORTGAGE",
  purpose: "debt_consolidation",
  verification_status: "Verified",
  dti: 15.5,
  installment: 4_500_000,
  int_rate: 12,
  term_months: 12,
};

/**
 * Kịch bản dựng sẵn, mỗi kịch bản kích hoạt một chốt chặn khác nhau.
 *
 * Ba CCCD đầu có thật trong dữ liệu của cic-service; hai chốt CIC (nợ xấu và trần
 * tổng dư nợ) chỉ kích hoạt được qua CCCD vì dữ liệu đó do CIC cấp, không nhận từ
 * người dùng tự khai.
 */
export const KICH_BAN: {
  ten: string;
  mo_ta: string;
  ghi_de: Partial<CreditScoreRequest>;
}[] = [
  {
    ten: "Hồ sơ sạch",
    mo_ta: "Nợ nhóm 1, dư nợ thấp",
    ghi_de: { so_cccd: "075047842393" },
  },
  {
    ten: "Nợ xấu nhóm 5",
    mo_ta: "Vi phạm chốt nợ xấu CIC",
    ghi_de: { so_cccd: "089182000010" },
  },
  {
    ten: "Dư nợ 1,3 tỷ",
    mo_ta: "Vượt trần tổng 400 triệu",
    ghi_de: { so_cccd: "001668101246" },
  },
  {
    ten: "Lãi suất 25%",
    mo_ta: "Vượt trần 20%/năm",
    ghi_de: { so_cccd: "075047842393", int_rate: 25 },
  },
  {
    ten: "Trả nợ 80% thu nhập",
    mo_ta: "Vượt trần DSR 50%",
    ghi_de: {
      so_cccd: "075047842393",
      annual_inc: 60_000_000,
      installment: 4_000_000,
    },
  },
  {
    ten: "Tuổi 19 · 10+ năm KN",
    mo_ta: "Mâu thuẫn tuổi và thâm niên",
    ghi_de: {
      so_cccd: "075047842393",
      person_age: 19,
      emp_length: "10+ years",
    },
  },
];

export const NHAN_QUYET_DINH: Record<string, string> = {
  APPROVED: "Duyệt tự động",
  PENDING_REVIEW: "Chờ thẩm định",
  REJECTED: "Từ chối",
};

export const NHAN_MUC_DO: Record<YeuToGop["muc_do"], string> = {
  manh: "Mạnh",
  vua: "Vừa",
  nhe: "Nhẹ",
};

export const MUC_DICH = [
  ["debt_consolidation", "Đảo nợ"],
  ["home_improvement", "Sửa nhà"],
  ["car", "Mua xe"],
  ["medical", "Y tế"],
  ["education", "Học tập"],
  ["small_business", "Kinh doanh nhỏ"],
  ["major_purchase", "Mua sắm lớn"],
  ["moving", "Chuyển nhà"],
  ["vacation", "Du lịch"],
  ["credit_card", "Thẻ tín dụng"],
  ["other", "Khác"],
];

export const NHA_O = [
  ["OWN", "Sở hữu riêng"],
  ["MORTGAGE", "Đang thế chấp"],
  ["RENT", "Thuê"],
  ["OTHER", "Khác"],
];

export const THAM_NIEN = [
  "< 1 year",
  "1 year",
  "2 years",
  "3 years",
  "5 years",
  "7 years",
  "10+ years",
];
