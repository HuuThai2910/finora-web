import { Toast } from '@/components/Toast';
import { useRuleEngine } from '../hooks/useRuleEngine';
import { AiErrorNotice } from './AiErrorNotice';
import { IconEdit, IconPlus } from './icons';
import RuleCard from './RuleCard';
import './RuleEnginePanel.css';

/**
 * Bộ luật chấm điểm rủi ro.
 *
 * Luật là dữ liệu: admin thêm, sửa, xoá, sắp xếp, bật/tắt luật tuỳ ý. Mỗi luật đọc
 * MỘT trường trong danh mục backend công bố, quy đổi ra điểm theo bậc ngưỡng
 * (trường số) hoặc bảng tra (trường phân loại), và có trọng số riêng.
 */
export default function RuleEnginePanel() {
  const re = useRuleEngine();

  const actions = !re.editing ? (
    <button type="button" className="ui-btn ghost" onClick={re.startEditing}>
      <IconEdit />
      Chỉnh sửa luật
    </button>
  ) : (
    <div className="rl-actions">
      <button type="button" className="ui-btn ghost" onClick={re.cancelEditing} disabled={re.saving}>Hủy</button>
      <button type="button" className="ui-btn primary" onClick={re.save} disabled={re.saving}>
        {re.saving ? 'Đang lưu...' : 'Lưu bộ luật'}
      </button>
    </div>
  );

  return (
    <article className="ui-card aip-card rl-panel" aria-labelledby="rlTitle">
      <div className="aip-card-head">
        <div className="aip-head-main">
          <h2 id="rlTitle">Bộ luật chấm điểm rủi ro</h2>
          {re.data && (
            <span className="aip-meta" aria-live="polite">
              Đang bật <strong>{re.soLuatBat}/{re.rules.length}</strong> luật
              {re.soLuatBat > 0 && <>, tổng trọng số <strong>{Number(re.tongTrongSo.toFixed(2))}</strong></>}
            </span>
          )}
        </div>
        {re.data && actions}
      </div>

      {re.loadError ? (
        <div className="rl-state"><AiErrorNotice error={re.loadError} onRetry={re.refetch} /></div>
      ) : re.isLoading || !re.data ? (
        <div className="ui-empty" aria-busy="true">Đang tải bộ luật chấm điểm...</div>
      ) : (
        <>
          <p className="rl-note">
            Mỗi luật đọc một trường của hồ sơ và cho tối đa {re.diemToiDa} điểm. Điểm tổng quy về thang 100 theo trọng
            số các luật đang bật, nên thêm, bớt hay tắt luật không làm lệch thang. Khi hồ sơ thiếu dữ liệu, luật dùng
            "điểm khi thiếu dữ liệu": nên đặt ở mức trung tính, vì không tra được thông tin là sự cố hệ thống, không
            phải bằng chứng người vay rủi ro.
          </p>

          {(re.formError || re.saveError) && (
            <div className="rl-state">
              {re.formError
                ? <div className="ui-alert" role="alert">{re.formError}</div>
                : <AiErrorNotice error={re.saveError} />}
            </div>
          )}

          <div className={`rl-list${re.editing ? ' editing' : ''}`}>
            {re.rules.length === 0 && !re.editing && (
              <p className="rl-empty">Chưa có luật nào. Bấm "Chỉnh sửa luật" để thêm.</p>
            )}
            {re.rules.map((luat, i) => (
              <RuleCard
                // Khi sửa, thẻ mới có mã rỗng và mã có thể trùng tạm thời nên dùng chỉ số làm key.
                key={re.editing ? i : luat.ma}
                luat={luat}
                index={i}
                total={re.rules.length}
                editing={re.editing}
                truong={re.danhMuc.get(luat.truong)}
                danhSachTruong={re.danhSachTruong}
                diemToiDa={re.diemToiDa}
                mocVoCuc={re.mocVoCuc}
                tyTrong={luat.bat && re.tongTrongSo > 0 ? Math.round((luat.trong_so / re.tongTrongSo) * 100) : 0}
                onChange={(thayDoi) => re.sua(i, thayDoi)}
                onMoTa={(moTa) => re.suaMoTa(i, moTa)}
                onMa={(ma) => re.suaMa(i, ma)}
                onXoa={() => re.xoaLuat(i)}
                onDiChuyen={(huong) => re.diChuyen(i, huong)}
              />
            ))}
            {re.editing && (
              <button type="button" className="rl-add" onClick={re.themLuat}>
                <IconPlus />
                <span>Thêm luật</span>
                <small>Chọn trường dữ liệu và đặt bậc điểm</small>
              </button>
            )}
          </div>
        </>
      )}

      {re.notice && <Toast message={re.notice} onDismiss={re.dismissNotice} />}
    </article>
  );
}
