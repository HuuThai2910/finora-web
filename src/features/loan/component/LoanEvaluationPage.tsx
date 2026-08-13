import { useState, useEffect, useCallback } from 'react';
import { useGetAiConfigQuery, useUpdateAiConfigMutation } from '../api/aiConfigApi';
import { formatMoney } from '../formatters';
import type { GradeConfig, ApprovalThresholds, ModelWeights, AiProductConfigUpdate } from '../types';
import './LoanEvaluationPage.css';

const RULE_FACTORS = [
  { name: 'Tỷ lệ khoản vay/thu nhập năm', detail: '≤20%: 25 điểm · ≤50%: 15 điểm · còn lại: 5 điểm' },
  { name: 'Thâm niên làm việc', detail: '≥5 năm: 25 điểm · ≥2 năm: 15 điểm · còn lại: 5 điểm' },
  { name: 'Tình trạng nhà ở', detail: 'Sở hữu: 25 · thế chấp: 20 · thuê: 10 · khác: 5 điểm' },
  { name: 'Thu nhập năm', detail: '≥300 triệu: 25 điểm · ≥120 triệu: 15 điểm · còn lại: 5 điểm' },
];

const GRADE_RISK_LABELS: Record<string, string> = {
  A: 'Thấp', B: 'Trung bình', C: 'Cao', D: 'Rất cao', E: 'Cực kỳ cao',
};

function gradeClass(grade: string) {
  return `grade-${grade.toLowerCase()}`;
}

function validate(
  grades: GradeConfig[],
  thresholds: ApprovalThresholds,
  weights: ModelWeights,
): string | null {
  if (thresholds.auto_reject >= thresholds.auto_approve) {
    return 'Ngưỡng tự động từ chối phải nhỏ hơn ngưỡng tự động duyệt.';
  }
  const total = Math.round((weights.pd_weight + weights.risk_weight) * 10000) / 10000;
  if (total !== 1) {
    return `Tổng trọng số PD + Risk phải bằng 1.0 (hiện tại = ${total}).`;
  }
  for (const g of grades) {
    if (g.min_score > g.max_score) {
      return `Hạng ${g.grade}: min_score (${g.min_score}) không được lớn hơn max_score (${g.max_score}).`;
    }
    if (g.limit < 0) {
      return `Hạng ${g.grade}: hạn mức không được âm.`;
    }
  }
  return null;
}

