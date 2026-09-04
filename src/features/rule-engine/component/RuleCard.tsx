import type { AiRule, AiTruong } from '../types';
import RuleBacTable from './RuleBacTable';
import {
  GIA_TRI_LABEL,
  GOI_Y_MAX,
  NGUON_LABEL,
  TRONG_SO_MAX,
  TRONG_SO_MIN,
  bacMacDinh,
  bangDiemMacDinh,
} from './ruleEngineForm';
import { IconAlertCircle, IconArrowDown, IconArrowUp, IconTrash } from './ruleIcons';

/**
 * Một thẻ luật trong bảng cấu hình — hiển thị và (khi `editing`) sửa mọi thuộc
 * tính của luật. Thẻ tự xử lý các thay đổi chỉ liên quan tới chính nó (bậc, bảng
 * điểm, đổi trường, đổi chiều) và báo lên bằng `onChange`; những việc liên quan
 * tới danh sách (mã tự sinh, xoá, sắp xếp) do panel cha quyết.
 */

interface RuleCardProps {
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

export default function RuleCard({
  luat, index, total, editing, truong, danhSachTruong, diemToiDa, mocVoCuc, tyTrong,
  onChange, onMoTa, onMa, onXoa, onDiChuyen,
}: RuleCardProps) {
  const laPhanLoai = truong?.kieu === 'phan_loai';
  const tat = !luat.bat;
  const danhMuc = new Map(danhSachTruong.map(t => [t.ma, t]));

  // Tiền tố id để `label htmlFor` trỏ đúng ô của THẺ NÀY. Luật mới chưa có mã nên
  // lùi về chỉ số; hai luật không thể trùng cả mã lẫn vị trí trong cùng một lần render.
  const idThe = `luat-${luat.ma || `moi-${index}`}`;

  function doiTruong(maTruong: string) {
    const moi = danhMuc.get(maTruong);
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

  function doiChieu(nghichDao: boolean) {
    // Chiều đổi thì thứ tự ngưỡng hợp lệ đổi theo — dựng lại bậc cho khỏi kẹt lỗi.
    onChange({ nghich_dao: nghichDao, bac: bacMacDinh(nghichDao, mocVoCuc) });
  }

  function suaBangDiem(khoa: string, giaTri: number) {
    onChange({ bang_diem: { ...luat.bang_diem, [khoa]: giaTri } });
  }

  return (
    <section className={`rule-item${tat ? ' rule-item-off' : ''}`}>
      <header className={`rule-item-head${editing ? ' rule-item-head-editing' : ''}`}>
        {editing && (
          <div className="rule-edit-bar">
            <span className={`rule-order-badge${tat ? ' rule-tag-muted' : ''}`}>
              Luật #{index + 1}
            </span>
            <div className="rule-item-tools">
              <button
                type="button"
                className="rule-tool-btn"
                aria-label={`Chuyển luật ${luat.mo_ta || index + 1} lên trên`}
                title="Chuyển lên"
                onClick={() => onDiChuyen(-1)}
                disabled={index === 0}
              >
                <IconArrowUp />
              </button>
              <button
                type="button"
                className="rule-tool-btn"
                aria-label={`Chuyển luật ${luat.mo_ta || index + 1} xuống dưới`}
                title="Chuyển xuống"
                onClick={() => onDiChuyen(1)}
                disabled={index === total - 1}
              >
                <IconArrowDown />
              </button>
              {/* Công tắc dạng switch: trạng thái bật/tắt đọc được cả bằng vị trí núm
                  lẫn nhãn chữ, không chỉ bằng màu. */}
              <label className="rule-switch">
                <input
                  type="checkbox"
                  checked={luat.bat}
                  onChange={() => onChange({ bat: !luat.bat })}
                />
                <span className="rule-switch-track" aria-hidden="true" />
                <span className="rule-switch-label">{luat.bat ? 'Đang bật' : 'Đã tắt'}</span>
              </label>
              <button
                type="button"
                className="rule-delete-btn"
                aria-label={`Xóa luật ${luat.mo_ta || index + 1}`}
                title="Xóa luật"
                onClick={onXoa}
              >
                <IconTrash />
                <span>Xóa</span>
              </button>
            </div>
          </div>
        )}

        <div className="rule-item-title">
          {editing ? (
            <div className="rule-name-fields">
              <div className="rule-field">
                <label className="rule-field-label" htmlFor={`${idThe}-mo-ta`}>
                  Tên luật
                </label>
                <input
                  id={`${idThe}-mo-ta`}
                  type="text"
                  className="policy-input rule-input-text"
                  placeholder="Ví dụ: Tuổi người vay"
                  value={luat.mo_ta}
                  onChange={e => onMoTa(e.target.value)}
                  title={luat.mo_ta}
                />
              </div>
              <div className="rule-field rule-field-code">
                <label className="rule-field-label" htmlFor={`${idThe}-ma`}>
                  Mã luật
                </label>
                <input
                  id={`${idThe}-ma`}
                  type="text"
                  className="policy-input rule-input-text rule-input-code"
                  placeholder="MA_LUAT"
                  value={luat.ma}
                  onChange={e => onMa(e.target.value)}
                  title={luat.ma}
                />
              </div>
            </div>
          ) : (
            <>
              <h3>{luat.mo_ta}</h3>
              <span className="rule-tags">
                <span className="rule-tag">{truong?.mo_ta ?? luat.truong}</span>
                <code className="rule-code">{luat.ma}</code>
                {luat.nghich_dao && <span className="rule-tag rule-tag-muted">càng thấp càng tốt</span>}
                <span className="rule-tag rule-tag-muted">
                  trọng số ×{luat.trong_so}{luat.bat && ` · ${tyTrong}%`}
                </span>
              </span>
            </>
          )}
        </div>

        {!editing && (
          <span className={`rule-state${tat ? ' rule-state-off' : ''}`}>
            {tat ? 'Đã tắt' : 'Đang bật'}
          </span>
        )}
      </header>

      {editing && (
        <div className="rule-fields">
          <div className="rule-field">
            <label className="rule-field-label" htmlFor={`${idThe}-truong`}>
              Trường dữ liệu
            </label>
            {/* Select bọc trong .rule-select-wrap: chevron do CSS vẽ, mũi tên mặc
                định của trình duyệt bị ẩn để ô khớp với các input khác. */}
            <div className="rule-select-wrap">
              <select
                id={`${idThe}-truong`}
                className="policy-input rule-select"
                value={luat.truong}
                onChange={e => doiTruong(e.target.value)}
                title={truong ? `${truong.mo_ta}${truong.don_vi ? ` (${truong.don_vi})` : ''}` : luat.truong}
              >
                {(Object.keys(NGUON_LABEL) as AiTruong['nguon'][]).map(nguon => (
                  <optgroup key={nguon} label={NGUON_LABEL[nguon]}>
                    {danhSachTruong.filter(t => t.nguon === nguon).map(t => (
                      <option
                        key={t.ma}
                        value={t.ma}
                        title={`${t.mo_ta}${t.don_vi ? ` (${t.don_vi})` : ''}`}
                      >
                        {t.mo_ta}{t.don_vi && ` (${t.don_vi})`}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {!laPhanLoai && (
            <div className="rule-field">
              <label className="rule-field-label" htmlFor={`${idThe}-chieu`}>
                Chiều đánh giá
              </label>
              <div className="rule-select-wrap">
                <select
                  id={`${idThe}-chieu`}
                  className="policy-input rule-select"
                  value={luat.nghich_dao ? 'nghich' : 'thuan'}
                  onChange={e => doiChieu(e.target.value === 'nghich')}
                  title={luat.nghich_dao ? 'Càng thấp càng tốt' : 'Càng cao càng tốt'}
                >
                  <option value="thuan">Càng cao càng tốt</option>
                  <option value="nghich">Càng thấp càng tốt</option>
                </select>
              </div>
            </div>
          )}

          <div className="rule-field rule-field-sm">
            <label className="rule-field-label" htmlFor={`${idThe}-trong-so`}>
              Trọng số
            </label>
            <input
              id={`${idThe}-trong-so`}
              type="number"
              className="policy-input rule-input rule-input-num"
              min={TRONG_SO_MIN}
              max={TRONG_SO_MAX}
              step="0.1"
              value={luat.trong_so}
              onChange={e => onChange({ trong_so: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {laPhanLoai ? (
        <table className="rule-table">
          <thead>
            <tr>
              <th>{truong?.mo_ta ?? 'Giá trị'}</th>
              <th className="rule-th-score">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {(truong?.gia_tri_hop_le ?? Object.keys(luat.bang_diem ?? {})).map(khoa => {
              const diem = luat.bang_diem?.[khoa] ?? 0;
              return (
                <tr key={khoa}>
                  <td>{GIA_TRI_LABEL[khoa] ?? khoa}</td>
                  <td className="rule-td-score">
                    {editing ? (
                      <input
                        type="number"
                        className="policy-input rule-input rule-input-num"
                        aria-label={`Điểm cho ${GIA_TRI_LABEL[khoa] ?? khoa}`}
                        min="0"
                        max={diemToiDa}
                        value={diem}
                        onChange={e => suaBangDiem(khoa, Number(e.target.value))}
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
      ) : (
        <RuleBacTable
          bac={luat.bac ?? []}
          editing={editing}
          nghichDao={luat.nghich_dao}
          truong={truong}
          diemToiDa={diemToiDa}
          mocVoCuc={mocVoCuc}
          onChange={bac => onChange({ bac })}
        />
      )}

      {/* Hai khối xếp dọc, KHÔNG dùng grid hai cột: textarea gợi ý cần trọn chiều
          ngang, nhét nó vào cột số 90px như bản trước làm ô nhập bẹp lại. */}
      <footer className="rule-item-foot">
        <div className="rule-foot-row">
          <label className="rule-foot-label" htmlFor={`${idThe}-thieu`}>
            Điểm khi thiếu dữ liệu
          </label>
          {editing ? (
            <input
              id={`${idThe}-thieu`}
              type="number"
              className="policy-input rule-input rule-input-num"
              min="0"
              max={diemToiDa}
              value={luat.diem_khi_thieu}
              onChange={e => onChange({ diem_khi_thieu: Number(e.target.value) })}
            />
          ) : (
            <strong className="rule-foot-value">{luat.diem_khi_thieu}</strong>
          )}
        </div>
        <p className="rule-hint">
          Dùng khi hồ sơ không có dữ liệu cho luật này. Cố ý đặt ở mức trung tính
          thay vì điểm sàn: không tra được thông tin là sự cố hệ thống, không phải
          bằng chứng người vay rủi ro.
        </p>

        <div className="rule-foot-block">
          <div className="rule-foot-label-row">
            <label className="rule-foot-label" htmlFor={`${idThe}-goi-y`}>
              Gợi ý cho người vay
            </label>
            {!laPhanLoai && (
              <div className="rule-tip-wrap">
                <button
                  type="button"
                  className="rule-tip-trigger"
                  aria-label="Giải thích cách dùng biến {moc}"
                >
                  <IconAlertCircle className="rule-tip-icon" />
                </button>
                <div className="rule-tip-popover" role="tooltip">
                  <p>
                    <strong>Biến <code>{'{moc}'}</code>:</strong> Tự động thay bằng giá trị ngưỡng kế tiếp người vay cần đạt theo bậc điểm.
                  </p>
                  <p>
                    <em>Ví dụ:</em> “Giảm nợ xuống dưới <code>{'{moc}'}%</code> thu nhập” hoặc “Đạt từ <code>{'{moc}'}</code> điểm trở lên”.
                  </p>
                </div>
              </div>
            )}
          </div>
          {editing ? (
            <>
              <textarea
                id={`${idThe}-goi-y`}
                className="policy-input rule-textarea"
                rows={3}
                maxLength={GOI_Y_MAX}
                placeholder="Bỏ trống để hệ thống tự ghép câu từ mô tả luật"
                value={luat.goi_y ?? ''}
                onChange={e => onChange({ goi_y: e.target.value || null })}
              />
              <p className="rule-hint rule-hint-inline">
                {!laPhanLoai && (
                  <span>
                    Chèn <code>{'{moc}'}</code> vào câu để hệ thống tự điền ngưỡng kế tiếp.{' '}
                  </span>
                )}
                <span className="rule-counter">{(luat.goi_y ?? '').length}/{GOI_Y_MAX}</span>
              </p>
            </>
          ) : (
            <p className="rule-goi-y">
              {luat.goi_y ?? 'Tự ghép từ mô tả luật và ngưỡng kế tiếp'}
            </p>
          )}
        </div>
      </footer>
    </section>
  );
}
