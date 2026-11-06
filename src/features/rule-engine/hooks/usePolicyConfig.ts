import { useState } from 'react';
import { toast } from '@/lib/toast';
import { isPolicyConflict, toAiUiError } from '../mappers/aiApiError';
import { useGetAiPolicyConfigQuery, useUpdateAiPolicyConfigMutation } from '../api/policyConfigApi';
import { diffChinhSach, type ThayDoi } from '../mappers/policyDiff';
import { nhanPhienBan, sangTyLe } from '../mappers/policyDisplay';
import { kiemTraChinhSach } from '../schemas/policyForm';
import type { ApprovalThresholds, ModelWeights, PolicyGrade } from '../types';

export interface PolicyDraft {
  grades: PolicyGrade[];
  thresholds: ApprovalThresholds;
  weights: ModelWeights;
}

/**
 * Đọc và sửa chính sách đánh giá AI (bảng hạng, ngưỡng duyệt, trọng số).
 *
 * Bản nháp chỉ tồn tại khi đang sửa và được chép từ cache lúc bấm "Sửa trọng số và hạng", nên không cần đồng bộ ngược
 * khi cache đổi. "Lưu thay đổi" kiểm tra tại chỗ rồi mở bước xác nhận liệt kê thay đổi cũ → mới; chỉ khi xác nhận mới
 * PUT. Lưu xong RTK Query tải lại cấu hình (tag `AiConfig`) và thông báo nêu phiên bản chính sách mới backend trả về.
 * Nút lưu khóa trong lúc gửi để không PUT hai lần; PUT thay toàn bộ cấu hình nên gửi lại cũng an toàn.
 */
export function usePolicyConfig() {
  const query = useGetAiPolicyConfigQuery();
  const [update, { isLoading: saving }] = useUpdateAiPolicyConfigMutation();
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  // Người khác vừa lưu chính sách: bản nháp còn đó nhưng phải tải bản mới trước khi lưu tiếp.
  const [conflict, setConflict] = useState(false);
  const setNotice = (message: string | null) => { if (message) toast.info(message); };
  // Thay đổi chờ xác nhận; khác null là đang mở hộp xác nhận.
  const [pending, setPending] = useState<ThayDoi[] | null>(null);

  const config = query.data;

  function startEditing() {
    if (!config) return;
    setDraft({
      grades: config.grades.map((g) => ({ ...g })),
      thresholds: { ...config.approval_thresholds },
      weights: { ...config.model_weights },
    });
    setFormError(null);
    setSaveError(null);
  }

  function cancelEditing() {
    setDraft(null);
    setPending(null);
    setFormError(null);
    setSaveError(null);
  }

  function setGrade(index: number, field: 'min_score' | 'max_score' | 'limit', value: number) {
    setDraft((prev) => prev && {
      ...prev,
      grades: prev.grades.map((g, i) => (i === index ? { ...g, [field]: value } : g)),
    });
  }

  function setThreshold(field: keyof ApprovalThresholds, value: number) {
    setDraft((prev) => prev && { ...prev, thresholds: { ...prev.thresholds, [field]: value } });
  }

  /**
   * Nhập trọng số PD theo phần trăm; trọng số điểm luật tự bằng phần còn lại (100 trừ PD) vì backend bắt tổng hai
   * trọng số đúng bằng 1. Lưu dạng tỷ lệ làm tròn 4 chữ số như phép kiểm của finora-ai.
   */
  function setPdPercent(percent: number) {
    setDraft((prev) => prev && { ...prev, weights: { pd_weight: sangTyLe(percent), risk_weight: sangTyLe(100 - percent) } });
  }

  function save() {
    if (!draft || !config || saving) return;
    const error = kiemTraChinhSach(draft.grades, draft.thresholds, draft.weights);
    setFormError(error);
    setSaveError(null);
    if (error) return;
    const changes = diffChinhSach(config, draft);
    if (changes.length === 0) {
      cancelEditing();
      setNotice('Không có thay đổi nào để lưu.');
      return;
    }
    setPending(changes);
  }

  async function confirmSave() {
    if (!draft || saving) return;
    try {
      const saved = await update({
        grades: draft.grades,
        approval_thresholds: draft.thresholds,
        model_weights: draft.weights,
        expected_version: config?.decision_policy_version,
      }).unwrap();
      setDraft(null);
      setPending(null);
      const version = nhanPhienBan(saved.decision_policy_version);
      toast.success(version
        ? `Đã lưu. Hồ sơ chấm điểm từ giờ theo chính sách tín dụng ${version}.`
        : 'Đã lưu chính sách đánh giá AI.');
    } catch (err: unknown) {
      // Đóng hộp xác nhận; bản nháp còn nguyên để sửa tiếp. Xung đột phiên bản hiện cảnh báo trong trang kèm nút tải lại.
      setPending(null);
      if (isPolicyConflict(err)) {
        setConflict(true);
        return;
      }
      toast.error(toAiUiError(err));
    }
  }

  return {
    config,
    isLoading: query.isLoading,
    loadError: query.error,
    refetch: query.refetch,
    draft,
    saving,
    formError,
    saveError,
    conflict,
    /** Bỏ bản nháp, đọc chính sách mới nhất (sau khi người khác vừa lưu). */
    reloadLatest: () => {
      setConflict(false);
      setDraft(null);
      void query.refetch();
    },
    pending,
    closeConfirm: () => setPending(null),
    startEditing,
    cancelEditing,
    setGrade,
    setThreshold,
    setPdPercent,
    save,
    confirmSave,
  };
}
