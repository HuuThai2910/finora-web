import { ReviewCard } from '@/features/loan';
import type { FundingProgress, ListingInvestor, MarketListing } from '../../types';
import { formatMoney, formatPercent, parseDecimal } from '../../formatters';
import { MeterLegend, SegmentMeter } from './SegmentMeter';

interface Props {
  listing: MarketListing;
  investors: ListingInvestor[];
  investorsLoaded: boolean;
  progress: FundingProgress | undefined;
  nameOf: (investorId: string) => string;
}

/**
 * Tiến độ góp vốn: phần trăm lớn, số đã góp trên mục tiêu, thanh chia đoạn theo nhà đầu tư.
 *
 * Con số phần trăm lấy thẳng `fundedPercent` của backend. Bề rộng từng đoạn là tỷ lệ phần góp trên mục tiêu, chỉ để
 * vẽ; chưa tải xong phần vốn thì vẽ một đoạn theo phần trăm tổng.
 */
export function ProgressMeter({ listing, investors, investorsLoaded, progress, nameOf }: Props) {
  const target = parseDecimal(listing.targetAmount) ?? 0;
  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const investorCount = progress?.investorCount ?? new Set(live.map((item) => item.investorId)).size;
  // Đóng hoặc hủy: backend nhả mọi phần vốn và trừ khỏi số đã góp; `raisedAmount` giữ số đã gọi được trước khi hoàn
  // tiền nên tiến độ vẫn vẽ được. Backend cũ không có trường này thì chỉ còn nói tiền đã hoàn cho bao nhiêu người.
  const ended = listing.status === 'CLOSED' || listing.status === 'CANCELLED';
  const raised = ended ? parseDecimal(listing.raisedAmount) : null;
  const refunded = listing.investorCount ?? new Set(investors.map((item) => item.investorId)).size;
  const share = (amount: number) => (target > 0 ? (amount / target) * 100 : 0);
  const percent = raised != null ? Math.round(share(raised) * 100) / 100 : listing.fundedPercent;
  const amount = raised ?? listing.committedAmount;
  const segments = raised != null
    // Phần vốn đã hoàn không cho biết cái nào bị hủy lúc đóng, cái nào nhà đầu tư tự rút trước đó: vẽ một đoạn tổng.
    ? [{ key: 'raised', width: percent, tone: 'soft' as const, title: `Đã gọi ${formatMoney(raised)} đ trước khi hoàn tiền` }]
    : investorsLoaded
    ? live.map((item) => ({
        key: item.commitmentId,
        width: share(parseDecimal(item.amount) ?? 0),
        tone: 'soft' as const,
        title: `${nameOf(item.investorId)}: ${formatMoney(item.amount)} đ`,
      }))
    : [{ key: 'total', width: listing.fundedPercent, tone: 'soft' as const, title: formatPercent(listing.fundedPercent) }];
  // "Còn thiếu" chỉ có nghĩa khi khoản còn nhận lệnh; khoản đã đóng hay hủy thì con số đó vô nghĩa.
  const open = listing.status === 'OPEN' && (parseDecimal(listing.remainingAmount) ?? 0) > 0;

  return (
    <ReviewCard title="Tiến độ góp vốn">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-[26px] font-bold leading-[1.2] tabular-nums">{formatPercent(percent)}</span>
        <span className="text-muted text-[13px] tabular-nums">
          {formatMoney(amount)} đ / {formatMoney(listing.targetAmount)} đ
        </span>
      </div>
      {ended && raised == null ? <div className="h-2" /> : (
        <SegmentMeter
          segments={segments}
          label={ended
            ? `Đã gọi ${formatPercent(percent)} mục tiêu trước khi ${listing.status === 'CLOSED' ? 'đóng' : 'hủy'}`
            : `Đã góp ${formatPercent(listing.fundedPercent)} mục tiêu, ${investorCount} nhà đầu tư`}
        />
      )}
      <MeterLegend
        note={ended ? undefined : 'Mỗi đoạn là một nhà đầu tư'}
        aside={ended
          ? `đã hoàn tiền về ví ${refunded} nhà đầu tư`
          : `${investorCount} nhà đầu tư${open ? `, còn thiếu ${formatMoney(listing.remainingAmount)} đ` : ''}`}
      />
    </ReviewCard>
  );
}
