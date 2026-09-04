/* ── AI Credit Scoring (finora-ai /api/v1/ai/credit) ─────────────────────── */

/** Hồ sơ gửi sang finora-ai để chấm điểm. Trường tùy chọn bỏ trống thay vì
 *  điền số, để bộ dự đoán dùng median trong gói model. */
export interface CreditScoreRequest {
  annual_inc: number;
  loan_amnt: number;
  purpose: string;
  home_ownership: string;
  person_age?: number;
  emp_length?: string;
  verification_status?: string;
  dti?: number;
  installment?: number;
  int_rate?: number;
  term_months?: number;
  interest_method?: string;
  so_cccd?: string;
}

/** Vết của một luật đã chạy — cơ sở giải trình của Rule Engine (D4). */
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

export interface CreditScoreResponse {
  pd_probability: number;
  risk_score: number;
  evaluation_score: number;
  credit_grade: 'A' | 'B' | 'C' | 'D';
  suggested_limit: number;
  decision: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  rejection_reason: string | null;
  rejection_reasons: string[];
  rule_trace: RuleTraceItem[];
  model_version: string;
}

/** Một yếu tố ảnh hưởng tới PD, đo bằng đóng góp TreeSHAP (C1.2). */
export interface YeuToAnhHuong {
  dac_trung: string;
  mo_ta: string;
  gia_tri: number;
  /** Đóng góp vào log-odds: dương = đẩy về phía rủi ro, âm = kéo về an toàn. */
  muc_dong_gop: number;
  /** True khi đặc trưng là rò rỉ nhãn đã biết (int_rate) — hiển thị kèm cảnh báo. */
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

/** Bản diễn giải cho người vay — thay số log-odds bằng câu chữ và việc cần làm. */
export interface DienGiaiNguoiDung {
  thong_diep: string;
  ly_do_chinh: string[];
  goi_y_cai_thien: string[];
}

export interface CreditExplainResponse {
  pd_probability: number;
  risk_score: number;
  evaluation_score: number;
  credit_grade: 'A' | 'B' | 'C' | 'D';
  decision: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED';
  dien_giai: DienGiaiNguoiDung;
  giai_thich_mo_hinh: GiaiThichMoHinh;
  rule_trace: RuleTraceItem[];
  rejection_reasons: string[];
  model_version: string;
}
