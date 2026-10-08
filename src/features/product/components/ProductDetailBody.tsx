import type { ReactNode } from 'react';
import { RATE_CAP_PERCENT } from '../constants';
import { formatDayTime, formatMoney, repaymentLabel } from '../mappers/productDisplay';
import type { LoanProduct } from '../types';
import { RateScale } from './RateScale';
import { SyncState } from './SyncState';

/**
 * Nội dung ngăn chi tiết: dữ liệu cấu hình của sản phẩm do finora-loan trả về.
 * `performance`: mục số liệu khoản vay và giải ngân (API thống kê), đặt sau điều khoản vay như mockup.
 */
export function ProductDetailBody({ product, performance }: { product: LoanProduct; performance?: ReactNode }) {
  return (
    <>
      {product.description && <p className="prod-desc">{product.description}</p>}

      <h3>Điều khoản vay</h3>
      <dl className="prod-dl">
        <dt>Hạn mức</dt>
        <dd>{formatMoney(product.minAmount)} đến {formatMoney(product.maxAmount)}</dd>
        <dt>Kỳ hạn</dt>
        <dd>{product.minTermMonths} đến {product.maxTermMonths} tháng</dd>
        <dt>Cách trả nợ</dt>
        <dd>{repaymentLabel(product.repaymentMethod)}</dd>
      </dl>

      {performance}

      <h3>Lãi suất năm</h3>
      <RateScale product={product} />
      <p className="prod-cap">
        Dải xanh là khung lãi suất, vạch đậm là lãi cơ sở dùng tính lịch trả trước thẩm định. Trần {RATE_CAP_PERCENT}%/năm.
      </p>

      <h3>Đồng bộ Fineract</h3>
      <dl className="prod-dl">
        <dt>Trạng thái</dt>
        <dd><SyncState status={product.coreSyncStatus} /></dd>
        <dt>Mã bên Fineract</dt>
        <dd>{product.currentCoreMappingId != null ? <span className="ui-mono">#{product.currentCoreMappingId}</span> : '-'}</dd>
        <dt>Bản cấu hình</dt>
        <dd>{product.configurationVersion}</dd>
      </dl>
      {product.coreSyncStatus === 'FAILED' && (
        <p className="prod-note">Lần đồng bộ gần nhất không thành công, Fineract chưa có sản phẩm này.</p>
      )}

      <h3>Lịch sử</h3>
      <dl className="prod-dl">
        <dt>Tạo</dt>
        <dd>{formatDayTime(product.createdAt)}<span className="ui-sub">{product.createdBy}</span></dd>
        <dt>Cập nhật</dt>
        <dd>{formatDayTime(product.updatedAt)}<span className="ui-sub">{product.updatedBy}</span></dd>
      </dl>
    </>
  );
}
