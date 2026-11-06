import { formatNumber } from '@/utils';
import { dong, sangPhanTram, soTuChuoi } from '../mappers/policyDisplay';
import type { ModelWeights, PolicyGrade } from '../types';
import { GradeBadge } from './GradeBadge';
import { CARD, CARD_HEAD, CARD_TITLE, META, POLICY_INPUT, TABLE_WRAP } from './styles';

interface GradeTableCardProps {
  grades: PolicyGrade[];
  weights: ModelWeights;
  editing: boolean;
  onGrade: (index: number, field: 'min_score' | 'max_score' | 'limit', value: number) => void;
}

/**
 * Bảng hạng tín dụng: khoảng điểm và hạn mức gợi ý của từng hạng. Ô hạn mức là ô chữ có dấu phân cách hàng nghìn và
 * đơn vị "đ" (như ô số tiền của màn thu hồi): số hàng chục triệu gõ trong ô số trơn rất dễ thừa hay thiếu một chữ số 0.
 */
export function GradeTableCard({ grades, weights, editing, onGrade }: GradeTableCardProps) {
  const scoreInput = (index: number, field: 'min_score' | 'max_score', grade: PolicyGrade) => (
    <input
      type="number"
      className={`aip-input ${POLICY_INPUT} w-22`}
      min="0"
      max="100"
      aria-label={`${field === 'min_score' ? 'Điểm tối thiểu' : 'Điểm tối đa'} hạng ${grade.grade}`}
      value={grade[field]}
      onChange={(e) => onGrade(index, field, Number(e.target.value))}
    />
  );

  return (
    <article className={`ui-card aip-card ${CARD}`} aria-labelledby="aipGradeTitle">
      <div className={`aip-card-head ${CARD_HEAD}`}>
        <h2 id="aipGradeTitle" className={CARD_TITLE}>Phân hạng và hạn mức gợi ý</h2>
        <span className={`aip-meta ${META}`}>
          Điểm đánh giá = điểm PD × {sangPhanTram(weights.pd_weight)}% + điểm luật × {sangPhanTram(weights.risk_weight)}%
        </span>
      </div>
      <div className={`ui-table-wrap aip-table-wrap ${TABLE_WRAP}`}>
        <table className="ui-table list aip-grade-table">
          <thead>
            <tr>
              <th>Hạng</th>
              <th className="num">Điểm tối thiểu</th>
              <th className="num">Điểm tối đa</th>
              <th className="num">Hạn mức gợi ý</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((g, i) => (
              <tr key={editing ? i : g.grade}>
                <td><GradeBadge grade={g.grade} /></td>
                <td className="num">{editing ? scoreInput(i, 'min_score', g) : g.min_score}</td>
                <td className="num">{editing ? scoreInput(i, 'max_score', g) : g.max_score}</td>
                <td className="num">
                  {editing ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-secondary">
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`aip-input money ${POLICY_INPUT} w-37.5`}
                        aria-label={`Hạn mức hạng ${g.grade} (đồng)`}
                        value={formatNumber(g.limit)}
                        onChange={(e) => onGrade(i, 'limit', soTuChuoi(e.target.value))}
                      />
                      đ
                    </span>
                  ) : dong(g.limit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
