import { Icon } from '@/components/Icon';
import { DailyTable } from '../components/DailyTable';
import { DashboardCharts } from '../components/DashboardCharts';
import { NewAccountsCard } from '../components/NewAccountsCard';
import { PeriodKpiPanel } from '../components/PeriodKpiPanel';
import { TodoList } from '../components/TodoList';
import { PERIODS } from '../constants';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardStatistics } from '../hooks/useDashboardStatistics';
import { useDashboardView } from '../hooks/useDashboardView';
import { handleTabArrows } from '../components/tabKeys';

/** Hàng thẻ cùng tỉ lệ cột với mockup; màn hẹp dồn về một cột. */
const ROW = 'grid grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)] items-stretch gap-4 max-[1180px]:grid-cols-[minmax(0,1fr)] *:min-w-0';
/** Còn một cột thì "Việc cần xử lý" lên trước thẻ số liệu: việc phải làm quan trọng hơn biểu đồ. */
const TOP_ROW = `${ROW} max-[1180px]:[&>.dash-todo]:order-first`;

const AS_OF = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', hour12: false,
});

/** "22:00, 06/10/2026" từ `asOf` của summary (thời điểm backend chốt số). */
function formatAsOf(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = AS_OF.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('hour')}:${part('minute')}, ${part('day')}/${part('month')}/${part('year')}`;
}

/**
 * Tổng quan theo mockup dashboard.html: hàng trên là số liệu kỳ và việc cần xử lý, hàng giữa là bảng số liệu
 * từng ngày và tài khoản mới, cuối là khung biểu đồ có tab.
 *
 * Số liệu lấy từ API thống kê (STATS-001). Dư nợ, nợ xấu, hạng tín dụng và nhóm nợ chỉ có ảnh chụp hiện tại;
 * các số theo kỳ cộng từ series ngày và chỉ so với kỳ trước khi so được trung thực. Kỳ, ô số liệu đang chọn (dùng
 * chung cho thẻ Số liệu và bảng từng ngày) và tab biểu đồ nằm trên URL (`useDashboardView`).
 */
export default function DashboardPage() {
  const { period, kpi, chart, setPeriod, setKpi, setChart } = useDashboardView();
  const { todos, refetch, isFetching } = useDashboardData();
  const stats = useDashboardStatistics(period);
  const busy = isFetching || stats.isFetching;
  const asOf = formatAsOf(stats.loanSummary.data?.asOf);

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Tổng quan</h1>
          <p>Tình hình cho vay, gọi vốn và chợ chuyển nhượng của FINORA{asOf ? `, cập nhật ${asOf}` : ''}.</p>
        </div>
        <div className="dash-head-actions flex flex-wrap items-center gap-2.5">
          <div className="ui-seg" role="tablist" aria-label="Kỳ số liệu" onKeyDown={(event) => handleTabArrows(event, PERIODS, period, setPeriod)}>
            {PERIODS.map((days) => (
              <button
                key={days}
                type="button"
                role="tab"
                aria-selected={period === days}
                tabIndex={period === days ? 0 : -1}
                onClick={() => setPeriod(days)}
              >
                {days} ngày
              </button>
            ))}
          </div>
          {/* Nút làm mới tròn; đang tải thì icon quay. */}
          <button
            type="button"
            className="dash-refresh grid size-9 place-items-center rounded-[50%] border border-line bg-white text-secondary shadow-card transition-[color,border-color] duration-150 hover:not-disabled:border-[#b9cbef] hover:not-disabled:text-brand disabled:cursor-progress [&_svg]:size-3.75 aria-busy:[&_svg]:animate-[dash-spin_0.9s_linear_infinite]"
            aria-label={busy ? 'Đang tải số liệu' : 'Làm mới số liệu'}
            title="Làm mới số liệu"
            onClick={() => {
              refetch();
              stats.refetch();
            }}
            disabled={busy}
            aria-busy={busy}
          >
            <Icon name="refresh" />
          </button>
        </div>
      </header>

      <div className={`dash-row ${TOP_ROW}`}>
        <PeriodKpiPanel stats={stats} selected={kpi} onSelect={setKpi} />
        <TodoList todos={todos} />
      </div>

      {/* Hàng giữa xuống một cột sớm hơn (1360px) để thẻ Tài khoản mới chiếm cả hàng. */}
      <div className={`dash-row dash-mid ${ROW} max-[1360px]:grid-cols-[minmax(0,1fr)]`}>
        <DailyTable key={period} stats={stats} selected={kpi} onSelect={setKpi} />
        <NewAccountsCard stats={stats} />
      </div>

      <DashboardCharts stats={stats} selected={chart} onSelect={setChart} />
    </section>
  );
}
