import type { ReactNode } from 'react';
import { useActorNames } from '@/features/loan';
import { formatDateTime } from '@/utils';
import { RATE_CAP_PERCENT } from '../constants';
import { formatMoney, formatTermRange, repaymentLabel } from '../mappers/productDisplay';
import type { LoanProduct } from '../types';
import { CAPTION, DETAIL_LIST } from './drawerStyles';
import { RateScale } from './RateScale';
import { SyncState } from './SyncState';

/** Bản ghi do hệ thống khởi tạo ghi người thao tác là `SYSTEM`, không phải mã người dùng nên không tra tên. */
const SYSTEM_ACTOR = 'SYSTEM';

/**
 * Nội dung ngăn chi tiết: dữ liệu cấu hình của sản phẩm do finora-loan trả về.
 * `performance`: mục số liệu khoản vay và giải ngân (API thống kê), đặt sau điều khoản vay như mockup.
 * Người tạo, người cập nhật là mã người dùng: tra họ tên (không có thì email) từ finora-user như các màn khác.
 */
export function ProductDetailBody({ product, performance }: { product: LoanProduct; performance?: ReactNode }) {
  const { displayName } = useActorNames([product.createdBy, product.updatedBy].filter((id) => id !== SYSTEM_ACTOR));
  const actor = (id: string) => (id === SYSTEM_ACTOR ? 'Hệ thống' : displayName(id));
  // Hạn mức cố định (tối thiểu bằng tối đa) ghi một số thay cho "X đến X".
  const amount = product.minAmount === product.maxAmount
    ? formatMoney(product.maxAmount)
    : `${formatMoney(product.minAmount)} đến ${formatMoney(product.maxAmount)}`;

  return (
    <>
      {product.description && <p className="prod-desc mt-3.5 text-secondary text-[13px] leading-5">{product.description}</p>}

      <h3>Điều khoản vay</h3>
      <dl className={DETAIL_LIST}>
        <dt>Hạn mức</dt>
        <dd>{amount}</dd>
        <dt>Kỳ hạn</dt>
        <dd>{formatTermRange(product.minTermMonths, product.maxTermMonths, ' đến ')}</dd>
        <dt>Cách trả nợ</dt>
        <dd>{repaymentLabel(product.repaymentMethod)}</dd>
      </dl>

      {performance}

      <h3>Lãi suất năm</h3>
      <RateScale product={product} />
      <p className={CAPTION}>
        Dải xanh là khung lãi suất, vạch đậm là lãi cơ sở dùng tính lịch trả trước thẩm định. Trần {RATE_CAP_PERCENT}%/năm.
      </p>

      <h3>Đồng bộ hệ thống lõi</h3>
      <dl className={DETAIL_LIST}>
        <dt>Trạng thái</dt>
        <dd><SyncState status={product.coreSyncStatus} /></dd>
        <dt>Mã liên kết</dt>
        <dd>{product.currentCoreMappingId != null ? <span className="ui-mono">#{product.currentCoreMappingId}</span> : '-'}</dd>
        <dt>Bản cấu hình</dt>
        <dd>{product.configurationVersion}</dd>
      </dl>
      {product.coreSyncStatus === 'FAILED' && (
        <p className="prod-note mt-2 py-2 px-2.5 rounded-md bg-danger-bg text-danger text-[13px]">
          Lần đồng bộ gần nhất không thành công, hệ thống lõi chưa có sản phẩm này.
        </p>
      )}

      <h3>Lịch sử</h3>
      <dl className={DETAIL_LIST}>
        <dt>Tạo</dt>
        <dd>{formatDateTime(product.createdAt)}<span className="ui-sub">{actor(product.createdBy)}</span></dd>
        <dt>Cập nhật</dt>
        <dd>{formatDateTime(product.updatedAt)}<span className="ui-sub">{actor(product.updatedBy)}</span></dd>
      </dl>
    </>
  );
}
