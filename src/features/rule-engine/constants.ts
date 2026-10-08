import type { AiTruong } from './types';

export const NGUON_LABEL: Record<AiTruong['nguon'], string> = {
  ho_so: 'Hồ sơ tự khai',
  cic: 'Dữ liệu CIC',
  fineract: 'Sản phẩm vay',
  dan_xuat: 'Chỉ số dẫn xuất',
};

/** Nhãn tiếng Việt cho giá trị phân loại; giá trị chưa có nhãn hiện mã gốc. */
export const GIA_TRI_LABEL: Record<string, string> = {
  OWN: 'Sở hữu riêng',
  MORTGAGE: 'Đang thế chấp',
  RENT: 'Thuê',
  OTHER: 'Khác',
  debt_consolidation: 'Đảo nợ',
  credit_card: 'Thẻ tín dụng',
  home_improvement: 'Sửa nhà',
  major_purchase: 'Mua sắm lớn',
  medical: 'Y tế',
  car: 'Mua xe',
  small_business: 'Kinh doanh nhỏ',
  moving: 'Chuyển nhà',
  vacation: 'Du lịch',
  education: 'Học tập',
  other: 'Khác',
  Verified: 'Đã xác minh',
  'Source Verified': 'Xác minh qua nguồn',
  'Not Verified': 'Chưa xác minh',
};

/* Ràng buộc trùng với finora-ai/app/api/config_router.py; UI chỉ báo sớm. */
export const MAU_MA_LUAT = /^[A-Z][A-Z0-9_]{2,63}$/;
export const TRONG_SO_MIN = 0.1;
export const TRONG_SO_MAX = 10;
export const GOI_Y_MAX = 300;

/** Căn cứ pháp lý của từng trần trong `legal_limits` (ghi chú trong rule_engine.py). */
export const CAN_CU_TRAN = {
  max_platform_limit: 'Quyết định 2866/QĐ-NHNN',
  max_total_debt_all_platforms: 'Quyết định 2866/QĐ-NHNN',
  max_interest_rate: 'Điều 468 Bộ luật Dân sự 2015',
  max_term_months: 'Nghị định 94/2025/NĐ-CP',
} as const;

/**
 * Nhóm nợ CIC từ đó bị loại trực tiếp. Hằng số của backend
 * (`NHOM_NO_XAU_TOI_THIEU` trong rule_engine.py), CHƯA có API công bố: đổi ở
 * backend thì phải sửa tay ở đây.
 */
export const NHOM_NO_XAU_TOI_THIEU = 3;

/**
 * Nhãn mã luật loại trực tiếp (`rejection_reasons`) và lý do bắt buộc thẩm định
 * (`review_reasons`) mà finora-ai trả về. Danh sách lấy từ
 * `kiem_tra_chot_chan_cung` và `kiem_tra_yeu_cau_tham_dinh` trong rule_engine.py.
 * Mã mới chưa có nhãn thì hiển thị mã gốc.
 */
export const NHAN_MA_LOAI_TRUC_TIEP: Record<string, string> = {
  INTEREST_RATE_EXCEEDS_LEGAL_LIMIT: 'Lãi suất vượt trần pháp lý',
  INVALID_INTEREST_RATE: 'Lãi suất không hợp lệ',
  TERM_EXCEEDS_LEGAL_LIMIT: 'Kỳ hạn vượt mức tối đa',
  CIC_CURRENT_BAD_DEBT: 'Đang có nợ xấu tại CIC',
  CIC_BAD_DEBT_COOLDOWN: 'Còn trong thời gian phục hồi sau nợ xấu',
  TOTAL_DEBT_EXCEEDS_LEGAL_LIMIT: 'Tổng dư nợ vượt trần mọi nền tảng',
};

export const NHAN_LY_DO_THAM_DINH: Record<string, string> = {
  CIC_CURRENT_GROUP_MISSING: 'CIC không trả về nhóm nợ hiện tại',
  CIC_BAD_DEBT_RECOVERY_REVIEW: 'Đang trong giai đoạn theo dõi sau nợ xấu',
};
