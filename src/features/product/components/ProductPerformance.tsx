import { useMemo } from 'react';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StaleProjectionNote } from '@/features/statistics';
import { formatNumber, formatPercent } from '@/utils';
import { PRODUCT_CHART_MONTHS, useProductStatistics } from '../hooks/useProductStatistics';
import { buildDisbursedOption, disbursedByMonth } from '../mappers/productCharts';
import { formatMoney } from '../mappers/productDisplay';

/**
 * Hai mục trong ngăn chi tiết sản phẩm (mockup products.html): "Khoản vay đang có" từ `portfolio.byProduct`
 * của summary và "Giải ngân 6 tháng" từ `productPoints` của series cột tháng.
 */
export function ProductPerformance({ productId }: { productId: number }) {
  const { summary, series } = useProductStatistics();
  const stat = summary.data?.portfolio.byProduct.find((item) => item.productId === productId);
  const disbursed = useMemo(() => (series.data ? disbursedByMonth(series.data, productId) : null), [series.data, productId]);
  const option = useMemo(() => (disbursed ? buildDisbursedOption(disbursed.months, disbursed.values) : null), [disbursed]);

  return (
    <>
      <h3>Khoản vay đang có</h3>
      {summary.error ? (
        <ErrorNotice error={summary.error} onRetry={summary.refetch} />
      ) : summary.isLoading ? (
        <span className="ui-skeleton prod-perf-skel" aria-busy="true" />
      ) : !stat || stat.outstandingLoans === 0 ? (
        <p className="prod-cap">Sản phẩm hiện chưa có khoản vay nào còn dư nợ.</p>
      ) : (
        <>
          <dl className="prod-dl">
            <dt>Số khoản</dt>
            <dd>{formatNumber(stat.outstandingLoans)}</dd>
            <dt>Dư nợ gốc</dt>
            <dd>{formatMoney(stat.principalOutstanding)}</dd>
            <dt>Tỷ lệ nợ xấu</dt>
            <dd>{formatPercent(stat.nplRatioPercent)}</dd>
          </dl>
          <StaleProjectionNote count={summary.data?.portfolio.staleProjections} />
        </>
      )}

      <h3>Giải ngân {PRODUCT_CHART_MONTHS} tháng</h3>
      {series.error ? (
        <ErrorNotice error={series.error} onRetry={series.refetch} />
      ) : series.isLoading || !disbursed || !option ? (
        <span className="ui-skeleton prod-perf-skel" aria-busy="true" />
      ) : disbursed.values.every((value) => value === 0) ? (
        <p className="prod-cap">Không giải ngân trong {PRODUCT_CHART_MONTHS} tháng qua.</p>
      ) : (
        <>
          <EChart className="prod-dr-plot" option={option} ariaLabel={`Biểu đồ cột giải ngân ${PRODUCT_CHART_MONTHS} tháng của sản phẩm`} />
          <p className="prod-cap">Tháng này tính đến hôm nay.</p>
        </>
      )}
    </>
  );
}
