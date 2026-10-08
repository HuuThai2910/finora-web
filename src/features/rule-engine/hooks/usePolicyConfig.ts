import { useCallback, useState } from 'react';
import { useGetAiPolicyConfigQuery, useUpdateAiPolicyConfigMutation } from '../api/policyConfigApi';
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
 * Bản nháp chỉ tồn tại khi đang sửa và được chép từ cache lúc bấm "Chỉnh sửa", nên
 * không cần đồng bộ ngược khi cache đổi. Lưu xong thì RTK Query tải lại cấu hình
 * (tag `AiConfig`) và trang hiện bản backend vừa ghi. Nút lưu bị khóa trong lúc
 * gửi để không PUT hai lần; PUT thay toàn bộ cấu hình nên gửi lại cũng an toàn.
 */
export function usePolicyConfig() {
  const query = useGetAiPolicyConfigQuery();
  const [update, { isLoading: saving }] = useUpdateAiPolicyConfigMutation();
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const config = query.data;
  // Giữ cùng một hàm qua các lần render: Toast đặt lại hẹn giờ mỗi khi onDismiss đổi.
  const dismissNotice = useCallback(() => setNotice(null), []);

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

  function setWeight(field: keyof ModelWeights, value: number) {
    setDraft((prev) => prev && { ...prev, weights: { ...prev.weights, [field]: value } });
  }

  async function save() {
    if (!draft || saving) return;
    const error = kiemTraChinhSach(draft.grades, draft.thresholds, draft.weights);
    setFormError(error);
    setSaveError(null);
    if (error) return;
    try {
      await update({
        grades: draft.grades,
        approval_thresholds: draft.thresholds,
        model_weights: draft.weights,
      }).unwrap();
      setDraft(null);
      setNotice('Đã lưu chính sách đánh giá AI.');
    } catch (err: unknown) {
      setSaveError(err);
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
    notice,
    dismissNotice,
    startEditing,
    cancelEditing,
    setGrade,
    setThreshold,
    setWeight,
    save,
  };
}
