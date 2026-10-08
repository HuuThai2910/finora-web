import { useMemo } from 'react';
import { ChartCard, ChartDataTable } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import { bucketTitle, lastDaysRange, sumOf, useGetUserStatisticsSeriesQuery } from '@/features/statistics';
import { chartNumber } from '@/lib/charts/theme';
import { formatNumber } from '@/utils';
import { buildSignupWeeklyOption } from '../mappers/signupWeeklyChart';

/** Số tuần của biểu đồ, theo mockup. */
const WEEKS = 12;
/** `from` lùi 11 tuần: backend nới về thứ Hai của tuần đó, nên ra đúng 12 cột tuần kể cả tuần này. */
const RANGE_DAYS = (WEEKS - 1) * 7 + 1;

/**
 * Thẻ "Đăng ký và xác minh theo tuần" (`/admin/users/stats/series`, cột tuần), toàn hệ thống.
 * Tuần hiện tại tính đến hôm nay.
 */
export function SignupWeeklyCard() {
  const series = useGetUserStatisticsSeriesQuery(lastDaysRange(RANGE_DAYS, 'WEEK'));
  const points = series.data?.points;
  const option = useMemo(() => (points ? buildSignupWeeklyOption(points) : null), [points]);
  const registered = points ? sumOf(points, (point) => point.registered) : 0;
  const verified = points ? sumOf(points, (point) => point.ekycVerified) : 0;

  return (
    <ChartCard
      id="kycSignupTitle"
      title="Đăng ký và xác minh theo tuần"
      aside={`${WEEKS} tuần, toàn hệ thống`}
      isLoading={series.isLoading}
      error={series.error}
      onRetry={series.refetch}
      isEmpty={registered === 0 && verified === 0}
    >
      {points && option && (
        <>
          <p className="ui-chart-lead">
            <b>{chartNumber(registered)}</b> khách đăng ký và <b>{chartNumber(verified)}</b> khách xác minh xong eKYC
            trong {WEEKS} tuần.
          </p>
          <EChart className="ui-chart-plot kyc-signup-plot" option={option} ariaLabel="Biểu đồ cột số khách đăng ký mới và số khách xác minh xong theo tuần" />
          <ChartDataTable
            headers={['Tuần', 'Đăng ký mới', 'Người vay', 'Nhà đầu tư', 'Xác minh xong', 'Thất bại']}
            rows={points.map((point) => [
              bucketTitle(point.bucketStart, 'WEEK'),
              formatNumber(point.registered),
              formatNumber(point.registeredBorrowers),
              formatNumber(point.registeredInvestors),
              formatNumber(point.ekycVerified),
              formatNumber(point.ekycFailed),
            ])}
          />
        </>
      )}
    </ChartCard>
  );
}
