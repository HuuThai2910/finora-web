import { useEffect, useRef } from 'react';
import { echarts, type ChartOption } from '@/lib/charts/echarts';

interface EChartProps {
  option: ChartOption;
  /** Mô tả ngắn cho trình đọc màn hình; số liệu chi tiết nằm ở bảng thay thế cạnh biểu đồ. */
  ariaLabel: string;
  className?: string;
  /** Thay toàn bộ option thay vì gộp, dùng khi số chuỗi thay đổi. */
  notMerge?: boolean;
  onClick?: (params: { dataIndex: number; seriesName?: string; name?: string }) => void;
}

/** Chờ font tối đa chừng này (ms) rồi vẽ luôn, để mạng chậm không làm trống biểu đồ. */
const FONT_WAIT_MS = 1500;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function fontsReady(): Promise<unknown> {
  const ready = document.fonts?.ready ?? Promise.resolve();
  return Promise.race([ready, new Promise((resolve) => window.setTimeout(resolve, FONT_WAIT_MS))]);
}

/**
 * Khung biểu đồ ECharts dùng chung: vẽ SVG (chữ tiếng Việt sắc nét), tự co giãn theo thẻ,
 * tắt hoạt ảnh khi người dùng chọn giảm chuyển động. Đổi `option` thì biểu đồ biến hình sang dữ liệu mới.
 * Phần tử chứa phải có chiều cao (đặt qua `className`).
 */
export function EChart({ option, ariaLabel, className, notMerge = false, onClick }: EChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const clickRef = useRef(onClick);
  const latestRef = useRef({ option, notMerge });
  clickRef.current = onClick;
  latestRef.current = { option, notMerge };

  // Khởi tạo sau khi font tải xong: ECharts đo chữ lúc vẽ và nhớ kết quả, đo bằng font dự phòng thì
  // nhãn trục bị cắt. Dọn instance và ResizeObserver khi rời trang để không rò bộ nhớ.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let alive = true;
    let observer: ResizeObserver | null = null;
    void fontsReady().then(() => {
      if (!alive) return;
      const chart = echarts.init(host, 'finora', { renderer: 'svg' });
      chartRef.current = chart;
      chart.on('click', (params) => {
        clickRef.current?.(params as { dataIndex: number; seriesName?: string; name?: string });
      });
      apply(chart, latestRef.current.option, latestRef.current.notMerge);
      observer = new ResizeObserver(() => chart.resize());
      observer.observe(host);
    });
    return () => {
      alive = false;
      observer?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (chartRef.current) apply(chartRef.current, option, notMerge);
  }, [option, notMerge]);

  return <div ref={hostRef} className={className} role="img" aria-label={ariaLabel} />;
}

function apply(chart: ReturnType<typeof echarts.init>, option: ChartOption, notMerge: boolean) {
  chart.setOption(prefersReducedMotion() ? { ...option, animation: false } : option, { notMerge });
}
