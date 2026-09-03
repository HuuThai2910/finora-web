import { useState, useEffect, useCallback } from 'react';
import { useGetAiRulesQuery, useUpdateAiRulesMutation } from '../api/aiRulesApi';
import type { AiRule, AiRuleUpdate, RuleBac } from '../types';
import './RuleEnginePanel.css';

/**
 * Bảng cấu hình các luật chấm điểm của Rule Engine (D4).
 *
 * Tách khỏi LoanEvaluationPage vì đây là nhóm cấu hình khác hẳn: trang kia chỉnh
 * cách quy đổi điểm ra hạng, panel này chỉnh cách tính ra chính điểm đó.
 *
 * Backend đã chặn cấu hình vô nghĩa (bậc không đơn điệu, ngưỡng sai chiều, tắt
 * hết luật) và trả 422 kèm lý do. UI kiểm lại những lỗi đó ngay tại chỗ để người
 * dùng thấy sai ngay khi gõ, thay vì phải bấm Lưu mới biết.
 */

const NHOM_5C_LABEL: Record<string, string> = {
  Character: 'Uy tín',
  Capacity: 'Khả năng trả nợ',
  Capital: 'Tài sản tích lũy',
};

const NHA_O_LABEL: Record<string, string> = {
  OWN: 'Sở hữu riêng',
  MORTGAGE: 'Đang thế chấp',
  RENT: 'Thuê',
  OTHER: 'Khác',
};

/** Ngưỡng cuối cùng biểu diễn "mọi giá trị còn lại" — không hiển thị dạng số. */
function laNguongVoCuc(nguong: number, moc: number) {
  return nguong >= moc;
}

function dinhDangNguong(nguong: number, moc: number, nghichDao: boolean) {
  if (laNguongVoCuc(nguong, moc)) return 'còn lại';
  return `${nghichDao ? '≤' : '≥'} ${nguong}`;
}

type FormRules = Record<string, AiRuleUpdate>;

function dungForm(rules: AiRule[]): FormRules {
  const form: FormRules = {};
  for (const r of rules) {
    form[r.ma] = {
      bat: r.bat,
      diem_khi_thieu: r.diem_khi_thieu,
      ...(r.bac ? { bac: r.bac.map(b => [...b] as RuleBac) } : {}),
      ...(r.bang_diem ? { bang_diem: { ...r.bang_diem } } : {}),
    };
  }
  return form;
}

/** Kiểm tra tại chỗ, cùng bộ luật với backend. Trả về thông báo lỗi hoặc ''. */
function kiemTra(rules: AiRule[], form: FormRules, diemToiDa: number): string {
  if (!Object.values(form).some(r => r.bat)) {
    return 'Phải bật ít nhất một luật, nếu không hệ thống không còn cơ sở chấm điểm.';
  }

  for (const luat of rules) {
    const f = form[luat.ma];
    const ten = luat.mo_ta;

    if (f.diem_khi_thieu < 0 || f.diem_khi_thieu > diemToiDa) {
      return `${ten}: điểm khi thiếu dữ liệu phải trong khoảng 0–${diemToiDa}.`;
    }

    if (luat.la_bang_diem) {
      const diem = Object.values(f.bang_diem ?? {});
      if (diem.some(d => d < 0 || d > diemToiDa)) {
        return `${ten}: điểm phải trong khoảng 0–${diemToiDa}.`;
      }
      if (Math.max(...diem) !== diemToiDa) {
        return `${ten}: loại tốt nhất phải đạt đúng ${diemToiDa} điểm để các luật cân nhau.`;
      }
      continue;
    }

    const bac = f.bac ?? [];
    const diem = bac.map(b => b[1]);
    if (diem.some(d => d < 0 || d > diemToiDa)) {
      return `${ten}: điểm mỗi bậc phải trong khoảng 0–${diemToiDa}.`;
    }
    if (Math.max(...diem) !== diemToiDa) {
      return `${ten}: bậc tốt nhất phải đạt đúng ${diemToiDa} điểm để các luật cân nhau.`;
    }
    for (let i = 1; i < diem.length; i++) {
      if (diem[i] > diem[i - 1]) {
        return `${ten}: điểm phải giảm dần — bậc đầu là bậc tốt nhất.`;
      }
    }
    const nguong = bac.map(b => b[0]);
    for (let i = 1; i < nguong.length; i++) {
      const sai = luat.nghich_dao ? nguong[i] < nguong[i - 1] : nguong[i] > nguong[i - 1];
      if (sai) {
        return `${ten}: ngưỡng phải ${luat.nghich_dao ? 'tăng' : 'giảm'} dần theo thứ tự bậc.`;
      }
    }
  }
  return '';
}

