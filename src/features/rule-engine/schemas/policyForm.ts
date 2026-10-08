import type { ApprovalThresholds, ModelWeights, PolicyGrade } from '../types';

/**
 * Kiểm tra sớm form chính sách trước khi PUT /config/product.
 *
 * Chỉ gồm các ràng buộc rẻ, chắc chắn trùng backend (`config_router.py`). Ràng buộc
 * phụ thuộc cấu hình (bảng hạng phủ kín 0 đến 100, ngưỡng tự duyệt thuộc hai hạng
 * cao nhất, hạn mức không vượt trần nền tảng) để backend kiểm và hiện nguyên câu
 * backend trả về, tránh hai nơi diễn giải khác nhau.
 */
export function kiemTraChinhSach(
  grades: PolicyGrade[],
  thresholds: ApprovalThresholds,
  weights: ModelWeights,
): string | null {
  if (thresholds.auto_reject >= thresholds.auto_approve) {
    return 'Ngưỡng tự động từ chối phải nhỏ hơn ngưỡng tự động đề xuất duyệt.';
  }
  const total = Math.round((weights.pd_weight + weights.risk_weight) * 10000) / 10000;
  if (total !== 1) {
    return `Trọng số PD cộng trọng số điểm luật phải bằng 1 (hiện tại là ${total}).`;
  }
  for (const g of grades) {
    if (g.min_score >= g.max_score) {
      return `Hạng ${g.grade}: điểm tối thiểu (${g.min_score}) phải nhỏ hơn điểm tối đa (${g.max_score}).`;
    }
    if (g.limit < 0) return `Hạng ${g.grade}: hạn mức không được âm.`;
  }
  return null;
}
