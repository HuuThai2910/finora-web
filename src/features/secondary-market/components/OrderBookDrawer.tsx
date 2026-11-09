import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from '@/components/Drawer';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { fundingDetailPath } from '@/features/investment';
import { EMPTY, formatDateTime, formatNumber } from '@/utils';
import { useGetOrderBookQuery } from '../api/orderBookApi';
import { LADDER_DEPTH, SIDE_LABEL, SNAPSHOT_DEPTH } from '../constant';
import { formatAnnualRate, formatMoneyVnd, formatPrice } from '../formatters';
import { buildDepthOption } from '../mappers/depthChartOption';
import { SIDE_TEXT } from '../styles';
import type { OrderBookSnapshot, PriceLevel } from '../types';
import { PriceLadder } from './PriceLadder';

interface Props {
  listingId: number;
  onClose: () => void;
}

/** Đầu mỗi phần trong ngăn: tiêu đề bên trái, chú thích nhỏ bên phải. */
const SECTION_HEAD = 'sm-sec-head flex items-baseline justify-between gap-3';
const SECTION_NOTE = 'text-muted text-[12px]';

const sum = (levels: PriceLevel[], key: 'quantity' | 'orderCount') =>
  levels.reduce((total, level) => total + level[key], 0);

/** Câu dẫn của biểu đồ độ sâu, có số Note và số lệnh của từng phía. */
function depthLead(book: OrderBookSnapshot): string {
  const side = (who: string, verb: string, levels: PriceLevel[]) => {
    const notes = sum(levels, 'quantity');
    return notes ? `${who} chờ ${formatNumber(notes)} phần vốn trong ${formatNumber(sum(levels, 'orderCount'))} lệnh` : `${who} chưa ai đặt ${verb}`;
  };
  // Backend chỉ gửi tối đa SNAPSHOT_DEPTH mức mỗi phía; chạm trần thì nói rõ con số chỉ tính trên các mức đó.
  const capped = book.bids.length >= SNAPSHOT_DEPTH || book.asks.length >= SNAPSHOT_DEPTH;
  return `${side('Bên mua', 'mua', book.bids)}, ${side('bên bán', 'bán', book.asks)}${capped ? `, tính trên ${SNAPSHOT_DEPTH} mức giá tốt nhất mỗi bên` : ''}.`;
}

