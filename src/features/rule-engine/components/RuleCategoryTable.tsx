import { GIA_TRI_LABEL } from '../constants';
import type { AiRule, AiTruong } from '../types';

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
    <table className="rl-table">
      <thead>
        <tr>
          <th>{truong?.mo_ta ?? 'Giá trị'}</th>
          <th className="rl-score">Điểm</th>
        </tr>
      </thead>
      <tbody>
        {khoaList.map((khoa) => {
          const diem = luat.bang_diem?.[khoa] ?? 0;
          const nhan = GIA_TRI_LABEL[khoa] ?? khoa;
          return (
            <tr key={khoa}>
              <td>{nhan}</td>
              <td className="rl-score">
                {editing ? (
                  <input
                    type="number"
                    className="aip-input rl-num rl-cell-input"
                    aria-label={`Điểm cho ${nhan}`}
                    min="0"
                    max={diemToiDa}
                    value={diem}
                    onChange={(e) => onChange({ ...luat.bang_diem, [khoa]: Number(e.target.value) })}
                  />
                ) : (
                  <strong>{diem}</strong>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
