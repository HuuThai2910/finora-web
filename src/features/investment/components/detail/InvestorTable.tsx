import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Pager } from '@/components/Pager';
import { StatusPill } from '@/components/StatusPill';
import { FUNDING_PAGE_SIZE, MONEY_STATE } from '../../constants';
import type { FundingFacts } from '../../mappers/loanTimeline';
import { LENDER_SIGN_PILL, lenderSign } from '../../mappers/signing';
import type { ListingInvestor } from '../../types';
import { formatDateTime, formatMoney, formatPercent, parseDecimal } from '../../formatters';
import { InvestorLink } from '../InvestorLink';

interface Props {
  investors: ListingInvestor[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  nameOf: (investorId: string) => string;
  facts: FundingFacts | null;
  /** Khoản đã có hợp đồng (đủ vốn ít nhất một lần): mới có cột Ký hợp đồng. */
  hasContract: boolean;
}

const amountOf = (item: ListingInvestor) => parseDecimal(item.amount) ?? 0;

// Dưới 1380px (cột tiến trình 320px chiếm chỗ) bảng bỏ cột Phần vốn và đưa lúc đặt lệnh xuống dưới tên để không cuộn ngang.

/**
 * Ai đã góp vốn vào khoản vay: tên (không hiện mã), số tiền, phần vốn, tỷ lệ, ký hợp đồng, tiền góp đang ở đâu, lúc
 * đặt lệnh; dòng tổng chỉ cộng phần vốn còn hiệu lực. Backend trả trọn danh sách (kể cả phần đã hủy, để mờ ở cuối) nên
 * chia trang ở client, 10 dòng mỗi trang như các bảng khác.
 */
export function InvestorTable({ investors, isLoading, error, onRetry, nameOf, facts, hasContract }: Props) {
  const [page, setPage] = useState(0);

  if (error) return <ErrorNotice error={error} onRetry={onRetry} />;
  if (isLoading) return <div className="ui-card ui-empty" aria-busy="true">Đang tải danh sách nhà đầu tư...</div>;
  if (investors.length === 0) return <div className="ui-card ui-empty">Chưa có ai góp vốn vào khoản vay này.</div>;

  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const sorted = [...investors].sort(
    (a, b) => Number(a.status === 'CANCELLED') - Number(b.status === 'CANCELLED') || amountOf(b) - amountOf(a),
  );
  const count = Math.ceil(sorted.length / FUNDING_PAGE_SIZE);
  const current = Math.min(page, count - 1);
  const rows = sorted.slice(current * FUNDING_PAGE_SIZE, (current + 1) * FUNDING_PAGE_SIZE);
  // Cột ký chỉ có khi đã có hợp đồng và đọc được lịch sử ký từ Loan.
  const showSign = hasContract && facts != null;

  return (
    <article className="ui-card lr-card px-3.5 pt-3.5 pb-3 max-[760px]:px-2.5">
      <div className="ui-table-wrap">
        <table className="ui-table list [&_td]:px-2 [&_th]:px-2 [&_tfoot_td]:border-t [&_tfoot_td]:border-t-line [&_tfoot_td]:bg-[#f8faff] [&_tfoot_td]:py-2.5 [&_tfoot_td]:font-semibold">
          <thead>
            <tr>
              <th>Nhà đầu tư</th>
              <th className="num">Số tiền góp</th>
              <th className="num hide-sm max-[1380px]:hidden">Phần vốn</th>
              {showSign && <th>Ký hợp đồng</th>}
              <th>Tiền góp</th>
              <th className="hide-sm max-[1380px]:hidden">Đặt lệnh lúc</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const cancelled = item.status === 'CANCELLED';
              const sign = showSign ? lenderSign(item, facts, hasContract) : null;
              const money = MONEY_STATE[item.status] ?? MONEY_STATE.ACTIVE;
              return (
                <tr key={item.commitmentId} className={cancelled ? '[&_td]:text-muted' : undefined}>
                  <td>
                    <span className="ui-person">
                      <Avatar name={nameOf(item.investorId)} />
                      <span>
                        <InvestorLink userId={item.investorId} name={nameOf(item.investorId)} />
                        {sign === 'LEFT' ? <span className="ui-sub">Không ký, đã rút</span> : null}
                        <span className="ui-sub hidden max-[1380px]:block">đặt lệnh {formatDateTime(item.createdAt)}</span>
                      </span>
                    </span>
                  </td>
                  <td className="num">
                    <span className={cancelled ? undefined : 'strong'}>{formatMoney(item.amount)} đ</span>
                    {!cancelled && <span className="ui-sub">{formatPercent(item.sharePercent)} khoản vay</span>}
                  </td>
                  <td className="num hide-sm max-[1380px]:hidden">{item.noteCount}</td>
                  {showSign && (
                    <td>
                      {sign ? (
                        <StatusPill tone={LENDER_SIGN_PILL[sign].tone} small dot>{LENDER_SIGN_PILL[sign].label}</StatusPill>
                      ) : null}
                    </td>
                  )}
                  <td><StatusPill tone={money.tone} small>{money.label}</StatusPill></td>
                  <td className="hide-sm max-[1380px]:hidden">{formatDateTime(item.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>{new Set(live.map((item) => item.investorId)).size} nhà đầu tư</td>
              <td className="num">{formatMoney(live.reduce((sum, item) => sum + amountOf(item), 0))} đ</td>
              <td className="num hide-sm max-[1380px]:hidden">{live.reduce((sum, item) => sum + item.noteCount, 0)}</td>
              {showSign && <td />}
              <td />
              <td className="hide-sm max-[1380px]:hidden" />
            </tr>
          </tfoot>
        </table>
      </div>
      {count > 1 && <Pager page={current} size={FUNDING_PAGE_SIZE} total={sorted.length} unit="lần góp" onPage={setPage} />}
    </article>
  );
}
