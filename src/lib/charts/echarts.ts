/**
 * ECharts nạp theo module (echarts/core) để bundle chỉ chứa loại biểu đồ đang dùng.
 * Thêm loại biểu đồ hoặc component mới thì đăng ký ở đây.
 */
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { CHART_THEME } from './theme';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  TooltipComponent,
  SVGRenderer,
]);

echarts.registerTheme('finora', CHART_THEME);

export { echarts };
export type { EChartsCoreOption as ChartOption } from 'echarts/core';
