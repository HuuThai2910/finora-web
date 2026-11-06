import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CHART_EMPTY_TEXT } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { usePermission } from '@/features/auth';
import { StaleProjectionNote } from '@/features/statistics';
import { DASHBOARD_CHARTS } from '../constants';
import type { DashboardStatistics } from '../hooks/useDashboardStatistics';
import { buildChartSpec, type ChartSpecReady, type LeadPart } from '../mappers/chartSpecs';
import type { DashboardChartKey } from '../types';
import { handleTabArrows } from './tabKeys';

function Lead({ parts }: { parts: LeadPart[] }) {
  return (
    <p className="ui-chart-lead text-[13.5px]">
      {parts.map((part, index) => (typeof part === 'string' ? part : <b key={index}>{part.strong}</b>))}
    </p>
  );
}

// Kiểu bảng chung (dải tiêu đề bo tròn, dòng kẻ mảnh) nhưng dòng thấp hơn; cột đầu là nhãn, các cột sau là số.
const CT_TH = 'whitespace-nowrap bg-[#f6f8fd] px-2.5 py-1.5 text-right text-[12px] font-medium text-secondary first:rounded-l-md first:text-left last:rounded-r-md';
const CT_TD = 'whitespace-nowrap border-b border-b-divider px-2.5 py-2 text-right first:text-left first:text-secondary [&.strong]:font-semibold in-[tr:hover]:bg-[#f8faff] in-[tr:last-child]:[border-bottom:0]';

/** Bảng số liệu bên cạnh biểu đồ: cùng số với biểu đồ, đọc được không cần rê chuột. */
function SideTable({ spec }: { spec: ChartSpecReady }) {
  return (
    <table className="dash-ct mt-3 w-full border-separate border-spacing-0 text-[13px] tabular-nums">
      {spec.headers && (
        <thead><tr>{spec.headers.map((header) => <th key={header} scope="col" className={CT_TH}>{header}</th>)}</tr></thead>
      )}
      <tbody>
        {spec.rows.map((row, index) => {
          const strong = !spec.headers && index < (spec.strongRows ?? 0);
          return (
            <tr key={row[0]}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={strong && cellIndex > 0 ? `strong ${CT_TD}` : CT_TD}>{cell}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Một khung biểu đồ, người dùng chọn xem biểu đồ nào qua tab (mockup dashboard.html). Chỉ biểu đồ đang chọn
 * được dựng; mỗi biểu đồ có trạng thái tải, lỗi kèm mã và rỗng riêng nên một service lỗi không che các tab khác.
 */
interface DashboardChartsProps {
  stats: DashboardStatistics;
  /** Tab đang chọn; nằm trên URL của trang để quay lại vẫn đúng biểu đồ. */
  selected: DashboardChartKey;
  onSelect: (key: DashboardChartKey) => void;
}

const CHART_KEYS = DASHBOARD_CHARTS.map((item) => item.key);

export function DashboardCharts({ stats, selected, onSelect }: DashboardChartsProps) {
  const { canView } = usePermission();
  const chart = DASHBOARD_CHARTS.find((item) => item.key === selected) ?? DASHBOARD_CHARTS[0];
  const {
    period, currentFrom, chartBucket, loanSummary, investmentSummary, investmentChart, loanChart,
    investmentCompare, loanCompare, investmentPeriods, loanPeriods,
  } = stats;
  // `stats` là object mới mỗi lần render; memo theo đúng dữ liệu nguồn để option giữ nguyên tham chiếu,
  // nếu không ECharts (notMerge) vẽ lại từ đầu mỗi khi một query khác trên trang đổi trạng thái tải.
  const spec = useMemo(
    () => buildChartSpec(selected, stats),
    [selected, period, currentFrom, chartBucket, loanSummary.currentData, loanSummary.error, investmentSummary.currentData,
      investmentChart.currentData, investmentChart.error, loanChart.currentData, loanChart.error,
      investmentCompare.currentData, investmentCompare.error, loanCompare.currentData, loanCompare.error,
      investmentPeriods, loanPeriods],
  );

  return (
    <section className="ui-card dash-card dash-chart px-4.5 py-4" aria-labelledby="dashChartTitle">
      <div className="dash-chart-bar mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-b-divider pb-3">
        <div className="ui-tabs" role="tablist" aria-label="Chọn biểu đồ" onKeyDown={(event) => handleTabArrows(event, CHART_KEYS, selected, onSelect)}>
          {DASHBOARD_CHARTS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              data-key={item.key}
              aria-selected={item.key === selected}
              aria-controls="dashChartPanel"
              tabIndex={item.key === selected ? 0 : -1}
              onClick={() => onSelect(item.key)}
            >
              <Icon name={item.icon} />
              {item.tab}
            </button>
          ))}
        </div>
        {chart.link && canView(chart.link.view) && (
          <Link
            className="dash-more inline-flex items-center gap-0.5 whitespace-nowrap text-[13px] font-semibold text-brand [&_svg]:size-3.5"
            to={chart.link.to}
          >
            Mở trang {chart.link.label}<Icon name="chevronRight" />
          </Link>
        )}
      </div>

      <div id="dashChartPanel" role="tabpanel" aria-labelledby="dashChartTitle">
        <h2 className="ui-sr-only" id="dashChartTitle">{chart.title}</h2>
        {spec.status === 'error' ? (
          <ErrorNotice error={spec.error} onRetry={spec.retry} />
        ) : spec.status === 'loading' ? (
          <div className="ui-chart-state" aria-busy="true">
            <span className="ui-skeleton ui-chart-skel-line" />
            <span className="ui-skeleton ui-chart-skel-plot" />
          </div>
        ) : spec.status === 'empty' ? (
          <>
            <p className="ui-chart-empty">{spec.text ?? CHART_EMPTY_TEXT}</p>
            {spec.note && <p className="ui-chart-note dash-chart-center text-center">{spec.note}</p>}
          </>
        ) : (
          // Cột số liệu bên trái, biểu đồ bên phải; dưới 1000px xếp dọc và bỏ vạch ngăn.
          <div className="dash-chart-body grid grid-cols-[minmax(300px,360px)_minmax(0,1fr)] items-stretch gap-7 max-[1000px]:grid-cols-[minmax(0,1fr)] max-[1000px]:gap-4">
            <div className="dash-chart-side flex min-w-0 flex-col border-r border-r-divider pr-7 max-[1000px]:pr-0 max-[1000px]:[border-right:0]">
              <Lead parts={spec.lead} />
              <SideTable spec={spec} />
              <StaleProjectionNote count={spec.staleProjections} />
              {/* Ghi chú nguồn số đẩy xuống đáy cột. */}
              <p className="ui-chart-note dash-chart-foot mt-auto pt-2.5">{spec.note}</p>
            </div>
            <EChart className="dash-plot min-h-75" option={spec.option} ariaLabel={spec.ariaLabel} notMerge />
          </div>
        )}
      </div>
    </section>
  );
}
