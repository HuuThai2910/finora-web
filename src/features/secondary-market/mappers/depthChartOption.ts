import type { ChartOption } from '@/lib/charts/echarts';
import { CHART_PALETTE, chartNumber, tooltipHtml } from '@/lib/charts/theme';
import { parseDecimal } from '@/utils';
import { formatPrice } from '../formatters';
import type { PriceLevel } from '../types';

interface Level {
  price: number;
  quantity: number;
}

const toLevels = (levels: PriceLevel[]): Level[] =>
  levels.flatMap((level) => {
    const price = parseDecimal(level.pricePercent);
    return price == null ? [] : [{ price, quantity: level.quantity }];
  });

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Biểu đồ độ sâu sổ lệnh (chép hàm thuần `buildDepthOption` của mockup).
 *
 * Trục y là số Note **cộng dồn** từ giá tốt nhất: bên mua là số Note sẵn sàng mua ở giá đó trở lên,
 * bên bán là số Note sẵn sàng bán ở giá đó trở xuống. Chỉ dựa trên các mức giá backend gửi trong ảnh
 * chụp sổ, không tự suy thêm mức nào.
 */
export function buildDepthOption(bidLevels: PriceLevel[], askLevels: PriceLevel[]): ChartOption {
  const bids = toLevels(bidLevels).sort((a, b) => b.price - a.price);
  const asks = toLevels(askLevels).sort((a, b) => a.price - b.price);
  const prices = [...bids, ...asks].map((level) => level.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const pad = Math.max(0.3, (high - low) * 0.06);
  const xMin = Math.floor((low - pad) * 10) / 10;
  const xMax = Math.ceil((high + pad) * 10) / 10;

  const bidPoints: Array<[number, number]> = [];
  if (bids.length) {
    let cumulative = bids.reduce((sum, level) => sum + level.quantity, 0);
    bidPoints.push([xMin, cumulative]);
    for (let index = bids.length - 1; index >= 0; index -= 1) {
      bidPoints.push([bids[index].price, cumulative]);
      cumulative -= bids[index].quantity;
      bidPoints.push([bids[index].price, cumulative]);
    }
  }
  const askPoints: Array<[number, number]> = [];
  if (asks.length) {
    let cumulative = 0;
    asks.forEach((level) => {
      askPoints.push([level.price, cumulative]);
      cumulative += level.quantity;
      askPoints.push([level.price, cumulative]);
    });
    askPoints.push([xMax, cumulative]);
  }

  const bidAt = (x: number) => bids.filter((l) => l.price >= x - 1e-9).reduce((sum, l) => sum + l.quantity, 0);
  const askAt = (x: number) => asks.filter((l) => l.price <= x + 1e-9).reduce((sum, l) => sum + l.quantity, 0);
  const line = (name: string, data: Array<[number, number]>, color: string) => ({
    name,
    type: 'line',
    data,
    color,
    symbol: 'none',
    smooth: false,
    lineStyle: { width: 2 },
    areaStyle: { color, opacity: 0.08 },
    emphasis: { disabled: true },
  });

  return {
    legend: { data: ['Bên mua', 'Bên bán'] },
    grid: { left: 4, right: 16, top: 32, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: (params: unknown) => {
        const first = Array.isArray(params) ? (params[0] as { axisValue?: number }) : undefined;
        const x = round1(Number(first?.axisValue ?? 0));
        return tooltipHtml(`Giá ${formatPrice(x)}`, [
          { color: CHART_PALETTE.success, label: 'Mua ở giá này trở lên', value: `${chartNumber(bidAt(x))} Note` },
          { color: CHART_PALETTE.danger, label: 'Bán ở giá này trở xuống', value: `${chartNumber(askAt(x))} Note` },
        ]);
      },
    },
    xAxis: {
      type: 'value',
      min: xMin,
      max: xMax,
      axisLabel: { formatter: (value: number) => formatPrice(value), showMinLabel: false, showMaxLabel: false },
      splitLine: { show: false },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [line('Bên mua', bidPoints, CHART_PALETTE.success), line('Bên bán', askPoints, CHART_PALETTE.danger)],
  };
}
