import { StatusPill } from '@/components/StatusPill';
import { ReviewCard, ReviewRows, type ReviewRow } from '@/features/loan';
import type { FundingFacts } from '../../mappers/loanTimeline';
import { daysBetween } from '../../stage';
import type { FundingProgress, ListingInvestor, MarketListing } from '../../types';
import { formatDate, formatDateTime, formatMoney, formatPercent, parseDecimal } from '../../formatters';
import { MeterLegend, SegmentMeter } from './SegmentMeter';
import { StatStrip, type Stat } from './StatStrip';

/**
 * Tổng quan khi chờ giải ngân: hợp đồng đã có hiệu lực, Loan chuyển tiền cho người vay; khóa vốn và phát hành phần vốn
 * tự chạy ngay khi giải ngân xong. Mốc hiệu lực và yêu cầu giải ngân đọc từ lịch sử hồ sơ vay (có quyền mới có).
 */
export function DisbursementCard({ listing, progress, facts }: {
  listing: MarketListing;
  progress: FundingProgress | undefined;
  facts: FundingFacts | null;
}) {
  const rows: ReviewRow[] = [
    ...(facts?.effectiveAt ? [{ key: 'effective', label: 'Hợp đồng hiệu lực', value: formatDateTime(facts.effectiveAt) }] : []),
    { key: 'amount', label: 'Số tiền giải ngân', value: `${formatMoney(listing.committedAmount)} đ` },
    ...(facts?.disbursementRequestedAt
      ? [{ key: 'requested', label: 'Yêu cầu giải ngân', value: formatDateTime(facts.disbursementRequestedAt) }]
      : []),
    { key: 'disbursed', label: 'Giải ngân lúc', value: <span className="text-muted font-normal">Chưa giải ngân</span> },
    ...(progress
      ? [{
          key: 'notes',
          label: 'Phần vốn sẽ phát hành',
          value: progress.committedNoteCount,
          hint: 'khóa vốn và phát hành ngay khi giải ngân xong',
        }]
      : []),
  ];
  return (
    <ReviewCard title="Giải ngân">
      <ReviewRows rows={rows} />
    </ReviewCard>
  );
}

/**
 * Kết quả đợt gọi vốn sau khi phát hành: dải số liệu (đã gọi, nhà đầu tư, thời gian gọi vốn, giải ngân) và thanh vốn
 * góp chia theo nhà đầu tư. Chi tiết từng phần vốn ở tab Phần vốn nên không lặp lại.
 */
export function FundingResultCard({ listing, investors, progress, facts, noteCount, nameOf }: {
  listing: MarketListing;
  investors: ListingInvestor[];
  progress: FundingProgress | undefined;
  facts: FundingFacts | null;
  noteCount: number;
  nameOf: (investorId: string) => string;
}) {
  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const target = parseDecimal(listing.targetAmount) ?? 0;
  const lenders = progress?.investorCount ?? new Set(live.map((item) => item.investorId)).size;
  const fundedAt = progress?.fullyFundedAt ?? null;
  const days = facts?.openedAt && fundedAt ? daysBetween(facts.openedAt, fundedAt) : null;
  const early = fundedAt ? daysBetween(fundedAt, listing.fundingClosesAt) : null;
  const stats: Stat[] = [
    { key: 'raised', label: 'Đã gọi', value: `${formatMoney(listing.committedAmount)} đ`, hint: `${formatPercent(listing.fundedPercent)} mục tiêu` },
    { key: 'lenders', label: 'Nhà đầu tư', value: lenders, hint: noteCount > 0 ? `${noteCount} phần vốn` : null },
    ...(days != null
      ? [{
          key: 'days',
          label: 'Thời gian gọi vốn',
          value: `${days} ngày`,
          hint: early ? `sớm ${early} ngày so với hạn` : null,
        }]
      : []),
    ...(listing.disbursedAt
      ? [{ key: 'disbursed', label: 'Giải ngân', value: formatDate(listing.disbursedAt), hint: formatDateTime(listing.disbursedAt).slice(0, 5) }]
      : []),
  ];

  return (
    <ReviewCard title="Kết quả gọi vốn">
      <StatStrip stats={stats} />
      <div className="mt-3.5">
        <SegmentMeter
          label={`Vốn góp của ${lenders} nhà đầu tư`}
          segments={live.map((item) => ({
            key: item.commitmentId,
            width: target > 0 ? ((parseDecimal(item.amount) ?? 0) / target) * 100 : 0,
            tone: 'solid',
            title: `${nameOf(item.investorId)}: ${formatMoney(item.amount)} đ`,
          }))}
        />
        <MeterLegend note="Mỗi đoạn là một nhà đầu tư, rê chuột để xem" />
      </div>
    </ReviewCard>
  );
}

/** Nhãn trạng thái trả nợ của khoản vay theo số liệu Loan (đối soát): quá hạn hay đúng hạn. */
export function RepaymentPill({ overdueAmount, daysPastDue }: { overdueAmount: number; daysPastDue: number }) {
  return overdueAmount > 0
    ? <StatusPill tone="warning" small>Quá hạn {daysPastDue} ngày</StatusPill>
    : <StatusPill tone="success" small>Đúng hạn</StatusPill>;
}
