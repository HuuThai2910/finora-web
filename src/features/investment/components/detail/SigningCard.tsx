import { Avatar } from '@/components/Avatar';
import { StatusPill } from '@/components/StatusPill';
import { ReviewCard, ReviewRows } from '@/features/loan';
import type { FundingFacts } from '../../mappers/loanTimeline';
import type { SigningSummary } from '../../mappers/signing';
import type { ListingInvestor, MarketListing } from '../../types';
import { describeTimeLeft } from '../../stage';
import { formatDateTime, formatMoney, parseDecimal } from '../../formatters';
import { MeterLegend, SegmentMeter } from './SegmentMeter';
import { StatStrip } from './StatStrip';

interface Props {
  listing: MarketListing;
  investors: ListingInvestor[];
  facts: FundingFacts | null;
  signing: SigningSummary | null;
  nameOf: (investorId: string) => string;
  /** Hạn ký của văn bản hiện hành (API hợp đồng quản trị); null khi thiếu quyền hoặc chưa tải. */
  expiresAt: string | null;
}

/**
 * Tổng quan khi chờ ký: dải số liệu (nhà đầu tư đã ký, số tiền đã ký, người vay), thanh chia đoạn theo nhà đầu tư (đậm
 * là đã ký) và bảng người chưa ký. Thứ tự ký theo backend: các nhà đầu tư ký trước, người vay ký cuối.
 *
 * Ai đã ký và hạn ký đọc từ API hợp đồng quản trị của Loan (ghép vào `facts`); chưa tải được thì chỉ còn số hợp đồng.
 */
export function SigningCard({ listing, investors, facts, signing, nameOf, expiresAt }: Props) {
  if (!signing || !facts) {
    return (
      <ReviewCard title="Ký hợp đồng">
        <ReviewRows rows={[
          ...(listing.contractCode ? [{ key: 'code', label: 'Số hợp đồng', value: <span className="ui-mono">{listing.contractCode}</span> }] : []),
          { key: 'state', label: 'Trạng thái', value: <StatusPill tone="warning" small>Đang chờ các bên ký</StatusPill> },
          ...(expiresAt ? [{ key: 'deadline', label: 'Hạn ký', value: formatDateTime(expiresAt), hint: describeTimeLeft(expiresAt).label }] : []),
        ]} />
      </ReviewCard>
    );
  }
  const left = expiresAt ? describeTimeLeft(expiresAt) : null;

  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const total = signing.totalAmount;
  const waitingBorrower = facts.contractStatus === 'PENDING_BORROWER_SIGNATURE' || facts.contractStatus === 'SIGNING'
    || (signing.signedCount >= signing.lenderCount && signing.lenderCount > 0);
  // Đã ký lên trước để phần đậm của thanh liền một khối.
  const segments = [...live]
    .sort((a, b) => Number(facts.signedLenders.has(b.investorId)) - Number(facts.signedLenders.has(a.investorId)))
    .map((item) => {
      const signed = facts.signedLenders.has(item.investorId);
      return {
        key: item.commitmentId,
        width: total > 0 ? ((parseDecimal(item.amount) ?? 0) / total) * 100 : 0,
        tone: signed ? 'solid' as const : 'outline' as const,
        title: `${nameOf(item.investorId)}: ${formatMoney(item.amount)} đ, ${signed ? 'đã ký' : 'chưa ký'}`,
      };
    });
  const remaining = signing.lenderCount - signing.signedCount;

  return (
    <ReviewCard title="Ký hợp đồng">
      <StatStrip stats={[
        {
          key: 'lenders',
          label: 'Nhà đầu tư đã ký',
          value: `${signing.signedCount}/${signing.lenderCount}`,
          hint: remaining > 0 ? `còn ${remaining} người chưa ký` : 'đã ký đủ',
        },
        {
          key: 'amount',
          label: 'Số tiền đã ký',
          value: `${formatMoney(signing.signedAmount)} đ`,
          hint: `trên ${formatMoney(total)} đ`,
        },
        {
          key: 'borrower',
          label: 'Người vay',
          value: waitingBorrower ? 'Đang chờ ký' : 'Chưa ký',
          hint: waitingBorrower ? 'nhà đầu tư đã ký đủ' : 'ký sau khi nhà đầu tư ký đủ',
        },
        ...(expiresAt && left
          ? [{
              key: 'deadline',
              label: 'Hạn ký',
              value: formatDateTime(expiresAt),
              hint: left.label ? <span className={left.warn ? 'text-warning' : undefined}>{left.label}</span> : null,
            }]
          : []),
      ]} />
      <div className="mt-3.5">
        <SegmentMeter segments={segments} label={`${signing.signedCount} trên ${signing.lenderCount} nhà đầu tư đã ký`} />
        <MeterLegend
          items={[{ tone: 'solid', label: 'Đã ký' }, { tone: 'outline', label: 'Chưa ký' }]}
          aside="Mỗi đoạn là một nhà đầu tư"
        />
      </div>
      {signing.unsigned.length > 0 && (
        <>
          <h3 className="mt-4 mb-1 text-secondary text-[13px] font-semibold">Chưa ký ({signing.unsigned.length})</h3>
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Nhà đầu tư</th>
                  <th className="num">Số tiền góp</th>
                  <th className="num">Phần vốn</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {signing.unsigned.map((item) => (
                  <tr key={item.commitmentId}>
                    <td>
                      <span className="ui-person"><Avatar name={nameOf(item.investorId)} />{nameOf(item.investorId)}</span>
                    </td>
                    <td className="num">{formatMoney(item.amount)} đ</td>
                    <td className="num">{item.noteCount}</td>
                    <td><StatusPill tone="warning" small dot>Chưa ký</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ReviewCard>
  );
}
