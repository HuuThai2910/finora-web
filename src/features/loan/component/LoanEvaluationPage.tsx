import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/api';
import './LoanEvaluationPage.css';

interface GradeConfig {
  grade: string;
  min_score: number;
  max_score: number;
  limit: number;
}

interface ApprovalThresholds {
  auto_approve: number;
  auto_reject: number;
}

interface ModelWeights {
  pd_weight: number;
  risk_weight: number;
}

interface LegalLimits {
  max_platform_limit: number;
  max_interest_rate: number;
  max_term_months: number;
}

interface ProductConfig {
  grades: GradeConfig[];
  approval_thresholds: ApprovalThresholds;
  model_weights: ModelWeights;
  legal_limits: LegalLimits;
}

const GRADE_META: Record<string, { risk: string; tagClass: string }> = {
  A: { risk: 'Rủi ro cực thấp', tagClass: 'tag-green' },
  B: { risk: 'Rủi ro trung bình', tagClass: 'tag-blue' },
  C: { risk: 'Rủi ro cao', tagClass: 'tag-amber' },
  D: { risk: 'Rủi ro rất cao', tagClass: 'tag-red' },
  E: { risk: 'Từ chối', tagClass: 'tag-red' },
};

const PREVIEW_BANDS = [
  { range: '< 10', label: 'INTERDICT', bg: '#fee2e2', color: '#991b1b' },
  { range: '10 – 39', label: 'Hạng D', bg: '#fef2f2', color: '#b91c1c' },
  { range: '40 – 59', label: 'Hạng C', bg: '#fefce8', color: '#92400e' },
  { range: '60 – 89', label: 'Hạng B', bg: '#eff6ff', color: '#1e40af' },
  { range: '90 – 100', label: 'Hạng A · tự APPROVED', bg: '#d1fae5', color: '#065f46' },
];

const FALLBACK_GRADES: GradeConfig[] = [
  { grade: 'A', min_score: 90, max_score: 100, limit: 100_000_000 },
  { grade: 'B', min_score: 60, max_score: 89, limit: 50_000_000 },
  { grade: 'C', min_score: 40, max_score: 59, limit: 20_000_000 },
  { grade: 'D', min_score: 10, max_score: 39, limit: 10_000_000 },
];

const FALLBACK_THRESHOLDS: ApprovalThresholds = {
  auto_approve: 90,
  auto_reject: 10,
};

