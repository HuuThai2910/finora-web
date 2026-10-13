import { useMemo, useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Pager } from '@/components/Pager';
import { bucketLabel } from '@/features/statistics';
import { EMPTY } from '@/utils';
import type { DashboardStatistics } from '../hooks/useDashboardStatistics';
import { DAILY_COLUMNS, buildDailyRows } from '../mappers/dailyRows';
import type { PeriodKpiKey } from '../types';
import { DashCardHead } from './DashCardHead';

/** 8 dòng một trang để bảng cao bằng thẻ Tài khoản mới bên cạnh (mockup DAILY_SIZE). */
const DAILY_PAGE_SIZE = 8;

interface DailyTableProps {
  stats: DashboardStatistics;
  selected: PeriodKpiKey;
  onSelect: (key: PeriodKpiKey) => void;
}

/** Ghi chú dưới bảng: cách lấy số của cột tuần và số khoản vay không đọc được lịch sử từ Fineract. */
function dailyNote(weekly: boolean, unavailableLoans: number): string | null {
  const parts: string[] = [];
  if (weekly) parts.push('Tuần bắt đầu thứ Hai; dư nợ và nợ xấu lấy cuối tuần, các cột khác cộng cả tuần');
  if (unavailableLoans > 0) {
    parts.push(`${unavailableLoans} khoản vay chưa đọc được lịch sử từ Fineract nên chưa tính vào dư nợ và nợ xấu`);
  }
  return parts.length ? `${parts.join('. ')}.` : null;
}

/**
 * Thẻ "Số liệu từng ngày, N ngày" (mockup .db-daily): kỳ 7/30 ngày mỗi dòng một ngày, kỳ 90 ngày mỗi dòng
 * một tuần, mới nhất ở trên. Cùng nguồn series với thẻ biểu đồ nên không gọi thêm API. Trang của bảng là
 * state cục bộ; trang cha đặt `key` theo kỳ để đổi kỳ thì về trang đầu.
 */
export function DailyTable({ stats, selected, onSelect }: DailyTableProps) {
  const [page, setPage] = useState(0);
  const { period, chartBucket, investmentChart, loanChart } = stats;
  const weekly = chartBucket !== 'DAY';
  const investmentPoints = investmentChart.currentData?.points;
  const loanPoints = loanChart.currentData?.points;
  const rows = useMemo(
    () => (investmentPoints && loanPoints ? buildDailyRows(investmentPoints, loanPoints) : null),
    [investmentPoints, loanPoints],
  );
  const error = investmentChart.error ?? loanChart.error;
  const note = dailyNote(weekly, loanChart.currentData?.portfolioHistory?.unavailableLoans ?? 0);
  const pageRows = rows?.slice(page * DAILY_PAGE_SIZE, (page + 1) * DAILY_PAGE_SIZE) ?? [];

  return (
    <section className="ui-card dash-card dash-daily" aria-labelledby="dashDailyTitle">
      <DashCardHead
        id="dashDailyTitle"
        icon="calendar"
        title={weekly ? `Số liệu từng tuần, ${period} ngày` : `Số liệu từng ngày, ${period} ngày`}
        aside={<span className="dash-aside-note">Mới nhất ở trên</span>}
      />
      {error ? (
        <div className="dash-block">
          <ErrorNotice error={error} onRetry={() => { void investmentChart.refetch(); void loanChart.refetch(); }} />
        </div>
      ) : !rows ? (
        <div className="dash-block" aria-busy="true"><span className="ui-skeleton dash-daily-skel" /></div>
      ) : (
        <>
          <div className="ui-table-wrap dash-daily-wrap">
            <table className="ui-table dash-daily-table">
              <thead>
                <tr>
                  <th scope="col">{weekly ? 'Tuần' : 'Ngày'}</th>
                  {DAILY_COLUMNS.map((column) => {
                    const on = column.kpi != null && column.kpi === selected;
                    const header = weekly && column.weeklyHeader ? column.weeklyHeader : column.header;
                    return (
                      <th key={column.key} scope="col" className={on ? 'num on' : 'num'}>
                        {column.kpi ? (
                          <button
                            type="button"
                            aria-pressed={on}
                            title={`Xem xu hướng ${header.toLowerCase()}`}
                            onClick={() => column.kpi && onSelect(column.kpi)}
                          >
                            {header}
                          </button>
                        ) : header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.bucketStart}>
                    <td className="strong">
                      {weekly && <span className="dash-wk">từ </span>}
                      {bucketLabel(row.bucketStart, chartBucket)}
                    </td>
                    {DAILY_COLUMNS.map((column) => {
                      const value = row[column.key];
                      const on = column.kpi != null && column.kpi === selected;
                      return (
                        <td key={column.key} className={on ? 'num on' : 'num'}>
                          {value == null ? EMPTY : column.format(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {note && <p className="dash-daily-note">{note}</p>}
          <Pager page={page} size={DAILY_PAGE_SIZE} total={rows.length} unit={weekly ? 'tuần' : 'ngày'} onPage={setPage} />
        </>
      )}
    </section>
  );
}
