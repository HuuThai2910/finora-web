import { bucketLabel, bucketTitle, type UserSeriesPoint } from '@/features/statistics';
import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_FOCUS, CHART_PALETTE, chartNumber, tooltipHtml } from '@/lib/charts/theme';

/**
 * Cột đôi theo tuần: khách đăng ký mới (xám) và khách xác minh eKYC xong (xanh), chép `buildSignupOption`
 * của mockup customers-kyc.html. Tooltip thêm người vay, nhà đầu tư và số xác minh thất bại. Hàm thuần.
 *
 * Hai cột đếm theo hai mốc khác nhau (ngày tạo tài khoản và ngày hoàn tất eKYC) nên một tuần có thể có số
 * xác minh lớn hơn số đăng ký.
 */
export function buildSignupWeeklyOption(points: UserSeriesPoint[]): ChartOption {
  return {
    legend: { data: ['Đăng ký mới', 'Xác minh xong'] },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const point = points[params[0]?.dataIndex ?? 0];
        return tooltipHtml(bucketTitle(point.bucketStart, 'WEEK'), [
          { label: 'Đăng ký mới', value: `${chartNumber(point.registered)} khách`, color: CHART_PALETTE.neutral },
          { label: 'Người vay, nhà đầu tư', value: `${chartNumber(point.registeredBorrowers)}, ${chartNumber(point.registeredInvestors)}` },
          { label: 'Xác minh xong', value: `${chartNumber(point.ekycVerified)} khách`, color: CHART_PALETTE.brand },
          { label: 'Xác minh thất bại', value: `${chartNumber(point.ekycFailed)} khách` },
        ]);
      },
    },
    xAxis: { type: 'category', data: points.map((point) => bucketLabel(point.bucketStart, 'WEEK')) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: 'Đăng ký mới', type: 'bar', data: points.map((point) => point.registered), color: CHART_PALETTE.neutral, barMaxWidth: 14, barGap: '15%', emphasis: CHART_FOCUS },
      { name: 'Xác minh xong', type: 'bar', data: points.map((point) => point.ekycVerified), color: CHART_PALETTE.brand, barMaxWidth: 14, emphasis: CHART_FOCUS },
    ],
  };
}
