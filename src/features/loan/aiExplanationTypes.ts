/* ── Giải thích AI của một lần chấm điểm (finora-ai), dùng ở trang chi tiết hồ sơ vay ── */

/** Vết của một luật đã chạy: cơ sở giải trình của bộ luật chấm điểm. */
export interface RuleTraceItem {
  ma: string;
  mo_ta: string;
  /** Mã trường luật đã đọc, ví dụ cic_score. */
  truong: string;
  gia_tri: number | string | null;
  diem: number;
  toi_da: number;
  trong_so: number;
  thieu_du_lieu: boolean;
}

/** Một yếu tố ảnh hưởng tới PD, đo bằng đóng góp TreeSHAP. */
export interface YeuToAnhHuong {
  dac_trung: string;
  mo_ta: string;
  gia_tri: number;
  /** Đóng góp vào log-odds: dương = đẩy về phía rủi ro, âm = kéo về an toàn. */
  muc_dong_gop: number;
  /** True khi đặc trưng là rò rỉ nhãn đã biết (int_rate): hiển thị kèm cảnh báo. */
  la_leakage: boolean;
}

/**
 * Một dữ kiện gốc của hồ sơ (dư nợ, thu nhập, điểm CIC…), gộp từ mọi đặc trưng
 * dẫn xuất của nó. Bản này dành cho thẩm định viên: không số log-odds, chỉ mức
 * ảnh hưởng so với dữ kiện mạnh nhất của chính hồ sơ.
 */
export interface YeuToGop {
  ma_nhom: string;
  mo_ta: string;
  muc_do: 'manh' | 'vua' | 'nhe';
  /** Tổng đóng góp SHAP của cả nhóm, giữ để đối chứng với bản thô. */
  muc_dong_gop: number;
}

export interface TomTatYeuTo {
  bat_loi: YeuToGop[];
  co_loi: YeuToGop[];
}

export interface GiaiThichMoHinh {
  yeu_to_bat_loi: YeuToAnhHuong[];
  yeu_to_co_loi: YeuToAnhHuong[];
  gia_tri_co_so: number;
  canh_bao: string[];
  /** Bản gộp theo dữ kiện gốc, đã bỏ nhóm lãi suất (leakage). */
  tom_tat: TomTatYeuTo;
}

/** Bản diễn giải cho người vay: thay số log-odds bằng câu chữ và việc cần làm. */
export interface DienGiaiNguoiDung {
  thong_diep: string;
  ly_do_chinh: string[];
  goi_y_cai_thien: string[];
}
