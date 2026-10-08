import { Toast } from '@/components/Toast';
import { AiErrorNotice } from '../components/AiErrorNotice';
import { GradeTableCard } from '../components/GradeTableCard';
import { IconEdit } from '../components/icons';
import { KnockoutRulesCard } from '../components/KnockoutRulesCard';
import { LegalLimitsCard } from '../components/LegalLimitsCard';
import { PolicyThresholdsCard } from '../components/PolicyThresholdsCard';
import RuleEnginePanel from '../components/RuleEnginePanel';
import { usePolicyConfig } from '../hooks/usePolicyConfig';
import './AiPolicyPage.css';

/**
 * Chính sách đánh giá AI (`/loans/evaluation`).
 *
 * Hai khối lưu độc lập vì backend có hai endpoint riêng: phần trên (trọng số, ngưỡng,
 * bảng hạng) lưu qua PUT /config/product bằng nút "Chỉnh sửa" ở đầu trang; bộ luật
 * chấm điểm lưu qua PUT /config/rules bằng nút riêng trong thẻ của nó.
 */
export default function AiPolicyPage() {
  const policy = usePolicyConfig();
  const { config, draft } = policy;
  const editing = draft !== null;

  const headAction = !editing ? (
    <button type="button" className="ui-btn primary" onClick={policy.startEditing}>
      <IconEdit />
      Chỉnh sửa
    </button>
  ) : (
    <div className="aip-actions">
      <button type="button" className="ui-btn ghost" onClick={policy.cancelEditing} disabled={policy.saving}>Hủy</button>
      <button type="button" className="ui-btn primary" onClick={policy.save} disabled={policy.saving}>
        {policy.saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </div>
  );

  return (
    <section className="ui-page aip-page">
      <header className="ui-page-head aip-page-head">
        <div className="ui-title"><h1>Chính sách đánh giá AI</h1></div>
        {config && headAction}
      </header>

      {policy.formError && <div className="ui-alert" role="alert">{policy.formError}</div>}
      {policy.saveError ? <AiErrorNotice error={policy.saveError} /> : null}

      {policy.loadError ? (
        <AiErrorNotice error={policy.loadError} onRetry={policy.refetch} />
      ) : policy.isLoading || !config ? (
        <div className="ui-card ui-empty" aria-busy="true">Đang tải chính sách đánh giá AI...</div>
      ) : (
        <>
          <div className="aip-top">
            <PolicyThresholdsCard
              weights={draft?.weights ?? config.model_weights}
              thresholds={draft?.thresholds ?? config.approval_thresholds}
              editing={editing}
              onWeight={policy.setWeight}
              onThreshold={policy.setThreshold}
            />
            <LegalLimitsCard limits={config.legal_limits} />
          </div>
          <GradeTableCard
            grades={draft?.grades ?? config.grades}
            weights={draft?.weights ?? config.model_weights}
            editing={editing}
            onGrade={policy.setGrade}
          />
          <KnockoutRulesCard limits={config.legal_limits} />
        </>
      )}

      {/* Bộ luật tải và lưu độc lập: lỗi cấu hình chính sách không chặn việc xem luật. */}
      <RuleEnginePanel />

      {policy.notice && <Toast message={policy.notice} onDismiss={policy.dismissNotice} />}
    </section>
  );
}
