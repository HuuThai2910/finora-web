import { GIA_TRI_LABEL } from '../constants';
import type { AiRule, AiTruong } from '../types';
import {
  RULE_CELL_INPUT, RULE_SCORE, RULE_TABLE, RULE_TBODY, RULE_TD_LABEL, RULE_TD_SCORE, RULE_TH_LABEL, RULE_TH_SCORE,
} from './styles';

interface RuleCategoryTableProps {
  luat: AiRule;
  truong: AiTruong | undefined;
  editing: boolean;
  diemToiDa: number;
  onChange: (bangDiem: Record<string, number>) => void;
}

/** Bảng điểm theo từng giá trị của một trường phân loại (nhà ở, mục đích vay...). */
export default function RuleCategoryTable({ luat, truong, editing, diemToiDa, onChange }: RuleCategoryTableProps) {
  const khoaList = truong?.gia_tri_hop_le ?? Object.keys(luat.bang_diem ?? {});

  return (
    <table className={`rl-table ${RULE_TABLE}`}>
      <thead>
        <tr>
          <th className={RULE_TH_LABEL}>{truong?.mo_ta ?? 'Giá trị'}</th>
          <th className={`rl-score ${RULE_TH_SCORE}`}>Điểm</th>
        </tr>
      </thead>
      <tbody className={RULE_TBODY}>
        {khoaList.map((khoa) => {
          const diem = luat.bang_diem?.[khoa] ?? 0;
          const nhan = GIA_TRI_LABEL[khoa] ?? khoa;
          return (
            <tr key={khoa}>
              <td className={RULE_TD_LABEL}>{nhan}</td>
              <td className={`rl-score ${RULE_TD_SCORE}`}>
                {editing ? (
                  <input
                    type="number"
                    className={`aip-input rl-num rl-cell-input ${RULE_CELL_INPUT} w-full`}
                    aria-label={`Điểm cho ${nhan}`}
                    min="0"
                    max={diemToiDa}
                    value={diem}
                    onChange={(e) => onChange({ ...luat.bang_diem, [khoa]: Number(e.target.value) })}
                  />
                ) : (
                  <strong className={RULE_SCORE}>{diem}</strong>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
