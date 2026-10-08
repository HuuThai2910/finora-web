/**
 * Theme và hàm định dạng biểu đồ, chuyển từ finora-web-mockup/chart-theme.js (bản "mềm", cột một màu).
 *
 * Quy tắc: mềm ở chuyển động, không ở hình dáng (không gradient, cột bo đầu); một trục y; một tông xanh,
 * thứ bậc dùng dải xanh đậm đến nhạt; chữ không mang màu chuỗi; mỗi biểu đồ có bảng số liệu thay thế.
 */

export const CHART_PALETTE = {
  brand: '#1d56c4',
  ink: '#0a2c68',
  ink2: '#5f6b82',
  muted: '#8a95ab',
  grid: '#edf2fa',
  axis: '#dbe4f0',
  surface: '#ffffff',
  /** Chuỗi không phải trọng tâm (phần còn lại, đã ngừng). */
  neutral: '#c3cede',
  /** Hai chuỗi so sánh: đậm + nhạt. */
  pair: ['#1d56c4', '#a3bde3'],
  /** Dải thứ bậc 5 bậc, đậm đến nhạt. */
  ordinal: ['#112c6b', '#1a479f', '#1d56c4', '#5f8fd6', '#a3bde3'],
  /**
   * Màu phân loại khi phải tách nhiều thực thể ngang hàng trên một biểu đồ đường (vd từng sản phẩm vay),
   * lấy từ products.html của mockup (đã qua validate_palette.js). Thực thể còn lại gộp một nhóm `neutral`.
   */
  categorical: ['#1d56c4', '#eb6834', '#1baf7a'],
  /** Chỉ cho bên Mua/Bán của sổ lệnh và trạng thái; luôn kèm chữ. */
  success: '#0a7d4f',
  danger: '#c2263a',
  warning: '#c96a06',
} as const;

export const CHART_FONT = "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', sans-serif";

const axisCommon = {
  axisLine: { show: true, lineStyle: { color: CHART_PALETTE.axis, width: 1 } },
  axisTick: { show: false },
  axisLabel: { color: CHART_PALETTE.muted, fontSize: 11, margin: 10, hideOverlap: true },
  splitLine: { show: false },
  nameTextStyle: { color: CHART_PALETTE.muted, fontSize: 11 },
};

export const CHART_THEME = {
  color: [CHART_PALETTE.brand, CHART_PALETTE.pair[1], CHART_PALETTE.neutral, ...CHART_PALETTE.ordinal],
  backgroundColor: 'transparent',
  textStyle: { fontFamily: CHART_FONT, color: CHART_PALETTE.ink2, fontSize: 12 },
  animationDuration: 700,
  animationEasing: 'cubicOut',
  animationDurationUpdate: 400,
  animationEasingUpdate: 'cubicInOut',
  grid: { left: 4, right: 12, top: 36, bottom: 4, containLabel: true },
  legend: {
    top: 0,
    left: 0,
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 16,
    textStyle: { color: CHART_PALETTE.ink2, fontSize: 12 },
    inactiveColor: '#d1d5db',
  },
  categoryAxis: axisCommon,
  timeAxis: axisCommon,
  valueAxis: {
    ...axisCommon,
    axisLine: { show: false },
    splitNumber: 4,
    splitLine: { show: true, lineStyle: { color: CHART_PALETTE.grid, width: 1, type: 'solid' } },
  },
  tooltip: {
    backgroundColor: '#fff',
    borderWidth: 0,
    padding: [10, 12],
    textStyle: { color: CHART_PALETTE.ink, fontSize: 12, fontFamily: CHART_FONT },
    extraCssText: 'border-radius:12px;box-shadow:0 10px 28px rgba(15,40,90,.16);',
    transitionDuration: 0.25,
    axisPointer: {
      lineStyle: { color: CHART_PALETTE.neutral, width: 1 },
      shadowStyle: { color: 'rgba(17,24,39,.04)' },
      crossStyle: { color: CHART_PALETTE.neutral },
    },
  },
  bar: { barMaxWidth: 24, itemStyle: { borderRadius: [6, 6, 0, 0] } },
  line: { symbol: 'circle', symbolSize: 8, showSymbol: false, lineStyle: { width: 2.5, cap: 'round', join: 'round' } },
};

const numberFormat = new Intl.NumberFormat('vi-VN');
const oneDecimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** 1250000 thành "1.250.000". */
export const chartNumber = (value: number): string => numberFormat.format(Math.round(value));

/** Tiền rút gọn cho trục và nhãn: "1,2 tỷ", "350 tr", "12 nghìn". */
export function moneyShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${oneDecimal.format(value / 1e9)} tỷ`;
  if (abs >= 1e6) return `${oneDecimal.format(value / 1e6)} tr`;
  if (abs >= 1e3) return `${oneDecimal.format(value / 1e3)} nghìn`;
  return numberFormat.format(value);
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] ?? char));

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/**
 * HTML tooltip: một tiêu đề và các dòng (chấm màu, nhãn, giá trị căn phải). Mọi chuỗi đều được escape
 * vì tên khoản vay hay người dùng đến từ backend.
 */
export function tooltipHtml(title: string, rows: TooltipRow[], foot?: string): string {
  const body = rows.map((row) => `<div style="display:flex;align-items:center;gap:8px;min-width:180px;margin-top:4px">
      ${row.color ? `<span style="width:8px;height:8px;border-radius:2px;background:${row.color};flex:none"></span>` : ''}
      <span style="flex:1;color:${CHART_PALETTE.ink2}">${escapeHtml(row.label)}</span>
      <b style="font-weight:500;font-variant-numeric:tabular-nums">${escapeHtml(row.value)}</b></div>`).join('');
  const footer = foot ? `<div style="margin-top:6px;color:${CHART_PALETTE.muted}">${escapeHtml(foot)}</div>` : '';
  return `<div style="font-weight:500">${escapeHtml(title)}</div>${body}${footer}`;
}

const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/**
 * Vùng dưới đường của bản "mềm" (mockup chart-theme.js `area`): màu chuỗi mờ dần từ 22% xuống 0 ở trục.
 * Gradient khai báo dạng object nên không cần nạp `echarts.graphic`.
 */
export function chartArea(color: string) {
  return {
    color: {
      type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [{ offset: 0, color: rgba(color, 0.22) }, { offset: 1, color: rgba(color, 0) }],
    },
  };
}

/** Nhấn khi rê chuột: phần còn lại mờ đi. */
export const CHART_FOCUS = { focus: 'series', blurScope: 'coordinateSystem' } as const;
