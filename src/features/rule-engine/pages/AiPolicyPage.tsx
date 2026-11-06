import { usePermission } from '@/features/auth';
import { AiErrorNotice } from '../components/AiErrorNotice';
import { GradeTableCard } from '../components/GradeTableCard';
import { IconEdit } from '../components/icons';
import { KnockoutRulesCard } from '../components/KnockoutRulesCard';
import { LegalLimitsCard } from '../components/LegalLimitsCard';
import { PolicyThresholdsCard } from '../components/PolicyThresholdsCard';
import RuleEnginePanel from '../components/RuleEnginePanel';
import { SaveConfirmModal } from '../components/SaveConfirmModal';
import { usePolicyConfig } from '../hooks/usePolicyConfig';
import { nhanPhienBan } from '../mappers/policyDisplay';

/**
 * Chính sách đánh giá AI (`/loans/evaluation`).
 *
 * Hai khối lưu độc lập vì backend có hai endpoint riêng: phần trên (trọng số, ngưỡng, bảng hạng) lưu qua PUT
 * /config/product bằng nút "Sửa trọng số và hạng" ở đầu trang; bộ luật chấm điểm lưu qua PUT /config/rules bằng nút
 * riêng trong thẻ của nó. Cả hai cùng nâng phiên bản chính sách tín dụng (`decision_policy_version`), hiện dưới tiêu đề
 * để người duyệt biết hồ sơ đang được chấm theo bản nào.
 */
export default function AiPolicyPage() {
  const policy = usePolicyConfig();
  const { config, draft } = policy;
  const editing = draft !== null;
  // Sửa trọng số, ngưỡng và bảng hạng cần quyền Thao tác "Chính sách AI"; chỉ có quyền Xem thì trang chỉ đọc.
  const canEdit = usePermission().canAct('ai-policy');
  const phienBan = nhanPhienBan(config?.decision_policy_version);

  const headAction = !editing ? (
    <button type="button" className="ui-btn primary" onClick={policy.startEditing}>
      <IconEdit />
      Sửa trọng số và hạng
    </button>
  ) : (
    <div className="aip-actions flex gap-2 shrink-0">
      <button type="button" className="ui-btn ghost" onClick={policy.cancelEditing} disabled={policy.saving}>Hủy</button>
      <button type="button" className="ui-btn primary" onClick={policy.save} disabled={policy.saving}>
        {policy.saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </div>
  );

  return (
    <section className="ui-page aip-page">
      <header className="ui-page-head aip-page-head items-center">
        <div className="ui-title">
          <h1>Chính sách đánh giá AI</h1>
          {phienBan && <p className="aip-version">Đang áp dụng: chính sách tín dụng {phienBan}</p>}
        </div>
        {config && canEdit && headAction}
      </header>

      {policy.formError && <div className="ui-alert" role="alert">{policy.formError}</div>}
      {policy.conflict ? (
        <div className="ui-alert aip-conflict" role="alert">
          <div>
            Chính sách vừa được người khác lưu nên chưa lưu được thay đổi của bạn.
            <small>Tải bản mới để xem họ đã đổi gì, rồi sửa lại.</small>
          </div>
          <button type="button" className="ui-btn soft" onClick={policy.reloadLatest}>Tải bản mới</button>
        </div>
      ) : null}

      {policy.loadError ? (
        <AiErrorNotice error={policy.loadError} onRetry={policy.refetch} />
      ) : policy.isLoading || !config ? (
        <div className="ui-card ui-empty" aria-busy="true">Đang tải chính sách đánh giá AI...</div>
      ) : (
        <>
          <div className="aip-top grid grid-cols-2 gap-4 [align-items:start] max-[1100px]:grid-cols-[1fr]">
            <PolicyThresholdsCard
              weights={draft?.weights ?? config.model_weights}
              thresholds={draft?.thresholds ?? config.approval_thresholds}
              editing={editing}
              onPdPercent={policy.setPdPercent}
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

      {policy.pending && (
        <SaveConfirmModal
          title="Lưu trọng số, ngưỡng và hạng"
          phienBan={phienBan}
          changes={policy.pending}
          saving={policy.saving}
          onConfirm={policy.confirmSave}
          onClose={policy.closeConfirm}
        />
      )}
    </section>
  );
}
