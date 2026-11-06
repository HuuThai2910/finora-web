import { useSearchParams } from 'react-router-dom';
import { DASHBOARD_CHARTS, DEFAULT_PERIOD, PERIODS } from '../constants';
import type { DashboardChartKey, PeriodDays, PeriodKpiKey } from '../types';

const KPI_KEYS: readonly PeriodKpiKey[] = ['outstanding', 'committed', 'npl', 'fee'];
const DEFAULT_KPI: PeriodKpiKey = 'committed';
const DEFAULT_CHART: DashboardChartKey = 'funding';

export interface DashboardView {
  period: PeriodDays;
  kpi: PeriodKpiKey;
  chart: DashboardChartKey;
}

function readPeriod(raw: string | null): PeriodDays {
  return PERIODS.find((days) => String(days) === raw) ?? DEFAULT_PERIOD;
}

const readKpi = (raw: string | null): PeriodKpiKey => KPI_KEYS.find((key) => key === raw) ?? DEFAULT_KPI;

const readChart = (raw: string | null): DashboardChartKey =>
  DASHBOARD_CHARTS.find((item) => item.key === raw)?.key ?? DEFAULT_CHART;

/**
 * Kỳ số liệu, ô KPI đang chọn và tab biểu đồ của Tổng quan nằm trên URL (`?period=7&kpi=npl&chart=overdue`): sang trang
 * khác rồi bấm Lùi, hay tải lại trang, vẫn thấy đúng cách xem cũ; gửi đường dẫn cho người khác cũng vậy.
 * Ghi bằng `replace` vì đổi cách xem không phải một bước điều hướng (Lùi không phải đi qua từng lần bấm tab).
 * Giá trị mặc định không ghi lên URL cho gọn; giá trị lạ coi như mặc định.
 */
export function useDashboardView() {
  const [params, setParams] = useSearchParams();
  const view: DashboardView = {
    period: readPeriod(params.get('period')),
    kpi: readKpi(params.get('kpi')),
    chart: readChart(params.get('chart')),
  };

  const write = (next: DashboardView) => {
    const query: Record<string, string> = {};
    if (next.period !== DEFAULT_PERIOD) query.period = String(next.period);
    if (next.kpi !== DEFAULT_KPI) query.kpi = next.kpi;
    if (next.chart !== DEFAULT_CHART) query.chart = next.chart;
    setParams(query, { replace: true });
  };

  return {
    ...view,
    setPeriod: (period: PeriodDays) => write({ ...view, period }),
    setKpi: (kpi: PeriodKpiKey) => write({ ...view, kpi }),
    setChart: (chart: DashboardChartKey) => write({ ...view, chart }),
  };
}
