import { useMemo } from 'react';
import { ChartCard, ChartDataTable } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import { StaleProjectionNote, bucketLabel, bucketTitle, vnToday } from '@/features/statistics';
import { chartNumber, moneyShort } from '@/lib/charts/theme';
import { formatNumber, formatPercent } from '@/utils';
import { PRODUCT_CHART_MONTHS, useProductStatistics } from '../hooks/useProductStatistics';
import {
  buildDemandOption, buildRiskOption, describeDemandTrend, toDemandData, toRiskRows,
} from '../mappers/productCharts';

interface Props {
  /** Bấm một thanh nợ xấu để mở ngăn chi tiết của sản phẩm đó. */
  onOpenProduct: (productId: number) => void;
}

/**
 * Hai thẻ đầu trang Sản phẩm vay (mockup products.html): nhu cầu (hồ sơ nộp theo tháng) và rủi ro (nợ xấu
 * theo sản phẩm, ảnh chụp hiện tại). Mỗi thẻ có trạng thái tải, lỗi, rỗng riêng.
 */
export function ProductOverview({ onOpenProduct }: Props) {
  const { summary, series, names } = useProductStatistics();
  const today = vnToday();
  const demand = useMemo(() => (series.data ? toDemandData(series.data, names, today) : null), [series.data, names, today]);
  const trend = useMemo(() => (demand ? describeDemandTrend(demand) : null), [demand]);
  const demandOption = useMemo(() => (demand ? buildDemandOption(demand) : null), [demand]);
  const portfolio = summary.data?.portfolio;
  const riskRows = useMemo(() => (portfolio ? toRiskRows(portfolio.byProduct) : []), [portfolio]);
  const riskOption = useMemo(
    () => (portfolio ? buildRiskOption(riskRows, portfolio.nplRatioPercent) : null),
    [riskRows, portfolio],
  );
  const leader = demand?.groups.find((group) => !group.others);
  const riskiest = riskRows[0];

  return (
    <div className="prod-overview">
      <ChartCard
        id="prodDemandTitle"
        title="Hồ sơ nộp theo tháng"
        aside={demand && demand.months.length > 0
          ? `${bucketLabel(demand.months[0], 'MONTH')} đến ${bucketLabel(demand.months[demand.months.length - 1], 'MONTH')}`
          : `${PRODUCT_CHART_MONTHS - 1} tháng trọn`}
        isLoading={series.isLoading}
        error={series.error}
        onRetry={series.refetch}
        isEmpty={!demand || demand.total === 0}
      >
        {demand && demandOption && (
          <>
            <p className="ui-chart-lead">
              {trend?.rising ? (
                <>
                  {trend.rising.name} tăng nhanh nhất, <b>{chartNumber(trend.rising.from)}</b> lên
                  {' '}<b>{chartNumber(trend.rising.to)}</b> hồ sơ/tháng
                </>
              ) : (
                <>
                  <b>{chartNumber(demand.total)}</b> hồ sơ nộp trong {demand.months.length} tháng
                  {leader && <>, nhiều nhất là {leader.name} (<b>{chartNumber(leader.total)}</b> hồ sơ)</>}
                </>
              )}
              {trend && trend.falling.length > 0 && (
                <>; {trend.falling.map((item) => `${item.name} giảm ${item.months} tháng liền`).join(', ')}</>
              )}
              .
            </p>
            <EChart
              className="ui-chart-plot"
              option={demandOption}
              notMerge
              ariaLabel={`Biểu đồ đường số hồ sơ vay nộp mỗi tháng của từng sản phẩm, ${demand.months.length} tháng trọn gần nhất`}
            />
            <ChartDataTable
              headers={['Tháng', ...demand.groups.map((group) => group.name), 'Tổng']}
              rows={demand.months.map((month, index) => [
                bucketTitle(month, 'MONTH'),
                ...demand.groups.map((group) => formatNumber(group.values[index])),
                formatNumber(demand.groups.reduce((sum, group) => sum + group.values[index], 0)),
              ])}
            />
          </>
        )}
      </ChartCard>

      <ChartCard
        id="prodRiskTitle"
        title="Nợ xấu theo sản phẩm"
        aside="Hiện tại"
        isLoading={summary.isLoading}
        error={summary.error}
        onRetry={summary.refetch}
        isEmpty={riskRows.length === 0}
        emptyText="Chưa có sản phẩm nào còn dư nợ."
      >
        {portfolio && riskOption && riskiest && (
          <>
            <p className="ui-chart-lead">
              Tỷ lệ nợ xấu toàn danh mục <b>{formatPercent(portfolio.nplRatioPercent)}</b>; cao nhất là {riskiest.productName}
              {' '}(<b>{formatPercent(riskiest.nplRatioPercent)}</b>).
            </p>
            <EChart
              className="ui-chart-plot"
              option={riskOption}
              notMerge
              ariaLabel="Biểu đồ thanh tỷ lệ nợ xấu của từng sản phẩm, so với toàn danh mục"
              onClick={({ dataIndex }) => {
                const row = riskRows[dataIndex];
                if (row) onOpenProduct(row.productId);
              }}
            />
            <StaleProjectionNote count={portfolio.staleProjections} />
            <ChartDataTable
              headers={['Sản phẩm', 'Khoản còn dư nợ', 'Dư nợ gốc', 'Nợ xấu', 'Tỷ lệ']}
              rows={riskRows.map((row) => [
                row.productName,
                formatNumber(row.outstandingLoans),
                `${moneyShort(row.principalOutstanding)} đ`,
                `${moneyShort(row.nplPrincipalOutstanding)} đ`,
                formatPercent(row.nplRatioPercent),
              ])}
            />
          </>
        )}
      </ChartCard>
    </div>
  );
}
