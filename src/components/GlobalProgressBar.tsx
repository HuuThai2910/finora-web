import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { finishProgress, getActiveCount, startProgress, subscribeProgress } from '@/lib/progress/progressStore';

/** Chờ chừng này mới hiện thanh, để request nhanh không làm thanh nháy. */
const SHOW_DELAY_MS = 150;
/** Nhịp tăng dần; mỗi nhịp đi thêm một phần quãng còn lại tới 90%, nên càng lâu càng chậm. */
const TRICKLE_MS = 300;
const TRICKLE_CAP = 0.9;
/** Thời gian giữ ở 100% rồi mờ dần trước khi ẩn. */
const FINISH_MS = 260;

type Phase = 'idle' | 'running' | 'finishing';

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Thanh tiến trình mảnh ở mép trên cửa sổ (kiểu NProgress) cho cả web: hiện khi còn request API không chạy nền hoặc
 * chunk trang đang tải (xem `progressMiddleware`, `PageChunkFallback`). Không thay các chỉ báo "Đang tải…" cục bộ.
 * Người dùng bật giảm chuyển động thì thanh đứng yên ở giữa thay vì chạy dần.
 */
export function GlobalProgressBar() {
  const active = useSyncExternalStore(subscribeProgress, getActiveCount, getActiveCount);
  const [phase, setPhase] = useState<Phase>('idle');
  const [width, setWidth] = useState(0);
  const reduced = useRef(false);

  // Bắt đầu: đợi SHOW_DELAY_MS, vẫn còn việc thì hiện. Hết việc khi đang hiện: chạy tới 100% rồi ẩn.
  useEffect(() => {
    if (active > 0) {
      if (phase === 'running') return undefined;
      const timer = window.setTimeout(() => {
        reduced.current = prefersReducedMotion();
        setWidth(reduced.current ? 0.6 : 0.08);
        setPhase('running');
      }, phase === 'finishing' ? 0 : SHOW_DELAY_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase !== 'running') return undefined;
    setWidth(1);
    setPhase('finishing');
    return undefined;
  }, [active, phase]);

  useEffect(() => {
    if (phase === 'finishing') {
      const timer = window.setTimeout(() => {
        setPhase('idle');
        setWidth(0);
      }, FINISH_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase !== 'running' || reduced.current) return undefined;
    const timer = window.setInterval(() => {
      setWidth((current) => current + (TRICKLE_CAP - current) * 0.12);
    }, TRICKLE_MS);
    return () => window.clearInterval(timer);
  }, [phase]);

  if (phase === 'idle') return null;

  return createPortal(
    <div
      className="ui-progress pointer-events-none fixed inset-x-0 top-0 z-1200 h-0.75"
      role="progressbar"
      aria-label="Đang tải dữ liệu"
      aria-valuetext={phase === 'finishing' ? 'Đã tải xong' : 'Đang tải'}
      aria-busy={phase === 'running'}
    >
      <div
        className={`h-full origin-left bg-brand shadow-[0_0_8px_rgba(29,86,196,0.55)] transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${phase === 'finishing' ? 'opacity-0 delay-100' : 'opacity-100'}`}
        style={{ transform: `scaleX(${width})` }}
      />
    </div>,
    document.body,
  );
}

/**
 * Fallback của Suspense khi chunk trang lazy đang tải: vẫn hiện chữ "Đang tải trang…" như cũ, đồng thời tính là một
 * việc của thanh tải toàn trang.
 */
export function PageChunkFallback() {
  useEffect(() => {
    const key = startProgress();
    return () => finishProgress(key);
  }, []);
  return <div className="ui-empty" aria-busy="true">Đang tải trang...</div>;
}
