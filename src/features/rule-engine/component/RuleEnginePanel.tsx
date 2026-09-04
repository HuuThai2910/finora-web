import RuleCard from './RuleCard';
import { IconPlus } from './ruleIcons';
import { useRuleEngine } from '../hooks/useRuleEngine';
import './css/RuleEnginePanel.css';

/**
 * Bảng cấu hình bộ luật chấm điểm của Rule Engine (D4).
 *
 * Luật là dữ liệu: admin thêm, sửa, xoá, sắp xếp, bật/tắt luật tuỳ ý. Mỗi luật
 * đọc MỘT trường trong danh mục backend công bố, quy đổi ra điểm theo bậc ngưỡng
 * (trường số) hoặc bảng tra (trường phân loại), và có trọng số riêng.
 */
export default function RuleEnginePanel() {
  const {
    data,
    isLoading,
    error,
    saving,
    editing,
    form,
    danhMuc,
    danhSachTruong,
    diemToiDa,
    mocVoCuc,
    luatBat,
    tongTrongSo,
    formError,
    successMsg,
    startEditing,
    cancelEditing,
    handleSave,
    sua,
    suaMoTa,
    suaMa,
    themLuat,
    xoaLuat,
    diChuyen,
  } = useRuleEngine();

  if (isLoading) return <article className="policy-panel"><p>Đang tải cấu hình luật…</p></article>;
  if (error || !data) {
    return (
      <article className="policy-panel">
        <p className="policy-form-error">Không tải được cấu hình luật chấm điểm.</p>
      </article>
    );
  }

  return (
    <article className="policy-panel rule-panel">
      <div className="policy-panel-heading">
        <div>
          <span className="policy-eyebrow">Rule engine</span>
          <h2>Bộ luật chấm điểm rủi ro</h2>
          <p className="rule-subtitle">
            Mỗi luật đọc một trường của hồ sơ và cho tối đa {diemToiDa} điểm. Điểm tổng được
            chuẩn hóa về thang 100 theo trọng số các luật đang bật, nên thêm, bớt hay tắt
            luật không làm lệch thang điểm.
          </p>
        </div>
        {!editing ? (
          <button className="policy-edit-btn" onClick={startEditing}>Chỉnh sửa luật</button>
        ) : (
          <div className="policy-action-group">
            <button className="policy-cancel-btn" onClick={cancelEditing} disabled={saving}>Hủy</button>
            <button className="policy-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu bộ luật'}
            </button>
          </div>
        )}
      </div>

      {successMsg && <div className="policy-success" role="status">{successMsg}</div>}
      {formError && <div className="policy-form-error" role="alert">{formError}</div>}

      <p className="rule-summary">
        Đang bật <strong>{luatBat.length}/{form.length}</strong> luật
        {luatBat.length > 0 && (
          <> · tổng trọng số <strong>{Number(tongTrongSo.toFixed(2))}</strong></>
        )}
      </p>

      <div className={`rule-list${editing ? ' rule-list-editing' : ''}`}>
        {form.length === 0 && !editing && (
          <p className="rule-empty">Chưa có luật nào. Bấm “Chỉnh sửa luật” để thêm.</p>
        )}
        {form.map((luat, i) => (
          <RuleCard
            // Khi sửa, thẻ mới có mã rỗng và mã có thể trùng tạm thời — dùng chỉ số làm key.
            key={editing ? i : luat.ma}
            luat={luat}
            index={i}
            total={form.length}
            editing={editing}
            truong={danhMuc.get(luat.truong)}
            danhSachTruong={danhSachTruong}
            diemToiDa={diemToiDa}
            mocVoCuc={mocVoCuc}
            tyTrong={luat.bat && tongTrongSo > 0 ? Math.round((luat.trong_so / tongTrongSo) * 100) : 0}
            onChange={thayDoi => sua(i, thayDoi)}
            onMoTa={moTa => suaMoTa(i, moTa)}
            onMa={ma => suaMa(i, ma)}
            onXoa={() => xoaLuat(i)}
            onDiChuyen={huong => diChuyen(i, huong)}
          />
        ))}

        {editing && (
          <button type="button" className="rule-add-btn" onClick={themLuat}>
            <IconPlus className="rule-add-icon" />
            <span>Thêm luật</span>
            <small>Chọn trường dữ liệu và đặt bậc điểm</small>
          </button>
        )}
      </div>
    </article>
  );
}
