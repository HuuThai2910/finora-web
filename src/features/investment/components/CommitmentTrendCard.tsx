import { useMemo } from 'react';
import { ChartCard, ChartDataTable } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import { bucketTitle, lastDaysRange, sumOf, useGetInvestmentStatisticsSeriesQuery } from '@/features/statistics';
import { formatCurrency, formatNumber } from '@/utils';
import { buildCommitmentOption } from '../mappers/commitmentChart';

const DAYS = 30;

/**
 * Thẻ "Vốn góp 30 ngày" (mockup funding.html): `committedAmount` và `commitments` của series thống kê
 * Investment, cột ngày. Cùng tham số với biểu đồ chợ Notes nên dùng chung một lần tải.
 */
export function CommitmentTrendCard() {
  const series = useGetInvestmentStatisticsSeriesQuery(lastDaysRange(DAYS));
  const points = series.data?.points;
  const option = useMemo(() => (points ? buildCommitmentOption(points) : null), [points]);
  const total = points ? sumOf(points, (point) => point.committedAmount) : 0;
  const count = points ? sumOf(points, (point) => point.commitments) : 0;

  return (
    <ChartCard
      id="fuCommitTitle"
      title={`Vốn góp ${DAYS} ngày`}
      aside="Theo ngày đặt lệnh"
      isLoading={series.isLoading}
      error={series.error}
      onRetry={series.refetch}
      isEmpty={count === 0}
    >
      {points && option && (
        <>
          <p className="ui-chart-lead">
            <b>{formatCurrency(total)}</b> từ <b>{formatNumber(count)}</b> lệnh góp vốn; lệnh đã hủy không tính.
          </p>
          <EChart className="ui-chart-plot sm" option={option} ariaLabel={`Biểu đồ cột vốn góp mỗi ngày trong ${DAYS} ngày`} />
          <ChartDataTable
            headers={['Ngày', 'Vốn góp', 'Số lệnh']}
            rows={points.map((point) => [bucketTitle(point.bucketStart, 'DAY'), formatCurrency(point.committedAmount), formatNumber(point.commitments)])}
          />
        </>
      )}
    </ChartCard>
  );
}
