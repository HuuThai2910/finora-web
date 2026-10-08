import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { formatDateTime } from '../../formatters';
import type { AdminAssessmentExplanation, AssessmentEvidence } from '../../types';
import { BorrowerMessage, FactorSummary, RuleTraceTable, ShapColumns } from './AiExplanationBlocks';
import { ReviewCard } from './ReviewCard';
import { policyLabel } from '../../mappers/reviewDisplay';

interface ScoringDetailTabProps {
  assessment: AssessmentEvidence | null;
  explanation: AdminAssessmentExplanation | null;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

function metaLine(assessment: AssessmentEvidence, explanation: AdminAssessmentExplanation | null): string {
  const scoredAt = explanation?.scoredAt ?? assessment.scoredAt;
  const model = explanation?.actualModelVersion ?? assessment.actualModelVersion;
  const policy = explanation?.decisionPolicyVersion ?? assessment.decisionPolicyVersion;
  return [
    scoredAt ? `Chấm lúc ${formatDateTime(scoredAt)}` : null,
    `mô hình ${model ?? 'chưa xác định'}`,
    policy ? policyLabel(policy) : null,
  ].filter(Boolean).join(', ');
}

/**
 * Tab "Chi tiết chấm điểm": bản AI sinh lúc chấm, do Loan Service lưu lại và không chấm lại, nên
 * đây là bằng chứng cho quyết định đã ra kể cả khi mô hình hoặc bộ luật sau đó đã đổi.
 */
export function ScoringDetailTab({ assessment, explanation, isLoading, error, onRetry }: ScoringDetailTabProps) {
  const [technical, setTechnical] = useState(false);

  if (!assessment || assessment.status !== 'SUCCEEDED') {
    return (
      <ReviewCard title="Chi tiết chấm điểm">
        <p className="lr-muted">Chưa có kết quả chấm điểm.</p>
      </ReviewCard>
    );
  }

  const meta = metaLine(assessment, explanation);
  if (error && !explanation) {
    return (
      <ReviewCard title="Chi tiết chấm điểm" aside={meta}>
        <ErrorNotice error={error} onRetry={onRetry} />
      </ReviewCard>
    );
  }
  if (!explanation) {
    return (
      <ReviewCard title="Chi tiết chấm điểm" aside={meta}>
        <p className="lr-muted" aria-busy={isLoading}>Đang tải phân tích...</p>
      </ReviewCard>
    );
  }

  const model = explanation.modelExplanation;
  return (
    <ReviewCard title="Chi tiết chấm điểm" aside={meta}>
      <div className="lr-ai">
        {/* Vết luật là căn cứ thẩm định: mỗi luật do quản trị viên cấu hình, có trường đã đọc,
            giá trị thật và điểm. Bản gộp SHAP bên dưới chỉ cho biết mô hình chú ý điều gì. */}
        {explanation.ruleTrace && explanation.ruleTrace.length > 0 ? (
          <section className="lr-ai-section">
            <h3>Bảng luật đã chấm</h3>
            <p className="lr-ai-sub">Đủ mã luật, trường đọc và trọng số để đối chiếu với chính sách đánh giá.</p>
            <RuleTraceTable trace={explanation.ruleTrace} />
          </section>
        ) : null}

        {model ? <FactorSummary summary={model.tom_tat} /> : null}
        {explanation.borrowerExplanation ? <BorrowerMessage message={explanation.borrowerExplanation} /> : null}

        {model ? (
          <>
            <div className="lr-ai-mode">
              <button type="button" className="ui-btn soft" aria-expanded={technical} onClick={() => setTechnical((value) => !value)}>
                {technical ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật (SHAP từng đặc trưng)'}
              </button>
              <span>Số liệu trên thang log-odds, dùng để đối chiếu mô hình, không cần cho thẩm định thường ngày.</span>
            </div>
            {technical && model.canh_bao.length > 0 ? (
              <div className="lr-ai-warning">
                <Icon name="alert" />
                <div><b>Lưu ý về chất lượng giải thích.</b> {model.canh_bao.join(' ')}</div>
              </div>
            ) : null}
            {technical ? (
              <section className="lr-ai-section">
                <h3>Chi tiết SHAP từng đặc trưng (bản thô)</h3>
                <p className="lr-ai-sub">
                  Từng đặc trưng đúng như mô hình nhìn thấy. Tổng mọi đóng góp cộng giá trị cơ sở ({model.gia_tri_co_so}) bằng đúng đầu ra.
                </p>
                <ShapColumns risk={model.yeu_to_bat_loi} safe={model.yeu_to_co_loi} />
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </ReviewCard>
  );
}
