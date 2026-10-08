import { useMemo } from 'react';
import { CHART_EMPTY_TEXT } from '@/components/ChartCard';
import { EChart } from '@/components/EChart';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StaleProjectionNote, type LoanStatisticsSummary } from '@/features/statistics';
import { formatCurrency, formatNumber, formatPercent } from '@/utils';
import type { DashboardStatistics } from '../hooks/useDashboardStatistics';
import { buildTrendOption } from '../mappers/chartOptions';
import { buildPeriodKpis, formatDelta, type KpiTile } from '../mappers/periodKpis';
import { rollingAverage } from '../mappers/rolling';
import type { PeriodKpiKey } from '../types';
import { DashCardHead } from './DashCardHead';

/** Dòng thứ ba của ô số: chênh lệch có mũi tên khi so được, không thì ghi chú trung tính. */
function DeltaLine({ tile, period }: { tile: KpiTile; period: number }) {
  if (!tile.delta) return <span className="dash-delta">{tile.note}</span>;
  const { percent, good } = tile.delta;
  if (Math.abs(percent) < 0.05) return <span className="dash-delta" title={`so với ${period} ngày trước đó`}><b>0,0%</b></span>;
  return (
    <span className={`dash-delta ${good ? 'good' : 'bad'}`} title={`so với ${period} ngày trước đó`}>
      <Icon name={percent >= 0 ? 'arrowUp' : 'arrowDown'} />
      <b>{formatDelta(percent)}</b>
    </span>
  );
}

/** Phần dưới khi chọn ô ảnh chụp (dư nợ, nợ xấu): số chi tiết, vì backend chưa có lịch sử để vẽ xu hướng. */
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
      <p className="ui-chart-note">Số hiện tại. Hệ thống chưa lưu dư nợ theo ngày nên chưa vẽ được xu hướng.</p>
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

/**
 * Thẻ "Số liệu N ngày": bốn ô là bốn nút chọn; phần dưới vẽ bình quân 7 ngày của ô đang chọn (vốn gọi
 * được, phí chợ Notes) hoặc số chi tiết của ô ảnh chụp (dư nợ, nợ xấu).
 */
export function PeriodKpiPanel({ stats, selected, onSelect }: PeriodKpiPanelProps) {
  const { period, currentFrom, loanSummary, investmentCompare, investmentPeriods } = stats;
  const tiles = buildPeriodKpis(loanSummary.data, investmentPeriods);
  const comparePoints = investmentCompare.currentData?.points;

  const trend = useMemo(() => {
    if (!comparePoints || (selected !== 'committed' && selected !== 'fee')) return null;
    const points = rollingAverage(comparePoints, currentFrom, (point) => (selected === 'committed' ? point.committedAmount : point.platformFee));
    if (points.every((point) => point.day === 0)) return { empty: true as const };
    return {
      empty: false as const,
      option: buildTrendOption({ points, name: selected === 'committed' ? 'Vốn gọi được' : 'Phí thu' }),
    };
  }, [comparePoints, currentFrom, selected]);

  const snapshot = selected === 'outstanding' || selected === 'npl';
  const source = snapshot ? loanSummary : investmentCompare;
  // Đổi kỳ thì series kỳ mới chưa về (`currentData` rỗng) dù `isLoading` đã false: vẫn là đang tải.
  const loanPending = !loanSummary.data && !loanSummary.error;
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
        ) : (snapshot ? loanPending : investmentPending) ? (
          <span className="ui-skeleton dash-trend-skel" aria-busy="true" />
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
