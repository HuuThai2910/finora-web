import { sangPhanTram } from '../mappers/policyDisplay';
import type { ApprovalThresholds, ModelWeights } from '../types';
import { DefRow } from './DefRow';
import { CARD, CARD_HEAD, CARD_TITLE, POLICY_INPUT } from './styles';

interface PolicyThresholdsCardProps {
  weights: ModelWeights;
  thresholds: ApprovalThresholds;
  editing: boolean;
  /** Trọng số PD theo phần trăm; trọng số điểm luật tự bằng phần còn lại. */
  onPdPercent: (percent: number) => void;
  onThreshold: (field: keyof ApprovalThresholds, value: number) => void;
}

const pct = (ratio: number) => `${sangPhanTram(ratio)}%`;

/** Ô số kèm đơn vị "%" bên phải; ô chỉ đọc (tự tính) nền xám để không bị tưởng là gõ được. */
const PERCENT_WRAP = 'inline-flex items-center gap-1.5';
const UNIT = <span className="text-[13px] font-normal text-secondary">%</span>;

/**
 * Trọng số trộn điểm và hai ngưỡng quyết định tự động.
 * Công thức ở ghi chú lấy từ `tinh_diem_tong_hop` của finora-ai. Trọng số nhập theo phần trăm (85 thay vì 0,85) cho
 * khớp cách hiển thị; ô trọng số điểm luật không nhập mà tự bằng 100 trừ trọng số PD, nên tổng luôn đúng 100%.
 */
export function PolicyThresholdsCard({ weights, thresholds, editing, onPdPercent, onThreshold }: PolicyThresholdsCardProps) {
  const thresholdInput = (id: string, label: string, value: number, onChange: (value: number) => void) => (
    <input
      id={id}
      type="number"
      className={`aip-input ${POLICY_INPUT} w-25`}
      aria-label={label}
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
  const pdPercent = sangPhanTram(weights.pd_weight);
  const riskPercent = sangPhanTram(weights.risk_weight);

  return (
    <article className={`ui-card aip-card ${CARD}`} aria-labelledby="aipThresholdsTitle">
      <div className={`aip-card-head ${CARD_HEAD}`}>
        <h2 id="aipThresholdsTitle" className={CARD_TITLE}>Trọng số và ngưỡng duyệt</h2>
      </div>
      <dl className="aip-def">
        <DefRow
          label="Trọng số PD"
          value={editing ? (
            <span className={PERCENT_WRAP}>
              <input
                id="aipPd"
                type="number"
                className={`aip-input ${POLICY_INPUT} w-20`}
                aria-label="Trọng số PD (%)"
                min="0"
                max="100"
                step="5"
                value={pdPercent}
                onChange={(e) => onPdPercent(Number(e.target.value))}
              />
              {UNIT}
            </span>
          ) : pct(weights.pd_weight)}
          note="Điểm PD = (1 - PD) × 100"
        />
        <DefRow
          label="Trọng số điểm luật"
          value={editing ? (
            <span className={PERCENT_WRAP}>
              <input
                id="aipRisk"
                type="number"
                className={`aip-input ${POLICY_INPUT} w-20 read-only:bg-surface-muted read-only:text-secondary`}
                aria-label="Trọng số điểm luật (%), tự bằng 100 trừ trọng số PD"
                value={riskPercent}
                readOnly
                tabIndex={-1}
              />
              {UNIT}
            </span>
          ) : pct(weights.risk_weight)}
          note={editing ? 'Tự bằng 100% trừ trọng số PD' : 'Điểm của bộ luật bên dưới, thang 100'}
        />
        <DefRow
          label="Tự động từ chối"
          value={editing
            ? thresholdInput('aipReject', 'Ngưỡng tự động từ chối', thresholds.auto_reject, (v) => onThreshold('auto_reject', v))
            : `< ${thresholds.auto_reject}`}
          note="Hoặc vi phạm luật loại trực tiếp"
        />
        <DefRow
          label="Tự động đề xuất duyệt"
          value={editing
            ? thresholdInput('aipApprove', 'Ngưỡng tự động đề xuất duyệt', thresholds.auto_approve, (v) => onThreshold('auto_approve', v))
            : `≥ ${thresholds.auto_approve}`}
          note="Điểm ở giữa chờ thẩm định viên"
        />
      </dl>
    </article>
  );
}