export default function LoanEvaluationPage() {
  const { data: config, isLoading, error } = useGetAiConfigQuery();
  const [updateConfig, { isLoading: saving }] = useUpdateAiConfigMutation();

  const [editing, setEditing] = useState(false);
  const [formGrades, setFormGrades] = useState<GradeConfig[]>([]);
  const [formThresholds, setFormThresholds] = useState<ApprovalThresholds>({ auto_approve: 90, auto_reject: 40 });
  const [formWeights, setFormWeights] = useState<ModelWeights>({ pd_weight: 0.6, risk_weight: 0.4 });
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetForm = useCallback(() => {
    if (!config) return;
    setFormGrades(config.grades.map(g => ({ ...g })));
    setFormThresholds({ ...config.approval_thresholds });
    setFormWeights({ ...config.model_weights });
    setFormError('');
  }, [config]);

  useEffect(() => {
    if (config) resetForm();
  }, [config, resetForm]);

  function startEditing() {
    resetForm();
    setEditing(true);
    setSuccessMsg('');
  }

  function cancelEditing() {
    setEditing(false);
    resetForm();
  }

  async function handleSave() {
    const validationError = validate(formGrades, formThresholds, formWeights);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError('');

    const body: AiProductConfigUpdate = {
      grades: formGrades,
      approval_thresholds: formThresholds,
      model_weights: formWeights,
    };
    try {
      await updateConfig(body).unwrap();
      setEditing(false);
      setSuccessMsg('Cập nhật chính sách thành công.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? String((err as { data: { detail?: string } }).data?.detail ?? JSON.stringify((err as { data: unknown }).data))
          : 'Có lỗi xảy ra khi lưu.';
      setFormError(message);
    }
  }

  function updateGrade(index: number, field: keyof GradeConfig, value: string) {
    setFormGrades(prev => prev.map((g, i) =>
      i === index
        ? { ...g, [field]: field === 'grade' ? value : Number(value) }
        : g
    ));
  }

  if (isLoading) {
    return (
      <section className="policy-page">
        <div className="policy-loading">Đang tải cấu hình chính sách AI…</div>
      </section>
    );
  }

  if (error || !config) {
    return (
      <section className="policy-page">
        <div className="policy-error">
          Không thể tải cấu hình. Hãy đảm bảo finora-ai đang chạy tại cổng 8000.
        </div>
      </section>
    );
  }

  const grades = editing ? formGrades : config.grades;
  const thresholds = editing ? formThresholds : config.approval_thresholds;
  const weights = editing ? formWeights : config.model_weights;

  return (
    <section className="policy-page">
      <header className="policy-header">
        <div>
          <span className="policy-eyebrow">Mô hình v13.0.0</span>
          <h1>Chính sách đánh giá AI</h1>
          <p>Cấu hình khoảng điểm, hạng tín dụng, ngưỡng duyệt tự động và trọng số mô hình.</p>
        </div>
        {!editing ? (
          <button className="policy-edit-btn" onClick={startEditing}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Chỉnh sửa
          </button>
        ) : (
          <div className="policy-action-group">
            <button className="policy-cancel-btn" onClick={cancelEditing} disabled={saving}>Hủy</button>
            <button className="policy-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        )}
      </header>

      {successMsg && <div className="policy-success">{successMsg}</div>}
      {formError && <div className="policy-form-error">{formError}</div>}

      {/* ── Summary cards ───────────────────────────────────────── */}
      <div className="policy-grid policy-summary">
        <article className="policy-card">
          <span>Trọng số xác suất rủi ro</span>
          {editing ? (
            <input
              type="number"
              className="policy-input"
              step="0.1"
              min="0"
              max="1"
              value={formWeights.pd_weight}
              onChange={e => setFormWeights(w => ({ ...w, pd_weight: Number(e.target.value) }))}
            />
          ) : (
            <strong>{Math.round(weights.pd_weight * 100)}%</strong>
          )}
          <p>(1 − PD) × 100</p>
        </article>
        <article className="policy-card">
          <span>Trọng số điểm quy tắc</span>
          {editing ? (
            <input
              type="number"
              className="policy-input"
              step="0.1"
              min="0"
              max="1"
              value={formWeights.risk_weight}
              onChange={e => setFormWeights(w => ({ ...w, risk_weight: Number(e.target.value) }))}
            />
          ) : (
            <strong>{Math.round(weights.risk_weight * 100)}%</strong>
          )}
          <p>Risk score 0–100</p>
        </article>
        <article className="policy-card">
          <span>Tự động từ chối</span>
          {editing ? (
            <input
              type="number"
              className="policy-input"
              min="0"
              max="100"
              value={formThresholds.auto_reject}
              onChange={e => setFormThresholds(t => ({ ...t, auto_reject: Number(e.target.value) }))}
            />
          ) : (
            <strong>&lt; {thresholds.auto_reject}</strong>
          )}
          <p>Hoặc vi phạm quy tắc chặn</p>
        </article>
        <article className="policy-card">
          <span>Tự động đề xuất duyệt</span>
          {editing ? (
            <input
              type="number"
              className="policy-input"
              min="0"
              max="100"
              value={formThresholds.auto_approve}
              onChange={e => setFormThresholds(t => ({ ...t, auto_approve: Number(e.target.value) }))}
            />
          ) : (
            <strong>≥ {thresholds.auto_approve}</strong>
          )}
          <p>Còn lại chờ admin thẩm định</p>
        </article>
      </div>

      {/* ── Grades table ───────────────────────────────────────── */}
      <article className="policy-panel">
        <div className="policy-panel-heading">
          <div>
            <span className="policy-eyebrow">Credit grading</span>
            <h2>Phân hạng và hạn mức gợi ý</h2>
          </div>
          <span>Evaluation score = PD score × {Math.round(weights.pd_weight * 100)}% + risk score × {Math.round(weights.risk_weight * 100)}%</span>
        </div>
        <div className="policy-table-wrap">
          <table className="policy-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Điểm tối thiểu</th>
                <th>Điểm tối đa</th>
                <th>Mức rủi ro</th>
                <th>Hạn mức AI gợi ý</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => (
                <tr key={g.grade}>
                  <td>
                    <strong className={`policy-grade ${gradeClass(g.grade)}`}>{g.grade}</strong>
                  </td>
                  <td>
                    {editing ? (
                      <input
                        type="number"
                        className="policy-input sm"
                        min="0"
                        max="100"
                        value={g.min_score}
                        onChange={e => updateGrade(i, 'min_score', e.target.value)}
                      />
                    ) : (
                      g.min_score
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input
                        type="number"
                        className="policy-input sm"
                        min="0"
                        max="100"
                        value={g.max_score}
                        onChange={e => updateGrade(i, 'max_score', e.target.value)}
                      />
                    ) : (
                      g.max_score
                    )}
                  </td>
                  <td>{GRADE_RISK_LABELS[g.grade] ?? '—'}</td>
                  <td>
                    {editing ? (
                      <input
                        type="number"
                        className="policy-input"
                        min="0"
                        step="1000000"
                        value={g.limit}
                        onChange={e => updateGrade(i, 'limit', e.target.value)}
                      />
                    ) : (
                      formatMoney(g.limit)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* ── Legal limits (read-only) ──────────────────────────── */}
      <article className="policy-panel">
        <div className="policy-panel-heading">
          <div>
            <span className="policy-eyebrow">Giới hạn pháp lý</span>
            <h2>Trần nền tảng theo quy định</h2>
          </div>
          <span>Chỉ đọc — thay đổi theo quy định pháp luật</span>
        </div>
        <div className="policy-legal-grid">
          <div className="policy-legal-item">
            <span>Hạn mức tối đa/nền tảng</span>
            <strong>{formatMoney(config.legal_limits.max_platform_limit)}</strong>
          </div>
          <div className="policy-legal-item">
            <span>Lãi suất tối đa/năm</span>
            <strong>{(config.legal_limits.max_interest_rate * 100).toFixed(0)}%</strong>
          </div>
          <div className="policy-legal-item">
            <span>Kỳ hạn tối đa</span>
            <strong>{config.legal_limits.max_term_months} tháng</strong>
          </div>
        </div>
      </article>

      {/* ── Rule engine + Knock-outs ─────────────────────────── */}
      <div className="policy-grid">
        <article className="policy-panel">
          <div className="policy-panel-heading">
            <div><span className="policy-eyebrow">Rule engine 5C</span><h2>Bốn yếu tố chấm điểm</h2></div>
          </div>
          <ol className="policy-list">
            {RULE_FACTORS.map(f => (
              <li key={f.name}><strong>{f.name}</strong><span>{f.detail}</span></li>
            ))}
          </ol>
        </article>
        <article className="policy-panel">
          <div className="policy-panel-heading">
            <div><span className="policy-eyebrow">Knock-out rules</span><h2>Điều kiện chặn cứng</h2></div>
          </div>
          <ul className="policy-list">
            <li><strong>Lãi suất không hợp lệ</strong><span>Không lớn hơn {(config.legal_limits.max_interest_rate * 100).toFixed(0)}%/năm và phải lớn hơn 0.</span></li>
            <li><strong>Kỳ hạn vượt giới hạn</strong><span>Không quá {config.legal_limits.max_term_months} tháng theo policy hiện tại.</span></li>
            <li><strong>Áp lực trả nợ quá cao</strong><span>Khoản trả tháng vượt 50% thu nhập tháng.</span></li>
            <li><strong>Tuổi và kinh nghiệm bất hợp lý</strong><span>Loại khi dữ liệu cho thấy bắt đầu làm việc trước 10 tuổi.</span></li>
          </ul>
        </article>
      </div>
    </section>
  );
}
