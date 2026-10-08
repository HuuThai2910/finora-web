import { useMemo, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { CHART_EMPTY_TEXT } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StaleProjectionNote } from '@/features/statistics';
import { DASHBOARD_CHARTS } from '../constants';
import type { DashboardStatistics } from '../hooks/useDashboardStatistics';
import { buildChartSpec, type ChartSpecReady, type LeadPart } from '../mappers/chartSpecs';
import type { DashboardChartKey } from '../types';

function Lead({ parts }: { parts: LeadPart[] }) {
  return (
    <p className="ui-chart-lead">
      {parts.map((part, index) => (typeof part === 'string' ? part : <b key={index}>{part.strong}</b>))}
    </p>
  );
}

/** Bảng số liệu bên cạnh biểu đồ: cùng số với biểu đồ, đọc được không cần rê chuột. */
function SideTable({ spec }: { spec: ChartSpecReady }) {
  return (
    <table className="dash-ct">
      {spec.headers && (
        <thead><tr>{spec.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
      )}
      <tbody>
        {spec.rows.map((row, index) => {
          const strong = !spec.headers && index < (spec.strongRows ?? 0);
          return (
            <tr key={row[0]}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={strong && cellIndex > 0 ? 'strong' : undefined}>{cell}</td>
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
export function DashboardCharts({ stats }: { stats: DashboardStatistics }) {
  const [selected, setSelected] = useState<DashboardChartKey>('funding');
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

  // Phím mũi tên trái/phải chuyển tab như mockup.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const index = DASHBOARD_CHARTS.findIndex((item) => item.key === selected);
    const step = event.key === 'ArrowRight' ? 1 : DASHBOARD_CHARTS.length - 1;
    const next = DASHBOARD_CHARTS[(index + step) % DASHBOARD_CHARTS.length];
    setSelected(next.key);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-key="${next.key}"]`)?.focus();
  };

  return (
    <section className="ui-card dash-card dash-chart" aria-labelledby="dashChartTitle">
      <div className="dash-chart-bar">
        <div className="ui-tabs" role="tablist" aria-label="Chọn biểu đồ" onKeyDown={onKeyDown}>
          {DASHBOARD_CHARTS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              data-key={item.key}
              aria-selected={item.key === selected}
              aria-controls="dashChartPanel"
              tabIndex={item.key === selected ? 0 : -1}
              onClick={() => setSelected(item.key)}
            >
              <Icon name={item.icon} />
              {item.tab}
            </button>
          ))}
        </div>
        {chart.link && (
          <Link className="dash-more" to={chart.link.to}>Mở trang {chart.link.label}<Icon name="chevronRight" /></Link>
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
            {spec.note && <p className="ui-chart-note dash-chart-center">{spec.note}</p>}
          </>
        ) : (
          <div className="dash-chart-body">
            <div className="dash-chart-side">
              <Lead parts={spec.lead} />
              <SideTable spec={spec} />
              <StaleProjectionNote count={spec.staleProjections} />
              <p className="ui-chart-note dash-chart-foot">{spec.note}</p>
            </div>
            <EChart className="dash-plot" option={spec.option} ariaLabel={spec.ariaLabel} notMerge />
          </div>
        )}
      </div>
    </section>
  );
}
