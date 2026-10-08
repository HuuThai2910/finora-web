import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { DailyTable } from '../components/DailyTable';
import { DashboardCharts } from '../components/DashboardCharts';
import { NewAccountsCard } from '../components/NewAccountsCard';
import { PeriodKpiPanel } from '../components/PeriodKpiPanel';
import { TodoList } from '../components/TodoList';
import { DEFAULT_PERIOD, PERIODS } from '../constants';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardStatistics } from '../hooks/useDashboardStatistics';
import type { PeriodDays, PeriodKpiKey } from '../types';
import './DashboardPage.css';

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
 * các số theo kỳ cộng từ series ngày và chỉ so với kỳ trước khi so được trung thực. Kỳ và ô số liệu đang
 * chọn là state cục bộ của trang (ô đang chọn dùng chung cho thẻ Số liệu và bảng từng ngày).
 */
export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodDays>(DEFAULT_PERIOD);
  const [kpi, setKpi] = useState<PeriodKpiKey>('committed');
  const { todos, refetch, isFetching } = useDashboardData();
  const stats = useDashboardStatistics(period);
  const busy = isFetching || stats.isFetching;
  const asOf = formatAsOf(stats.loanSummary.data?.asOf);

  return (
    <section className="ui-page">
      <header className="ui-page-head">
        <div className="ui-title">
          <h1>Tổng quan</h1>
          <p>Tình hình cho vay, gọi vốn và chợ Notes của FINORA{asOf ? `, cập nhật ${asOf}` : ''}.</p>
        </div>
        <div className="dash-head-actions">
          <div className="ui-seg" role="tablist" aria-label="Kỳ số liệu">
            {PERIODS.map((days) => (
              <button key={days} type="button" role="tab" aria-selected={period === days} onClick={() => setPeriod(days)}>
                {days} ngày
              </button>
            ))}
          </div>
          <button
            type="button"
            className="dash-refresh"
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

      <div className="dash-row">
        <PeriodKpiPanel stats={stats} selected={kpi} onSelect={setKpi} />
        <TodoList todos={todos} />
      </div>

      <div className="dash-row dash-mid">
        <DailyTable key={period} stats={stats} selected={kpi} onSelect={setKpi} />
        <NewAccountsCard stats={stats} />
      </div>

      <DashboardCharts stats={stats} />
    </section>
  );
}
