import { RowMenu, type RowMenuItem } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import {
  availableActions,
  formatDay,
  formatMillionRange,
  formatRate,
  repaymentLabel,
  statusLabel,
  statusTone,
} from '../mappers/productDisplay';
import type { LoanProduct, ProductAction } from '../types';
import { SyncState } from './SyncState';

interface ProductTableProps {
  products: LoanProduct[];
  /** Sản phẩm đang mở trong ngăn chi tiết, để tô dòng. */
  openId: number | null;
  onOpen: (product: LoanProduct) => void;
  /** Lưu trữ cần xác nhận nên không gửi thẳng: mở ngăn chi tiết ở bước xác nhận. */
  onAskArchive: (product: LoanProduct) => void;
  onAction: (product: LoanProduct, action: Exclude<ProductAction, 'archive'>) => void;
  busy: boolean;
}

function menuItems(product: LoanProduct, props: ProductTableProps): RowMenuItem[] {
  const actions = availableActions(product);
  const items: RowMenuItem[] = [{ key: 'open', label: 'Xem chi tiết', icon: 'eye', onSelect: () => props.onOpen(product) }];
  if (actions.syncLabel) {
    items.push({ key: 'sync', label: actions.syncLabel, icon: 'refresh', disabled: props.busy, onSelect: () => props.onAction(product, 'core-sync') });
  }
  if (actions.canActivate || actions.activateBlockedReason) {
    items.push({
      key: 'activate',
      label: 'Kích hoạt',
      icon: 'checkCircle',
      disabled: props.busy || !actions.canActivate,
      disabledReason: actions.activateBlockedReason ?? undefined,
      onSelect: () => props.onAction(product, 'activate'),
    });
  }
  if (actions.canDeactivate) {
    items.push({ key: 'deactivate', label: 'Tạm dừng', icon: 'clock', disabled: props.busy, onSelect: () => props.onAction(product, 'deactivate') });
  }
  if (actions.canArchive) {
    items.push({ key: 'archive', label: 'Lưu trữ', icon: 'xCircle', danger: true, separatorBefore: true, onSelect: () => props.onAskArchive(product) });
  }
  return items;
}

/** Bảng sản phẩm: bấm dòng để mở ngăn chi tiết; thao tác của dòng gom vào menu "⋯". */
export function ProductTable(props: ProductTableProps) {
  const { products, openId, onOpen } = props;
  return (
    <div className="ui-table-wrap">
      <table className="ui-table list prod-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th className="num">Hạn mức</th>
            <th className="num hide-sm">Kỳ hạn</th>
            <th className="num hide-sm">Lãi suất năm</th>
            <th className="hide-md">Cách trả nợ</th>
            <th>Trạng thái</th>
            <th className="hide-md">Cập nhật</th>
            <th className="act"><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const classes = ['clickable', openId === product.id ? 'is-open' : '', product.status === 'ARCHIVED' ? 'is-archived' : '']
              .filter(Boolean)
              .join(' ');
            return (
              <tr
                key={product.id}
                className={classes}
                tabIndex={0}
                aria-label={`Xem chi tiết ${product.name}`}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('button, a')) return;
                  onOpen(product);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.target === event.currentTarget) onOpen(product);
                }}
              >
                <td>
                  <span className="prod-name">{product.name}</span>
                  <span className="ui-sub ui-mono">{product.code}</span>
                </td>
                <td className="num">{formatMillionRange(product.minAmount, product.maxAmount)}</td>
                <td className="num hide-sm">{product.minTermMonths} - {product.maxTermMonths} tháng</td>
                <td className="num hide-sm">
                  {formatRate(product.annualInterestRate)}
                  <span className="ui-sub">
                    khung {formatRate(product.minAnnualInterestRate).replace('%', '')} - {formatRate(product.maxAnnualInterestRate)}
                  </span>
                </td>
                <td className="hide-md">{repaymentLabel(product.repaymentMethod)}</td>
                <td>
                  <div className="prod-status">
                    <StatusPill tone={statusTone(product.status)}>{statusLabel(product.status)}</StatusPill>
                    {/* Chỉ hiện dòng đồng bộ khi chưa xong, để bảng không lặp "Đã đồng bộ" ở mọi dòng. */}
                    {product.coreSyncStatus !== 'SYNCED' && <SyncState status={product.coreSyncStatus} />}
                  </div>
                </td>
                <td className="hide-md"><span className="prod-muted">{formatDay(product.updatedAt)}</span></td>
                <td className="act">
                  <RowMenu label={`Thao tác với ${product.name}`} items={menuItems(product, props)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
