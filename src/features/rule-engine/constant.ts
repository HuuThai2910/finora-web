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

export const MAU_MA_LUAT = /^[A-Z][A-Z0-9_]{2,63}$/;
export const TRONG_SO_MIN = 0.1;
export const TRONG_SO_MAX = 10;
export const GOI_Y_MAX = 300;
