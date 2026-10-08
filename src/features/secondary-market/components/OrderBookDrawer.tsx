import { useMemo } from 'react';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { EMPTY, formatDateTime, formatNumber } from '@/utils';
import { useGetOrderBookQuery } from '../api/orderBookApi';
import { LADDER_DEPTH, SIDE_LABEL, SNAPSHOT_DEPTH } from '../constant';
import { formatAnnualRate, formatMoneyVnd, formatPrice } from '../formatters';
import { buildDepthOption } from '../mappers/depthChartOption';
import type { OrderBookSnapshot, PriceLevel } from '../types';
import { PriceLadder } from './PriceLadder';
import { SideDrawer } from './SideDrawer';

interface Props {
  listingId: number;
  onClose: () => void;
}

const sum = (levels: PriceLevel[], key: 'quantity' | 'orderCount') =>
  levels.reduce((total, level) => total + level[key], 0);

/** Câu dẫn của biểu đồ độ sâu, có số Note và số lệnh của từng phía. */
function depthLead(book: OrderBookSnapshot): string {
  const side = (who: string, verb: string, levels: PriceLevel[]) => {
    const notes = sum(levels, 'quantity');
    return notes ? `${who} chờ ${formatNumber(notes)} Note trong ${formatNumber(sum(levels, 'orderCount'))} lệnh` : `${who} chưa ai đặt ${verb}`;
  };
  // Backend chỉ gửi tối đa SNAPSHOT_DEPTH mức mỗi phía; chạm trần thì nói rõ con số chỉ tính trên các mức đó.
  const capped = book.bids.length >= SNAPSHOT_DEPTH || book.asks.length >= SNAPSHOT_DEPTH;
  return `${side('Bên mua', 'mua', book.bids)}, ${side('bên bán', 'bán', book.asks)}${capped ? `, tính trên ${SNAPSHOT_DEPTH} mức giá tốt nhất mỗi bên` : ''}.`;
}

function BookBody({ book }: { book: OrderBookSnapshot }) {
  const hasDepth = book.bids.length > 0 || book.asks.length > 0;
  const depthOption = useMemo(() => buildDepthOption(book.bids, book.asks), [book.bids, book.asks]);
  const facts: Array<[string, string]> = [
    ['Dư nợ tham chiếu mỗi Note', formatMoneyVnd(book.referenceOutstanding)],
    ['Mệnh giá Note', formatMoneyVnd(book.noteDenomination)],
    ['Lãi suất', formatAnnualRate(book.annualInterestRate)],
    ['Kỳ hạn', `${book.termMonths} tháng`],
    ['Khớp gần nhất', book.lastTradePercent == null ? 'Chưa khớp' : formatPrice(book.lastTradePercent)],
    ['Khớp lúc', book.lastTradeAt ? formatDateTime(book.lastTradeAt) : EMPTY],
  ];

  return (
    <>
      <dl className="sm-facts">
        {facts.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>

      {book.defaulted && book.defaultWarning && (
        <div className="sm-warn" role="note"><Icon name="alert" /><span>{book.defaultWarning}</span></div>
      )}

      <section aria-labelledby="sm-depth-title">
        <div className="sm-sec-head"><h3 id="sm-depth-title">Độ sâu sổ lệnh</h3><span>số Note cộng dồn</span></div>
        <p className="sm-depth-lead">{depthLead(book)}</p>
        {hasDepth && (
          <EChart
            className="sm-depth"
            option={depthOption}
            notMerge
            ariaLabel="Biểu đồ độ sâu: số Note cộng dồn bên mua và bên bán theo giá, số liệu chi tiết ở thang giá bên dưới"
          />
        )}
      </section>

      <section aria-labelledby="sm-ladder-title">
        <div className="sm-sec-head"><h3 id="sm-ladder-title">Thang giá</h3><span>tối đa {LADDER_DEPTH} mức mỗi bên</span></div>
        <PriceLadder book={book} />
      </section>

      <section aria-labelledby="sm-ticks-title">
        <div className="sm-sec-head"><h3 id="sm-ticks-title">Khớp gần đây</h3><span>bên chủ động khớp</span></div>
        {book.recentTrades.length === 0 ? (
          <p className="sm-dr-empty">Chưa có lần khớp nào.</p>
        ) : (
          <ol className="sm-ticks">
            {book.recentTrades.map((tick, index) => (
              <li key={`${tick.executedAt}-${index}`}>
                <span className="t">{formatDateTime(tick.executedAt)}</span>
                <span className={tick.aggressorSide === 'BID' ? 's sm-bid' : 's sm-ask'}>{SIDE_LABEL[tick.aggressorSide]}</span>
                <span className="p">{formatPrice(tick.pricePercent)}</span>
                <span className="q">{tick.quantity} Note</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

/**
 * Ngăn sổ lệnh của một đợt. Ảnh chụp tự thay khi có lệnh đặt, khớp hoặc hủy (luồng SSE trong
 * `useGetOrderBookQuery`); sổ công khai chỉ có độ sâu gộp theo mức giá, không cho biết ai đặt lệnh.
 */
export function OrderBookDrawer({ listingId, onClose }: Props) {
  const { data, isLoading, error, refetch } = useGetOrderBookQuery(listingId);

  const title = (
    <>
      <h2>{data ? `Khoản vay #${data.loanId}` : `Sổ lệnh đợt #${listingId}`}</h2>
      {data?.creditGrade && <span className="ui-tag">Hạng {data.creditGrade}</span>}
      {data?.defaulted && <StatusPill tone="danger" small>Nợ xấu</StatusPill>}
    </>
  );

  return (
    <SideDrawer
      title={title}
      subtitle={<><span className="ui-mono">Đợt #{listingId}</span>, sổ lệnh tự cập nhật khi có lệnh mới</>}
      onClose={onClose}
    >
      {error ? (
        <ErrorNotice error={error} onRetry={refetch} />
      ) : isLoading || !data ? (
        <div className="ui-empty" aria-busy="true">Đang tải sổ lệnh...</div>
      ) : (
        <BookBody book={data} />
      )}
    </SideDrawer>
  );
}
