import type { FundingProgress, ListingInvestor, MarketListing } from '../../types';
import { formatMoney, formatPercent, parseDecimal } from '../../formatters';

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
    <section className="ui-card fd-card" aria-labelledby="fdMeterTitle">
      <h2 id="fdMeterTitle" className="fd-card-title">Tiến độ góp vốn</h2>
      <div className="fd-meter-top">
        <span className="fd-meter-pct">{formatPercent(listing.fundedPercent)}</span>
        <span className="fd-meter-amt">
          {formatMoney(listing.committedAmount)} / {formatMoney(listing.targetAmount)} đ
        </span>
      </div>
      <div
        className="fd-meter"
        role="img"
        aria-label={`Đã góp ${formatPercent(listing.fundedPercent)} mục tiêu, ${investorCount} nhà đầu tư`}
      >
        {investorsLoaded ? (
          live.map((item) => (
            <span
              key={item.commitmentId}
              className={`fd-seg${item.status === 'FINALIZED' ? ' locked' : ''}`}
              style={{ width: width(parseDecimal(item.amount) ?? 0) }}
              title={`${nameOf(item.investorId)}: ${formatMoney(item.amount)} đ`}
            />
          ))
        ) : (
          <span className="fd-seg" style={{ width: `${Math.min(Math.max(listing.fundedPercent, 0), 100)}%` }} />
        )}
      </div>
      <div className="fd-legend">
        {hasHeld && <span><i />Giữ chỗ</span>}
        {hasLocked && <span><i className="locked" />Đã khóa</span>}
        <span className="fd-legend-n">
          {investorCount} nhà đầu tư, còn thiếu {formatMoney(listing.remainingAmount)} đ
        </span>
      </div>
    </section>
  );
}
