import { useCallback, useEffect, useState } from 'react';
import { loanFetch } from '@/lib/loanApi';
import './ProductListPage.css';

interface LoanProduct {
  id: number;
  code: string;
  name: string;
  description: string | null;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  annualInterestRate: number;
  repaymentMethod: 'ANNUITY' | 'EQUAL_PRINCIPAL';
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  coreSyncStatus: 'NOT_SYNCED' | 'PENDING' | 'SYNCED' | 'FAILED';
  configurationVersion: number;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PageResponse<T> {
  data: T[];
  page: number;
  size: number;
  totalElements: number;
}

interface CreateProductForm {
  code: string;
  name: string;
  description: string;
  minAmount: string;
  maxAmount: string;
  minTermMonths: string;
  maxTermMonths: string;
  annualInterestRate: string;
  repaymentMethod: 'ANNUITY' | 'EQUAL_PRINCIPAL';
}

const EMPTY_FORM: CreateProductForm = {
  code: '',
  name: '',
  description: '',
  minAmount: '',
  maxAmount: '',
  minTermMonths: '',
  maxTermMonths: '',
  annualInterestRate: '',
  repaymentMethod: 'ANNUITY',
};

const REPAYMENT_LABELS: Record<string, string> = {
  ANNUITY: 'Declining Balance',
  EQUAL_PRINCIPAL: 'Trả gốc đều',
};

const STATUS_TAG: Record<string, { label: string; cls: string; dot: string }> = {
  DRAFT: { label: 'Nháp', cls: 'ptag-gray', dot: 'status-dot-gray' },
  ACTIVE: { label: 'Hoạt động', cls: 'ptag-green', dot: 'status-dot-green' },
  INACTIVE: { label: 'Tạm dừng', cls: 'ptag-amber', dot: 'status-dot-amber' },
  ARCHIVED: { label: 'Lưu trữ', cls: 'ptag-gray', dot: 'status-dot-gray' },
};

const SYNC_TAG: Record<string, { label: string; cls: string }> = {
  NOT_SYNCED: { label: 'Chưa đồng bộ', cls: 'ptag-gray' },
  PENDING: { label: 'Đang đồng bộ', cls: 'ptag-amber' },
  SYNCED: { label: 'Đã đồng bộ', cls: 'ptag-green' },
  FAILED: { label: 'Lỗi đồng bộ', cls: 'ptag-red' },
};

function formatVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(value % 1_000_000_000 === 0 ? 0 : 1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} tr`;
  return value.toLocaleString('vi-VN');
}

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ProductListPage() {
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateProductForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const res = await loanFetch<PageResponse<LoanProduct>>(
        '/loan-products?page=0&size=100',
      );
      setProducts(res.data);
    } catch (err) {
      setStatus('error');
      setStatusMsg(err instanceof Error ? err.message : 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleAction = async (
    id: number,
    action: 'activate' | 'deactivate' | 'archive' | 'core-sync',
    version: number,
  ) => {
    setStatus('loading');
    setStatusMsg('');
    try {
      await loanFetch<LoanProduct>(`/admin/loan-products/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ version }),
      });
      setStatus('success');
      setStatusMsg(
        action === 'activate' ? 'Đã kích hoạt sản phẩm'
        : action === 'deactivate' ? 'Đã tạm dừng sản phẩm'
        : action === 'archive' ? 'Đã lưu trữ sản phẩm'
        : 'Đang đồng bộ Fineract...',
      );
      await loadProducts();
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      setStatus('error');
      setStatusMsg(err instanceof Error ? err.message : 'Lỗi thực hiện hành động');
    }
  };

  const handleCreate = async () => {
    setFormError('');
    if (!form.code || !form.name || !form.minAmount || !form.maxAmount || !form.annualInterestRate || !form.minTermMonths || !form.maxTermMonths) {
      setFormError('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }
    if (!/^[A-Za-z][A-Za-z0-9_]{2,49}$/.test(form.code)) {
      setFormError('Mã sản phẩm: bắt đầu bằng chữ, chỉ chứa chữ/số/_, 3–50 ký tự');
      return;
    }

    setSaving(true);
    try {
      await loanFetch<LoanProduct>('/admin/loan-products', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          description: form.description || null,
          minAmount: Number(form.minAmount),
          maxAmount: Number(form.maxAmount),
          minTermMonths: Number(form.minTermMonths),
          maxTermMonths: Number(form.maxTermMonths),
          annualInterestRate: Number(form.annualInterestRate),
          repaymentMethod: form.repaymentMethod,
        }),
      });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setStatus('success');
      setStatusMsg('Đã tạo sản phẩm mới (trạng thái Nháp)');
      await loadProducts();
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Lỗi tạo sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="prod-loading">Đang tải danh sách sản phẩm...</div>;
  }

  return (
    <div>
      <div className="prod-page-header">
        <h1>Sản phẩm vay</h1>
        <p>
          Danh sách sản phẩm vay đồng bộ từ Fineract — mỗi sản phẩm có cấu hình
          lãi, hạn mức, kỳ hạn riêng. Lifecycle: Nháp → Đồng bộ → Kích hoạt.
        </p>
      </div>

      <div className="prod-top-actions">
        {status === 'error' && (
          <span className="prod-status prod-status-error">{statusMsg}</span>
        )}
        {status === 'success' && (
          <span className="prod-status prod-status-saved">{statusMsg}</span>
        )}
        <button
          className="prod-btn sm prod-btn-ghost"
          onClick={() => { setLoading(true); loadProducts(); }}
        >
          ⟲ Làm mới
        </button>
        <button
          className="prod-btn sm prod-btn-primary"
          onClick={() => setShowCreate(true)}
        >
          + Tạo sản phẩm
        </button>
      </div>

      {/* Main products table */}
      <div className="prod-card">
        <div className="prod-card-header">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
            Danh sách sản phẩm vay
          </h3>
          <span className="spacer" />
          <span className="ptag ptag-blue">{products.length} sản phẩm</span>
        </div>
        <div className="prod-card-body no-pad">
          <div className="prod-table-wrap">
            {products.length === 0 ? (
              <div className="prod-empty">
                Chưa có sản phẩm nào. Nhấn "+ Tạo sản phẩm" để bắt đầu.
              </div>
            ) : (
              <table className="prod-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên sản phẩm</th>
                    <th>Lãi suất</th>
                    <th>Kiểu tính lãi</th>
                    <th>Hạn mức</th>
                    <th>Kỳ hạn</th>
                    <th>Trạng thái</th>
                    <th>Fineract</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const st = STATUS_TAG[p.status] ?? STATUS_TAG.DRAFT;
                    const sync = SYNC_TAG[p.coreSyncStatus] ?? SYNC_TAG.NOT_SYNCED;
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="ptag ptag-blue">{p.code}</span>
                        </td>
                        <td>
                          <div className="prod-name">{p.name}</div>
                          {p.description && (
                            <div className="prod-desc">{p.description}</div>
                          )}
                        </td>
                        <td>{p.annualInterestRate}%/năm</td>
                        <td>{REPAYMENT_LABELS[p.repaymentMethod] ?? p.repaymentMethod}</td>
                        <td className="amount-range">
                          {formatVND(p.minAmount)} – {formatVND(p.maxAmount)}
                        </td>
                        <td>
                          {p.minTermMonths} – {p.maxTermMonths} tháng
                        </td>
                        <td>
                          <span className={`ptag ${st.cls}`}>
                            <span className={`status-dot ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                        <td>
                          <span className={`ptag ${sync.cls}`}>{sync.label}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {p.status === 'DRAFT' && (
                              <>
                                <button
                                  className="prod-btn sm prod-btn-ghost"
                                  onClick={() => handleAction(p.id, 'core-sync', p.version)}
                                  disabled={status === 'loading'}
                                  title="Đồng bộ cấu hình lên Fineract"
                                >
                                  ⟳ Sync
                                </button>
                                {p.coreSyncStatus === 'SYNCED' && (
                                  <button
                                    className="prod-btn sm prod-btn-cyan"
                                    onClick={() => handleAction(p.id, 'activate', p.version)}
                                    disabled={status === 'loading'}
                                  >
                                    Kích hoạt
                                  </button>
                                )}
                                <button
                                  className="prod-btn sm prod-btn-danger"
                                  onClick={() => handleAction(p.id, 'archive', p.version)}
                                  disabled={status === 'loading'}
                                >
                                  Lưu trữ
                                </button>
                              </>
                            )}
                            {p.status === 'ACTIVE' && (
                              <button
                                className="prod-btn sm prod-btn-ghost"
                                onClick={() => handleAction(p.id, 'deactivate', p.version)}
                                disabled={status === 'loading'}
                              >
                                Tạm dừng
                              </button>
                            )}
                            {p.status === 'INACTIVE' && (
                              <>
                                <button
                                  className="prod-btn sm prod-btn-cyan"
                                  onClick={() => handleAction(p.id, 'activate', p.version)}
                                  disabled={status === 'loading'}
                                >
                                  Kích hoạt lại
                                </button>
                                <button
                                  className="prod-btn sm prod-btn-danger"
                                  onClick={() => handleAction(p.id, 'archive', p.version)}
                                  disabled={status === 'loading'}
                                >
                                  Lưu trữ
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create product modal */}
      {showCreate && (
        <div className="prod-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="prod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prod-modal-header">
              <h3>Tạo sản phẩm vay mới</h3>
              <button
                className="prod-modal-close"
                onClick={() => setShowCreate(false)}
              >
                ✕
              </button>
            </div>
            <div className="prod-modal-body">
              <div className="prod-field-row">
                <div className="prod-field">
                  <label>Mã sản phẩm *</label>
                  <input
                    type="text"
                    placeholder="VD: PVHP"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                    }
                  />
                  <div className="field-hint">Bắt đầu bằng chữ, 3–50 ký tự</div>
                </div>
                <div className="prod-field">
                  <label>Kiểu tính lãi *</label>
                  <select
                    value={form.repaymentMethod}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        repaymentMethod: e.target.value as 'ANNUITY' | 'EQUAL_PRINCIPAL',
                      }))
                    }
                  >
                    <option value="ANNUITY">Declining Balance (Trả đều)</option>
                    <option value="EQUAL_PRINCIPAL">Trả gốc đều</option>
                  </select>
                </div>
              </div>

              <div className="prod-field">
                <label>Tên sản phẩm *</label>
                <input
                  type="text"
                  placeholder="VD: Vay học phí"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="prod-field">
                <label>Mô tả</label>
                <textarea
                  placeholder="Mô tả ngắn về sản phẩm..."
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              <div className="prod-field-row">
                <div className="prod-field">
                  <label>Hạn mức tối thiểu (VND) *</label>
                  <input
                    type="number"
                    placeholder="1000000"
                    value={form.minAmount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minAmount: e.target.value }))
                    }
                  />
                </div>
                <div className="prod-field">
                  <label>Hạn mức tối đa (VND) *</label>
                  <input
                    type="number"
                    placeholder="100000000"
                    value={form.maxAmount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxAmount: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="prod-field-row">
                <div className="prod-field">
                  <label>Kỳ hạn tối thiểu (tháng) *</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={form.minTermMonths}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minTermMonths: e.target.value }))
                    }
                  />
                </div>
                <div className="prod-field">
                  <label>Kỳ hạn tối đa (tháng) *</label>
                  <input
                    type="number"
                    placeholder="24"
                    value={form.maxTermMonths}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxTermMonths: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="prod-field">
                <label>Lãi suất năm (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="15"
                  value={form.annualInterestRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, annualInterestRate: e.target.value }))
                  }
                />
              </div>

              {formError && (
                <div className="prod-field-error">{formError}</div>
              )}
            </div>
            <div className="prod-modal-footer">
              <button
                className="prod-btn sm prod-btn-ghost"
                onClick={() => setShowCreate(false)}
              >
                Hủy
              </button>
              <button
                className="prod-btn sm prod-btn-primary"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? 'Đang tạo...' : 'Tạo sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
