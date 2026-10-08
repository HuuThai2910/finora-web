/* ── Cấu hình chính sách AI (finora-ai /api/v1/ai/config/product) ────────── */

/** Một hạng tín dụng. Bảng hạng là cấu hình động: backend không cố định tập A-E. */
export interface PolicyGrade {
  grade: string;
  min_score: number;
  max_score: number;
  /** Hạn mức gợi ý (VNĐ), không vượt `legal_limits.max_platform_limit`. */
  limit: number;
}

export interface ApprovalThresholds {
  auto_approve: number;
  auto_reject: number;
}

export interface ModelWeights {
  pd_weight: number;
  risk_weight: number;
}

/** Trần pháp lý: chỉ đọc, PUT /config/product không đổi được. */
export interface LegalLimits {
  max_platform_limit: number;
  /** Trần tổng dư nợ một khách hàng trên toàn bộ nền tảng, Quyết định 2866/QĐ-NHNN. */
  max_total_debt_all_platforms: number;
  /** Dạng tỷ lệ: 0.2 nghĩa là 20%/năm. */
  max_interest_rate: number;
  max_term_months: number;
}

export interface AiPolicyConfig {
  decision_policy_version: string;
  grades: PolicyGrade[];
  approval_thresholds: ApprovalThresholds;
  model_weights: ModelWeights;
  legal_limits: LegalLimits;
}

/** PUT /config/product: không gửi `legal_limits`, backend giữ nguyên. */
export interface AiPolicyConfigUpdate {
  grades: PolicyGrade[];
  approval_thresholds: ApprovalThresholds;
  model_weights?: ModelWeights;
}

/* ── Bộ luật chấm điểm (finora-ai /api/v1/ai/config/rules) ───────────────── */

/** Một bậc chấm điểm: [ngưỡng, điểm]. */
export type RuleBac = [number, number];

/**
 * Một luật chấm điểm, đúng bản ghi backend lưu trong product_config.json.
 * Luật là dữ liệu: admin thêm/sửa/xoá tuỳ ý, không còn bộ luật cố định.
 */
export interface AiRule {
  /** Mã ổn định, ^[A-Z][A-Z0-9_]{2,63}$; xuất hiện trong rule_trace lưu kèm quyết định. */
  ma: string;
  mo_ta: string;
  /** Mã trường trong danh mục `AiTruong` mà luật đọc giá trị. */
  truong: string;
  /** True nghĩa là giá trị càng thấp càng tốt (ví dụ DTI). Chỉ có nghĩa với trường số. */
  nghich_dao: boolean;
  /** Tỷ trọng so với luật khác khi chuẩn hoá về thang 100, 0.1 đến 10. */
  trong_so: number;
  bat: boolean;
  diem_khi_thieu: number;
  /** Bậc (ngưỡng, điểm) cho trường số. */
  bac: RuleBac[] | null;
  /** Bảng điểm theo giá trị rời rạc cho trường phân loại. */
  bang_diem: Record<string, number> | null;
  /** Mẫu câu gợi ý cải thiện cho người vay, chỗ trống {moc} là ngưỡng kế tiếp. */
  goi_y: string | null;
}

/** Một trường trong danh mục backend công bố; luật chỉ được đọc trường ở đây. */
export interface AiTruong {
  ma: string;
  mo_ta: string;
  kieu: 'so' | 'phan_loai';
  nguon: 'ho_so' | 'cic' | 'fineract' | 'dan_xuat';
  don_vi: string;
  /** True với trường 0 đến 1: hiển thị và gợi ý theo phần trăm. */
  la_ty_le: boolean;
  gia_tri_hop_le: string[];
  nhom_shap: string | null;
}

export interface AiRulesResponse {
  decision_policy_version: string;
  rules: AiRule[];
  truong: AiTruong[];
  diem_toi_da_moi_luat: number;
  /** Ngưỡng biểu diễn "mọi giá trị còn lại"; JSON không có Infinity. */
  nguong_vo_cuc: number;
}

/** PUT thay TOÀN BỘ danh sách luật, theo đúng thứ tự gửi lên. */
export interface AiRulesUpdate {
  rules: AiRule[];
}
