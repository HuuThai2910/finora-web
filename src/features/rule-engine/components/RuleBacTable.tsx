import { dinhDangNguong, donViNguong, laNguongVoCuc, nguongSoChoBac, themBac } from '../schemas/ruleEngineForm';
import type { AiTruong, RuleBac } from '../types';
import { IconInfinity, IconPlus, IconTrash } from './icons';

/**
 * Bảng bậc (ngưỡng, điểm) của một luật đọc trường số.
 *
 * Bậc cuối có thể là "còn lại" (ngưỡng = `mocVoCuc`, JSON không có Infinity): khi
 * sửa, ô ngưỡng đó hiện chữ thay vì số 1000000000, kèm nút chuyển qua lại. Thêm bậc
 * luôn chèn TRƯỚC bậc cuối để bậc "còn lại" giữ nguyên vị trí.
 */
interface RuleBacTableProps {
  bac: RuleBac[];
  editing: boolean;
  nghichDao: boolean;
  truong: AiTruong | undefined;
  diemToiDa: number;
  mocVoCuc: number;
  onChange: (bac: RuleBac[]) => void;
}

const GHI_CHU_CON_LAI = 'Áp dụng cho mọi giá trị còn lại không thuộc các ngưỡng trên';

export default function RuleBacTable({ bac, editing, nghichDao, truong, diemToiDa, mocVoCuc, onChange }: RuleBacTableProps) {
  const donVi = donViNguong(truong);
  const laTyLe = truong?.la_ty_le ?? false;

  function sua(k: number, cot: 0 | 1, giaTri: number) {
    onChange(bac.map((b, j) => (j === k ? (cot === 0 ? [giaTri, b[1]] : [b[0], giaTri]) : [...b] as RuleBac)));
  }

  // Đếm ngưỡng (trừ bậc "còn lại") để tô đỏ ô trùng ngay khi gõ, trước khi bấm lưu.
  const demNguong = new Map<number, number>();
  bac.forEach(([n], idx) => {
    if (!(idx === bac.length - 1 && laNguongVoCuc(n, mocVoCuc))) demNguong.set(n, (demNguong.get(n) ?? 0) + 1);
  });

  function oNguong(nguong: number, k: number) {
    const voCuc = k === bac.length - 1 && laNguongVoCuc(nguong, mocVoCuc);
    if (!editing) {
      return voCuc ? (
        <div className="rl-con-lai"><span>còn lại</span><span className="rl-note-sm">{GHI_CHU_CON_LAI}</span></div>
      ) : dinhDangNguong(nguong, mocVoCuc, nghichDao);
    }
    if (voCuc) {
      return (
        <div className="rl-con-lai">
          <span className="rl-nguong-edit">
            <span className="rl-vo-cuc"><IconInfinity />còn lại</span>
            <button type="button" className="rl-link" title="Đổi thành ngưỡng số cụ thể"
              onClick={() => sua(k, 0, nguongSoChoBac(bac, k, nghichDao, laTyLe, mocVoCuc))}>
              Nhập số
            </button>
          </span>
          <span className="rl-note-sm">{GHI_CHU_CON_LAI}</span>
        </div>
      );
    }
    const biTrung = (demNguong.get(nguong) ?? 0) > 1;
    return (
      <div className="rl-con-lai">
        <span className="rl-nguong-edit">
          <input
            type="number"
            className={`aip-input rl-num rl-cell-input${biTrung ? ' dup' : ''}`}
            aria-label={`Ngưỡng bậc ${k + 1}`}
            aria-invalid={biTrung || undefined}
            step="any"
            value={nguong}
            onChange={(e) => sua(k, 0, Number(e.target.value))}
          />
          {k === bac.length - 1 && (
            <button type="button" className="rl-link" title="Áp dụng cho mọi giá trị còn lại" onClick={() => sua(k, 0, mocVoCuc)}>
              Còn lại
            </button>
          )}
        </span>
        {biTrung && <span className="rl-dup-msg">Trùng ngưỡng với bậc khác</span>}
      </div>
    );
  }

  return (
    <table className="rl-table">
      <thead>
        <tr>
          <th>Ngưỡng{donVi && <span className="rl-unit"> ({donVi})</span>}</th>
          <th className="rl-score">Điểm</th>
          {editing && <th className="rl-tool-col"><span className="ui-sr-only">Thao tác</span></th>}
        </tr>
      </thead>
      <tbody>
        {bac.map(([nguong, diem], k) => (
          <tr key={k}>
            <td>{oNguong(nguong, k)}</td>
            <td className="rl-score">
              {editing ? (
                <input type="number" className="aip-input rl-num rl-cell-input" aria-label={`Điểm bậc ${k + 1}`}
                  min="0" max={diemToiDa} value={diem} onChange={(e) => sua(k, 1, Number(e.target.value))} />
              ) : (
                <strong>{diem}</strong>
              )}
            </td>
            {editing && (
              <td className="rl-tool-col">
                <button type="button" className="rl-tool bare danger" aria-label={`Xóa bậc ${k + 1}`}
                  title={bac.length <= 2 ? 'Luật phải có ít nhất 2 bậc' : 'Xóa bậc này'}
                  onClick={() => onChange(bac.filter((_, j) => j !== k))} disabled={bac.length <= 2}>
                  <IconTrash />
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
      {editing && (
        <tfoot>
          <tr>
            <td colSpan={3}>
              <button type="button" className="ui-btn soft"
                onClick={() => onChange(themBac(bac, nghichDao, laTyLe, mocVoCuc, diemToiDa))}>
                <IconPlus />
                Thêm bậc
              </button>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
