import { dinhDangNguong, donViNguong, laNguongVoCuc, nguongSoChoBac, themBac } from '../schemas/ruleEngineForm';
import type { AiTruong, RuleBac } from '../types';
import { IconInfinity, IconPlus, IconTrash } from './icons';
import {
  RULE_CELL_INPUT, RULE_SCORE, RULE_TABLE, RULE_TBODY, RULE_TD_LABEL, RULE_TD_SCORE, RULE_TD_TOOL, RULE_TH_LABEL,
  RULE_TH_SCORE, RULE_TH_TOOL, RULE_TOOL_DANGER,
} from './styles';

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

const CON_LAI = 'rl-con-lai flex flex-col gap-0.5';
const NOTE_SM = 'rl-note-sm text-muted text-[12px] leading-[1.35]';
const NGUONG_EDIT = 'rl-nguong-edit flex items-center flex-wrap gap-2';
const LINK = 'rl-link h-7 px-2 rounded-sm text-brand text-[12px] font-medium whitespace-nowrap hover:bg-brand-50';

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
        <div className={CON_LAI}><span>còn lại</span><span className={NOTE_SM}>{GHI_CHU_CON_LAI}</span></div>
      ) : dinhDangNguong(nguong, mocVoCuc, nghichDao);
    }
    if (voCuc) {
      return (
        <div className={CON_LAI}>
          <span className={NGUONG_EDIT}>
            <span className="rl-vo-cuc inline-flex items-center gap-1.5 text-secondary [&_svg]:size-4"><IconInfinity />còn lại</span>
            <button type="button" className={LINK} title="Đổi thành ngưỡng số cụ thể"
              onClick={() => sua(k, 0, nguongSoChoBac(bac, k, nghichDao, laTyLe, mocVoCuc))}>
              Nhập số
            </button>
          </span>
          <span className={NOTE_SM}>{GHI_CHU_CON_LAI}</span>
        </div>
      );
    }
    const biTrung = (demNguong.get(nguong) ?? 0) > 1;
    return (
      <div className={CON_LAI}>
        <span className={NGUONG_EDIT}>
          <input
            type="number"
            // Ngưỡng trùng: ô đỏ cả khi đang focus.
            className={`aip-input rl-num rl-cell-input${biTrung ? ' dup' : ''} ${RULE_CELL_INPUT} w-full flex-[1_1_72px] min-w-16 [&.dup]:border-danger [&.dup]:bg-danger-bg [&.dup]:text-danger`}
            aria-label={`Ngưỡng bậc ${k + 1}`}
            aria-invalid={biTrung || undefined}
            step="any"
            value={nguong}
            onChange={(e) => sua(k, 0, Number(e.target.value))}
          />
          {k === bac.length - 1 && (
            <button type="button" className={LINK} title="Áp dụng cho mọi giá trị còn lại" onClick={() => sua(k, 0, mocVoCuc)}>
              Còn lại
            </button>
          )}
        </span>
        {biTrung && <span className="rl-dup-msg text-danger text-[12px] font-medium">Trùng ngưỡng với bậc khác</span>}
      </div>
    );
  }

  return (
    <table className={`rl-table ${RULE_TABLE}`}>
      <thead>
        <tr>
          <th className={RULE_TH_LABEL}>Ngưỡng{donVi && <span className="rl-unit text-muted font-normal"> ({donVi})</span>}</th>
          <th className={`rl-score ${RULE_TH_SCORE}`}>Điểm</th>
          {editing && <th className={`rl-tool-col ${RULE_TH_TOOL}`}><span className="ui-sr-only">Thao tác</span></th>}
        </tr>
      </thead>
      <tbody className={RULE_TBODY}>
        {bac.map(([nguong, diem], k) => (
          <tr key={k}>
            <td className={RULE_TD_LABEL}>{oNguong(nguong, k)}</td>
            <td className={`rl-score ${RULE_TD_SCORE}`}>
              {editing ? (
                <input type="number" className={`aip-input rl-num rl-cell-input ${RULE_CELL_INPUT} w-full`} aria-label={`Điểm bậc ${k + 1}`}
                  min="0" max={diemToiDa} value={diem} onChange={(e) => sua(k, 1, Number(e.target.value))} />
              ) : (
                <strong className={RULE_SCORE}>{diem}</strong>
              )}
            </td>
            {editing && (
              <td className={`rl-tool-col ${RULE_TD_TOOL}`}>
                <button type="button" className={`rl-tool bare danger ${RULE_TOOL_DANGER}`} aria-label={`Xóa bậc ${k + 1}`}
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
            <td colSpan={3} className="pt-2 px-2.5 pb-0 wrap-anywhere align-middle">
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
