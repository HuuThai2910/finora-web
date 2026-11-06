import type { FundingProgress, ListingInvestor, MarketListing } from '../../types';
import { formatMoney, formatPercent, parseDecimal } from '../../formatters';
import { CARD, CARD_TITLE } from '../../styles';

/**
 * Một phần góp trên thanh: giữ chỗ xanh nhạt, đã khóa (`locked`) xanh đậm.
 * Rê chuột lên một phần góp thì các phần còn lại mờ đi.
 */
const SEGMENT =
  'fd-seg flex-none h-full rounded-[999px] bg-[#a3bde3] [&.locked]:bg-brand transition-opacity duration-150 ease-soft ' +
  'in-[.fd-meter:hover]:not-hover:opacity-35';
const LEGEND_MARK = 'inline-block size-2.5 mr-1.25 rounded-[3px] align-[-1px]';

interface Props {
  listing: MarketListing;
  investors: ListingInvestor[];
  investorsLoaded: boolean;
  progress: FundingProgress | undefined;
  nameOf: (investorId: string) => string;
}

/**
 * Thanh tiến độ ghép từ phần góp của từng nhà đầu tư: giữ chỗ nhạt, đã khóa đậm.
 *
 * Con số phần trăm lấy thẳng `fundedPercent` của backend. Bề rộng từng đoạn là tỷ lệ phần
 * góp trên mục tiêu, chỉ để vẽ; chưa tải xong phần vốn thì vẽ một đoạn theo phần trăm tổng.
 */
export function ProgressMeter({ listing, investors, investorsLoaded, progress, nameOf }: Props) {
  const target = parseDecimal(listing.targetAmount) ?? 0;
  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const hasHeld = live.some((item) => item.status === 'ACTIVE');
  const hasLocked = live.some((item) => item.status === 'FINALIZED');
  const investorCount = progress?.investorCount ?? new Set(live.map((item) => item.investorId)).size;
  const width = (amount: number) => `${target > 0 ? Math.min((amount / target) * 100, 100) : 0}%`;

  return (
    <section className={`ui-card fd-card ${CARD}`} aria-labelledby="fdMeterTitle">
      <h2 id="fdMeterTitle" className={`fd-card-title ${CARD_TITLE}`}>Tiến độ góp vốn</h2>
      <div className="fd-meter-top flex items-baseline justify-between gap-3 flex-wrap">
        <span className="fd-meter-pct text-[28px] font-semibold leading-[1.1] tabular-nums max-[760px]:text-[24px]">
          {formatPercent(listing.fundedPercent)}
        </span>
        <span className="fd-meter-amt text-secondary text-[13px] tabular-nums">
          {formatMoney(listing.committedAmount)} / {formatMoney(listing.targetAmount)} đ
        </span>
      </div>
      <div
        className="fd-meter flex gap-0.5 h-3.5 mt-2.5 mb-2 p-0.5 overflow-hidden rounded-[999px] bg-[#eef0f3]"
        role="img"
        aria-label={`Đã góp ${formatPercent(listing.fundedPercent)} mục tiêu, ${investorCount} nhà đầu tư`}
      >
        {investorsLoaded ? (
          live.map((item) => (
            <span
              key={item.commitmentId}
              className={`${SEGMENT}${item.status === 'FINALIZED' ? ' locked' : ''}`}
              style={{ width: width(parseDecimal(item.amount) ?? 0) }}
              title={`${nameOf(item.investorId)}: ${formatMoney(item.amount)} đ`}
            />
          ))
        ) : (
          <span className={SEGMENT} style={{ width: `${Math.min(Math.max(listing.fundedPercent, 0), 100)}%` }} />
        )}
      </div>
      <div className="fd-legend flex gap-3.5 flex-wrap text-muted text-[12px]">
        {hasHeld && <span><i className={`${LEGEND_MARK} bg-[#a3bde3]`} />Giữ chỗ</span>}
        {hasLocked && <span><i className={`locked ${LEGEND_MARK} bg-brand`} />Đã khóa</span>}
        <span className="fd-legend-n ml-auto tabular-nums">
          {investorCount} nhà đầu tư
          {/* Chỉ khoản còn nhận lệnh mới "còn thiếu"; khoản đã kết thúc (đủ vốn, đóng, hủy) thì con số đó vô nghĩa. */}
          {listing.status === 'OPEN' ? `, còn thiếu ${formatMoney(listing.remainingAmount)} đ` : ''}
        </span>
      </div>
    </section>
  );
}
