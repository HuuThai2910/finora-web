import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/components/Icon';
import { dismissToast, getToasts, subscribeToasts, type ToastItem, type ToastKind } from '@/lib/toast';

const KIND_ICON: Record<ToastKind, IconName> = {
  success: 'checkCircle',
  error: 'xCircle',
  warning: 'alert',
  info: 'info',
};

/** Màu viền trái và icon theo loại; chữ luôn màu chữ chính để đủ tương phản. */
const KIND_CLASS: Record<ToastKind, string> = {
  success: 'border-l-success [&_.ui-toast-icon]:text-success',
  error: 'border-l-danger [&_.ui-toast-icon]:text-danger',
  warning: 'border-l-warning [&_.ui-toast-icon]:text-warning',
  info: 'border-l-brand [&_.ui-toast-icon]:text-brand',
};

/**
 * Vùng toast dùng chung cho cả web: góc trên phải trên desktop, trên cùng giữa ở màn hẹp. Vẽ qua portal ở body để
 * nằm trên ngăn trượt và hộp thoại. Mỗi toast tự đóng theo `duration`, dừng đếm khi rê chuột hoặc focus vào.
 */
export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  return createPortal(
    <section
      className="ui-toaster fixed top-4 right-4 z-1100 flex w-95 flex-col gap-2 pointer-events-none max-[760px]:top-2 max-[760px]:right-auto max-[760px]:left-1/2 max-[760px]:w-[calc(100vw-24px)] max-[760px]:-translate-x-1/2"
      aria-label="Thông báo"
    >
      {/* Vùng live luôn có trong DOM để trình đọc màn hình bắt được toast mới. */}
      <div aria-live="polite" aria-relevant="additions" className="contents">
        {items.filter((item) => item.kind !== 'error').map((item) => <ToastCard key={item.id} item={item} />)}
      </div>
      <div aria-live="assertive" aria-relevant="additions" className="contents">
        {items.filter((item) => item.kind === 'error').map((item) => <ToastCard key={item.id} item={item} />)}
      </div>
    </section>,
    document.body,
  );
}

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  // Thời gian còn lại trước khi đóng; dừng đếm thì trừ phần đã trôi để lúc chạy tiếp không đóng sớm hoặc muộn.
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);
  const close = useCallback(() => dismissToast(item.id), [item.id]);

  useEffect(() => {
    if (paused) return undefined;
    startedAt.current = Date.now();
    const timer = window.setTimeout(close, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(remaining.current - (Date.now() - startedAt.current), 600);
    };
  }, [paused, close]);

  return (
    <div
      className={`ui-toast ui-toast-item pointer-events-auto flex items-start gap-2.5 rounded-[10px] border border-line border-l-4 bg-white py-2.5 pr-2 pl-3 text-[13px] text-primary shadow-pop animate-[ui-pop_0.18s_ease-out_both] motion-reduce:animate-none ${KIND_CLASS[item.kind]}`}
      role={item.kind === 'error' ? 'alert' : 'status'}
      data-kind={item.kind}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <span className="ui-toast-icon mt-px flex size-4.5 flex-none [&_svg]:size-4.5">
        <Icon name={KIND_ICON[item.kind]} />
      </span>
      <div className="min-w-0 flex-1 leading-[1.45] wrap-anywhere">
        <p className="ui-toast-message">{item.message}</p>
        {item.detail && <small className="mt-0.5 block text-[12px] text-muted">{item.detail}</small>}
      </div>
      <button
        type="button"
        className="ui-toast-close -mt-0.5 flex size-6 flex-none cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent text-muted hover:bg-fill hover:text-primary [&_svg]:size-3.5"
        aria-label="Đóng thông báo"
        onClick={close}
      >
        <Icon name="close" />
      </button>
    </div>
  );
}
