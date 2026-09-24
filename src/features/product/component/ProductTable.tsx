import type { LoanProduct } from '../types';
import { formatNumber as formatMoney } from '@/utils';

type ProductAction = 'activate' | 'deactivate' | 'archive' | 'core-sync';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp', ACTIVE: 'Hoạt động', INACTIVE: 'Tạm dừng', ARCHIVED: 'Lưu trữ',
};
const SYNC_LABELS: Record<string, string> = {
  NOT_SYNCED: 'Chưa đồng bộ', PENDING: 'Đang đồng bộ', PROCESSING: 'Đang xử lý',
  RETRY_PENDING: 'Chờ thử lại', SYNCED: 'Đã đồng bộ', FAILED: 'Lỗi đồng bộ',
};

interface Props {
  products: LoanProduct[];
  busy: boolean;
  onAction: (id: number, action: ProductAction, version: number) => void;
}

function ProductActions({ product, busy, onAction }: { product: LoanProduct } & Omit<Props, 'products'>) {
  if (product.status === 'ARCHIVED') return null;
  return (
    <div className="prod-actions">
      {(product.coreSyncStatus === 'NOT_SYNCED' || product.coreSyncStatus === 'FAILED') && (
        <button className="prod-btn sm prod-btn-ghost" disabled={busy} onClick={() => onAction(product.id, 'core-sync', product.version)}>
          {product.coreSyncStatus === 'FAILED' ? 'Thử sync lại' : 'Đồng bộ'}
        </button>
      )}
      {product.status !== 'ACTIVE' && product.coreSyncStatus === 'SYNCED' && (
        <button className="prod-btn sm prod-btn-cyan" disabled={busy} onClick={() => onAction(product.id, 'activate', product.version)}>Kích hoạt</button>
      )}
      {product.status === 'ACTIVE' && (
        <button className="prod-btn sm prod-btn-ghost" disabled={busy} onClick={() => onAction(product.id, 'deactivate', product.version)}>Tạm dừng</button>
      )}
      {product.status !== 'ACTIVE' && (
        <button className="prod-btn sm prod-btn-danger" disabled={busy} onClick={() => onAction(product.id, 'archive', product.version)}>Lưu trữ</button>
      )}
    </div>
  );
}

export function ProductTable({ products, busy, onAction }: Props) {
  if (products.length === 0) return <div className="prod-empty">Chưa có sản phẩm ở trang này.</div>;
  return (
    <div className="prod-table-wrap">
      <table className="prod-table">
        <thead><tr><th>Mã</th><th>Sản phẩm</th><th>Lãi suất cơ sở / khung</th><th>Hạn mức</th><th>Kỳ hạn</th><th>Trạng thái</th><th>Fineract</th><th /></tr></thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td><span className="ptag ptag-blue">{product.code}</span></td>
              <td><div className="prod-name">{product.name}</div><div className="prod-desc">{product.description}</div></td>
              <td>
                <strong>{product.annualInterestRate}%/năm</strong>
                <span className="prod-desc">
                  Khung {product.minAnnualInterestRate}% – {product.maxAnnualInterestRate}%
                </span>
              </td>
              <td>{formatMoney(product.minAmount)} – {formatMoney(product.maxAmount)}</td>
              <td>{product.minTermMonths} – {product.maxTermMonths} tháng</td>
              <td><span className="ptag ptag-gray">{STATUS_LABELS[product.status] ?? product.status}</span></td>
              <td><span className={`ptag ${product.coreSyncStatus === 'SYNCED' ? 'ptag-green' : product.coreSyncStatus === 'FAILED' ? 'ptag-red' : 'ptag-amber'}`}>{SYNC_LABELS[product.coreSyncStatus] ?? product.coreSyncStatus}</span></td>
              <td><ProductActions product={product} busy={busy} onAction={onAction} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
