import { formatCurrency } from '@/utils';
import type { ModelWeights, PolicyGrade } from '../types';
import { GradeBadge } from './GradeBadge';

interface GradeTableCardProps {
  grades: PolicyGrade[];
  weights: ModelWeights;
  editing: boolean;
  onGrade: (index: number, field: 'min_score' | 'max_score' | 'limit', value: number) => void;
}

/** Bảng hạng tín dụng: khoảng điểm và hạn mức gợi ý của từng hạng. */
export function GradeTableCard({ grades, weights, editing, onGrade }: GradeTableCardProps) {
  const scoreInput = (index: number, field: 'min_score' | 'max_score', grade: PolicyGrade) => (
    <input
      type="number"
      className="aip-input"
      min="0"
      max="100"
      aria-label={`${field === 'min_score' ? 'Điểm tối thiểu' : 'Điểm tối đa'} hạng ${grade.grade}`}
      value={grade[field]}
      onChange={(e) => onGrade(index, field, Number(e.target.value))}
    />
  );

  return (
    <article className="ui-card aip-card" aria-labelledby="aipGradeTitle">
      <div className="aip-card-head">
        <h2 id="aipGradeTitle">Phân hạng và hạn mức gợi ý</h2>
        <span className="aip-meta">
          Điểm đánh giá = điểm PD × {Math.round(weights.pd_weight * 100)}% + điểm luật × {Math.round(weights.risk_weight * 100)}%
        </span>
      </div>
      <div className="ui-table-wrap aip-table-wrap">
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
                    <input
                      type="number"
                      className="aip-input money"
                      min="0"
                      step="1000000"
                      aria-label={`Hạn mức hạng ${g.grade}`}
                      value={g.limit}
                      onChange={(e) => onGrade(i, 'limit', Number(e.target.value))}
                    />
                  ) : formatCurrency(g.limit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
