import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Pager } from '@/components/Pager';
import { StatusPill } from '@/components/StatusPill';
import { COMMITMENT_LABEL, COMMITMENT_TONE, FUNDING_PAGE_SIZE } from '../../constants';
import type { ListingInvestor } from '../../types';
import { formatDateTime, formatMoney, formatPercent, parseDecimal } from '../../formatters';

interface Props {
  investors: ListingInvestor[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  names: Record<string, string>;
  namesLoading: boolean;
}

/** Phần vốn còn hiệu lực lên trước, trong mỗi nhóm thì phần góp lớn hơn lên trước. */
const ORDER: Record<ListingInvestor['status'], number> = { ACTIVE: 0, FINALIZED: 0, CANCELLED: 1 };

/**
 * Ai đã góp vốn vào khoản vay. Backend trả trọn danh sách (kể cả phần đã hủy) nên chia
 * trang ở client, 10 dòng mỗi trang như các bảng khác.
 */
export function InvestorTable({ investors, isLoading, error, onRetry, names, namesLoading }: Props) {
  const [page, setPage] = useState(0);

  if (error) return <ErrorNotice error={error} onRetry={onRetry} />;
  if (isLoading) return <div className="ui-card ui-empty" aria-busy="true">Đang tải danh sách nhà đầu tư...</div>;
  if (investors.length === 0) return <div className="ui-card ui-empty">Chưa có ai góp vốn vào khoản vay này.</div>;

  const sorted = [...investors].sort(
    (a, b) => ORDER[a.status] - ORDER[b.status] || (parseDecimal(b.amount) ?? 0) - (parseDecimal(a.amount) ?? 0),
  );
  const current = Math.min(page, Math.ceil(sorted.length / FUNDING_PAGE_SIZE) - 1);
  const rows = sorted.slice(current * FUNDING_PAGE_SIZE, (current + 1) * FUNDING_PAGE_SIZE);

  return (
    <div className="ui-card fd-table-card">
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Nhà đầu tư</th>
              <th className="num">Số tiền</th>
              <th className="num">Số Note</th>
              <th className="num">Tỷ lệ</th>
              <th>Trạng thái</th>
              <th>Đặt lệnh lúc</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.commitmentId} className={item.status === 'CANCELLED' ? 'fd-muted-row' : undefined}>
                <td>
                  {names[item.investorId] ?? (
                    <span className="fd-muted">{namesLoading ? 'Đang tra tên...' : 'Không tra được tên'}</span>
                  )}
                  <span className="ui-sub">Mã {item.investorId}</span>
                </td>
                <td className="num">{formatMoney(item.amount)} đ</td>
                <td className="num">{item.noteCount}</td>
                <td className="num">{formatPercent(item.sharePercent)}</td>
                <td>
                  <StatusPill tone={COMMITMENT_TONE[item.status] ?? 'neutral'} small>
                    {COMMITMENT_LABEL[item.status] ?? item.status}
                  </StatusPill>
                </td>
                <td>{formatDateTime(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={current} size={FUNDING_PAGE_SIZE} total={sorted.length} unit="phần vốn" onPage={setPage} />
    </div>
  );
}
