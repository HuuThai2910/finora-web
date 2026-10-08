import { useEffect, useRef } from 'react';
import { useLazyGetAssessmentExplanationQuery } from '../api/loanReviewApi';
import type { AssessmentEvidence } from '../types';

/**
 * Tải lười phần giải thích AI của lần chấm điểm hiện hành.
 *
 * Payload gồm SHAP từng đặc trưng và vết mọi luật, lớn hơn nhiều so với phần tóm tắt, nên chỉ gọi
 * khi người dùng mở tab Chi tiết chấm điểm (`active`). Kết quả giữ ở cấp trang để tab Thẩm định
 * dùng lại (điểm CIC, số lần tra cứu) mà không gọi thêm.
 *
 * Mỗi `assessmentId` chỉ tự gọi một lần: sau khi chấm lại, hồ sơ trỏ sang lần chấm mới thì tải lại;
 * lỗi thì dừng, người dùng bấm "Thử lại" (`reload`) chứ không tự gọi vòng lặp.
 *
 * @param applicationNumber mã hồ sơ trên URL
 * @param assessment bằng chứng chấm điểm trong chi tiết hồ sơ; chỉ lần chấm SUCCEEDED mới có giải thích
 * @param active tab Chi tiết chấm điểm đang mở
 */
export function useAssessmentExplanation(
  applicationNumber: string,
  assessment: AssessmentEvidence | null,
  active: boolean,
) {
  const [trigger, result] = useLazyGetAssessmentExplanationQuery();
  const requestedFor = useRef<number | null>(null);
  const assessmentId = assessment?.status === 'SUCCEEDED' ? assessment.assessmentId : null;

  // Đồng bộ với tab đang mở: gọi API khi lần đầu cần, hoặc khi hồ sơ chuyển sang lần chấm mới.
  useEffect(() => {
    if (!active || assessmentId == null || requestedFor.current === assessmentId) return;
    requestedFor.current = assessmentId;
    void trigger(applicationNumber);
  }, [active, assessmentId, applicationNumber, trigger]);

  // Dữ liệu của lần chấm cũ (trước khi chấm lại) không được dùng làm căn cứ cho lần chấm mới.
  const data = result.data && result.data.assessmentId === assessmentId ? result.data : null;

  return {
    data,
    isLoading: result.isFetching,
    error: result.error,
    reload: () => {
      void trigger(applicationNumber);
    },
  };
}
