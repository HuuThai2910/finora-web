import { useMemo } from 'react';
import { ChartCard, ChartDataTable } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import {
  StaleProjectionNote,
  buildDebtGroupOption,
  debtGroupName,
  overdueGroups,
  sumOf,
  type LoanStatisticsSummary,
} from '@/features/statistics';
import { moneyShort } from '@/lib/charts/theme';
import { formatNumber, formatPercent } from '@/utils';

interface Props {
  summary: LoanStatisticsSummary | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

const money = (value: number) => `${moneyShort(value)} đ`;

/**
 * "Dư nợ quá hạn theo nhóm nợ" (mockup operations.html). Backend chỉ có ảnh chụp hiện tại (`portfolio.byDebtGroup`),
 * không lưu lịch sử projection, nên thay trục 6 tháng của mockup bằng một cột mỗi nhóm và ghi rõ là số hiện tại.
 */
export function OverdueByGroupCard({ summary, isLoading, error, onRetry }: Props) {
  const portfolio = summary?.portfolio;
  const groups = portfolio?.byDebtGroup;
  const option = useMemo(() => (groups ? buildDebtGroupOption(groups) : null), [groups]);
  const overdue = groups ? overdueGroups(groups) : [];
  const overduePrincipal = sumOf(overdue, (group) => group.principalOutstanding);

  return (
    <ChartCard
      id="svc-overdue-title"
      title="Dư nợ quá hạn theo nhóm nợ"
      aside="Hiện tại"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={overdue.every((group) => group.loans === 0)}
      emptyText="Hiện không có khoản vay nào quá hạn."
    >
      {portfolio && groups && option && (
        <>
          <p className="ui-chart-lead">
            Dư nợ gốc quá hạn (nhóm 2 đến 5) <b>{money(overduePrincipal)}</b>; nợ xấu (nhóm 3 đến 5)
            {' '}<b>{money(portfolio.nplPrincipalOutstanding)}</b>, bằng <b>{formatPercent(portfolio.nplRatioPercent)}</b> dư nợ gốc.
          </p>
          <EChart className="ui-chart-plot svc-overdue-plot" option={option} ariaLabel="Biểu đồ cột dư nợ gốc của khoản quá hạn theo nhóm nợ 2 đến 5, số hiện tại" />
          <p className="ui-chart-note">Số hiện tại; hệ thống chưa lưu lịch sử nên chưa có diễn biến 6 tháng.</p>
          <StaleProjectionNote count={portfolio.staleProjections} />
          <ChartDataTable
            headers={['Nhóm nợ', 'Khoản vay', 'Dư nợ gốc', 'Tiền quá hạn']}
            rows={[...groups].sort((a, b) => a.debtGroup - b.debtGroup).map((group) => [
              `${group.debtGroup}. ${debtGroupName(group.debtGroup)}`,
              formatNumber(group.loans),
              money(group.principalOutstanding),
              money(group.overdueAmount),
            ])}
          />
        </>
      )}
    </ChartCard>
  );
}
