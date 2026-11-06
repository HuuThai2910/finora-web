import { RowMenu, type RowMenuItem } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { formatDate } from '@/utils';
import {
  availableActions,
  formatMillionRange,
  formatRate,
  formatRateFrame,
  formatTermRange,
  repaymentLabel,
  statusLabel,
  statusTone,
} from '../mappers/productDisplay';
import type { LoanProduct } from '../types';
import type { ConfirmAction } from './ProductDrawerActions';
import { SyncState } from './SyncState';

interface ProductTableProps {
  products: LoanProduct[];
  /** Sản phẩm đang mở trong ngăn chi tiết, để tô dòng. */
  openId: number | null;
  onOpen: (product: LoanProduct) => void;
  /** Kích hoạt, tạm dừng, lưu trữ cần xác nhận nên không gửi thẳng: mở ngăn chi tiết ở bước xác nhận. */
  onAsk: (product: LoanProduct, action: ConfirmAction) => void;
  /** Đồng bộ là việc của hệ thống, không đổi trạng thái mở bán: gửi thẳng. */
  onSync: (product: LoanProduct) => void;
  /** Sửa cấu hình bản nháp. */
  onEdit: (product: LoanProduct) => void;
  /** Mở form tạo điền sẵn cấu hình của sản phẩm này. */
  onCopy: (product: LoanProduct) => void;
  busy: boolean;
  /** Có quyền Thao tác "Sản phẩm vay"; không có thì menu dòng chỉ còn "Xem chi tiết". */
  canAct: boolean;
}

/**
 * Dòng đang mở trong ngăn chi tiết tô nền xanh nhạt (khi dòng có focus bàn phím thì nền focus chung của bảng vẫn thắng);
 * sản phẩm đã lưu trữ hiện tên và cột số màu xám.
 */
const ROW_STATES = '[&.is-open:not(:focus-visible)_td]:bg-brand-50 [&.is-archived_.prod-name]:text-muted [&.is-archived_.num]:text-muted';
/** Cột ẩn khi màn vừa (dưới 1100px) và màn hẹp (dưới 760px). */
const HIDE_MD = 'hide-md max-[1100px]:hidden';
const HIDE_SM = 'hide-sm max-[760px]:hidden';

function menuItems(product: LoanProduct, props: ProductTableProps): RowMenuItem[] {
  const actions = availableActions(product);
  const items: RowMenuItem[] = [{ key: 'open', label: 'Xem chi tiết', icon: 'eye', onSelect: () => props.onOpen(product) }];
  if (!props.canAct) return items;
  if (actions.canEdit) {
    items.push({ key: 'edit', label: 'Sửa', icon: 'edit', disabled: props.busy, onSelect: () => props.onEdit(product) });
  }
  items.push({ key: 'copy', label: 'Tạo bản sao', icon: 'plus', onSelect: () => props.onCopy(product) });
  if (actions.syncLabel) {
    items.push({ key: 'sync', label: actions.syncLabel, icon: 'refresh', disabled: props.busy, onSelect: () => props.onSync(product) });
  }
  if (actions.canActivate || actions.activateBlockedReason) {
    items.push({
      key: 'activate',
      label: 'Kích hoạt',
      icon: 'checkCircle',
      disabled: props.busy || !actions.canActivate,
      disabledReason: actions.activateBlockedReason ?? undefined,
      onSelect: () => props.onAsk(product, 'activate'),
    });
  }
  if (actions.canDeactivate) {
    items.push({ key: 'deactivate', label: 'Tạm dừng', icon: 'clock', disabled: props.busy, onSelect: () => props.onAsk(product, 'deactivate') });
  }
  if (actions.canArchive) {
    items.push({ key: 'archive', label: 'Lưu trữ', icon: 'xCircle', danger: true, separatorBefore: true, onSelect: () => props.onAsk(product, 'archive') });
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
            <th className={`num ${HIDE_SM}`}>Kỳ hạn</th>
            <th className={`num ${HIDE_SM}`}>Lãi suất năm</th>
            <th className={HIDE_MD}>Cách trả nợ</th>
            <th>Trạng thái</th>
            <th className={HIDE_MD}>Cập nhật</th>
            <th className="act"><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const classes = ['clickable', openId === product.id ? 'is-open' : '', product.status === 'ARCHIVED' ? 'is-archived' : '', ROW_STATES]
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
                  <span className="prod-name block font-medium text-primary">{product.name}</span>
                  {/* Mã trong bảng nhỏ hơn mã ở ngăn chi tiết (12px thay cho 13px của ui-mono). */}
                  <span className="ui-sub ui-mono text-[12px]">{product.code}</span>
                </td>
                <td className="num">{formatMillionRange(product.minAmount, product.maxAmount)}</td>
                <td className={`num ${HIDE_SM}`}>{formatTermRange(product.minTermMonths, product.maxTermMonths)}</td>
                <td className={`num ${HIDE_SM}`}>
                  {formatRate(product.annualInterestRate)}
                  <span className="ui-sub">{formatRateFrame(product.minAnnualInterestRate, product.maxAnnualInterestRate)}</span>
                </td>
                <td className={HIDE_MD}>{repaymentLabel(product.repaymentMethod)}</td>
                <td>
                  <div className="prod-status grid gap-0.5 justify-items-start">
                    <StatusPill tone={statusTone(product.status)}>{statusLabel(product.status)}</StatusPill>
                    {/* Chỉ hiện dòng đồng bộ khi chưa xong, để bảng không lặp "Đã đồng bộ" ở mọi dòng. */}
                    {product.coreSyncStatus !== 'SYNCED' && <SyncState status={product.coreSyncStatus} />}
                  </div>
                </td>
                <td className={HIDE_MD}><span className="prod-muted text-muted text-[13px]">{formatDate(product.updatedAt)}</span></td>
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
