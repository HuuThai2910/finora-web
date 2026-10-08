import { useMemo } from 'react';
import { ChartCard, ChartDataTable } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import {
  bucketTitle,
  buildTradedValueOption,
  formatPricePercent,
  lastDaysRange,
  sumOf,
  useGetInvestmentStatisticsSeriesQuery,
} from '@/features/statistics';
import { moneyShort } from '@/lib/charts/theme';
import { formatNumber } from '@/utils';
import {
  buildRollingPriceOption,
  hasPerformingPrice,
  ROLLING_DAYS,
  summarizeRollingPrice,
} from '../mappers/rollingPriceChart';

/** Số ngày của hai biểu đồ, theo mockup. */
const DAYS = 30;

const money = (value: number) => `${moneyShort(value)} đ`;
const price = (value: number | null) => (value == null ? '-' : formatPricePercent(value));

/**
 * Hai thẻ "Giá trị khớp theo ngày" và "Giá khớp bình quân" (mockup secondary-market.html), từ series thống kê
 * ngày của Investment (không tính lần khớp thanh toán lỗi).
 *
 * Một lời gọi lấy 36 ngày: 30 ngày hiển thị và 6 ngày trước đó để cửa sổ trượt 7 ngày của ngày đầu kỳ đủ dữ
 * liệu. Giá bình quân chỉ tính Note của khoản vay chưa vỡ nợ (`performing*`), gia quyền theo số Note.
 */
export function MarketTrendCharts() {
  const series = useGetInvestmentStatisticsSeriesQuery(lastDaysRange(DAYS + ROLLING_DAYS - 1));
  const all = series.data?.points;
  const points = useMemo(() => all?.slice(-DAYS), [all]);
  const valueOption = useMemo(() => (points ? buildTradedValueOption(points, 'DAY') : null), [points]);
  const rolling = useMemo(
    () => (all && hasPerformingPrice(all) ? summarizeRollingPrice(all, DAYS) : null),
    [all],
  );
  const priceOption = useMemo(
    () => (rolling && rolling.all != null ? buildRollingPriceOption(rolling.rows) : null),
    [rolling],
  );

  const trades = points ? sumOf(points, (point) => point.trades) : 0;
  const value = points ? sumOf(points, (point) => point.tradedAmount) : 0;
  const fee = points ? sumOf(points, (point) => point.platformFee) : 0;
  const common = { isLoading: series.isLoading, error: series.error, onRetry: series.refetch };

  return (
    <section className="sm-charts" aria-label="Biểu đồ chợ Notes">
      <ChartCard id="smValueTitle" title="Giá trị khớp theo ngày" aside={`${DAYS} ngày`} isEmpty={trades === 0} {...common}>
        {points && valueOption && (
          <>
            <p className="ui-chart-lead">
              <b>{formatNumber(trades)}</b> lần khớp, tổng <b>{moneyShort(value)}</b>, phí <b>{moneyShort(fee)}</b>.
            </p>
            <EChart className="ui-chart-plot sm" option={valueOption} ariaLabel={`Biểu đồ cột giá trị khớp lệnh mỗi ngày trong ${DAYS} ngày, tổng ${money(value)}`} />
            <ChartDataTable
              headers={['Ngày', 'Giá trị khớp', 'Số lần khớp', 'Phí nền tảng']}
              rows={points.map((point) => [
                bucketTitle(point.bucketStart, 'DAY'),
                money(point.tradedAmount),
                formatNumber(point.trades),
                money(point.platformFee),
              ])}
            />
          </>
        )}
      </ChartCard>

      <ChartCard
        id="smPriceTitle"
        title="Giá khớp bình quân"
        aside="trượt 7 ngày, không tính nợ xấu"
        isEmpty={rolling == null || rolling.all == null}
        emptyText={rolling == null
          ? 'Máy chủ chưa trả giá khớp tách riêng khoản nợ xấu, nên chưa tính được giá bình quân này.'
          : `Chưa có lần khớp nào của khoản vay chưa vỡ nợ trong ${DAYS} ngày.`}
        {...common}
      >
        {rolling && priceOption && (
          <>
            <p className="ui-chart-lead">
              {rolling.last7 == null ? (
                <>7 ngày gần nhất không có lần khớp</>
              ) : (
                <>
                  7 ngày gần nhất <b>{price(rolling.last7)}</b> dư nợ gốc
                  {rolling.earlier != null && (
                    <>, {rolling.last7 >= rolling.earlier ? 'cao' : 'thấp'} hơn các tuần trước ({price(rolling.earlier)})</>
                  )}
                </>
              )}
              ; bình quân {DAYS} ngày <b>{price(rolling.all)}</b>.
            </p>
            <EChart
              className="ui-chart-plot sm"
              option={priceOption}
              ariaLabel={`Biểu đồ đường giá khớp bình quân trượt 7 ngày, tính bằng phần trăm dư nợ gốc, bình quân ${DAYS} ngày ${price(rolling.all)}`}
            />
            <ChartDataTable
              headers={['Ngày', 'Bình quân 7 ngày', 'Trong ngày', 'Số Note']}
              rows={rolling.rows.map((row) => [
                bucketTitle(row.bucketStart, 'DAY'),
                price(row.rolling),
                price(row.daily),
                row.quantity ? formatNumber(row.quantity) : '-',
              ])}
            />
          </>
        )}
      </ChartCard>
    </section>
  );
}
