import { ErrorNotice } from '@/components/ErrorNotice';
import { ReviewCard } from '@/features/loan';
import { useGetOrderBookQuery } from '../../api/orderBookApi';
import { LADDER_DEPTH } from '../../constant';
import { formatPrice } from '../../formatters';
import type { PriceLevel } from '../../types';

type Side = 'bid' | 'ask';

/*
 * Bên mua: Giá | Phần vốn | Lệnh. Bên bán đảo cột (Lệnh | Phần vốn | Giá) cho đối xứng qua giữa thẻ; thanh nền theo số
 * phần vốn mọc từ mép trong (phải của bên mua, trái của bên bán). Giá mua xanh, giá bán đỏ, luôn kèm tiêu đề bằng chữ.
 */
const COLUMNS: Record<Side, string> = {
  bid: 'grid-cols-[minmax(0,1fr)_80px_56px]',
  ask: 'grid-cols-[56px_80px_minmax(0,1fr)]',
};
const BAR: Record<Side, string> = {
  bid: 'right-0 bg-[rgba(10,125,79,0.09)]',
  ask: 'left-0 bg-[rgba(194,38,58,0.08)]',
};
const PRICE_TEXT: Record<Side, string> = { bid: 'text-success', ask: 'text-danger text-right' };

const sum = (levels: PriceLevel[], key: 'quantity' | 'orderCount') =>
  levels.reduce((total, level) => total + level[key], 0);

function LadderSide({ side, title, levels, max }: { side: Side; title: string; levels: PriceLevel[]; max: number }) {
  const shown = levels.slice(0, LADDER_DEPTH);
  const notes = sum(levels, 'quantity');
  const orders = sum(levels, 'orderCount');
  const totals = levels.length === 0 ? null : side === 'bid'
    ? `${notes} phần vốn, ${orders} lệnh`
    : `${orders} lệnh, ${notes} phần vốn`;
  const row = `relative grid gap-2 px-2 py-1.5 ${COLUMNS[side]}`;

  return (
    <section aria-label={title}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 px-2 text-[13px] font-semibold">
        {side === 'bid' ? <span>{title}</span> : <b className="text-muted text-[12px] font-medium">{totals}</b>}
        {side === 'bid' ? <b className="text-muted text-[12px] font-medium">{totals}</b> : <span>{title}</span>}
      </div>
      <div className="grid gap-0.5 text-[13px] tabular-nums">
        <div className={`${row} rounded-md bg-[#f6f8fd] text-secondary text-[12px] font-medium`}>
          {side === 'bid'
            ? <><span>Giá</span><span className="text-right">Phần vốn</span><span className="text-right">Lệnh</span></>
            : <><span>Lệnh</span><span>Phần vốn</span><span className="text-right">Giá</span></>}
        </div>
        {shown.length === 0 ? (
          <div className="px-2 py-2.5 text-muted text-[13px]">{side === 'bid' ? 'Chưa có lệnh mua' : 'Chưa có lệnh bán'}</div>
        ) : shown.map((level) => {
          const price = <span className={`relative font-semibold ${PRICE_TEXT[side]}`}>{formatPrice(level.pricePercent)}</span>;
          return (
            <div key={level.pricePercent} className={row}>
              {/* Độ rộng thanh là giá trị động theo số phần vốn, nên phải đặt inline. */}
              <span
                className={`absolute top-0.5 bottom-0.5 rounded-[4px] ${BAR[side]}`}
                style={{ width: `${(level.quantity / max) * 100}%` }}
                aria-hidden="true"
              />
              {side === 'bid' ? (
                <>
                  {price}
                  <span className="relative text-right">{level.quantity}</span>
                  <span className="relative text-right text-muted">{level.orderCount}</span>
                </>
              ) : (
                <>
                  <span className="relative text-muted">{level.orderCount}</span>
                  <span className="relative">{level.quantity}</span>
                  {price}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Thẻ "Sổ lệnh": lệnh đang chờ hai phía gộp theo mức giá, giá tốt nhất ở dòng đầu. Ảnh chụp công khai của sổ tự cập
 * nhật qua WebSocket khi có lệnh đặt, khớp hoặc hủy (không hiện chữ báo); sổ không cho biết ai đặt lệnh nào.
 */
export function OrderBookCard({ listingId }: { listingId: number }) {
  const { data, error, isLoading, refetch } = useGetOrderBookQuery(listingId);
  const bids = data?.bids ?? [];
  const asks = data?.asks ?? [];
  const max = Math.max(1, ...bids.slice(0, LADDER_DEPTH).map((level) => level.quantity),
    ...asks.slice(0, LADDER_DEPTH).map((level) => level.quantity));

  return (
    <ReviewCard title="Sổ lệnh">
      {error ? (
        <ErrorNotice error={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <div className="ui-empty" aria-busy="true">Đang tải sổ lệnh...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 max-[760px]:grid-cols-1">
            <LadderSide side="bid" title="Đang chờ mua" levels={bids} max={max} />
            <LadderSide side="ask" title="Đang chờ bán" levels={asks} max={max} />
          </div>
          <p className="mt-3 text-muted text-[12px]">
            Giá tính theo % dư nợ gốc còn lại của phần vốn; mỗi bên hiện tối đa {LADDER_DEPTH} mức giá tốt nhất.
          </p>
        </>
      )}
    </ReviewCard>
  );
}
