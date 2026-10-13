import { useMemo } from 'react';
import { CHART_EMPTY_TEXT } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StaleProjectionNote, type LoanStatisticsSummary } from '@/features/statistics';
import { formatCurrency, formatNumber, formatPercent } from '@/utils';
import type { DashboardStatistics } from '../hooks/useDashboardStatistics';
import { moneyShort } from '@/lib/charts/theme';
import { buildLevelTrendOption, buildTrendOption } from '../mappers/chartOptions';
import { buildPeriodKpis, formatKpiDelta, isFlatDelta, portfolioTrendPoints, type KpiTile } from '../mappers/periodKpis';
import { rollingAverage } from '../mappers/rolling';
import type { PeriodKpiKey } from '../types';
import { DashCardHead } from './DashCardHead';

/** Dòng thứ ba của ô số: chênh lệch có mũi tên khi so được, không thì ghi chú trung tính. */
function DeltaLine({ tile, period }: { tile: KpiTile; period: number }) {
  const { delta } = tile;
  if (!delta) return <span className="dash-delta">{tile.note}</span>;
  if (isFlatDelta(delta)) {
    return <span className="dash-delta" title={`so với ${period} ngày trước đó`}><b>{delta.unit === 'point' ? '0,00 điểm' : '0,0%'}</b></span>;
  }
  return (
    <span className={`dash-delta ${delta.good ? 'good' : 'bad'}`} title={`so với ${period} ngày trước đó`}>
      <Icon name={delta.percent >= 0 ? 'arrowUp' : 'arrowDown'} />
      <b>{formatKpiDelta(delta)}</b>
    </span>
  );
}