const FALLBACK_WEIGHTS: ModelWeights = {
  pd_weight: 0.6,
  risk_weight: 0.4,
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function LoanEvaluationPage() {
  const [grades, setGrades] = useState<GradeConfig[]>(FALLBACK_GRADES);
  const [thresholds, setThresholds] = useState<ApprovalThresholds>(FALLBACK_THRESHOLDS);
  const [weights, setWeights] = useState<ModelWeights>(FALLBACK_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [version, setVersion] = useState(8);

  useEffect(() => {
    fetchJson<ProductConfig>('/config/product')
      .then((cfg) => {
        setGrades(cfg.grades);
        setThresholds(cfg.approval_thresholds);
        setWeights(cfg.model_weights);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateGrade = (index: number, field: keyof GradeConfig, value: number) => {
    setGrades((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)),
    );
    setSaveStatus('idle');
  };

  const updateThreshold = (field: keyof ApprovalThresholds, value: number) => {
    setThresholds((t) => ({ ...t, [field]: value }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    setErrorMsg('');
    try {
      const cfg = await fetchJson<ProductConfig>('/config/product', {
        method: 'PUT',
        body: JSON.stringify({
          grades,
          approval_thresholds: thresholds,
          model_weights: weights,
        }),
      });
      setGrades(cfg.grades);
      setThresholds(cfg.approval_thresholds);
      setWeights(cfg.model_weights);
      setVersion((v) => v + 1);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setSaveStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi không xác định');
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const cfg = await fetchJson<ProductConfig>('/config/product');
      setGrades(cfg.grades);
      setThresholds(cfg.approval_thresholds);
      setWeights(cfg.model_weights);
      setSaveStatus('idle');
    } catch {
      setGrades(FALLBACK_GRADES);
      setThresholds(FALLBACK_THRESHOLDS);
      setWeights(FALLBACK_WEIGHTS);
    } finally {
      setLoading(false);
    }
  };

  const reviewMin = thresholds.auto_reject;
  const reviewMax = thresholds.auto_approve - 1;

  if (loading) {
    return <div className="eval-loading">Đang tải cấu hình...</div>;
  }

  return (
    <div>
      <div className="eval-page-header">
        <h1>Rule Engine — Đánh giá khoản vay</h1>
        <p>
          Cấu hình ngưỡng tự động, hạng tín dụng, trọng số. Mỗi lần lưu tạo
          phiên bản mới, kèm SHA-256 hash và audit blockchain.
        </p>
      </div>

      {/* Top action buttons */}
      <div className="eval-top-actions">
        {saveStatus === 'error' && (
          <span className="eval-status eval-status-error">{errorMsg}</span>
        )}
        {saveStatus === 'saved' && (
          <span className="eval-status eval-status-saved">
            Đã lưu thành công (v{version})
          </span>
        )}
        <button className="eval-btn sm eval-btn-ghost" onClick={handleReset}>
          ⟲ Đặt lại
        </button>
        <button
          className="eval-btn sm eval-btn-primary"
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Đang lưu...' : `✓ Lưu + blockchain (v${version + 1})`}
        </button>
      </div>

      {/* Version note */}
      <div className="eval-version-note">
        <span>ℹ️ Phiên bản hiện tại: <b>v{version}</b></span>
        <span className="tag-blue tag" style={{ fontSize: '10px', fontFamily: 'monospace' }}>
          Blockchain verified
        </span>
      </div>

      {/* Block 1 — Thresholds */}
      <div className="eval-card">
        <div className="eval-card-header">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            Khối 1 — Ngưỡng Chặn Dưới &amp; Chặn Trên
          </h3>
        </div>
        <div className="eval-card-body">
          <div className="threshold-grid">
            <div className="threshold-item">
              <label>Điểm Từ chối tự động</label>
              <div className="threshold-input-row">
                <input
                  type="number"
                  value={thresholds.auto_reject}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateThreshold('auto_reject', Number(e.target.value))
                  }
                />
                <span className="unit">điểm</span>
              </div>
              <div className="threshold-result">
                Score &lt; {thresholds.auto_reject} →{' '}
                <span className="tag tag-red">REJECTED</span>
              </div>
            </div>

            <div className="threshold-item">
              <label>Điểm Duyệt tự động</label>
              <div className="threshold-input-row">
                <input
                  type="number"
                  value={thresholds.auto_approve}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    updateThreshold('auto_approve', Number(e.target.value))
                  }
                />
                <span className="unit">điểm</span>
              </div>
              <div className="threshold-result">
                Score ≥ {thresholds.auto_approve} →{' '}
                <span className="tag tag-green">APPROVED</span>
              </div>
            </div>

            <div className="threshold-item">
              <label>Vùng Thẩm định thủ công</label>
              <div className="threshold-auto-zone">
                {reviewMin} — {reviewMax} điểm
              </div>
              <div className="threshold-result">
                Tự sinh ra →{' '}
                <span className="tag tag-amber">PENDING_REVIEW</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Block 2 — Credit Grading */}
      <div className="eval-card">
        <div className="eval-card-header">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
            Khối 2 — Phân Hạng &amp; Hạn Mức (Credit Grading)
          </h3>
          <span className="spacer" />
          <span className="tag tag-blue">
            Cascading — không cho phép hổng hoặc chồng lấn
          </span>
        </div>
        <div className="eval-card-body">
          <table className="eval-table">
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Mức rủi ro</th>
                <th>Điểm</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => {
                const meta = GRADE_META[g.grade] ?? GRADE_META.E;
                return (
                  <tr key={g.grade}>
                    <td>
                      <span className={`tag ${meta.tagClass}`}>
                        Hạng {g.grade}
                      </span>
                    </td>
                    <td>
                      <b>{meta.risk}</b>
                    </td>
                    <td>
                      <div className="score-range">
                        <input
                          type="number"
                          className="score-input"
                          value={g.min_score}
                          min={0}
                          max={100}
                          onChange={(e) =>
                            updateGrade(i, 'min_score', Number(e.target.value))
                          }
                        />
                        <span className="score-sep">—</span>
                        <input
                          type="number"
                          className="score-input"
                          value={g.max_score}
                          min={0}
                          max={100}
                          onChange={(e) =>
                            updateGrade(i, 'max_score', Number(e.target.value))
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block 3 — Model Weights */}
      <div className="eval-card">
        <div className="eval-card-header">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Khối 3 — Cấu hình Trọng số tính điểm
          </h3>
        </div>
        <div className="eval-card-body">
          <div className="weights-grid">
            <div className="weight-field">
              <label>Trọng số Model PD (xác suất vỡ nợ)</label>
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={weights.pd_weight}
                onChange={(e) => {
                  const pd = Number(e.target.value);
                  setWeights({ pd_weight: pd, risk_weight: Math.round((1 - pd) * 100) / 100 });
                  setSaveStatus('idle');
                }}
              />
            </div>
            <div className="weight-field">
              <label>Trọng số Risk Score (rule-based)</label>
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={weights.risk_weight}
                onChange={(e) => {
                  const risk = Number(e.target.value);
                  setWeights({ pd_weight: Math.round((1 - risk) * 100) / 100, risk_weight: risk });
                  setSaveStatus('idle');
                }}
              />
            </div>
          </div>

          {Math.round((weights.pd_weight + weights.risk_weight) * 100) !== 100 && (
            <div className="eval-version-note" style={{ background: '#fef2f2', borderColor: '#fecaca', borderLeftColor: '#e11d2e', color: '#991b1b', marginBottom: 12 }}>
              ⚠ Tổng trọng số phải bằng 1.0 (hiện tại: {(weights.pd_weight + weights.risk_weight).toFixed(2)})
            </div>
          )}

          <div className="preview-label">Xem trước phân loại:</div>
          <div className="preview-bands">
            {PREVIEW_BANDS.map((band) => (
              <div
                key={band.range}
                className="preview-band"
                style={{ background: band.bg, color: band.color }}
              >
                <b>{band.range}</b>
                <div className="band-label">{band.label}</div>
              </div>
            ))}
          </div>

          <p className="formula-hint">
            Điểm cuối = PD model × {Math.round(weights.pd_weight * 100)}% + risk score × {Math.round(weights.risk_weight * 100)}% → grade/decision
            resolved by <code>loan_evaluation_configs</code>. Mỗi lần lưu:
            version +1, SHA-256 của cấu hình được ghi lên sổ cái.
          </p>
        </div>
      </div>
    </div>
  );
}