export default function RuleEnginePanel() {
  const { data, isLoading, error } = useGetAiRulesQuery();
  const [updateRules, { isLoading: saving }] = useUpdateAiRulesMutation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormRules>({});
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (data) setForm(dungForm(data.rules));
  }, [data]);

  const startEditing = useCallback(() => {
    if (data) setForm(dungForm(data.rules));
    setFormError('');
    setEditing(true);
  }, [data]);

  const cancelEditing = useCallback(() => {
    if (data) setForm(dungForm(data.rules));
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

  const { rules, diem_toi_da_moi_luat: diemToiDa, nguong_vo_cuc: mocVoCuc } = data;
  const soLuatBat = Object.values(form).filter(r => r.bat).length;

  async function handleSave() {
    const loi = kiemTra(rules, form, diemToiDa);
    if (loi) {
      setFormError(loi);
      return;
    }
    setFormError('');
    try {
      await updateRules({ rules: form }).unwrap();
      setEditing(false);
      setSuccessMsg('Cập nhật luật chấm điểm thành công.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { detail?: string } }).data?.detail
          : undefined;
      setFormError(detail ?? 'Lưu cấu hình luật thất bại.');
    }
  }

  function suaBac(ma: string, i: number, cot: 0 | 1, giaTri: string) {
    setForm(prev => {
      const bac = (prev[ma].bac ?? []).map(b => [...b] as RuleBac);
      bac[i][cot] = Number(giaTri);
      return { ...prev, [ma]: { ...prev[ma], bac } };
    });
  }

  function suaBangDiem(ma: string, khoa: string, giaTri: string) {
    setForm(prev => ({
      ...prev,
      [ma]: { ...prev[ma], bang_diem: { ...prev[ma].bang_diem, [khoa]: Number(giaTri) } },
    }));
  }

  function toggleLuat(ma: string) {
    setForm(prev => ({ ...prev, [ma]: { ...prev[ma], bat: !prev[ma].bat } }));
  }

  function suaDiemThieu(ma: string, giaTri: string) {
    setForm(prev => ({ ...prev, [ma]: { ...prev[ma], diem_khi_thieu: Number(giaTri) } }));
  }

  return (
    <article className="policy-panel rule-panel">
      <div className="policy-panel-heading">
        <div>
          <span className="policy-eyebrow">Rule engine 5C</span>
          <h2>Luật chấm điểm rủi ro</h2>
          <p className="rule-subtitle">
            Mỗi luật tối đa {diemToiDa} điểm. Điểm được chuẩn hóa về thang 100 theo
            số luật đang bật, nên tắt một luật không làm lệch thang điểm.
          </p>
        </div>
        {!editing ? (
          <button className="policy-edit-btn" onClick={startEditing}>Chỉnh sửa luật</button>
        ) : (
          <div className="policy-action-group">
            <button className="policy-cancel-btn" onClick={cancelEditing} disabled={saving}>Hủy</button>
            <button className="policy-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu luật'}
            </button>
          </div>
        )}
      </div>

      {successMsg && <div className="policy-success">{successMsg}</div>}
      {formError && <div className="policy-form-error">{formError}</div>}

      <p className="rule-summary">
        Đang bật <strong>{soLuatBat}/{rules.length}</strong> luật
        {soLuatBat < rules.length && ' — điểm đã được chuẩn hóa lại về thang 100'}
      </p>

      <div className="rule-list">
        {rules.map(luat => {
          const f = form[luat.ma];
          if (!f) return null;
          const tat = !f.bat;
          return (
            <section key={luat.ma} className={`rule-item${tat ? ' rule-item-off' : ''}`}>
              <header className="rule-item-head">
                <div>
                  <h3>{luat.mo_ta}</h3>
                  <span className="rule-tags">
                    <span className="rule-tag">{NHOM_5C_LABEL[luat.nhom_5c] ?? luat.nhom_5c}</span>
                    <code className="rule-code">{luat.ma}</code>
                    {luat.nghich_dao && <span className="rule-tag rule-tag-muted">càng thấp càng tốt</span>}
                  </span>
                </div>
                {editing ? (
                  <label className="rule-toggle">
                    <input type="checkbox" checked={f.bat} onChange={() => toggleLuat(luat.ma)} />
                    <span>{f.bat ? 'Đang bật' : 'Đã tắt'}</span>
                  </label>
                ) : (
                  <span className={`rule-state${tat ? ' rule-state-off' : ''}`}>
                    {tat ? 'Đã tắt' : 'Đang bật'}
                  </span>
                )}
              </header>

              {luat.la_bang_diem ? (
                <table className="rule-table">
                  <thead>
                    <tr><th>Tình trạng</th><th>Điểm</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(f.bang_diem ?? {}).map(([khoa, diem]) => (
                      <tr key={khoa}>
                        <td>{NHA_O_LABEL[khoa] ?? khoa}</td>
                        <td>
                          {editing ? (
                            <input
                              type="number"
                              className="policy-input rule-input"
                              min="0"
                              max={diemToiDa}
                              value={diem}
                              onChange={e => suaBangDiem(luat.ma, khoa, e.target.value)}
                            />
                          ) : (
                            <strong>{diem}</strong>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="rule-table">
                  <thead>
                    <tr><th>Ngưỡng</th><th>Điểm</th></tr>
                  </thead>
                  <tbody>
                    {(f.bac ?? []).map(([nguong, diem], i) => {
                      const voCuc = laNguongVoCuc(nguong, mocVoCuc);
                      return (
                        <tr key={i}>
                          <td>
                            {editing && !voCuc ? (
                              <input
                                type="number"
                                className="policy-input rule-input"
                                step="any"
                                value={nguong}
                                onChange={e => suaBac(luat.ma, i, 0, e.target.value)}
                              />
                            ) : (
                              dinhDangNguong(nguong, mocVoCuc, luat.nghich_dao)
                            )}
                          </td>
                          <td>
                            {editing ? (
                              <input
                                type="number"
                                className="policy-input rule-input"
                                min="0"
                                max={diemToiDa}
                                value={diem}
                                onChange={e => suaBac(luat.ma, i, 1, e.target.value)}
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
              )}

              <footer className="rule-item-foot">
                <span>Điểm khi thiếu dữ liệu</span>
                {editing ? (
                  <input
                    type="number"
                    className="policy-input rule-input"
                    min="0"
                    max={diemToiDa}
                    value={f.diem_khi_thieu}
                    onChange={e => suaDiemThieu(luat.ma, e.target.value)}
                  />
                ) : (
                  <strong>{f.diem_khi_thieu}</strong>
                )}
                <p className="rule-hint">
                  Dùng khi hồ sơ không có dữ liệu cho luật này. Cố ý đặt ở mức trung tính
                  thay vì điểm sàn: không tra được thông tin là sự cố hệ thống, không phải
                  bằng chứng người vay rủi ro.
                </p>
              </footer>
            </section>
          );
        })}
      </div>
    </article>
  );
}
