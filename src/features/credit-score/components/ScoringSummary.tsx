import { StatusPill } from '@/components/StatusPill';
import { GradeBadge } from '@/features/rule-engine';
import { NHAN_QUYET_DINH, TONE_QUYET_DINH } from '../constants';
import type { CreditExplainResponse } from '../types';

/**
 * Dải kết quả chính. Không có ô "Hạn mức đề xuất" như mockup: POST /credit/explain
 * không trả `suggested_limit`, và tự suy từ hạng ở client là tự tính lại kết quả AI.
 */
export function ScoringSummary({ ketQua }: { ketQua: CreditExplainResponse }) {
  return (
    <dl className="ui-card cs-summary" aria-label="Kết quả chấm điểm">
      <div>
        <dt>Quyết định</dt>
        <dd>
          <StatusPill tone={TONE_QUYET_DINH[ketQua.decision] ?? 'neutral'}>
            {NHAN_QUYET_DINH[ketQua.decision] ?? ketQua.decision}
          </StatusPill>
        </dd>
      </div>
      <div>
        <dt>Hạng tín dụng</dt>
        <dd><GradeBadge grade={ketQua.credit_grade} /></dd>
      </div>
      <div>
        <dt>Điểm tổng hợp</dt>
        <dd>{ketQua.evaluation_score}</dd>
      </div>
      <div>
        <dt>Xác suất vỡ nợ (PD)</dt>
        <dd>{ketQua.pd_probability}</dd>
      </div>
      <div>
        <dt>Điểm luật</dt>
        <dd>{ketQua.risk_score}<span className="cs-unit">/100</span></dd>
      </div>
    </dl>
  );
}
