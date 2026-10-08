import type { ApprovalThresholds, ModelWeights } from '../types';
import { DefRow } from './DefRow';

interface PolicyThresholdsCardProps {
  weights: ModelWeights;
  thresholds: ApprovalThresholds;
  editing: boolean;
  onWeight: (field: keyof ModelWeights, value: number) => void;
  onThreshold: (field: keyof ApprovalThresholds, value: number) => void;
}

const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

/**
 * Trọng số trộn điểm và hai ngưỡng quyết định tự động.
 * Công thức ở ghi chú lấy từ `tinh_diem_tong_hop` của finora-ai.
 */
export function PolicyThresholdsCard({ weights, thresholds, editing, onWeight, onThreshold }: PolicyThresholdsCardProps) {
  const numberInput = (
    id: string,
    label: string,
    value: number,
    onChange: (value: number) => void,
    attrs: { step?: string; min: string; max: string },
  ) => (
    <input
      id={id}
      type="number"
      className="aip-input"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      {...attrs}
    />
  );

  return (
    <article className="ui-card aip-card" aria-labelledby="aipThresholdsTitle">
      <div className="aip-card-head">
        <h2 id="aipThresholdsTitle">Trọng số và ngưỡng duyệt</h2>
      </div>
      <dl className="aip-def">
        <DefRow
          label="Trọng số PD"
          value={editing
            ? numberInput('aipPd', 'Trọng số PD', weights.pd_weight, (v) => onWeight('pd_weight', v), { step: '0.05', min: '0', max: '1' })
            : pct(weights.pd_weight)}
          note="Điểm PD = (1 - PD) × 100"
        />
        <DefRow
          label="Trọng số điểm luật"
          value={editing
            ? numberInput('aipRisk', 'Trọng số điểm luật', weights.risk_weight, (v) => onWeight('risk_weight', v), { step: '0.05', min: '0', max: '1' })
            : pct(weights.risk_weight)}
          note="Điểm của bộ luật bên dưới, thang 100"
        />
        <DefRow
          label="Tự động từ chối"
          value={editing
            ? numberInput('aipReject', 'Ngưỡng tự động từ chối', thresholds.auto_reject, (v) => onThreshold('auto_reject', v), { min: '0', max: '100' })
            : `< ${thresholds.auto_reject}`}
          note="Hoặc vi phạm luật loại trực tiếp"
        />
        <DefRow
          label="Tự động đề xuất duyệt"
          value={editing
            ? numberInput('aipApprove', 'Ngưỡng tự động đề xuất duyệt', thresholds.auto_approve, (v) => onThreshold('auto_approve', v), { min: '0', max: '100' })
            : `≥ ${thresholds.auto_approve}`}
          note="Điểm ở giữa chờ thẩm định viên"
        />
      </dl>
    </article>
  );
}
