import type { AiRule, AiTruong } from '../types';
import RuleBacTable from './RuleBacTable';
import RuleCardEditHead from './RuleCardEditHead';
import RuleCardFooter from './RuleCardFooter';
import RuleCategoryTable from './RuleCategoryTable';

const TAG = 'py-0.5 px-2 rounded-[999px] text-[12px] font-medium';
const TAG_MUTED = 'bg-[#eef2fa] text-secondary';

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
  /** Luật đã lưu: khóa ô mã vì mã nằm trong vết chấm điểm của các quyết định cũ. */
  khoaMa: boolean;
  /** Thẻ gây lỗi kiểm tra lần lưu gần nhất: viền đỏ để nhận ra sau khi trang cuộn tới. */
  coLoi: boolean;
  onChange: (thayDoi: Partial<AiRule>) => void;
  onMoTa: (moTa: string) => void;
  onMa: (ma: string) => void;
  onXoa: () => void;
  onDiChuyen: (huong: -1 | 1) => void;
}

export default function RuleCard(props: RuleCardProps) {
  const { luat, index, editing, truong, diemToiDa, mocVoCuc, tyTrong, coLoi, onChange } = props;
  const laPhanLoai = truong?.kieu === 'phan_loai';
  // Tiền tố id để `label htmlFor` trỏ đúng ô của THẺ NÀY; luật mới chưa có mã nên kèm chỉ số.
  const idThe = `luat-${luat.ma || 'moi'}-${index}`;

  return (
    // Container "rl-card": khối bên trong tự sắp lại theo bề ngang CỦA THẺ, không theo màn hình.
    // Luật đã tắt vẫn đọc được nhưng lùi về sau (bảng và chân thẻ mờ đi); lúc đang sửa thì không làm mờ.
    <section
      id={`rl-the-${index}`}
      className={`rl-item${luat.bat ? '' : ' off'}${coLoi ? ' has-error' : ''} @container/rl-card flex flex-col gap-3 min-w-0 p-4 bg-white border-r border-b border-r-line border-b-line scroll-mt-20 [&.off]:bg-surface-muted [&.off:not(:has(.rl-edit-bar))_:is(.rl-table,.rl-foot)]:opacity-60 [&.has-error]:shadow-[inset_0_0_0_2px_var(--color-danger)]`}
      aria-invalid={coLoi || undefined}
    >
      {editing ? (
        <RuleCardEditHead {...props} idThe={idThe} />
      ) : (
        <header className="rl-item-head flex items-start justify-between gap-3">
          <div className="rl-item-title flex flex-col gap-1.5 min-w-0">
            {/* Chế độ xem không hiện mã luật và tên trường dạng mã máy; vẫn để trong title để kỹ thuật tra khi cần. */}
            <h3 className="text-[14px] font-semibold leading-[1.4]" title={`Mã luật ${luat.ma}`}>{luat.mo_ta}</h3>
            <span className="rl-tags flex flex-wrap gap-1.5">
              <span className={`rl-tag ${TAG} bg-brand-50 text-brand`} title={`Trường ${luat.truong}`}>
                {truong?.mo_ta ?? 'Trường không còn trong danh mục'}
              </span>
              {luat.nghich_dao && <span className={`rl-tag muted ${TAG} ${TAG_MUTED}`}>càng thấp càng tốt</span>}
              <span className={`rl-tag muted ${TAG} ${TAG_MUTED}`}>trọng số ×{luat.trong_so}{luat.bat && `, chiếm ${tyTrong}%`}</span>
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
