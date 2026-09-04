/* ── AI Rules (finora-ai /api/v1/ai/config/rules) ───────────────────────── */

/** Một bậc chấm điểm: [ngưỡng, điểm]. */
export type RuleBac = [number, number];

/**
 * Một luật chấm điểm — đúng bản ghi backend lưu trong product_config.json.
 * Luật là dữ liệu: admin thêm/sửa/xoá tuỳ ý, không còn bộ luật cố định.
 */
export interface AiRule {
  /** Mã ổn định, ^[A-Z][A-Z0-9_]{2,63}$ — xuất hiện trong rule_trace lưu kèm quyết định. */
  ma: string;
  mo_ta: string;
  /** Mã trường trong danh mục `AiTruong` mà luật đọc giá trị. */
  truong: string;
  /** True nghĩa là giá trị càng thấp càng tốt (ví dụ DTI). Chỉ có nghĩa với trường số. */
  nghich_dao: boolean;
  /** Tỷ trọng so với luật khác khi chuẩn hoá về thang 100, 0.1–10. */
  trong_so: number;
  bat: boolean;
  diem_khi_thieu: number;
  /** Bậc (ngưỡng, điểm) — trường số. */
  bac: RuleBac[] | null;
  /** Bảng điểm theo giá trị rời rạc — trường phân loại. */
  bang_diem: Record<string, number> | null;
  /** Mẫu câu gợi ý cải thiện cho người vay, chỗ trống {moc} là ngưỡng kế tiếp. */
  goi_y: string | null;
}

/** Một trường trong danh mục backend công bố — luật chỉ được đọc trường ở đây. */
export interface AiTruong {
  ma: string;
  mo_ta: string;
  kieu: 'so' | 'phan_loai';
  nguon: 'ho_so' | 'cic' | 'fineract' | 'dan_xuat';
  don_vi: string;
  /** True với trường 0–1: hiển thị và gợi ý theo phần trăm. */
  la_ty_le: boolean;
  gia_tri_hop_le: string[];
  nhom_shap: string | null;
}

export interface AiRulesResponse {
  rules: AiRule[];
  truong: AiTruong[];
  diem_toi_da_moi_luat: number;
  /** Ngưỡng biểu diễn "mọi giá trị còn lại" — JSON không có Infinity. */
  nguong_vo_cuc: number;
}

/** PUT thay TOÀN BỘ danh sách luật, theo đúng thứ tự gửi lên. */
export interface AiRulesUpdate {
  rules: AiRule[];
}
