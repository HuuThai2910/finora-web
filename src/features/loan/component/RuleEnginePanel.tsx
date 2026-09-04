import { useState, useEffect, useCallback } from 'react';
import { useGetAiRulesQuery, useUpdateAiRulesMutation } from '../api/aiRulesApi';
import type { AiRule } from '../types';
import RuleCard from './RuleCard';
import { kiemTra, luatMoi, saoChep, sinhMa } from './ruleEngineForm';
import { IconPlus } from './ruleIcons';
import './RuleEnginePanel.css';

/**
 * Bảng cấu hình bộ luật chấm điểm của Rule Engine (D4).
 *
 * Luật là dữ liệu: admin thêm, sửa, xoá, sắp xếp, bật/tắt luật tuỳ ý. Mỗi luật
 * đọc MỘT trường trong danh mục backend công bố, quy đổi ra điểm theo bậc ngưỡng
 * (trường số) hoặc bảng tra (trường phân loại), và có trọng số riêng.
 *
 * Tách khỏi LoanEvaluationPage vì đây là nhóm cấu hình khác hẳn: trang kia chỉnh
 * cách quy đổi điểm ra hạng, panel này chỉnh cách tính ra chính điểm đó.
 *
 * State: bản nháp `form` là local state — chỉ tồn tại trong phiên sửa, không
 * cần đi xuyên route. Server state (bộ luật đã lưu, danh mục trường) nằm ở
 * RTK Query; lưu xong invalidate tag để mọi màn đọc cấu hình tải lại.
 *
 * Backend chặn cấu hình vô nghĩa và trả 422 kèm lý do; UI kiểm lại cùng bộ ràng
 * buộc (`ruleEngineForm.kiemTra`) để người dùng thấy sai ngay khi gõ. Lưu là
 * thay TOÀN BỘ danh sách, nguyên tử.
 */
export default function RuleEnginePanel() {
  const { data, isLoading, error } = useGetAiRulesQuery();
  const [updateRules, { isLoading: saving }] = useUpdateAiRulesMutation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AiRule[]>([]);
  // Chỉ số các luật vừa thêm trong phiên sửa này: mã còn tự sinh theo mô tả cho
  // tới khi admin sửa tay. Luật đã lưu thì mã cố định — nó nằm trong rule_trace
  // của các quyết định lịch sử.
  const [maTuSinh, setMaTuSinh] = useState<Set<number>>(new Set());
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (data) setForm(saoChep(data.rules));
  }, [data]);

  const startEditing = useCallback(() => {
    if (data) setForm(saoChep(data.rules));
    setMaTuSinh(new Set());
    setFormError('');
    setEditing(true);
  }, [data]);

  const cancelEditing = useCallback(() => {
    if (data) setForm(saoChep(data.rules));
    setMaTuSinh(new Set());
    setFormError('');
    setEditing(false);
  }, [data]);

  if (isLoading) return <article className="policy-panel"><p>Đang tải cấu hình luật…</p></article>;
  if (error || !data) {
    return (
      <article className="policy-panel">
        <p className="policy-form-error">Không tải được cấu hình luật chấm điểm.</p>
      </article>
    );
  }

  const { truong: danhSachTruong, diem_toi_da_moi_luat: diemToiDa, nguong_vo_cuc: mocVoCuc } = data;
  const danhMuc = new Map(danhSachTruong.map(t => [t.ma, t]));
  const luatBat = form.filter(r => r.bat);
  const tongTrongSo = luatBat.reduce((s, r) => s + r.trong_so, 0);

  async function handleSave() {
    const loi = kiemTra(form, danhMuc, diemToiDa);
    if (loi) {
      setFormError(loi);
      return;
    }
    setFormError('');
    try {
      await updateRules({ rules: form }).unwrap();
      setEditing(false);
      setMaTuSinh(new Set());
      setSuccessMsg('Cập nhật bộ luật chấm điểm thành công.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { detail?: unknown } }).data?.detail
          : undefined;
      setFormError(typeof detail === 'string' ? detail : 'Lưu cấu hình luật thất bại.');
    }
  }

  function sua(i: number, thayDoi: Partial<AiRule>) {
    setForm(prev => prev.map((r, j) => (j === i ? { ...r, ...thayDoi } : r)));
  }

  function suaMoTa(i: number, moTa: string) {
    const thayDoi: Partial<AiRule> = { mo_ta: moTa };
    if (maTuSinh.has(i)) thayDoi.ma = sinhMa(moTa);
    sua(i, thayDoi);
  }

  function suaMa(i: number, ma: string) {
    setMaTuSinh(prev => {
      const s = new Set(prev);
      s.delete(i);
      return s;
    });
    sua(i, { ma: ma.toUpperCase() });
  }

  function themLuat() {
    const truongDau = danhSachTruong[0];
    if (!truongDau) return;
    setMaTuSinh(prev => new Set(prev).add(form.length));
    setForm(prev => [...prev, luatMoi(truongDau, mocVoCuc)]);
  }

  function xoaLuat(i: number) {
    setForm(prev => prev.filter((_, j) => j !== i));
    // Dồn chỉ số các luật phía sau lên một bậc để cờ "mã tự sinh" không lệch thẻ.
    setMaTuSinh(prev => {
      const s = new Set<number>();
      for (const j of prev) {
        if (j < i) s.add(j);
        else if (j > i) s.add(j - 1);
      }
      return s;
    });
  }

  function diChuyen(i: number, huong: -1 | 1) {
    const j = i + huong;
    if (j < 0 || j >= form.length) return;
    setForm(prev => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setMaTuSinh(prev => {
      const s = new Set<number>();
      for (const k of prev) s.add(k === i ? j : k === j ? i : k);
      return s;
    });
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
