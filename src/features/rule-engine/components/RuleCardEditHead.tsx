import { NGUON_LABEL, TRONG_SO_MAX, TRONG_SO_MIN } from '../constants';
import { bacMacDinh, bangDiemMacDinh } from '../schemas/ruleEngineForm';
import type { AiTruong } from '../types';
import { IconArrowDown, IconArrowUp, IconTrash } from './icons';
import type { RuleCardProps } from './RuleCard';

const nhanTruong = (t: AiTruong) => `${t.mo_ta}${t.don_vi ? ` (${t.don_vi})` : ''}`;

/** Phần đầu thẻ luật khi đang sửa: thanh công cụ, tên và mã, trường dữ liệu, chiều, trọng số. */
export default function RuleCardEditHead({
  luat, index, total, truong, danhSachTruong, mocVoCuc, onChange, onMoTa, onMa, onXoa, onDiChuyen, idThe,
}: RuleCardProps & { idThe: string }) {
  const laPhanLoai = truong?.kieu === 'phan_loai';
  const ten = luat.mo_ta || String(index + 1);

  function doiTruong(maTruong: string) {
    const moi = danhSachTruong.find((t) => t.ma === maTruong);
    if (!moi) return;
    // Đổi sang trường cùng kiểu thì giữ bậc đang có; khác kiểu thì dựng lại.
    if (moi.kieu === 'so') {
      onChange({
        truong: maTruong,
        bang_diem: null,
        bac: truong?.kieu === 'so' && luat.bac ? luat.bac : bacMacDinh(luat.nghich_dao, mocVoCuc),
      });
    } else {
      onChange({ truong: maTruong, nghich_dao: false, bac: null, bang_diem: bangDiemMacDinh(moi) });
    }
  }

  // Chiều đổi thì thứ tự ngưỡng hợp lệ đổi theo: dựng lại bậc cho khỏi kẹt lỗi.
  const doiChieu = (nghichDao: boolean) => onChange({ nghich_dao: nghichDao, bac: bacMacDinh(nghichDao, mocVoCuc) });

  return (
    <header className="rl-item-head editing">
      <div className="rl-edit-bar">
        <span className="ui-tag">Luật #{index + 1}</span>
        <div className="rl-tools">
          <button type="button" className="rl-tool" aria-label={`Chuyển luật ${ten} lên trên`} title="Chuyển lên"
            onClick={() => onDiChuyen(-1)} disabled={index === 0}>
            <IconArrowUp />
          </button>
          <button type="button" className="rl-tool" aria-label={`Chuyển luật ${ten} xuống dưới`} title="Chuyển xuống"
            onClick={() => onDiChuyen(1)} disabled={index === total - 1}>
            <IconArrowDown />
          </button>
          {/* Công tắc: trạng thái đọc được bằng vị trí núm và nhãn chữ, không chỉ bằng màu. */}
          <label className="rl-switch">
            <input type="checkbox" checked={luat.bat} onChange={() => onChange({ bat: !luat.bat })} />
            <span className="rl-switch-track" aria-hidden="true" />
            <span>{luat.bat ? 'Đang bật' : 'Đã tắt'}</span>
          </label>
          <button type="button" className="rl-delete" aria-label={`Xóa luật ${ten}`} onClick={onXoa}>
            <IconTrash />
            <span>Xóa</span>
          </button>
        </div>
      </div>

      <div className="rl-name-fields">
        <div className="rl-field">
          <label htmlFor={`${idThe}-mo-ta`}>Tên luật</label>
          <input id={`${idThe}-mo-ta`} type="text" className="aip-input" placeholder="Ví dụ: Tuổi người vay"
            value={luat.mo_ta} onChange={(e) => onMoTa(e.target.value)} />
        </div>
        <div className="rl-field">
          <label htmlFor={`${idThe}-ma`}>Mã luật</label>
          <input id={`${idThe}-ma`} type="text" className="aip-input rl-input-code" placeholder="MA_LUAT"
            value={luat.ma} onChange={(e) => onMa(e.target.value)} />
        </div>
      </div>

      <div className={`rl-fields${laPhanLoai ? ' two' : ''}`}>
        <div className="rl-field">
          <label htmlFor={`${idThe}-truong`}>Trường dữ liệu</label>
          <select id={`${idThe}-truong`} className="aip-input rl-select" value={luat.truong}
            onChange={(e) => doiTruong(e.target.value)} title={truong ? nhanTruong(truong) : luat.truong}>
            {(Object.keys(NGUON_LABEL) as AiTruong['nguon'][]).map((nguon) => (
              <optgroup key={nguon} label={NGUON_LABEL[nguon]}>
                {danhSachTruong.filter((t) => t.nguon === nguon).map((t) => (
                  <option key={t.ma} value={t.ma}>{nhanTruong(t)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {!laPhanLoai && (
          <div className="rl-field">
            <label htmlFor={`${idThe}-chieu`}>Chiều đánh giá</label>
            <select id={`${idThe}-chieu`} className="aip-input rl-select" value={luat.nghich_dao ? 'nghich' : 'thuan'}
              onChange={(e) => doiChieu(e.target.value === 'nghich')}>
              <option value="thuan">Càng cao càng tốt</option>
              <option value="nghich">Càng thấp càng tốt</option>
            </select>
          </div>
        )}
        <div className="rl-field">
          <label htmlFor={`${idThe}-trong-so`}>Trọng số</label>
          <input id={`${idThe}-trong-so`} type="number" className="aip-input rl-num" min={TRONG_SO_MIN} max={TRONG_SO_MAX}
            step="0.1" value={luat.trong_so} onChange={(e) => onChange({ trong_so: Number(e.target.value) })} />
        </div>
      </div>
    </header>
  );
}
