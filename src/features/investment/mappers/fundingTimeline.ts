import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, moneyShort, tooltipHtml } from '@/lib/charts/theme';
import { EMPTY } from '@/utils';
import { formatDateTime, formatMoney, formatPercent, parseDecimal } from '../formatters';
import type { FundingProgress, ListingInvestor, MarketListing } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TimelinePoint {
  at: number;
  amount: number;
  /** Vốn góp lũy kế sau lần góp này. */
  total: number;
  investorId: string;
}

export interface FundingTimeline {
  target: number;
  startAt: number;
  closesAt: number;
  endAt: number;
  endNote: string;
  total: number;
  points: TimelinePoint[];
  /** Số ngày đủ vốn sớm hơn hạn; null khi chưa đủ vốn hoặc không sớm. */
  earlyDays: number | null;
  expired: boolean;
}

/**
 * Vốn góp lũy kế theo thời điểm đặt lệnh thật (`createdAt` của từng phần vốn).
 *
 * Phần vốn đã hủy đã nhả tiền nên không tính. Backend không trả thời điểm mở gọi vốn, nên
 * trục thời gian bắt đầu từ nửa đêm của ngày có lần góp đầu tiên thay vì đoán ngày mở.
 */
export function buildFundingTimeline(
  listing: MarketListing,
  investors: ListingInvestor[],
  progress: FundingProgress | undefined,
  now: Date = new Date(),
): FundingTimeline {
  const target = parseDecimal(listing.targetAmount) ?? 0;
  const closesAt = new Date(listing.fundingClosesAt).getTime();
  const rows = investors
    .filter((item) => item.status !== 'CANCELLED')
    .map((item) => ({ at: new Date(item.createdAt).getTime(), amount: parseDecimal(item.amount) ?? 0, investorId: item.investorId }))
    .filter((row) => Number.isFinite(row.at))
    .sort((a, b) => a.at - b.at);

  let running = 0;
  const points = rows.map((row) => {
    running += row.amount;
    return { ...row, total: running };
  });

  const first = new Date(points[0]?.at ?? now.getTime());
  first.setHours(0, 0, 0, 0);
  const lastAt = points[points.length - 1]?.at ?? first.getTime();
  const fundedAt = progress?.fullyFundedAt ? new Date(progress.fullyFundedAt).getTime() : null;

  let endAt: number;
  let endNote: string;
  if (listing.status === 'FULLY_FUNDED') {
    endAt = fundedAt ?? lastAt;
    endNote = 'Đủ vốn';
  } else if (listing.status === 'OPEN' && now.getTime() < closesAt) {
    endAt = now.getTime();
    endNote = 'Hiện tại';
  } else {
    endAt = closesAt;
    endNote = 'Hết hạn gọi vốn';
  }
  endAt = Math.max(endAt, lastAt);

  return {
    target,
    startAt: first.getTime(),
    closesAt,
    endAt,
    endNote,
    total: running,
    points,
    earlyDays:
      listing.status === 'FULLY_FUNDED' && fundedAt != null && closesAt > fundedAt
        ? Math.round((closesAt - fundedAt) / DAY_MS)
        : null,
    expired: endNote === 'Hết hạn gọi vốn',
  };
}

export const timelineShare = (value: number, target: number): string =>
  target > 0 ? formatPercent((value / target) * 100) : EMPTY;

/** Bước tròn cho trục y, để đỉnh trục chỉ hơn mục tiêu tối đa một bước. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].find((multiple) => multiple * magnitude >= raw) ?? 10) * magnitude;
}

const dayLabel = (value: number) => {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

interface ChartDatum {
  value: [number, number];
  investorId?: string;
  amount?: number;
  note?: string;
  symbol?: string;
}

/**
 * Biểu đồ bậc thang vốn góp lũy kế, chép từ `buildFundingTimeOption` của mockup.
 * Trục x là số mốc thời gian (không dùng trục 'time') để nhãn cách đều N ngày.
 */
export function buildFundingTimeOption(
  timeline: FundingTimeline,
  nameOf: (investorId: string) => string,
  narrow = false,
): ChartOption {
  const { target, startAt, closesAt, endAt, endNote, points } = timeline;
  const top = Math.max(target, points[points.length - 1]?.total ?? 0) * 1.08;
  const interval = niceStep((target || top) / 4);
  const xMax = Math.max(closesAt, endAt);
  const tickDays = Math.max(1, Math.ceil((xMax - startAt) / DAY_MS / (narrow ? 3 : 6)));
  const ticks: number[] = [];
  for (let tick = startAt; tick <= xMax; tick += tickDays * DAY_MS) ticks.push(tick);

  const data: ChartDatum[] = [
    { value: [startAt, 0], symbol: 'none' },
    ...points.map((point) => ({ value: [point.at, point.total] as [number, number], investorId: point.investorId, amount: point.amount })),
  ];
  const lastTotal = points[points.length - 1]?.total ?? 0;
  if (endAt > (points[points.length - 1]?.at ?? startAt)) data.push({ value: [endAt, lastTotal], note: endNote, symbol: 'none' });

  return {
    grid: { left: 4, right: 16, top: 20, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const datum = (Array.isArray(params) ? params[0] : params) as { data: ChartDatum };
        const [at, total] = datum.data.value;
        const rows = [
          { label: 'Lũy kế', value: `${formatMoney(total)} đ` },
          { label: 'Đạt mục tiêu', value: timelineShare(total, target) },
        ];
        if (datum.data.investorId) {
          rows.unshift({ label: nameOf(datum.data.investorId), value: `+${formatMoney(datum.data.amount ?? 0)} đ` });
        }
        return tooltipHtml(formatDateTime(new Date(at).toISOString()), rows, datum.data.note);
      },
    },
    xAxis: {
      type: 'value',
      min: startAt,
      max: xMax,
      axisLine: { show: true, lineStyle: { color: CHART_PALETTE.axis } },
      splitLine: { show: false },
      axisLabel: { customValues: ticks, formatter: dayLabel },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: Math.ceil(top / interval) * interval,
      interval,
      axisLabel: { formatter: moneyShort },
    },
    series: [
      {
        name: 'Vốn góp lũy kế',
        type: 'line',
        step: 'end',
        data,
        color: CHART_PALETTE.brand,
        areaStyle: { color: CHART_PALETTE.brand, opacity: 0.08 },
        showSymbol: true,
        symbolSize: 6,
        itemStyle: { borderColor: CHART_PALETTE.surface, borderWidth: 1 },
        markLine: {
          silent: true,
          symbol: 'none',
          animation: false,
          lineStyle: { color: CHART_PALETTE.neutral, type: 'dashed', width: 1 },
          label: { formatter: 'Mục tiêu', position: 'insideEndTop', color: CHART_PALETTE.muted, fontSize: 11 },
          data: [{ yAxis: target }],
        },
      },
    ],
  };
}
