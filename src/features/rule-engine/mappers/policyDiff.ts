import type { PolicyDraft } from '../hooks/usePolicyConfig';
import type { AiPolicyConfig, PolicyGrade } from '../types';
import { dong, sangPhanTram } from './policyDisplay';

/** Một dòng trong hộp xác nhận lưu: mục thay đổi, giá trị cũ và mới (thêm/xóa thì chỉ có một bên). */
export interface ThayDoi {
  muc: string;
  cu?: string;
  moi?: string;
}

const pct = (tyLe: number) => `${sangPhanTram(tyLe)}%`;
const khoangDiem = (g: PolicyGrade) => `${g.min_score} đến ${g.max_score}`;

function themNeuKhac(list: ThayDoi[], muc: string, cu: string, moi: string) {
  if (cu !== moi) list.push({ muc, cu, moi });
}

/**
 * Các thay đổi của bản nháp so với cấu hình đang áp dụng, để quản trị viên đọc lại trước khi lưu: PUT thay toàn bộ
 * cấu hình và mọi hồ sơ chấm sau đó theo bản mới. So bảng hạng theo tên hạng; danh sách hạng không đổi khi sửa.
 */
export function diffChinhSach(config: AiPolicyConfig, draft: PolicyDraft): ThayDoi[] {
  const list: ThayDoi[] = [];
  themNeuKhac(list, 'Trọng số PD', pct(config.model_weights.pd_weight), pct(draft.weights.pd_weight));
  themNeuKhac(list, 'Trọng số điểm luật', pct(config.model_weights.risk_weight), pct(draft.weights.risk_weight));
  themNeuKhac(list, 'Tự động từ chối', `dưới ${config.approval_thresholds.auto_reject}`, `dưới ${draft.thresholds.auto_reject}`);
  themNeuKhac(
    list, 'Tự động đề xuất duyệt',
    `từ ${config.approval_thresholds.auto_approve}`, `từ ${draft.thresholds.auto_approve}`,
  );
  for (const moi of draft.grades) {
    const cu = config.grades.find((g) => g.grade === moi.grade);
    if (!cu) continue;
    themNeuKhac(list, `Hạng ${moi.grade}, khoảng điểm`, khoangDiem(cu), khoangDiem(moi));
    themNeuKhac(list, `Hạng ${moi.grade}, hạn mức gợi ý`, dong(cu.limit), dong(moi.limit));
  }
  return list;
}