/** Phần dưới khi chọn ô dư nợ hoặc nợ xấu mà không có lịch sử theo ngày (Fineract không đọc được): số hiện tại. */
function SnapshotFacts({ kind, summary }: { kind: 'outstanding' | 'npl'; summary: LoanStatisticsSummary }) {
  const { portfolio } = summary;
  const rows = kind === 'outstanding'
    ? [
      ['Dư nợ gốc', formatCurrency(portfolio.principalOutstanding)],
      ['Gốc và lãi còn phải thu', formatCurrency(portfolio.totalOutstanding)],
      ['Tiền đang quá hạn', formatCurrency(portfolio.overdueAmount)],
      ['Khoản vay còn dư nợ', formatNumber(portfolio.outstandingLoans)],
    ]
    : [
      ['Dư nợ gốc nhóm 3 đến 5', formatCurrency(portfolio.nplPrincipalOutstanding)],
      ['Dư nợ gốc toàn danh mục', formatCurrency(portfolio.principalOutstanding)],
      ['Tỷ lệ nợ xấu', formatPercent(portfolio.nplRatioPercent)],
    ];
  return (
    <div className="dash-facts">
      <dl className="ui-rows">
        {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <p className="ui-chart-note">Số hiện tại; chưa đọc được lịch sử từ Fineract nên chưa vẽ được xu hướng.</p>
      <StaleProjectionNote count={portfolio.staleProjections} />
    </div>
  );
}

interface PeriodKpiPanelProps {
  stats: DashboardStatistics;
  /** Ô đang chọn; nằm ở trang vì bảng số liệu từng ngày cũng tô cột theo ô này. */
  selected: PeriodKpiKey;
  onSelect: (key: PeriodKpiKey) => void;
}

const PERCENT2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent2 = (value: number) => `${PERCENT2.format(value)}%`;

/**
 * Thẻ "Số liệu N ngày": bốn ô là bốn nút chọn; phần dưới vẽ bình quân 7 ngày của ô đang chọn (vốn gọi
 * được, phí chợ Notes) hoặc số cuối mỗi ngày (cuối mỗi tuần với kỳ 90 ngày) của dư nợ và tỷ lệ nợ xấu.
 */
export function PeriodKpiPanel({ stats, selected, onSelect }: PeriodKpiPanelProps) {
  const { period, currentFrom, chartBucket, loanSummary, loanChart, loanCompare, loanPeriods, investmentCompare, investmentPeriods } = stats;
  const tiles = buildPeriodKpis(loanSummary.data, investmentPeriods, loanPeriods, loanCompare.currentData?.portfolioHistory?.unavailableLoans ?? 0);
  const unavailableLoans = loanChart.currentData?.portfolioHistory?.unavailableLoans ?? 0;
  const comparePoints = investmentCompare.currentData?.points;
  const loanChartPoints = loanChart.currentData?.points;

  const trend = useMemo(() => {
    if (!comparePoints || (selected !== 'committed' && selected !== 'fee')) return null;
    const points = rollingAverage(comparePoints, currentFrom, (point) => (selected === 'committed' ? point.committedAmount : point.platformFee));
    if (points.every((point) => point.day === 0)) return { empty: true as const };
    return {
      empty: false as const,
      option: buildTrendOption({ points, name: selected === 'committed' ? 'Vốn gọi được' : 'Phí thu' }),
    };
  }, [comparePoints, currentFrom, selected]);

  const levelTrend = useMemo(() => {
    if (!loanChartPoints || (selected !== 'outstanding' && selected !== 'npl')) return null;
    const points = portfolioTrendPoints(loanChartPoints, selected);
    if (!points.length) return null;
    return buildLevelTrendOption(selected === 'outstanding'
      ? { points, bucket: chartBucket, name: 'Dư nợ cuối ngày', format: moneyShort }
      : { points, bucket: chartBucket, name: 'Tỷ lệ nợ xấu', format: percent2 });
  }, [loanChartPoints, selected, chartBucket]);

  const snapshot = selected === 'outstanding' || selected === 'npl';
  const source = snapshot ? loanSummary : investmentCompare;
  // Đổi kỳ thì series kỳ mới chưa về (`currentData` rỗng) dù `isLoading` đã false: vẫn là đang tải.
  // Ô dư nợ, nợ xấu chờ cả series biểu đồ; series lỗi thì vẫn hiện số hiện tại thay cho đường xu hướng.
  const loanPending = !loanSummary.data && !loanSummary.error;
  const loanTrendPending = loanPending || (!loanChart.currentData && !loanChart.error);
  const investmentPending = !investmentPeriods && !investmentCompare.error;
  const pending = (key: PeriodKpiKey) => (key === 'outstanding' || key === 'npl' ? loanPending : investmentPending);

  return (
    <section className="ui-card dash-card dash-kpis" aria-labelledby="dashKpiTitle">
      <DashCardHead id="dashKpiTitle" icon="trend" title={`Số liệu ${period} ngày`} aside={<span className="ui-tag">so với {period} ngày trước đó</span>} />
      <div className="dash-kpi-grid" role="tablist" aria-label="Chọn số liệu để xem chi tiết">
        {tiles.map((tile) => (
          <button key={tile.key} type="button" role="tab" className="dash-kpi" aria-selected={selected === tile.key} onClick={() => onSelect(tile.key)}>
            <span className="lbl">{tile.label}</span>
            <span className="val">{pending(tile.key) ? '…' : tile.value}</span>
            {!pending(tile.key) && <DeltaLine tile={tile} period={period} />}
          </button>
        ))}
      </div>

      <div className="dash-trend" role="tabpanel" aria-label={tiles.find((tile) => tile.key === selected)?.label}>
        {source.error ? (
          <ErrorNotice error={source.error} onRetry={source.refetch} />
        ) : (snapshot ? loanTrendPending : investmentPending) ? (
          <span className="ui-skeleton dash-trend-skel" aria-busy="true" />
        ) : snapshot && levelTrend ? (
          <>
            <span className="dash-trend-note">{chartBucket === 'DAY' ? 'Theo ngày' : 'Cuối mỗi tuần'}</span>
            <EChart className="dash-trend-plot" option={levelTrend} ariaLabel={`Biểu đồ đường ${selected === 'outstanding' ? 'dư nợ' : 'tỷ lệ nợ xấu'} cuối ${chartBucket === 'DAY' ? 'mỗi ngày' : 'mỗi tuần'}, ${period} ngày gần nhất`} />
            {unavailableLoans > 0 && (
              <p className="ui-chart-note">{unavailableLoans} khoản vay chưa đọc được lịch sử từ Fineract nên đường này chưa tính các khoản đó.</p>
            )}
          </>
        ) : snapshot ? (
          loanSummary.data && <SnapshotFacts kind={selected} summary={loanSummary.data} />
        ) : !trend || trend.empty ? (
          <p className="ui-chart-empty">{CHART_EMPTY_TEXT}</p>
        ) : (
          <>
            <span className="dash-trend-note">Bình quân 7 ngày</span>
            <EChart className="dash-trend-plot" option={trend.option} ariaLabel={`Biểu đồ đường ${selected === 'committed' ? 'vốn gọi được' : 'phí chợ Notes'} bình quân 7 ngày, ${period} ngày gần nhất`} />
          </>
        )}
      </div>
    </section>
  );
}