function BookBody({ book }: { book: OrderBookSnapshot }) {
  const hasDepth = book.bids.length > 0 || book.asks.length > 0;
  const depthOption = useMemo(() => buildDepthOption(book.bids, book.asks), [book.bids, book.asks]);
  const facts: Array<[string, string]> = [
    ['Dư nợ tham chiếu mỗi phần vốn', formatMoneyVnd(book.referenceOutstanding)],
    ['Mệnh giá mỗi phần vốn', formatMoneyVnd(book.noteDenomination)],
    ['Lãi suất', formatAnnualRate(book.annualInterestRate)],
    ['Kỳ hạn', `${book.termMonths} tháng`],
    ['Khớp gần nhất', book.lastTradePercent == null ? 'Chưa khớp' : formatPrice(book.lastTradePercent)],
    ['Khớp lúc', book.lastTradeAt ? formatDateTime(book.lastTradeAt) : EMPTY],
  ];

  return (
    <>
      <dl className="sm-facts grid grid-cols-3 gap-x-4 gap-y-3 max-[760px]:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted text-[12px]">{label}</dt>
            <dd className="mt-0.5 text-[14px] font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {book.defaulted && book.defaultWarning && (
        <div
          className="sm-warn flex gap-2 py-2.5 px-3 rounded-md bg-danger-bg text-danger text-[13px] [&_svg]:flex-none [&_svg]:size-4 [&_svg]:mt-0.5"
          role="note"
        >
          <Icon name="alert" />
          <span>{book.defaultWarning}</span>
        </div>
      )}

      <section aria-labelledby="sm-depth-title">
        <div className={SECTION_HEAD}><h3 id="sm-depth-title">Độ sâu sổ lệnh</h3><span className={SECTION_NOTE}>số phần vốn cộng dồn</span></div>
        <p className="sm-depth-lead mt-0.5 text-secondary text-[13px]">{depthLead(book)}</p>
        {hasDepth && (
          <EChart
            className="sm-depth h-50 mt-2"
            option={depthOption}
            notMerge
            ariaLabel="Biểu đồ độ sâu: số phần vốn cộng dồn bên mua và bên bán theo giá, số liệu chi tiết ở thang giá bên dưới"
          />
        )}
      </section>

      <section aria-labelledby="sm-ladder-title">
        <div className={SECTION_HEAD}>
          <h3 id="sm-ladder-title">Thang giá</h3>
          <span className={SECTION_NOTE}>tối đa {LADDER_DEPTH} mức mỗi bên</span>
        </div>
        <PriceLadder book={book} />
      </section>

      <section aria-labelledby="sm-ticks-title">
        <div className={SECTION_HEAD}><h3 id="sm-ticks-title">Khớp gần đây</h3><span className={SECTION_NOTE}>bên chủ động khớp</span></div>
        {book.recentTrades.length === 0 ? (
          <p className="sm-dr-empty mt-1.5 text-muted text-[13px]">Chưa có lần khớp nào.</p>
        ) : (
          <ol className="sm-ticks mt-1.5">
            {book.recentTrades.map((tick, index) => (
              <li
                key={`${tick.executedAt}-${index}`}
                className="grid grid-cols-[120px_44px_minmax(0,1fr)_72px] items-baseline gap-2 py-1.5 border-b border-b-divider text-[13px] tabular-nums last:[border-bottom:0]"
              >
                <span className="t text-muted text-[12px] whitespace-nowrap">{formatDateTime(tick.executedAt)}</span>
                <span
                  className={`text-[12px] font-medium ${tick.aggressorSide === 'BID' ? `s sm-bid ${SIDE_TEXT.bid}` : `s sm-ask ${SIDE_TEXT.ask}`}`}
                >
                  {SIDE_LABEL[tick.aggressorSide]}
                </span>
                <span className="p font-medium">{formatPrice(tick.pricePercent)}</span>
                <span className="q text-secondary text-right">{tick.quantity} phần</span>
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
  // Đợt của sổ lệnh chính là khoản gọi vốn đã phát hành Note: mở lại trang gọi vốn để xem nhà đầu tư, Note, tiến trình.
  const canViewFunding = usePermission().canView('funding');

  const title = (
    <>
      <h2>{data ? `Khoản vay #${data.loanId}` : `Sổ lệnh đợt #${listingId}`}</h2>
      {data?.creditGrade && <span className="ui-tag">Hạng {data.creditGrade}</span>}
      {data?.defaulted && <StatusPill tone="danger" small>Nợ xấu</StatusPill>}
    </>
  );

  return (
    <Drawer
      title={title}
      subtitle={(
        <span className="text-muted text-[12px]">
          <span className="ui-mono">Đợt #{listingId}</span>, sổ lệnh tự cập nhật khi có lệnh mới
          {canViewFunding && (
            <>
              {'. '}
              <Link className="ui-link sm-funding-link" to={fundingDetailPath(listingId)}>Xem khoản gọi vốn</Link>
            </>
          )}
        </span>
      )}
      onClose={onClose}
    >
      {/*
        Lớp `sd-body` giữ làm mốc cho kịch bản kiểm thử (chờ `.sd-body .sm-facts`); `contents` để các khối vẫn là con
        trực tiếp của thân ngăn chung và nhận khoảng cách của nó. Tiêu đề mục 14px như ngăn cũ.
      */}
      <div className="sd-body contents [&_h3]:mb-0 [&_h3]:text-[14px]">
        {error ? (
          <ErrorNotice error={error} onRetry={refetch} />
        ) : isLoading || !data ? (
          <div className="ui-empty" aria-busy="true">Đang tải sổ lệnh...</div>
        ) : (
          <BookBody book={data} />
        )}
      </div>
    </Drawer>
  );
}
