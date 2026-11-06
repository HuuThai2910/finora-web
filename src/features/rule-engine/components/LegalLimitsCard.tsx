import { formatPercent } from '@/utils';
import { dong } from '../mappers/policyDisplay';
import { CAN_CU_TRAN } from '../constants';
import type { LegalLimits } from '../types';
import { DefRow } from './DefRow';
import { CARD, CARD_HEAD, CARD_TITLE } from './styles';

/** Trần pháp lý do backend giữ cố định; PUT /config/product không đổi được. */
export function LegalLimitsCard({ limits }: { limits: LegalLimits }) {
  return (
    <article className={`ui-card aip-card ${CARD}`} aria-labelledby="aipLegalTitle">
      <div className={`aip-card-head ${CARD_HEAD}`}>
        <h2 id="aipLegalTitle" className={CARD_TITLE}>Trần theo quy định pháp luật</h2>
        <span className="ui-tag">Chỉ đọc</span>
      </div>
      <dl className="aip-def">
        <DefRow label="Hạn mức mỗi nền tảng" value={dong(limits.max_platform_limit)} note={CAN_CU_TRAN.max_platform_limit} />
        <DefRow
          label="Tổng dư nợ mọi nền tảng"
          value={dong(limits.max_total_debt_all_platforms)}
          note={CAN_CU_TRAN.max_total_debt_all_platforms}
        />
        {/* Backend trả lãi suất dạng tỷ lệ (0.2), nhân 100 trước khi định dạng. */}
        <DefRow label="Lãi suất tối đa" value={`${formatPercent(limits.max_interest_rate * 100)}/năm`} note={CAN_CU_TRAN.max_interest_rate} />
        <DefRow label="Kỳ hạn tối đa" value={`${limits.max_term_months} tháng`} note={CAN_CU_TRAN.max_term_months} />
      </dl>
    </article>
  );
}
