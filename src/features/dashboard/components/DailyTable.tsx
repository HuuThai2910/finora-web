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

// Ô đầu cột và ô số: lớp `on` đánh dấu cột của ô số liệu đang chọn ở thẻ Số liệu.
const TH = 'px-2.5 [&.on]:font-semibold [&.on]:text-brand';
const TD = 'px-2.5 [&.on]:bg-[#f3f7fe] [&.on]:font-semibold [&.on]:text-primary [tr:hover_&.on]:bg-[#eaf1fd]';

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
    parts.push(`${unavailableLoans} khoản vay chưa đọc được lịch sử từ hệ thống lõi nên chưa tính vào dư nợ và nợ xấu`);
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
    <section className="ui-card dash-card dash-daily flex flex-col px-4.5 pt-4 pb-3.5" aria-labelledby="dashDailyTitle">
      <DashCardHead
        id="dashDailyTitle"
        icon="calendar"
        title={weekly ? `Số liệu từng tuần, ${period} ngày` : `Số liệu từng ngày, ${period} ngày`}
        aside={<span className="dash-aside-note whitespace-nowrap text-[13px] text-secondary">Mới nhất ở trên</span>}
        className="mb-3"
      />
      {error ? (
        <div className="dash-block mt-2.5">
          <ErrorNotice error={error} onRetry={() => { void investmentChart.refetch(); void loanChart.refetch(); }} />
        </div>
      ) : !rows ? (
        <div className="dash-block mt-2.5" aria-busy="true"><span className="ui-skeleton dash-daily-skel block h-105" /></div>
      ) : (
        <>
          {/* Thẻ bên phải cao hơn thì bảng giãn đều các dòng cho kín thẻ, không để khoảng trống dưới đáy. */}
          <div className="ui-table-wrap dash-daily-wrap flex-auto">
            <table className="ui-table dash-daily-table h-full">
              <thead>
                <tr className="h-px">
                  <th scope="col" className={TH}>{weekly ? 'Tuần' : 'Ngày'}</th>
                  {DAILY_COLUMNS.map((column) => {
                    const on = column.kpi != null && column.kpi === selected;
                    const header = weekly && column.weeklyHeader ? column.weeklyHeader : column.header;
                    return (
                      <th key={column.key} scope="col" className={`${on ? 'num on' : 'num'} ${TH}`}>
                        {column.kpi ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-inherit [font:inherit] hover:text-brand in-[th.on]:font-semibold in-[th.on]:text-brand"
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
                    <td className={`strong ${TD}`}>
                      {weekly && <span className="dash-wk text-[12px] font-normal text-muted">từ </span>}
                      {bucketLabel(row.bucketStart, chartBucket)}
                    </td>
                    {DAILY_COLUMNS.map((column) => {
                      const value = row[column.key];
                      const on = column.kpi != null && column.kpi === selected;
                      return (
                        <td key={column.key} className={`${on ? 'num on' : 'num'} ${TD}`}>
                          {value == null ? EMPTY : column.format(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {note && <p className="dash-daily-note mt-2 text-[12px] text-muted">{note}</p>}
          <Pager page={page} size={DAILY_PAGE_SIZE} total={rows.length} unit={weekly ? 'tuần' : 'ngày'} onPage={setPage} />
        </>
      )}
    </section>
  );
}
