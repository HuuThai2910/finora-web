import { EMPTY } from '@/utils';
import type { MarketListing } from '../../types';
import { estimateNoteCount, formatMoney, formatMonths, formatRate, repaymentLabel } from '../../formatters';

/**
 * Điều khoản của khoản vay trên sàn. Khoản chờ duyệt chưa chốt mệnh giá nên chỉ hiện mục
 * tiêu tạm tính; khoản đã lên sàn hiện mệnh giá, mức góp tối thiểu và số Note tối đa.
 */
export function TermsCard({ listing }: { listing: MarketListing }) {
  const maxNotes = estimateNoteCount(listing.targetAmount, listing.noteDenomination);

  return (
    <section className="ui-card fd-card" aria-labelledby="fdTermsTitle">
      <h2 id="fdTermsTitle" className="fd-card-title">Điều khoản</h2>
      <dl className="ui-rows fd-rows">
        <div><dt>Lãi suất</dt><dd>{formatRate(listing.annualInterestRate)}</dd></div>
        <div><dt>Kỳ hạn</dt><dd>{formatMonths(listing.termMonths)}</dd></div>
        <div><dt>Cách trả nợ</dt><dd>{repaymentLabel(listing.repaymentMethod)}</dd></div>
        {listing.status === 'DRAFT' ? (
          <div><dt>Mục tiêu tạm tính</dt><dd>{formatMoney(listing.targetAmount)} đ</dd></div>
        ) : (
          <>
            <div><dt>Mệnh giá Note</dt><dd>{formatMoney(listing.noteDenomination)} đ</dd></div>
            <div><dt>Góp tối thiểu</dt><dd>{formatMoney(listing.minInvestmentAmount)} đ</dd></div>
            <div><dt>Số Note tối đa</dt><dd>{maxNotes ?? EMPTY}</dd></div>
          </>
        )}
        {listing.contractNumber && (
          <div><dt>Số hợp đồng</dt><dd><span className="ui-mono">{listing.contractNumber}</span></dd></div>
        )}
      </dl>
    </section>
  );
}
