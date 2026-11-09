import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { SearchBox } from '@/components/SearchBox';
import { formatNumber } from '@/utils';
import { ActiveFilterChips, type FilterChip } from './ActiveFilterChips';

export interface FilterBarSearch {
  value: string;
  onSearch: (value: string) => void;
  placeholder: string;
  /** Nhãn cho trình đọc màn hình. */
  label: string;
}

interface FilterBarProps {
  search: FilterBarSearch;
  /** Số bộ lọc đang áp dụng (badge trên nút "Bộ lọc"). */
  activeCount: number;
  /** Chip của từng bộ lọc đang áp dụng; rỗng thì không hiện hàng chip. */
  chips: FilterChip[];
  /** Mở bảng lọc: trang chép bộ lọc đang áp dụng sang bản nháp để sửa. */
  onOpen: () => void;
  /** Bấm "Áp dụng": trả `false` khi bản nháp còn lỗi (bảng lọc giữ mở để sửa). */
  onApply: () => boolean;
  /** Bỏ mọi bộ lọc đang áp dụng (nút "Xóa bộ lọc" trong bảng và "Xóa tất cả" ở hàng chip). */
  onClearAll: () => void;
  /** Các mục lọc (form dọc). */
  children: ReactNode;
  /** Tổng số kết quả và đơn vị, ví dụ 47 "hồ sơ"; chưa có thì không hiện. */
  total?: number;
  unit?: string;
  /** Nút thêm đặt cạnh nút "Bộ lọc" (ví dụ "Thêm nhân viên"). */
  actions?: ReactNode;
  /** Tiêu đề bảng lọc; mặc định "Bộ lọc". */
  title?: string;
  className?: string;
}

/**
 * Thanh lọc dùng chung của các trang danh sách: ô tìm bên trái, bên phải tổng số kết quả và nút "Bộ lọc" (có badge)
 * mở bảng lọc thả xuống dạng form dọc; dưới thanh là hàng chip của bộ lọc đang áp dụng để bỏ nhanh từng cái.
 *
 * Bảng lọc sửa trên bản nháp của trang, chỉ "Áp dụng" mới đổi kết quả. Đóng khi bấm ra ngoài hoặc Esc (bỏ bản nháp),
 * focus vào mục đầu khi mở và trả về nút khi đóng. Màn hẹp: bảng thành tấm trải hết bề ngang, neo đáy màn hình.
 */
export function FilterBar({
  search, activeCount, chips, onOpen, onApply, onClearAll, children, total, unit, actions, title = 'Bộ lọc', className,
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLFormElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    // Đưa focus vào ô đầu tiên của bảng lọc để dùng được bằng bàn phím.
    panelRef.current?.querySelector<HTMLElement>('input, select, button')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      close(false);
      return;
    }
    onOpen();
    setOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (onApply()) close(true);
  };

  return (
    <div className={`ui-filterbar grid gap-2.5 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SearchBox
          className="ui-filter-search w-80 max-[760px]:w-full"
          value={search.value}
          onSearch={search.onSearch}
          label={search.label}
          placeholder={search.placeholder}
        />
        <div ref={rootRef} className="relative flex items-center gap-2 ml-auto max-[760px]:ml-0 max-[760px]:w-full">
          {total != null && (
            <span className="ui-filter-total mr-1 text-secondary text-[13px] tabular-nums whitespace-nowrap max-[760px]:mr-auto" role="status">
              {formatNumber(total)} {unit}
            </span>
          )}
          <button
            ref={buttonRef}
            type="button"
            className="ui-btn ghost relative"
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="dialog"
            onClick={toggle}
          >
            <Icon name="funnel" />
            Bộ lọc
            {activeCount > 0 && (
              <span className="inline-grid place-items-center min-w-4.5 h-4.5 px-1 rounded-full bg-brand text-white text-[11px] font-semibold tabular-nums">
                {activeCount}
              </span>
            )}
          </button>
          {actions}
          {open && (
            <form
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-labelledby={titleId}
              className="ui-filter-panel absolute right-0 top-[calc(100%+6px)] z-70 grid w-90 max-h-[min(70vh,640px)] grid-rows-[auto_minmax(0,1fr)_auto] rounded-[12px] border border-line bg-white shadow-pop animate-[ui-pop_0.14s_ease-out_both] max-[600px]:fixed max-[600px]:inset-x-0 max-[600px]:top-auto max-[600px]:bottom-0 max-[600px]:w-full max-[600px]:max-h-[85vh] max-[600px]:rounded-b-none"
              onSubmit={submit}
              noValidate
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-b-divider">
                <h2 id={titleId} className="text-primary text-[15px] font-semibold">{title}</h2>
                <button
                  type="button"
                  className="grid place-items-center size-7 rounded-sm text-muted hover:bg-surface-muted hover:text-primary [&_svg]:size-4"
                  aria-label="Đóng bảng lọc"
                  onClick={() => close(true)}
                >
                  <Icon name="close" />
                </button>
              </div>
              <div className="grid content-start gap-3.5 overflow-y-auto px-4 py-3">{children}</div>
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-t-divider">
                <button
                  type="button"
                  className="ui-btn ghost"
                  onClick={() => {
                    onClearAll();
                    close(true);
                  }}
                >
                  Xóa bộ lọc
                </button>
                <button type="submit" className="ui-btn primary">Áp dụng</button>
              </div>
            </form>
          )}
        </div>
      </div>
      <ActiveFilterChips chips={chips} onClearAll={onClearAll} />
    </div>
  );
}
