import type { AiRule, AiTruong } from '../types';
import RuleBacTable from './RuleBacTable';
import RuleCardEditHead from './RuleCardEditHead';
import RuleCardFooter from './RuleCardFooter';
import RuleCategoryTable from './RuleCategoryTable';

/**
 * Một thẻ luật: xem, hoặc (khi `editing`) sửa mọi thuộc tính của luật. Thẻ tự xử lý
 * thay đổi chỉ liên quan tới chính nó (bậc, bảng điểm, đổi trường, đổi chiều) và báo
 * lên bằng `onChange`; việc liên quan tới danh sách (mã tự sinh, xoá, sắp xếp) do
 * panel cha quyết.
 */
export interface RuleCardProps {
  luat: AiRule;
  index: number;
  total: number;
  editing: boolean;
  truong: AiTruong | undefined;
  danhSachTruong: AiTruong[];
  diemToiDa: number;
  mocVoCuc: number;
  /** % đóng góp vào thang điểm, đã tính theo trọng số các luật đang bật. */
  tyTrong: number;
  onChange: (thayDoi: Partial<AiRule>) => void;
  onMoTa: (moTa: string) => void;
  onMa: (ma: string) => void;
  onXoa: () => void;
  onDiChuyen: (huong: -1 | 1) => void;
}

export default function RuleCard(props: RuleCardProps) {
  const { luat, index, editing, truong, diemToiDa, mocVoCuc, tyTrong, onChange } = props;
  const laPhanLoai = truong?.kieu === 'phan_loai';
  // Tiền tố id để `label htmlFor` trỏ đúng ô của THẺ NÀY; luật mới chưa có mã nên kèm chỉ số.
  const idThe = `luat-${luat.ma || 'moi'}-${index}`;

  return (
    <section className={`rl-item${luat.bat ? '' : ' off'}`}>
      {editing ? (
        <RuleCardEditHead {...props} idThe={idThe} />
      ) : (
        <header className="rl-item-head">
          <div className="rl-item-title">
            <h3>{luat.mo_ta}</h3>
            <code className="rl-code">{luat.ma}</code>
            <span className="rl-tags">
              <span className="rl-tag">{truong?.mo_ta ?? luat.truong}</span>
              {luat.nghich_dao && <span className="rl-tag muted">càng thấp càng tốt</span>}
              <span className="rl-tag muted">trọng số ×{luat.trong_so}{luat.bat && `, chiếm ${tyTrong}%`}</span>
            </span>
          </div>
          <span className={`ui-pill sm ${luat.bat ? 'success' : ''}`}>{luat.bat ? 'Đang bật' : 'Đã tắt'}</span>
        </header>
      )}

      {laPhanLoai ? (
        <RuleCategoryTable
          luat={luat}
          truong={truong}
          editing={editing}
          diemToiDa={diemToiDa}
          onChange={(bangDiem) => onChange({ bang_diem: bangDiem })}
        />
      ) : (
        <RuleBacTable
          bac={luat.bac ?? []}
          editing={editing}
          nghichDao={luat.nghich_dao}
          truong={truong}
          diemToiDa={diemToiDa}
          mocVoCuc={mocVoCuc}
          onChange={(bac) => onChange({ bac })}
        />
      )}

      <RuleCardFooter luat={luat} idThe={idThe} editing={editing} laPhanLoai={laPhanLoai} diemToiDa={diemToiDa} onChange={onChange} />
    </section>
  );
}
