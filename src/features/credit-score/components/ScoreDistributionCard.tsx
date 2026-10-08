import { useMemo } from 'react';
import { ChartCard, ChartDataTable } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import { useGetLoanStatisticsSummaryQuery } from '@/features/statistics';
import { chartNumber } from '@/lib/charts/theme';
import { formatNumber } from '@/utils';
import { binIndexOf, binLabel, buildScoreHistogramOption, formatShare } from '../mappers/scoreHistogramChart';

/**
 * Thẻ "Phân bố điểm tín dụng" (mockup credit-scoring.html), từ `creditScores` của summary thống kê Loan:
 * điểm của lần chấm mới nhất thành công mỗi hồ sơ vay thật. Khi đã chấm thử một hồ sơ trên trang, cột chứa
 * điểm đó được tô đậm. Hồ sơ chấm thử không được lưu nên không nằm trong phân bố.
 */
export function ScoreDistributionCard({ currentScore }: { currentScore?: number }) {
  const summary = useGetLoanStatisticsSummaryQuery();
  const scores = summary.data?.creditScores;
  const bins = scores?.histogram;
  const currentIndex = bins && currentScore != null ? binIndexOf(bins, currentScore) : -1;
  const option = useMemo(() => (bins ? buildScoreHistogramOption(bins, currentIndex) : null), [bins, currentIndex]);
  const total = bins ? bins.reduce((sum, bin) => sum + bin.count, 0) : 0;
  const below = bins && currentIndex >= 0 ? bins.slice(0, currentIndex).reduce((sum, bin) => sum + bin.count, 0) : 0;
  const currentBin = bins && currentIndex >= 0 ? bins[currentIndex] : undefined;

  return (
    <ChartCard
      id="csDistTitle"
      title="Phân bố điểm tín dụng"
      aside={scores ? `${formatNumber(scores.assessed)} hồ sơ đã chấm` : undefined}
      isLoading={summary.isLoading}
      error={summary.error}
      onRetry={summary.refetch}
      isEmpty={total === 0}
      emptyText="Chưa có hồ sơ vay nào được chấm điểm."
    >
      {bins && option && (
        <>
          <p className="ui-chart-lead">
            {currentBin && currentScore != null ? (
              <>
                Hồ sơ vừa chấm (điểm <b>{currentScore}</b>) nằm trong khoảng {binLabel(currentBin).toLowerCase()};
                {' '}<b>{formatShare(below, total)}</b> hồ sơ đã chấm có điểm dưới {currentBin.from}.
              </>
            ) : (
              <>Điểm tổng hợp của lần chấm mới nhất mỗi hồ sơ vay, <b>{chartNumber(total)}</b> hồ sơ.</>
            )}
          </p>
          <EChart className="ui-chart-plot" option={option} ariaLabel="Biểu đồ cột số hồ sơ theo khoảng điểm tín dụng, mỗi cột rộng 10 điểm" />
          <ChartDataTable
            headers={['Khoảng điểm', 'Số hồ sơ', 'Tỷ lệ']}
            rows={bins.map((bin) => [binLabel(bin), formatNumber(bin.count), formatShare(bin.count, total)])}
          />
        </>
      )}
    </ChartCard>
  );
}
